package com.bakeconnect.payment.service;

import com.bakeconnect.billing.dto.InvoiceDto;
import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.billing.entity.InvoiceStatus;
import com.bakeconnect.billing.repository.InvoiceRepository;
import com.bakeconnect.billing.service.BillingService;
import com.bakeconnect.common.exception.*;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.*;
import com.bakeconnect.payment.entity.*;
import com.bakeconnect.payment.repository.BankReconciliationRecordRepository;
import com.bakeconnect.payment.repository.PaymentAttemptRepository;
import com.bakeconnect.payment.repository.PaymentRefundRecordRepository;
import com.bakeconnect.payment.repository.WebhookEventInboxRepository;
import com.bakeconnect.payment.spi.PaymentProvider;
import com.bakeconnect.payment.spi.PaymentProviderFactory;
import com.bakeconnect.payment.spi.PaymentSessionRequest;
import com.bakeconnect.payment.spi.PaymentSessionResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentAttemptRepository paymentAttemptRepository;
    private final WebhookEventInboxRepository webhookEventInboxRepository;
    private final WebhookInboxService webhookInboxService;
    private final PaymentInitiationPersistenceService persistenceService;
    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final BillingService billingService;
    private final PaymentProviderFactory paymentProviderFactory;
    private final NotificationOutboxRepository notificationOutboxRepository;
    private final BankReconciliationRecordRepository bankReconciliationRecordRepository;
    private final PaymentRefundRecordRepository paymentRefundRecordRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public PaymentService(PaymentAttemptRepository paymentAttemptRepository,
                          WebhookEventInboxRepository webhookEventInboxRepository,
                          WebhookInboxService webhookInboxService,
                          PaymentInitiationPersistenceService persistenceService,
                          OrderRepository orderRepository,
                          InvoiceRepository invoiceRepository,
                          BillingService billingService,
                          PaymentProviderFactory paymentProviderFactory,
                          NotificationOutboxRepository notificationOutboxRepository,
                          BankReconciliationRecordRepository bankReconciliationRecordRepository,
                          PaymentRefundRecordRepository paymentRefundRecordRepository,
                          UserRepository userRepository,
                          ObjectMapper objectMapper) {
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.webhookEventInboxRepository = webhookEventInboxRepository;
        this.webhookInboxService = webhookInboxService;
        this.persistenceService = persistenceService;
        this.orderRepository = orderRepository;
        this.invoiceRepository = invoiceRepository;
        this.billingService = billingService;
        this.paymentProviderFactory = paymentProviderFactory;
        this.notificationOutboxRepository = notificationOutboxRepository;
        this.bankReconciliationRecordRepository = bankReconciliationRecordRepository;
        this.paymentRefundRecordRepository = paymentRefundRecordRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public PaymentService(PaymentAttemptRepository paymentAttemptRepository,
                          WebhookEventInboxRepository webhookEventInboxRepository,
                          WebhookInboxService webhookInboxService,
                          OrderRepository orderRepository,
                          InvoiceRepository invoiceRepository,
                          BillingService billingService,
                          PaymentProviderFactory paymentProviderFactory,
                          NotificationOutboxRepository notificationOutboxRepository,
                          BankReconciliationRecordRepository bankReconciliationRecordRepository,
                          PaymentRefundRecordRepository paymentRefundRecordRepository,
                          UserRepository userRepository,
                          ObjectMapper objectMapper) {
        this(paymentAttemptRepository, webhookEventInboxRepository, webhookInboxService,
                new PaymentInitiationPersistenceService(paymentAttemptRepository, orderRepository, invoiceRepository, objectMapper),
                orderRepository, invoiceRepository, billingService, paymentProviderFactory,
                notificationOutboxRepository, bankReconciliationRecordRepository,
                paymentRefundRecordRepository, userRepository, objectMapper);
    }

    public PaymentService(PaymentAttemptRepository paymentAttemptRepository,
                          WebhookEventInboxRepository webhookEventInboxRepository,
                          OrderRepository orderRepository,
                          InvoiceRepository invoiceRepository,
                          BillingService billingService,
                          PaymentProviderFactory paymentProviderFactory,
                          NotificationOutboxRepository notificationOutboxRepository,
                          ObjectMapper objectMapper) {
        this(paymentAttemptRepository, webhookEventInboxRepository,
                new WebhookInboxService(webhookEventInboxRepository),
                orderRepository, invoiceRepository, billingService,
                paymentProviderFactory, notificationOutboxRepository,
                null, null, null, objectMapper);
    }

    /**
     * Initiates payment without holding database locks across gateway network calls.
     * Persists initiation intent first, makes bounded network call, and handles timeout recovery.
     */
    public PaymentSessionResponse initiatePayment(PaymentInitiateRequest request, UUID currentUserId, UserRole role) {
        // 1. Transactional reservation: intent is committed before network call
        PaymentInitiationPersistenceService.ReservationResult res;
        try {
            res = persistenceService.reserveInitiationIntent(
                    request, currentUserId, role, paymentProviderFactory);
        } catch (PaymentInitiationPersistenceService.ConcurrentActiveAttemptException e) {
            res = persistenceService.fetchActiveAttempt(e.getOrderId());
        }

        PaymentAttempt attempt = res.attempt();

        if (res.outcome() == PaymentInitiationPersistenceService.ReservationOutcome.EXISTING_ACTIVE ||
                res.outcome() == PaymentInitiationPersistenceService.ReservationOutcome.EXISTING_TERMINAL) {

            return new PaymentSessionResponse(
                    attempt.getId(),
                    attempt.getIdempotencyKey(),
                    attempt.getProvider(),
                    attempt.getProviderReference(),
                    attempt.getCheckoutUrl(), // Real URL, never fake!
                    attempt.getAmount(),
                    attempt.getCurrency(),
                    attempt.getStatus(),
                    attempt.getQueuePosition(),
                    attempt.getExpiresAt(),
                    res.outcome() == PaymentInitiationPersistenceService.ReservationOutcome.EXISTING_ACTIVE
                            ? "An active payment attempt is already in progress for this order"
                            : "Existing payment session returned",
                    attempt.getStatus() == PaymentAttemptStatus.FAILED || attempt.getStatus() == PaymentAttemptStatus.EXPIRED
            );
        }

        PaymentProvider provider = paymentProviderFactory.getProvider(attempt.getProvider());

        if (res.outcome() == PaymentInitiationPersistenceService.ReservationOutcome.UNCERTAIN_NEEDS_RECOVERY) {
            // Recover session from gateway using the stable idempotency key
            try {
                PaymentSessionRequest sessionReq = new PaymentSessionRequest(
                        attempt.getOrder().getId(),
                        res.orderNumber() != null ? res.orderNumber() : attempt.getOrder().getOrderNumber(),
                        attempt.getAmount(),
                        "INR",
                        attempt.getIdempotencyKey(),
                        res.userEmail(),
                        res.userPhone()
                );
                PaymentSessionResult recovered = provider.initiatePaymentSession(sessionReq);
                attempt = persistenceService.recoverUncertainAttempt(attempt.getId(), recovered);
                return new PaymentSessionResponse(
                        attempt.getId(),
                        attempt.getIdempotencyKey(),
                        attempt.getProvider(),
                        attempt.getProviderReference(),
                        attempt.getCheckoutUrl(),
                        attempt.getAmount(),
                        attempt.getCurrency(),
                        attempt.getStatus(),
                        attempt.getQueuePosition(),
                        attempt.getExpiresAt(),
                        "Payment session recovered from payment gateway",
                        false
                );
            } catch (Exception e) {
                log.warn("Recovery lookup for uncertain attempt {} failed: {}", attempt.getId(), e.getMessage());
                return new PaymentSessionResponse(
                        attempt.getId(),
                        attempt.getIdempotencyKey(),
                        attempt.getProvider(),
                        attempt.getProviderReference(),
                        null,
                        attempt.getAmount(),
                        attempt.getCurrency(),
                        PaymentAttemptStatus.UNCERTAIN_INITIATION,
                        0,
                        attempt.getExpiresAt(),
                        "Payment initiation previously timed out and outcome is uncertain. Please retry shortly.",
                        true
                );
            }
        }

        // 2. Make bounded gateway network call — ZERO DATABASE LOCKS HELD!
        PaymentSessionRequest sessionReq = new PaymentSessionRequest(
                res.order().getId(),
                res.orderNumber() != null ? res.orderNumber() : res.order().getOrderNumber(),
                res.paymentAmount(),
                "INR",
                request.getIdempotencyKey(),
                res.userEmail(),
                res.userPhone()
        );

        PaymentSessionResult sessionResult;
        try {
            sessionResult = provider.initiatePaymentSession(sessionReq);
        } catch (Exception e) {
            log.error("Payment provider initiation failed for attempt {}", attempt.getId(), e);
            persistenceService.markUncertainInitiation(attempt.getId(), e.getMessage());
            throw e;
        }

        // 3. Post-network state completion in isolated transaction
        PaymentAttempt completedAttempt = persistenceService.completeInitiation(attempt.getId(), sessionResult);

        return new PaymentSessionResponse(
                completedAttempt.getId(),
                completedAttempt.getIdempotencyKey(),
                completedAttempt.getProvider(),
                completedAttempt.getProviderReference(),
                sessionResult.paymentUrl(),
                completedAttempt.getAmount(),
                completedAttempt.getCurrency(),
                completedAttempt.getStatus(),
                completedAttempt.getQueuePosition(),
                completedAttempt.getExpiresAt(),
                completedAttempt.getStatus() == PaymentAttemptStatus.QUEUED
                        ? "Payment session queued (Position " + completedAttempt.getQueuePosition() + "). Please wait for your turn."
                        : "Payment session active. Please complete payment within the time limit.",
                false
        );
    }

    @Transactional(readOnly = true)
    public PaymentAttemptDto getPaymentAttempt(UUID attemptId, UUID currentUserId, UserRole role) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentAttempt", "id", attemptId));

        if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                !attempt.getOrder().getUser().getId().equals(currentUserId)) {
            throw new ForbiddenException("Access denied: You cannot view payment attempts for another user's order");
        }

        return PaymentAttemptDto.fromEntity(attempt);
    }

    @Transactional(readOnly = true)
    public List<PaymentAttemptDto> getPaymentAttemptsByOrder(UUID orderId, UUID currentUserId, UserRole role) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (role != UserRole.BAKERY_ADMIN && role != UserRole.BAKERY_MANAGER &&
                !order.getUser().getId().equals(currentUserId)) {
            throw new ForbiddenException("Access denied: You cannot view payment attempts for another user's order");
        }

        return paymentAttemptRepository.findByOrderId(orderId).stream()
                .map(PaymentAttemptDto::fromEntity)
                .toList();
    }

    @Transactional
    public void processWebhook(String providerName, String deliveryId, String signatureHeader, byte[] rawPayload) {
        processWebhook(providerName, deliveryId, signatureHeader, null, null, rawPayload);
    }

    @Transactional
    public void processWebhook(String providerName, String deliveryId, String signatureHeader,
                               String signatureV2Header, String timestampHeader, byte[] rawPayload) {
        if (rawPayload != null && rawPayload.length > 65536) {
            throw new BadRequestException("Payload exceeds maximum permitted size of 64KB");
        }

        byte[] payloadBytes = (rawPayload != null) ? rawPayload : new byte[0];
        String rawPayloadStr = new String(payloadBytes, StandardCharsets.UTF_8);
        String payloadHash = calculateSha256(payloadBytes);

        String effectiveDeliveryId = (deliveryId != null && !deliveryId.isBlank())
                ? deliveryId
                : "DEL-" + UUID.randomUUID();

        // 1. Duplicate & Conflict Check (REQUIRES_NEW transaction)
        WebhookInboxService.DuplicateCheckResult dupCheck = webhookInboxService.checkDuplicate(effectiveDeliveryId, payloadHash);
        if (dupCheck.status() == WebhookInboxService.DuplicateStatus.CONFLICTING_PAYLOAD) {
            log.error("FRAUD CONFLICT: Duplicate delivery ID {} with different payload hash", effectiveDeliveryId);
            throw new ConflictException("Duplicate delivery ID carrying conflicting payload hash");
        }
        if (dupCheck.status() == WebhookInboxService.DuplicateStatus.IDEMPOTENT_DUPLICATE) {
            log.info("Webhook duplicate delivery ID {} ignored idempotently", effectiveDeliveryId);
            return;
        }

        PaymentProvider provider = paymentProviderFactory.getProvider(providerName);

        // 2. Raw-byte HMAC signature verification BEFORE deserialization
        boolean signatureValid = false;
        if (signatureV2Header != null && timestampHeader != null) {
            signatureValid = provider.verifyWebhookSignatureV2(payloadBytes, signatureV2Header, timestampHeader);
        }
        if (!signatureValid && signatureHeader != null) {
            signatureValid = provider.verifyWebhookSignature(payloadBytes, signatureHeader);
        }

        if (!signatureValid) {
            webhookInboxService.recordIncoming(
                    provider.getProviderName(),
                    effectiveDeliveryId,
                    "UNKNOWN",
                    rawPayloadStr,
                    signatureHeader != null ? signatureHeader : signatureV2Header,
                    payloadHash,
                    WebhookVerificationStatus.FAILED,
                    WebhookProcessingStatus.FAILED
            );
            log.warn("Rejected webhook from {}: Invalid HMAC signature on raw bytes", providerName);
            throw new UnauthorizedException("Invalid webhook signature");
        }

        // Persist verified incoming webhook in inbox (durable in REQUIRES_NEW)
        WebhookEventInbox inbox = webhookInboxService.recordIncoming(
                provider.getProviderName(),
                effectiveDeliveryId,
                "PARSING",
                rawPayloadStr,
                signatureHeader != null ? signatureHeader : signatureV2Header,
                payloadHash,
                WebhookVerificationStatus.VERIFIED,
                WebhookProcessingStatus.RECEIVED
        );
        UUID inboxId = inbox != null ? inbox.getId() : null;

        // 3. Deserialization
        WebhookPayloadDto payload;
        try {
            payload = objectMapper.readValue(payloadBytes, WebhookPayloadDto.class);
        } catch (Exception e) {
            log.error("Failed to parse verified webhook payload from {}", providerName, e);
            webhookInboxService.markFailed(inboxId, "JSON parse error: " + e.getMessage());
            throw new BadRequestException("Malformed JSON payload in webhook");
        }

        // 4. Mandatory Amount and Currency Verification
        if (payload.getAmount() == null || payload.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            webhookInboxService.markFailed(inboxId, "Amount is missing or non-positive");
            throw new BadRequestException("Tampered payment payload: amount is required and must be positive");
        }

        if (payload.getCurrency() == null || !"INR".equalsIgnoreCase(payload.getCurrency().trim())) {
            webhookInboxService.markFailed(inboxId, "Currency is missing or not INR: " + payload.getCurrency());
            throw new BadRequestException("Tampered payment payload: currency must be INR");
        }

        // 5. Payment Attempt matching
        Optional<PaymentAttempt> attemptOpt = findMatchingAttempt(payload);

        if (attemptOpt.isEmpty()) {
            log.warn("No payment attempt found for webhook delivery ID: {}", effectiveDeliveryId);
            webhookInboxService.markIgnored(inboxId, "No matching payment attempt found");
            return;
        }

        PaymentAttempt attempt = attemptOpt.get();

        // Exact amount check
        BigDecimal payloadAmount = payload.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (payloadAmount.compareTo(attempt.getAmount()) != 0) {
            String error = String.format("Payment amount mismatch: expected %s, got %s",
                    attempt.getAmount(), payloadAmount);
            log.error("Fraud alert on delivery {}: {}", effectiveDeliveryId, error);
            webhookInboxService.markFailed(inboxId, error);
            throw new BadRequestException("Tampered payment payload: amount mismatch");
        }

        // Account-scoped UTR deduplication check
        if (payload.getUtr() != null && !payload.getUtr().isBlank() && attempt.getReceivingAccount() != null) {
            Optional<PaymentAttempt> existingUtr = paymentAttemptRepository
                    .findByReceivingAccountAndUtr(attempt.getReceivingAccount(), payload.getUtr().trim());
            if (existingUtr.isPresent() && !existingUtr.get().getId().equals(attempt.getId())) {
                log.error("Fraud alert: Duplicate UTR {} already used on attempt {}",
                        payload.getUtr(), existingUtr.get().getId());
                webhookInboxService.markConflict(inboxId, "Duplicate transaction reference UTR: " + payload.getUtr());
                throw new ConflictException("Duplicate transaction reference UTR: " + payload.getUtr());
            }
        }

        // 6. Explicit State Transitions
        String event = (payload.getEvent() != null && !payload.getEvent().isBlank())
                ? payload.getEvent().toUpperCase().trim()
                : "UNKNOWN";

        processEventTransition(attempt, payload, event, effectiveDeliveryId, inboxId, provider);
    }

    @Transactional
    public void processRawInboxEvent(UUID inboxId) {
        WebhookEventInbox inbox = webhookEventInboxRepository.findById(inboxId).orElse(null);
        if (inbox == null) {
            log.warn("Webhook inbox record {} not found for asynchronous processing", inboxId);
            return;
        }
        if (inbox.getProcessingStatus() == WebhookProcessingStatus.PROCESSED ||
                inbox.getProcessingStatus() == WebhookProcessingStatus.DEAD_LETTER) {
            return;
        }

        PaymentProvider provider;
        try {
            provider = paymentProviderFactory.getProvider(inbox.getProvider());
        } catch (Exception e) {
            log.error("Unknown provider '{}' for inbox item {}", inbox.getProvider(), inboxId);
            webhookInboxService.markFailed(inboxId, "Unknown provider: " + inbox.getProvider());
            return;
        }

        byte[] payloadBytes = inbox.getRawPayload().getBytes(StandardCharsets.UTF_8);
        WebhookPayloadDto payload;
        try {
            payload = objectMapper.readValue(payloadBytes, WebhookPayloadDto.class);
        } catch (Exception e) {
            log.error("Failed to parse stored webhook payload for inbox {}", inboxId, e);
            webhookInboxService.markFailed(inboxId, "JSON parse error: " + e.getMessage());
            return;
        }

        if (payload.getAmount() == null || payload.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            webhookInboxService.markFailed(inboxId, "Amount is missing or non-positive");
            return;
        }
        if (payload.getCurrency() == null || !"INR".equalsIgnoreCase(payload.getCurrency().trim())) {
            webhookInboxService.markFailed(inboxId, "Currency is missing or not INR: " + payload.getCurrency());
            return;
        }

        Optional<PaymentAttempt> attemptOpt = findMatchingAttempt(payload);
        if (attemptOpt.isEmpty()) {
            log.warn("No payment attempt found for webhook inbox ID: {}", inboxId);
            webhookInboxService.markIgnored(inboxId, "No matching payment attempt found");
            return;
        }

        PaymentAttempt attempt = attemptOpt.get();
        BigDecimal payloadAmount = payload.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (payloadAmount.compareTo(attempt.getAmount()) != 0) {
            String error = String.format("Payment amount mismatch: expected %s, got %s",
                    attempt.getAmount(), payloadAmount);
            log.error("Fraud alert on inbox item {}: {}", inboxId, error);
            webhookInboxService.markFailed(inboxId, error);
            return;
        }

        if (payload.getUtr() != null && !payload.getUtr().isBlank() && attempt.getReceivingAccount() != null) {
            Optional<PaymentAttempt> existingUtr = paymentAttemptRepository
                    .findByReceivingAccountAndUtr(attempt.getReceivingAccount(), payload.getUtr().trim());
            if (existingUtr.isPresent() && !existingUtr.get().getId().equals(attempt.getId())) {
                log.error("Fraud alert: Duplicate UTR {} already used on attempt {}",
                        payload.getUtr(), existingUtr.get().getId());
                webhookInboxService.markConflict(inboxId, "Duplicate transaction reference UTR: " + payload.getUtr());
                return;
            }
        }

        String event = (payload.getEvent() != null && !payload.getEvent().isBlank())
                ? payload.getEvent().toUpperCase().trim()
                : "UNKNOWN";

        processEventTransition(attempt, payload, event, inbox.getDeliveryId(), inboxId, provider);
    }

    private Optional<PaymentAttempt> findMatchingAttempt(WebhookPayloadDto payload) {
        Optional<PaymentAttempt> attemptOpt = Optional.empty();
        if (payload.getPaymentId() != null && !payload.getPaymentId().isBlank()) {
            attemptOpt = paymentAttemptRepository.findByProviderReference(payload.getPaymentId());
        }
        if (attemptOpt.isEmpty() && payload.getAttemptId() != null && !payload.getAttemptId().isBlank()) {
            try {
                UUID attemptUuid = UUID.fromString(payload.getAttemptId());
                attemptOpt = paymentAttemptRepository.findById(attemptUuid);
            } catch (IllegalArgumentException ignored) {
                attemptOpt = paymentAttemptRepository.findByIdempotencyKey(payload.getAttemptId());
            }
        }
        if (attemptOpt.isEmpty() && payload.getIdempotencyKey() != null && !payload.getIdempotencyKey().isBlank()) {
            attemptOpt = paymentAttemptRepository.findByIdempotencyKey(payload.getIdempotencyKey());
        }
        if (attemptOpt.isEmpty() && payload.getOrderId() != null && !payload.getOrderId().isBlank()) {
            Optional<Order> orderOpt = orderRepository.findByOrderNumber(payload.getOrderId());
            if (orderOpt.isPresent()) {
                List<PaymentAttempt> attempts = paymentAttemptRepository.findByOrderId(orderOpt.get().getId());
                if (!attempts.isEmpty()) {
                    attemptOpt = Optional.of(attempts.get(attempts.size() - 1));
                }
            }
        }
        return attemptOpt;
    }

    private void processEventTransition(PaymentAttempt attempt, WebhookPayloadDto payload,
                                        String event, String deliveryId, UUID inboxId,
                                        PaymentProvider provider) {
        Order order = attempt.getOrder();

        // Late credit guard: If session expired or order was cancelled, money received
        // must NOT revive order or confirm inventory without staff verification!
        boolean isLateCredit = (attempt.getStatus() == PaymentAttemptStatus.EXPIRED ||
                attempt.getStatus() == PaymentAttemptStatus.CANCELLED ||
                order.getStatus() == OrderStatus.CANCELLED);

        if (isLateCredit && (
                "OBSERVED_SUCCESS".equals(event) ||
                "RECONCILED".equals(event) ||
                "SUCCESS".equals(event) ||
                "PAYMENT_SUCCESS".equals(event))) {
            log.warn("Late credit alert arrived for expired/cancelled attempt {} on order {}. Routing to MANUAL_REVIEW.",
                    attempt.getId(), order.getId());
            attempt.setStatus(PaymentAttemptStatus.MANUAL_REVIEW);
            if ("RECONCILED".equals(event)) {
                attempt.setSettlementStatus(PaymentSettlementStatus.RECONCILED);
            }
            if (payload.getUtr() != null && !payload.getUtr().isBlank()) {
                attempt.setUtr(payload.getUtr().trim());
            }
            if (payload.getVerificationLevel() != null) {
                attempt.setVerificationLevel(payload.getVerificationLevel());
            }
            paymentAttemptRepository.save(attempt);

            OrderStatusHistory history = new OrderStatusHistory(
                    order.getStatus(),
                    order.getStatus(),
                    "LATE_CREDIT_FLAGGED_FOR_REFUND",
                    "Late credit received for cancelled/expired order (UTR: " + (attempt.getUtr() != null ? attempt.getUtr() : "pending") + "). Flagged for manual review / refund to prevent overselling.",
                    order.getUser().getId(),
                    "PAYMENT_GATEWAY"
            );
            order.addStatusHistory(history);
            orderRepository.save(order);

            if (paymentRefundRecordRepository != null) {
                PaymentRefundRecord refundRecord = new PaymentRefundRecord(
                        attempt,
                        order,
                        attempt.getAmount(),
                        attempt.getCurrency(),
                        "Late credit received after order cancellation/expiry; flagged for refund",
                        attempt.getUtr(),
                        order.getUser()
                );
                paymentRefundRecordRepository.save(refundRecord);
            }

            webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), "LATE_CREDIT_MANUAL_REVIEW");
            return;
        }

        switch (event) {
            case "OBSERVED_SUCCESS" -> {
                // Do not downgrade if already RECONCILED
                if (attempt.getStatus() == PaymentAttemptStatus.RECONCILED) {
                    log.info("Ignoring OBSERVED_SUCCESS on already RECONCILED attempt {}", attempt.getId());
                    webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                    return;
                }

                attempt.setStatus(PaymentAttemptStatus.OBSERVED_SUCCESS);
                attempt.setSettlementStatus(PaymentSettlementStatus.NOT_RECONCILED);
                if (payload.getUtr() != null && !payload.getUtr().isBlank()) {
                    attempt.setUtr(payload.getUtr().trim());
                }
                if (payload.getVerificationLevel() != null) {
                    attempt.setVerificationLevel(payload.getVerificationLevel());
                }
                paymentAttemptRepository.save(attempt);

                // Auto-create wholesale invoice for B2B if not present
                if (order.getOrderType() == OrderType.BUSINESS && attempt.getInvoice() == null) {
                    InvoiceDto createdInvoice = billingService.createInvoiceForOrder(order);
                    invoiceRepository.findById(createdInvoice.getId()).ifPresent(attempt::setInvoice);
                    paymentAttemptRepository.save(attempt);
                }

                order.setPaymentStatus(PaymentStatus.AUTHORIZED);
                OrderStatusHistory history = new OrderStatusHistory(
                        order.getStatus(),
                        order.getStatus(),
                        "PAYMENT_OBSERVED",
                        "Payment observed via UPI SMS (UTR: " + (attempt.getUtr() != null ? attempt.getUtr() : "pending") + "). Awaiting official statement reconciliation.",
                        order.getUser().getId(),
                        "PAYMENT_OBSERVER"
                );
                order.addStatusHistory(history);
                orderRepository.save(order);

                webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                log.info("Payment attempt {} marked OBSERVED_SUCCESS via delivery {}", attempt.getId(), deliveryId);
            }

            case "RECONCILED" -> {
                // If already RECONCILED: skip duplicate financial posting
                if (attempt.getStatus() == PaymentAttemptStatus.RECONCILED &&
                        order.getPaymentStatus() == PaymentStatus.PAID) {
                    log.info("Attempt {} already RECONCILED. Skipping duplicate financial posting.", attempt.getId());
                    webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                    return;
                }

                attempt.setStatus(PaymentAttemptStatus.RECONCILED);
                attempt.setSettlementStatus(PaymentSettlementStatus.RECONCILED);
                if (payload.getUtr() != null && !payload.getUtr().isBlank()) {
                    attempt.setUtr(payload.getUtr().trim());
                }
                if (payload.getProviderReference() != null && attempt.getProviderReference() == null) {
                    attempt.setProviderReference(payload.getProviderReference());
                }
                paymentAttemptRepository.save(attempt);

                order.setPaymentStatus(PaymentStatus.PAID);
                if (order.getStatus() == OrderStatus.PENDING_REVIEW || order.getStatus() == OrderStatus.AWAITING_PAYMENT) {
                    order.setStatus(OrderStatus.CONFIRMED);
                    order.setConfirmedAt(Instant.now());
                }

                OrderStatusHistory history = new OrderStatusHistory(
                        OrderStatus.PENDING_REVIEW,
                        order.getStatus(),
                        "PAYMENT_RECONCILED_STATEMENT",
                        "Statement reconciliation confirmed via " + provider.getProviderName() + " (" + (attempt.getUtr() != null ? attempt.getUtr() : attempt.getProviderReference()) + ")",
                        order.getUser().getId(),
                        "BANK_RECONCILIATION"
                );
                order.addStatusHistory(history);
                orderRepository.save(order);

                // Reconcile Invoice if wholesale (B2B) or invoice is present
                Invoice invoice = attempt.getInvoice();
                if (invoice == null && order.getOrderType() == OrderType.BUSINESS) {
                    InvoiceDto created = billingService.createInvoiceForOrder(order);
                    invoice = invoiceRepository.findById(created.getId()).orElse(null);
                    attempt.setInvoice(invoice);
                    paymentAttemptRepository.save(attempt);
                }

                if (invoice != null && invoice.getStatus() != InvoiceStatus.PAID) {
                    billingService.recordPayment(
                            invoice.getId(),
                            attempt.getAmount(),
                            attempt.getUtr() != null ? attempt.getUtr() : attempt.getProviderReference(),
                            "Settled via statement reconciliation webhook from " + provider.getProviderName(),
                            order.getUser().getId()
                    );
                }

                // Enqueue notification outbox
                enqueueNotification(
                        order.getUser().getEmail(),
                        "Payment Confirmed for Order " + order.getOrderNumber(),
                        "PAYMENT_SUCCESS",
                        Map.of(
                                "orderNumber", order.getOrderNumber(),
                                "amount", attempt.getAmount().toString(),
                                "reference", attempt.getProviderReference() != null ? attempt.getProviderReference() : "N/A"
                        )
                );

                webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                log.info("Payment attempt {} marked RECONCILED via delivery {}", attempt.getId(), deliveryId);
            }

            case "SUCCESS", "PAYMENT_SUCCESS" -> {
                // If already RECONCILED: skip duplicate financial posting
                if (attempt.getStatus() == PaymentAttemptStatus.RECONCILED) {
                    log.info("Ignoring SUCCESS on already RECONCILED attempt {}", attempt.getId());
                    webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                    return;
                }

                attempt.setStatus(PaymentAttemptStatus.SUCCESS);
                attempt.setSettlementStatus(PaymentSettlementStatus.NOT_BANK_SETTLEMENT);
                if (payload.getUtr() != null && !payload.getUtr().isBlank()) {
                    attempt.setUtr(payload.getUtr().trim());
                }
                if (payload.getProviderReference() != null && attempt.getProviderReference() == null) {
                    attempt.setProviderReference(payload.getProviderReference());
                }
                paymentAttemptRepository.save(attempt);

                order.setPaymentStatus(PaymentStatus.PAID);
                if (order.getStatus() == OrderStatus.PENDING_REVIEW || order.getStatus() == OrderStatus.AWAITING_PAYMENT) {
                    order.setStatus(OrderStatus.CONFIRMED);
                    order.setConfirmedAt(Instant.now());
                }

                OrderStatusHistory history = new OrderStatusHistory(
                        OrderStatus.PENDING_REVIEW,
                        order.getStatus(),
                        "PAYMENT_CONFIRMED",
                        "Payment confirmed via " + provider.getProviderName() + " (" + (attempt.getUtr() != null ? attempt.getUtr() : attempt.getProviderReference()) + ")",
                        order.getUser().getId(),
                        "PAYMENT_GATEWAY"
                );
                order.addStatusHistory(history);
                orderRepository.save(order);

                Invoice invoice = attempt.getInvoice();
                if (invoice == null && order.getOrderType() == OrderType.BUSINESS) {
                    InvoiceDto created = billingService.createInvoiceForOrder(order);
                    invoice = invoiceRepository.findById(created.getId()).orElse(null);
                    attempt.setInvoice(invoice);
                    paymentAttemptRepository.save(attempt);
                }

                if (invoice != null && invoice.getStatus() != InvoiceStatus.PAID) {
                    billingService.recordPayment(
                            invoice.getId(),
                            attempt.getAmount(),
                            attempt.getUtr() != null ? attempt.getUtr() : attempt.getProviderReference(),
                            "Settled via webhook from " + provider.getProviderName(),
                            order.getUser().getId()
                    );
                }

                enqueueNotification(
                        order.getUser().getEmail(),
                        "Payment Confirmed for Order " + order.getOrderNumber(),
                        "PAYMENT_SUCCESS",
                        Map.of(
                                "orderNumber", order.getOrderNumber(),
                                "amount", attempt.getAmount().toString(),
                                "reference", attempt.getProviderReference() != null ? attempt.getProviderReference() : "N/A"
                        )
                );

                webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                log.info("Payment attempt {} marked SUCCESS via delivery {}", attempt.getId(), deliveryId);
            }

            case "MANUAL_REVIEW" -> {
                attempt.setStatus(PaymentAttemptStatus.MANUAL_REVIEW);
                paymentAttemptRepository.save(attempt);

                OrderStatusHistory history = new OrderStatusHistory(
                        order.getStatus(),
                        order.getStatus(),
                        "PAYMENT_FLAGGED",
                        "Payment flagged for manual review by bakery staff",
                        order.getUser().getId(),
                        "PAYMENT_GATEWAY"
                );
                order.addStatusHistory(history);
                orderRepository.save(order);

                webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                log.warn("Payment attempt {} marked MANUAL_REVIEW via delivery {}", attempt.getId(), deliveryId);
            }

            case "FAILED" -> {
                // Do NOT downgrade reconciled, observed, or successful payments!
                if (attempt.getStatus() == PaymentAttemptStatus.RECONCILED ||
                        attempt.getStatus() == PaymentAttemptStatus.OBSERVED_SUCCESS ||
                        attempt.getStatus() == PaymentAttemptStatus.SUCCESS) {
                    log.warn("Ignoring late FAILED webhook for already settled/observed attempt {}", attempt.getId());
                    webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                    return;
                }

                attempt.setStatus(PaymentAttemptStatus.FAILED);
                paymentAttemptRepository.save(attempt);

                webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
                log.warn("Payment attempt {} marked FAILED via delivery {}", attempt.getId(), deliveryId);
            }

            case "EXPIRED", "CANCELLED" -> {
                if (attempt.getStatus() == PaymentAttemptStatus.RECONCILED ||
                        attempt.getStatus() == PaymentAttemptStatus.OBSERVED_SUCCESS ||
                        attempt.getStatus() == PaymentAttemptStatus.SUCCESS) {
                    log.warn("Late credit alert arrived for expired/cancelled attempt {}. Routing to MANUAL_REVIEW.", attempt.getId());
                    attempt.setStatus(PaymentAttemptStatus.MANUAL_REVIEW);
                    paymentAttemptRepository.save(attempt);
                    webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), "LATE_CREDIT_REVIEW");
                    return;
                }

                attempt.setStatus("EXPIRED".equals(event) ? PaymentAttemptStatus.EXPIRED : PaymentAttemptStatus.CANCELLED);
                paymentAttemptRepository.save(attempt);
                webhookInboxService.markProcessed(inboxId, order.getId(), attempt.getId(), event);
            }

            default -> {
                log.warn("Unknown webhook event '{}' received on delivery {}. Retaining for investigation.", event, deliveryId);
                webhookInboxService.markUnderInvestigation(inboxId, "Unrecognized event: " + event);
            }
        }
    }

    private String computeFingerprint(UUID orderId, UUID invoiceId, String provider, BigDecimal amount) {
        String data = orderId + "|" + (invoiceId != null ? invoiceId : "") + "|" + provider.toUpperCase() + "|" + amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return data;
        }
    }

    private String calculateSha256(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(data));
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    private void enqueueNotification(String email, String subject, String templateName, Map<String, Object> data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            NotificationOutbox outbox = new NotificationOutbox(email, subject, templateName, json);
            notificationOutboxRepository.save(outbox);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize payment notification", e);
        }
    }

    @Transactional(readOnly = true)
    public Page<PaymentAttemptDto> getPaymentAttempts(PaymentAttemptStatus status, String provider, Pageable pageable) {
        return paymentAttemptRepository.findWithFilters(status, provider, pageable)
                .map(PaymentAttemptDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public PaymentFinancialMetricsDto getPaymentMetrics() {
        BigDecimal reconciled = paymentAttemptRepository.sumReconciledAmount();
        BigDecimal observedUnreconciled = paymentAttemptRepository.sumObservedUnreconciledAmount();
        long observedSuccess = paymentAttemptRepository.countByStatus(PaymentAttemptStatus.OBSERVED_SUCCESS);
        long reconciledCount = paymentAttemptRepository.countByStatus(PaymentAttemptStatus.RECONCILED);
        long manualReview = paymentAttemptRepository.countByStatus(PaymentAttemptStatus.MANUAL_REVIEW);
        long failed = paymentAttemptRepository.countByStatus(PaymentAttemptStatus.FAILED);
        long total = paymentAttemptRepository.count();

        return new PaymentFinancialMetricsDto(
                reconciled != null ? reconciled : BigDecimal.ZERO,
                observedUnreconciled != null ? observedUnreconciled : BigDecimal.ZERO,
                observedSuccess,
                reconciledCount,
                manualReview,
                failed,
                total
        );
    }

    @Transactional
    public BankReconciliationDto reconcilePayment(BankReconciliationRequest request, UUID managerId) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(request.paymentAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("PaymentAttempt", "id", request.paymentAttemptId()));

        User manager = userRepository != null ? userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", managerId)) : null;

        Order order = attempt.getOrder();

        if (request.amount().compareTo(attempt.getAmount()) != 0) {
            throw new BadRequestException(String.format("Reconciliation amount %s does not match attempt amount %s",
                    request.amount(), attempt.getAmount()));
        }

        if (bankReconciliationRecordRepository != null) {
            bankReconciliationRecordRepository.findByBankReferenceNumber(request.bankReferenceNumber().trim())
                    .ifPresent(existing -> {
                        throw new ConflictException("Bank reference number " + request.bankReferenceNumber() + " was already reconciled");
                    });
        }

        attempt.setStatus(PaymentAttemptStatus.RECONCILED);
        attempt.setSettlementStatus(PaymentSettlementStatus.RECONCILED);
        attempt.setUtr(request.bankReferenceNumber().trim());
        paymentAttemptRepository.save(attempt);

        if (order != null) {
            order.setPaymentStatus(PaymentStatus.PAID);
            if (order.getStatus() == OrderStatus.PENDING_REVIEW || order.getStatus() == OrderStatus.AWAITING_PAYMENT) {
                order.setStatus(OrderStatus.CONFIRMED);
                order.setConfirmedAt(Instant.now());
            }

            OrderStatusHistory history = new OrderStatusHistory(
                    order.getStatus(),
                    order.getStatus(),
                    "PAYMENT_RECONCILED_STATEMENT",
                    String.format("Payment reconciled with bank statement (Ref: %s, Account: %s)",
                            request.bankReferenceNumber(), request.receivingAccount()),
                    manager != null ? manager.getId() : order.getUser().getId(),
                    manager != null ? manager.getRole().name() : "STAFF"
            );
            order.addStatusHistory(history);
            orderRepository.save(order);

            Invoice invoice = attempt.getInvoice();
            if (invoice == null && order.getOrderType() == OrderType.BUSINESS) {
                InvoiceDto created = billingService.createInvoiceForOrder(order);
                invoice = invoiceRepository.findById(created.getId()).orElse(null);
                attempt.setInvoice(invoice);
                paymentAttemptRepository.save(attempt);
            }
            if (invoice != null && invoice.getStatus() != InvoiceStatus.PAID) {
                billingService.recordPayment(
                        invoice.getId(),
                        attempt.getAmount(),
                        request.bankReferenceNumber().trim(),
                        "Reconciled via bank statement by manager " + (manager != null ? manager.getEmail() : "staff"),
                        manager != null ? manager.getId() : order.getUser().getId()
                );
            }
        }

        BankReconciliationRecord record = new BankReconciliationRecord(
                attempt,
                request.bankReferenceNumber().trim(),
                request.receivingAccount().trim(),
                request.amount(),
                manager,
                request.statementDate() != null ? request.statementDate() : LocalDate.now(),
                request.notes()
        );
        BankReconciliationRecord saved = (bankReconciliationRecordRepository != null)
                ? bankReconciliationRecordRepository.save(record)
                : record;

        return BankReconciliationDto.fromEntity(saved);
    }

    @Transactional
    public PaymentRefundDto recordRefund(RecordRefundRequest request, UUID managerId) {
        PaymentAttempt attempt = paymentAttemptRepository.findById(request.paymentAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("PaymentAttempt", "id", request.paymentAttemptId()));

        User manager = userRepository != null ? userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", managerId)) : null;

        if (attempt.getStatus() != PaymentAttemptStatus.RECONCILED &&
                attempt.getStatus() != PaymentAttemptStatus.OBSERVED_SUCCESS &&
                attempt.getStatus() != PaymentAttemptStatus.SUCCESS &&
                attempt.getStatus() != PaymentAttemptStatus.MANUAL_REVIEW) {
            throw new BusinessRuleException("Cannot refund payment attempt in status: " + attempt.getStatus());
        }

        if (request.amount().compareTo(attempt.getAmount()) > 0) {
            throw new BadRequestException("Refund amount cannot exceed attempt amount " + attempt.getAmount());
        }

        Order order = attempt.getOrder();
        if (order != null) {
            OrderStatusHistory history = new OrderStatusHistory(
                    order.getStatus(),
                    order.getStatus(),
                    "PAYMENT_REFUND_RECORDED",
                    String.format("Payment refund of ₹%s recorded (Reason: %s, Ref: %s)",
                            request.amount(), request.reason(), request.referenceNumber() != null ? request.referenceNumber() : "N/A"),
                    manager != null ? manager.getId() : order.getUser().getId(),
                    manager != null ? manager.getRole().name() : "STAFF"
            );
            order.addStatusHistory(history);
            orderRepository.save(order);
        }

        attempt.setSettlementStatus(PaymentSettlementStatus.REFUNDED);
        paymentAttemptRepository.save(attempt);

        PaymentRefundRecord refundRecord = new PaymentRefundRecord(
                attempt,
                order,
                request.amount(),
                attempt.getCurrency(),
                request.reason(),
                request.referenceNumber(),
                manager
        );
        PaymentRefundRecord saved = (paymentRefundRecordRepository != null)
                ? paymentRefundRecordRepository.save(refundRecord)
                : refundRecord;

        return PaymentRefundDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<PaymentRefundDto> getRefunds(Pageable pageable) {
        if (paymentRefundRecordRepository == null) return Page.empty();
        return paymentRefundRecordRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(PaymentRefundDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<WebhookEventInboxDto> getWebhookEvents(WebhookProcessingStatus status, Pageable pageable) {
        if (status != null) {
            return webhookEventInboxRepository.findByProcessingStatus(status, pageable)
                    .map(WebhookEventInboxDto::fromEntity);
        }
        return webhookEventInboxRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(WebhookEventInboxDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public ObserverHealthDto getObserverHealth() {
        try {
            PaymentProvider provider = paymentProviderFactory.getProvider("YOUPI_PG");
            boolean healthy = provider.isObserverHealthy();
            return new ObserverHealthDto("YOUPI_PG", healthy,
                    healthy ? "Android SMS observer is active and reporting healthy status."
                            : "Android SMS observer is inactive, unreachable, or reporting unhealthy status.");
        } catch (Exception e) {
            return new ObserverHealthDto("YOUPI_PG", false, "Error probing observer health: " + e.getMessage());
        }
    }
}
