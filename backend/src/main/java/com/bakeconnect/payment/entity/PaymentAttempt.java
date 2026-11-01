package com.bakeconnect.payment.entity;

import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.ordering.entity.Order;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_attempts")
public class PaymentAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_reference")
    private String providerReference;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "base_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFee = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PaymentAttemptStatus status = PaymentAttemptStatus.INITIATED;

    @Column(name = "checkout_url", columnDefinition = "TEXT")
    private String checkoutUrl;

    @Column(name = "queue_position")
    private int queuePosition = 0;

    @Column(name = "receiving_account", length = 100)
    private String receivingAccount;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "utr", length = 64)
    private String utr;

    @Column(name = "verification_level")
    private int verificationLevel = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", length = 50)
    private PaymentSettlementStatus settlementStatus = PaymentSettlementStatus.NOT_RECONCILED;

    @Column(name = "request_fingerprint", length = 128)
    private String requestFingerprint;

    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public PaymentAttempt() {}

    public PaymentAttempt(Order order, Invoice invoice, String provider, String idempotencyKey,
                          BigDecimal amount, String currency) {
        this(order, invoice, provider, idempotencyKey, amount, BigDecimal.ZERO, amount, currency);
    }

    public PaymentAttempt(Order order, Invoice invoice, String provider, String idempotencyKey,
                          BigDecimal baseAmount, BigDecimal platformFee, BigDecimal amount, String currency) {
        this.order = order;
        this.invoice = invoice;
        this.user = order != null ? order.getUser() : null;
        this.provider = provider;
        this.idempotencyKey = idempotencyKey;
        this.baseAmount = baseAmount != null ? baseAmount : amount;
        this.platformFee = platformFee != null ? platformFee : BigDecimal.ZERO;
        this.amount = amount != null ? amount : this.baseAmount.add(this.platformFee);
        this.currency = (currency != null && !currency.isBlank()) ? currency : "INR";
        this.status = PaymentAttemptStatus.INITIATED;
        this.settlementStatus = PaymentSettlementStatus.NOT_RECONCILED;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) {
        this.order = order;
        if (order != null && this.user == null) {
            this.user = order.getUser();
        }
    }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getProviderReference() { return providerReference; }
    public void setProviderReference(String providerReference) { this.providerReference = providerReference; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public BigDecimal getBaseAmount() { return baseAmount; }
    public void setBaseAmount(BigDecimal baseAmount) { this.baseAmount = baseAmount; }

    public BigDecimal getPlatformFee() { return platformFee; }
    public void setPlatformFee(BigDecimal platformFee) { this.platformFee = platformFee; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public PaymentAttemptStatus getStatus() { return status; }
    public void setStatus(PaymentAttemptStatus status) { this.status = status; }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }

    public int getQueuePosition() { return queuePosition; }
    public void setQueuePosition(int queuePosition) { this.queuePosition = queuePosition; }

    public String getReceivingAccount() { return receivingAccount; }
    public void setReceivingAccount(String receivingAccount) { this.receivingAccount = receivingAccount; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }

    public int getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(int verificationLevel) { this.verificationLevel = verificationLevel; }

    public PaymentSettlementStatus getSettlementStatus() { return settlementStatus; }
    public void setSettlementStatus(PaymentSettlementStatus settlementStatus) { this.settlementStatus = settlementStatus; }

    public String getRequestFingerprint() { return requestFingerprint; }
    public void setRequestFingerprint(String requestFingerprint) { this.requestFingerprint = requestFingerprint; }

    public String getRawResponse() { return rawResponse; }
    public void setRawResponse(String rawResponse) { this.rawResponse = rawResponse; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
