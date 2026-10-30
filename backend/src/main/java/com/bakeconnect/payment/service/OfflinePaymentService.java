package com.bakeconnect.payment.service;

import com.bakeconnect.billing.service.BillingService;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.OrderStatusHistory;
import com.bakeconnect.ordering.entity.PaymentStatus;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.OfflinePaymentDto;
import com.bakeconnect.payment.dto.RecordOfflinePaymentRequest;
import com.bakeconnect.payment.entity.OfflinePayment;
import com.bakeconnect.payment.repository.OfflinePaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
public class OfflinePaymentService {

    private static final Logger log = LoggerFactory.getLogger(OfflinePaymentService.class);

    private final OfflinePaymentRepository offlinePaymentRepository;
    private final OrderRepository orderRepository;
    private final BillingService billingService;
    private final UserRepository userRepository;

    public OfflinePaymentService(
            OfflinePaymentRepository offlinePaymentRepository,
            OrderRepository orderRepository,
            BillingService billingService,
            UserRepository userRepository) {
        this.offlinePaymentRepository = offlinePaymentRepository;
        this.orderRepository = orderRepository;
        this.billingService = billingService;
        this.userRepository = userRepository;
    }

    @Transactional
    public OfflinePaymentDto recordOfflinePayment(RecordOfflinePaymentRequest req, UUID staffId) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", staffId));

        if (req.orderId() == null && req.invoiceId() == null) {
            throw new BusinessRuleException("Either orderId or invoiceId must be provided to record payment");
        }

        BigDecimal amount = req.amount().setScale(2, RoundingMode.HALF_UP);
        Order order = null;

        if (req.orderId() != null) {
            order = orderRepository.findById(req.orderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order", "id", req.orderId()));

            if (order.getPaymentStatus() == PaymentStatus.PAID) {
                throw new BusinessRuleException("Order " + order.getOrderNumber() + " is already fully paid");
            }

            List<OfflinePayment> existingPayments = offlinePaymentRepository.findByOrderIdOrderByRecordedAtDesc(order.getId());
            BigDecimal previouslyRecorded = existingPayments.stream()
                    .map(OfflinePayment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal orderTotal = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
            BigDecimal outstanding = orderTotal.subtract(previouslyRecorded).setScale(2, RoundingMode.HALF_UP);

            if (amount.compareTo(outstanding) > 0) {
                throw new com.bakeconnect.common.exception.BadRequestException(
                        String.format("Payment amount ₹%s exceeds outstanding order balance ₹%s", amount, outstanding));
            }

            BigDecimal totalRecorded = previouslyRecorded.add(amount).setScale(2, RoundingMode.HALF_UP);

            if (totalRecorded.compareTo(orderTotal) >= 0) {
                order.setPaymentStatus(PaymentStatus.PAID);
            } else if (totalRecorded.compareTo(BigDecimal.ZERO) > 0) {
                order.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
            }

            OrderStatusHistory history = new OrderStatusHistory(
                    order.getStatus(),
                    order.getStatus(),
                    "OFFLINE_PAYMENT_RECORDED",
                    String.format("Payment of ₹%s recorded offline via %s (Ref: %s). Total recorded: ₹%s / ₹%s",
                            amount, req.paymentMethod(), req.referenceNumber() != null ? req.referenceNumber() : "N/A",
                            totalRecorded, orderTotal),
                    staffId,
                    staff.getRole().name()
            );
            order.addStatusHistory(history);
            orderRepository.save(order);
        }

        if (req.invoiceId() != null) {
            billingService.recordPayment(
                    req.invoiceId(),
                    amount,
                    req.referenceNumber() != null ? req.referenceNumber() : "OFFLINE-" + req.paymentMethod(),
                    req.notes(),
                    staffId
            );
        }

        OfflinePayment payment = new OfflinePayment(
                order,
                req.invoiceId(),
                staff,
                amount,
                req.paymentMethod().toUpperCase(),
                req.referenceNumber(),
                req.notes()
        );
        OfflinePayment saved = offlinePaymentRepository.save(payment);

        log.info("Offline payment of ₹{} ({}) recorded by staff {} for order: {}, invoice: {}",
                amount, req.paymentMethod(), staff.getEmail(),
                order != null ? order.getOrderNumber() : "N/A",
                req.invoiceId() != null ? req.invoiceId() : "N/A");

        return OfflinePaymentDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public com.bakeconnect.payment.dto.CodSummaryDto getCodSummary() {
        BigDecimal totalPaid = orderRepository.sumPaidDeliveryOrders();
        BigDecimal totalUnpaid = orderRepository.sumUnpaidDeliveryOrders();
        long paidCount = orderRepository.countByDeliveryTypeAndPaymentStatus(
                com.bakeconnect.ordering.entity.DeliveryType.DELIVERY, PaymentStatus.PAID);
        long pendingCount = orderRepository.countByDeliveryTypeAndPaymentStatus(
                com.bakeconnect.ordering.entity.DeliveryType.DELIVERY, PaymentStatus.PENDING);
        long partialCount = orderRepository.countByDeliveryTypeAndPaymentStatus(
                com.bakeconnect.ordering.entity.DeliveryType.DELIVERY, PaymentStatus.PARTIALLY_PAID);

        return new com.bakeconnect.payment.dto.CodSummaryDto(
                totalPaid != null ? totalPaid : BigDecimal.ZERO,
                totalUnpaid != null ? totalUnpaid : BigDecimal.ZERO,
                paidCount,
                pendingCount + partialCount
        );
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.bakeconnect.payment.dto.CodOrderDto> getCodOrders(
            PaymentStatus paymentStatus, org.springframework.data.domain.Pageable pageable) {
        return orderRepository.findByDeliveryTypeAndPaymentStatus(
                com.bakeconnect.ordering.entity.DeliveryType.DELIVERY, paymentStatus, pageable)
                .map(o -> {
                    List<OfflinePayment> payments = offlinePaymentRepository.findByOrderIdOrderByRecordedAtDesc(o.getId());
                    BigDecimal collected = payments.stream()
                            .map(OfflinePayment::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal balance = o.getTotalAmount().subtract(collected).max(BigDecimal.ZERO);
                    return new com.bakeconnect.payment.dto.CodOrderDto(
                            o.getId(),
                            o.getOrderNumber(),
                            o.getUser() != null ? o.getUser().getEmail() : null,
                            o.getUser() != null ? o.getUser().getFullName() : null,
                            o.getStatus(),
                            o.getPaymentStatus(),
                            o.getDeliveryType(),
                            o.getTotalAmount(),
                            collected,
                            balance,
                            o.getCreatedAt()
                    );
                });
    }

    @Transactional(readOnly = true)
    public List<OfflinePaymentDto> getRecentPayments() {
        return offlinePaymentRepository.findTop50ByOrderByRecordedAtDesc()
                .stream()
                .map(OfflinePaymentDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OfflinePaymentDto> getPaymentsForOrder(UUID orderId) {
        return offlinePaymentRepository.findByOrderIdOrderByRecordedAtDesc(orderId)
                .stream()
                .map(OfflinePaymentDto::fromEntity)
                .toList();
    }
}
