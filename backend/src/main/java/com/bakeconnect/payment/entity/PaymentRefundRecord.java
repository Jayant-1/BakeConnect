package com.bakeconnect.payment.entity;

import com.bakeconnect.identity.entity.User;
import com.bakeconnect.ordering.entity.Order;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_refund_records")
public class PaymentRefundRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_attempt_id", nullable = false)
    private PaymentAttempt paymentAttempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_by", nullable = false)
    private User recordedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public PaymentRefundRecord() {}

    public PaymentRefundRecord(PaymentAttempt paymentAttempt, Order order, BigDecimal amount,
                               String currency, String reason, String referenceNumber, User recordedBy) {
        this.paymentAttempt = paymentAttempt;
        this.order = order;
        this.amount = amount;
        this.currency = (currency != null && !currency.isBlank()) ? currency : "INR";
        this.reason = reason;
        this.referenceNumber = referenceNumber;
        this.recordedBy = recordedBy;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public PaymentAttempt getPaymentAttempt() { return paymentAttempt; }
    public Order getOrder() { return order; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getReason() { return reason; }
    public String getReferenceNumber() { return referenceNumber; }
    public User getRecordedBy() { return recordedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
