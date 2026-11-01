package com.bakeconnect.payment.dto;

import com.bakeconnect.payment.entity.PaymentAttempt;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.entity.PaymentSettlementStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PaymentAttemptDto {

    private UUID id;
    private UUID orderId;
    private String orderNumber;
    private UUID invoiceId;
    private String provider;
    private String providerReference;
    private String idempotencyKey;
    private BigDecimal baseAmount;
    private BigDecimal platformFee;
    private BigDecimal amount;
    private String currency;
    private PaymentAttemptStatus status;
    private PaymentSettlementStatus settlementStatus;
    private String checkoutUrl;
    private int queuePosition;
    private Instant expiresAt;
    private String utr;
    private int verificationLevel;
    private String customerExplanation;
    private boolean retryEligible;
    private Instant createdAt;

    public PaymentAttemptDto() {}

    public static PaymentAttemptDto fromEntity(PaymentAttempt attempt) {
        PaymentAttemptDto dto = new PaymentAttemptDto();
        dto.setId(attempt.getId());
        if (attempt.getOrder() != null) {
            dto.setOrderId(attempt.getOrder().getId());
            dto.setOrderNumber(attempt.getOrder().getOrderNumber());
        }
        if (attempt.getInvoice() != null) {
            dto.setInvoiceId(attempt.getInvoice().getId());
        }
        dto.setProvider(attempt.getProvider());
        dto.setProviderReference(attempt.getProviderReference());
        dto.setIdempotencyKey(attempt.getIdempotencyKey());
        dto.setBaseAmount(attempt.getBaseAmount());
        dto.setPlatformFee(attempt.getPlatformFee());
        dto.setAmount(attempt.getAmount());
        dto.setCurrency(attempt.getCurrency());
        dto.setStatus(attempt.getStatus());
        dto.setSettlementStatus(attempt.getSettlementStatus());
        dto.setCheckoutUrl(attempt.getCheckoutUrl());
        dto.setQueuePosition(attempt.getQueuePosition());
        dto.setExpiresAt(attempt.getExpiresAt());
        dto.setUtr(attempt.getUtr());
        dto.setVerificationLevel(attempt.getVerificationLevel());
        dto.setCustomerExplanation(buildCustomerExplanation(attempt));
        dto.setRetryEligible(attempt.getStatus() == PaymentAttemptStatus.FAILED || attempt.getStatus() == PaymentAttemptStatus.EXPIRED);
        dto.setCreatedAt(attempt.getCreatedAt());
        return dto;
    }

    private static String buildCustomerExplanation(PaymentAttempt attempt) {
        if (attempt.getStatus() == null) return "Status pending";
        return switch (attempt.getStatus()) {
            case INITIATED -> "Payment session initiated. Preparing payment checkout window.";
            case QUEUED -> "Waiting in queue (position " + attempt.getQueuePosition() + "). Concurrency slot will open shortly.";
            case AWAITING_PAYMENT, PENDING -> "Awaiting UPI payment transfer. Scan QR or approve payment request.";
            case PROCESSING -> "Payment transmission in progress.";
            case OBSERVED_SUCCESS -> "Payment alert observed from bank SMS (UTR: " + (attempt.getUtr() != null ? attempt.getUtr() : "pending") + "). Awaiting official statement reconciliation.";
            case MANUAL_REVIEW -> "Payment received requires manual verification by bakery staff.";
            case RECONCILED -> "Payment fully reconciled and confirmed against bank records.";
            case SUCCESS -> "Payment successfully completed.";
            case FAILED -> "Payment attempt was unsuccessful. You may retry.";
            case EXPIRED -> "Payment checkout window expired without received payment.";
            case CANCELLED -> "Payment checkout was cancelled by customer.";
            case UNCERTAIN_INITIATION -> "Payment session state uncertain after gateway timeout. Verifying gateway status.";
        };
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public UUID getInvoiceId() { return invoiceId; }
    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }

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

    public PaymentSettlementStatus getSettlementStatus() { return settlementStatus; }
    public void setSettlementStatus(PaymentSettlementStatus settlementStatus) { this.settlementStatus = settlementStatus; }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }

    public int getQueuePosition() { return queuePosition; }
    public void setQueuePosition(int queuePosition) { this.queuePosition = queuePosition; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }

    public int getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(int verificationLevel) { this.verificationLevel = verificationLevel; }

    public String getCustomerExplanation() { return customerExplanation; }
    public void setCustomerExplanation(String customerExplanation) { this.customerExplanation = customerExplanation; }

    public boolean isRetryEligible() { return retryEligible; }
    public void setRetryEligible(boolean retryEligible) { this.retryEligible = retryEligible; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
