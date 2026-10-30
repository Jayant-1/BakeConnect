package com.bakeconnect.payment.service;

import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.billing.entity.InvoiceStatus;
import com.bakeconnect.billing.repository.InvoiceRepository;
import com.bakeconnect.common.exception.*;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.PaymentStatus;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.PaymentInitiateRequest;
import com.bakeconnect.payment.entity.PaymentAttempt;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.repository.PaymentAttemptRepository;
import com.bakeconnect.payment.spi.PaymentProvider;
import com.bakeconnect.payment.spi.PaymentProviderFactory;
import com.bakeconnect.payment.spi.PaymentSessionResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class PaymentInitiationPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(PaymentInitiationPersistenceService.class);

    private static final List<PaymentAttemptStatus> ACTIVE_STATUSES = List.of(
            PaymentAttemptStatus.INITIATED,
            PaymentAttemptStatus.QUEUED,
            PaymentAttemptStatus.AWAITING_PAYMENT,
            PaymentAttemptStatus.PROCESSING
    );

    private final PaymentAttemptRepository paymentAttemptRepository;
    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final ObjectMapper objectMapper;

    public PaymentInitiationPersistenceService(
            PaymentAttemptRepository paymentAttemptRepository,
            OrderRepository orderRepository,
            InvoiceRepository invoiceRepository,
            ObjectMapper objectMapper) {
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
        this.objectMapper = objectMapper;
    }

    public enum ReservationOutcome {
        NEW_INTENT,
        EXISTING_ACTIVE,
        EXISTING_TERMINAL,
        UNCERTAIN_NEEDS_RECOVERY
    }

    public static class ConcurrentActiveAttemptException extends RuntimeException {
        private final UUID orderId;
        public ConcurrentActiveAttemptException(UUID orderId) {
            super("Concurrent active attempt race caught for order " + orderId);
            this.orderId = orderId;
        }
        public UUID getOrderId() { return orderId; }
    }

    public record ReservationResult(
            PaymentAttempt attempt,
            ReservationOutcome outcome,
            Order order,
            Invoice invoice,
            BigDecimal paymentAmount,
            String userEmail,
            String userPhone
    ) {
        public ReservationResult(PaymentAttempt attempt, ReservationOutcome outcome, Order order, Invoice invoice, BigDecimal paymentAmount) {
            this(attempt, outcome, order, invoice, paymentAmount,
                    order != null && order.getUser() != null ? order.getUser().getEmail() : null,
                    order != null && order.getUser() != null ? order.getUser().getPhone() : null);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ReservationResult reserveInitiationIntent(
            PaymentInitiateRequest request,
            UUID currentUserId,
            UserRole role,
            String providerName,
            boolean isObserverHealthy,
            String requestFingerprint) {

        // 1. Check existing idempotency key
        Optional<PaymentAttempt> existing = paymentAttemptRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existing.isPresent()) {
            PaymentAttempt attempt = existing.get();

            // IDOR check before revealing any existing payment attempt
            if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                    attempt.getUser() != null && !attempt.getUser().getId().equals(currentUserId)) {
                throw new ForbiddenException("Access denied: Idempotency key belongs to another user");
            }

            // Parameter conflict check: order, invoice, provider must match
            if ((attempt.getOrder() != null && !attempt.getOrder().getId().equals(request.getOrderId())) ||
                    !Objects.equals(attempt.getInvoice() != null ? attempt.getInvoice().getId() : null, request.getInvoiceId()) ||
                    (request.getProvider() != null && attempt.getProvider() != null && !request.getProvider().equalsIgnoreCase(attempt.getProvider())) ||
                    (attempt.getRequestFingerprint() != null && requestFingerprint != null && !attempt.getRequestFingerprint().equals(requestFingerprint))) {
                throw new ConflictException("Idempotency key reuse conflict: request parameters differ from previous initiation");
            }

            if (attempt.getStatus() == PaymentAttemptStatus.UNCERTAIN_INITIATION) {
                return new ReservationResult(attempt, ReservationOutcome.UNCERTAIN_NEEDS_RECOVERY,
                        attempt.getOrder(), attempt.getInvoice(), attempt.getAmount());
            }

            ReservationOutcome outcome = attempt.getStatus().isActive()
                    ? ReservationOutcome.EXISTING_ACTIVE
                    : ReservationOutcome.EXISTING_TERMINAL;
            return new ReservationResult(attempt, outcome, attempt.getOrder(), attempt.getInvoice(), attempt.getAmount());
        }

        // 2. Fetch and Authorize Order
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                order.getUser() != null && !order.getUser().getId().equals(currentUserId)) {
            throw new ForbiddenException("Access denied: You cannot pay for another user's order");
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BusinessRuleException("Order " + order.getOrderNumber() + " is already fully paid");
        }

        // 3. Invoice Ownership & Linkage Validation
        Invoice invoice = null;
        BigDecimal paymentAmount = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);

        if (request.getInvoiceId() != null) {
            invoice = invoiceRepository.findById(request.getInvoiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", request.getInvoiceId()));

            if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                    invoice.getRetailer() != null && !invoice.getRetailer().getId().equals(currentUserId)) {
                throw new ForbiddenException("Access denied: Invoice does not belong to you");
            }

            if (invoice.getOrder() == null || !invoice.getOrder().getId().equals(order.getId())) {
                throw new BadRequestException("Invoice does not belong to order " + order.getOrderNumber());
            }

            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new BusinessRuleException("Invoice " + invoice.getInvoiceNumber() + " is already fully paid");
            }

            if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
                throw new BusinessRuleException("Cannot initiate payment for cancelled invoice " + invoice.getInvoiceNumber());
            }

            paymentAmount = invoice.getBalanceAmount().setScale(2, RoundingMode.HALF_UP);
        }

        // 4. Concurrency Guard: Check for existing active attempt for this order
        Optional<PaymentAttempt> activeAttempt = paymentAttemptRepository
                .findFirstByOrderIdAndStatusIn(order.getId(), ACTIVE_STATUSES);
        if (activeAttempt.isPresent()) {
            return new ReservationResult(activeAttempt.get(), ReservationOutcome.EXISTING_ACTIVE, order, invoice, paymentAmount);
        }

        // 5. Observer Health check
        if (!isObserverHealthy) {
            throw new BusinessRuleException("UPI payments are temporarily paused because banking observers are offline. Please choose Cash on Delivery or retry shortly.");
        }

        // 6. Persist Initiation Intent BEFORE calling gateway
        PaymentAttempt newAttempt = new PaymentAttempt(
                order,
                invoice,
                providerName,
                request.getIdempotencyKey(),
                paymentAmount,
                "INR"
        );
        newAttempt.setUser(order.getUser());
        newAttempt.setRequestFingerprint(requestFingerprint);
        newAttempt.setStatus(PaymentAttemptStatus.INITIATED);

        try {
            PaymentAttempt saved = paymentAttemptRepository.saveAndFlush(newAttempt);
            return new ReservationResult(saved, ReservationOutcome.NEW_INTENT, order, invoice, paymentAmount);
        } catch (DataIntegrityViolationException e) {
            log.warn("Database constraint caught concurrent active attempt race on order {}. Raising ConcurrentActiveAttemptException.", order.getId());
            throw new ConcurrentActiveAttemptException(order.getId());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ReservationResult reserveInitiationIntent(
            PaymentInitiateRequest request,
            UUID currentUserId,
            UserRole role,
            PaymentProviderFactory paymentProviderFactory) {

        // 1. Check existing idempotency key first
        Optional<PaymentAttempt> existing = paymentAttemptRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existing.isPresent()) {
            PaymentAttempt attempt = existing.get();

            // IDOR check before revealing any existing payment attempt
            if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                    attempt.getUser() != null && !attempt.getUser().getId().equals(currentUserId)) {
                throw new ForbiddenException("Access denied: Idempotency key belongs to another user");
            }

            // Parameter conflict check: order, invoice, provider must match
            if ((attempt.getOrder() != null && !attempt.getOrder().getId().equals(request.getOrderId())) ||
                    !Objects.equals(attempt.getInvoice() != null ? attempt.getInvoice().getId() : null, request.getInvoiceId()) ||
                    (request.getProvider() != null && attempt.getProvider() != null && !request.getProvider().equalsIgnoreCase(attempt.getProvider()))) {
                throw new ConflictException("Idempotency key reuse conflict: request parameters differ from previous initiation");
            }

            if (attempt.getStatus() == PaymentAttemptStatus.UNCERTAIN_INITIATION) {
                return new ReservationResult(attempt, ReservationOutcome.UNCERTAIN_NEEDS_RECOVERY,
                        attempt.getOrder(), attempt.getInvoice(), attempt.getAmount());
            }

            ReservationOutcome outcome = attempt.getStatus().isActive()
                    ? ReservationOutcome.EXISTING_ACTIVE
                    : ReservationOutcome.EXISTING_TERMINAL;
            return new ReservationResult(attempt, outcome, attempt.getOrder(), attempt.getInvoice(), attempt.getAmount());
        }

        // 2. Fetch and Authorize Order
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                order.getUser() != null && !order.getUser().getId().equals(currentUserId)) {
            throw new ForbiddenException("Access denied: You cannot pay for another user's order");
        }

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BusinessRuleException("Order " + order.getOrderNumber() + " is already fully paid");
        }

        // 3. Invoice Ownership & Linkage Validation
        Invoice invoice = null;
        BigDecimal paymentAmount = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);

        if (request.getInvoiceId() != null) {
            invoice = invoiceRepository.findById(request.getInvoiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", request.getInvoiceId()));

            if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                    invoice.getRetailer() != null && !invoice.getRetailer().getId().equals(currentUserId)) {
                throw new ForbiddenException("Access denied: Invoice does not belong to you");
            }

            if (invoice.getOrder() == null || !invoice.getOrder().getId().equals(order.getId())) {
                throw new BadRequestException("Invoice does not belong to order " + order.getOrderNumber());
            }

            if (invoice.getStatus() == InvoiceStatus.PAID) {
                throw new BusinessRuleException("Invoice " + invoice.getInvoiceNumber() + " is already fully paid");
            }

            if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
                throw new BusinessRuleException("Cannot initiate payment for cancelled invoice " + invoice.getInvoiceNumber());
            }

            paymentAmount = invoice.getBalanceAmount().setScale(2, RoundingMode.HALF_UP);
        }

        // 4. Concurrency Guard: Check for existing active attempt for this order
        Optional<PaymentAttempt> activeAttempt = paymentAttemptRepository
                .findFirstByOrderIdAndStatusIn(order.getId(), ACTIVE_STATUSES);
        if (activeAttempt.isPresent()) {
            return new ReservationResult(activeAttempt.get(), ReservationOutcome.EXISTING_ACTIVE, order, invoice, paymentAmount);
        }

        // 5. Provider lookup and observer health check
        PaymentProvider provider = paymentProviderFactory.getProvider(request.getProvider());
        if (!provider.isObserverHealthy()) {
            throw new BusinessRuleException("UPI payments are temporarily paused because banking observers are offline. Please choose Cash on Delivery or retry shortly.");
        }

        String requestFingerprint = computeFingerprint(order.getId(), invoice != null ? invoice.getId() : null, provider.getProviderName(), paymentAmount);

        // 6. Persist Initiation Intent BEFORE calling gateway
        PaymentAttempt newAttempt = new PaymentAttempt(
                order,
                invoice,
                provider.getProviderName(),
                request.getIdempotencyKey(),
                paymentAmount,
                "INR"
        );
        newAttempt.setUser(order.getUser());
        newAttempt.setRequestFingerprint(requestFingerprint);
        newAttempt.setStatus(PaymentAttemptStatus.INITIATED);

        try {
            PaymentAttempt saved = paymentAttemptRepository.saveAndFlush(newAttempt);
            return new ReservationResult(saved, ReservationOutcome.NEW_INTENT, order, invoice, paymentAmount);
        } catch (DataIntegrityViolationException e) {
            log.warn("Database constraint caught concurrent active attempt race on order {}. Raising ConcurrentActiveAttemptException.", order.getId());
            throw new ConcurrentActiveAttemptException(order.getId());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public PaymentAttempt fetchActiveAttempt(UUID orderId) {
        return paymentAttemptRepository
                .findFirstByOrderIdAndStatusIn(orderId, ACTIVE_STATUSES)
                .orElseThrow(() -> new ConflictException("Concurrent checkout attempt in progress. Please retry."));
    }

    public String computeFingerprint(UUID orderId, UUID invoiceId, String provider, BigDecimal amount) {
        String data = orderId + "|" + (invoiceId != null ? invoiceId : "") + "|" + (provider != null ? provider.toUpperCase() : "") + "|" + amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return data;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markUncertainInitiation(UUID attemptId, String errorReason) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId).orElse(null);
        if (attempt != null) {
            // Do not overwrite if webhook already observed the payment
            if (attempt.getStatus() != PaymentAttemptStatus.OBSERVED_SUCCESS &&
                    attempt.getStatus() != PaymentAttemptStatus.RECONCILED &&
                    attempt.getStatus() != PaymentAttemptStatus.SUCCESS) {
                attempt.setStatus(PaymentAttemptStatus.UNCERTAIN_INITIATION);
                attempt.setRawResponse(errorReason);
                paymentAttemptRepository.save(attempt);
                paymentAttemptRepository.flush();
                log.warn("Payment attempt {} marked UNCERTAIN_INITIATION due to network timeout/error: {}",
                        attemptId, errorReason);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentAttempt completeInitiation(UUID attemptId, PaymentSessionResult sessionResult) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentAttempt", "id", attemptId));

        // Preserve status if a webhook arrived before initiation completed
        if (!attempt.getStatus().isTerminal() &&
                attempt.getStatus() != PaymentAttemptStatus.OBSERVED_SUCCESS &&
                attempt.getStatus() != PaymentAttemptStatus.RECONCILED) {

            attempt.setProviderReference(sessionResult.providerReference());
            attempt.setCheckoutUrl(sessionResult.paymentUrl());
            attempt.setQueuePosition(sessionResult.queuePosition());

            if (sessionResult.queuePosition() > 0 || "QUEUED".equalsIgnoreCase(sessionResult.status())) {
                attempt.setStatus(PaymentAttemptStatus.QUEUED);
            } else {
                attempt.setStatus(PaymentAttemptStatus.AWAITING_PAYMENT);
            }

            if (sessionResult.expiresAt() != null) {
                attempt.setExpiresAt(sessionResult.expiresAt());
            } else {
                attempt.setExpiresAt(Instant.now().plusSeconds(900));
            }

            if (sessionResult.receivingAccount() != null) {
                attempt.setReceivingAccount(sessionResult.receivingAccount());
            }

            try {
                if (sessionResult.metadata() != null) {
                    attempt.setRawResponse(objectMapper.writeValueAsString(sessionResult.metadata()));
                }
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize session metadata", e);
            }

            attempt = paymentAttemptRepository.saveAndFlush(attempt);
        } else {
            log.info("Payment attempt {} already reached {} before initiation completed. Retaining status.",
                    attemptId, attempt.getStatus());
            if (sessionResult.paymentUrl() != null && attempt.getCheckoutUrl() == null) {
                attempt.setCheckoutUrl(sessionResult.paymentUrl());
            }
            if (sessionResult.providerReference() != null && attempt.getProviderReference() == null) {
                attempt.setProviderReference(sessionResult.providerReference());
            }
            attempt = paymentAttemptRepository.saveAndFlush(attempt);
        }

        return attempt;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentAttempt recoverUncertainAttempt(UUID attemptId, PaymentSessionResult sessionResult) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentAttempt", "id", attemptId));

        attempt.setProviderReference(sessionResult.providerReference());
        attempt.setCheckoutUrl(sessionResult.paymentUrl());
        attempt.setQueuePosition(sessionResult.queuePosition());

        if ("SUCCESS".equalsIgnoreCase(sessionResult.status()) || "OBSERVED_SUCCESS".equalsIgnoreCase(sessionResult.status())) {
            attempt.setStatus(PaymentAttemptStatus.OBSERVED_SUCCESS);
        } else if ("RECONCILED".equalsIgnoreCase(sessionResult.status())) {
            attempt.setStatus(PaymentAttemptStatus.RECONCILED);
        } else if ("QUEUED".equalsIgnoreCase(sessionResult.status()) || sessionResult.queuePosition() > 0) {
            attempt.setStatus(PaymentAttemptStatus.QUEUED);
        } else {
            attempt.setStatus(PaymentAttemptStatus.AWAITING_PAYMENT);
        }

        if (sessionResult.expiresAt() != null) {
            attempt.setExpiresAt(sessionResult.expiresAt());
        }

        return paymentAttemptRepository.saveAndFlush(attempt);
    }
}
