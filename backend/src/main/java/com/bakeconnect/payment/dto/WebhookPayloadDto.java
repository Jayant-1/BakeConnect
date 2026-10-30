package com.bakeconnect.payment.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class WebhookPayloadDto {

    @JsonAlias({"event", "eventType", "status"})
    private String event;

    @JsonAlias({"deliveryId", "delivery_id"})
    private String deliveryId;

    private Long timestamp;

    @JsonAlias({"paymentId", "providerReference", "provider_reference"})
    private String paymentId;

    @JsonAlias({"orderId", "orderNumber", "order_id", "order_number"})
    private String orderId;

    @JsonAlias({"attemptId", "idempotencyKey", "attempt_id"})
    private String attemptId;

    private BigDecimal amount;

    private Long amountPaise;

    private String currency = "INR";

    private String method;

    private String utr;

    private String verificationTag;

    private Integer verificationLevel;

    private String settlementState;

    private String completedAt;

    private Map<String, Object> metadata;

    private String failureReason;

    public WebhookPayloadDto() {}

    public WebhookPayloadDto(String event, String deliveryId, String paymentId,
                             String attemptId, String orderId, BigDecimal amount,
                             String currency, String status, String failureReason) {
        this.event = (event != null) ? event : status;
        this.deliveryId = deliveryId;
        this.paymentId = paymentId;
        this.attemptId = attemptId;
        this.orderId = orderId;
        this.amount = amount;
        this.currency = (currency != null) ? currency : "INR";
        this.failureReason = failureReason;
    }

    public String getEvent() { return event; }
    public void setEvent(String event) { this.event = event; }

    public String getEventType() { return event; }
    public void setEventType(String eventType) { this.event = eventType; }

    public String getStatus() { return event; }
    public void setStatus(String status) { this.event = status; }

    public String getDeliveryId() { return deliveryId; }
    public void setDeliveryId(String deliveryId) { this.deliveryId = deliveryId; }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }

    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }

    public String getProviderReference() { return paymentId; }
    public void setProviderReference(String providerReference) { this.paymentId = providerReference; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getOrderNumber() { return orderId; }
    public void setOrderNumber(String orderNumber) { this.orderId = orderNumber; }

    public String getAttemptId() { return attemptId; }
    public void setAttemptId(String attemptId) { this.attemptId = attemptId; }

    public String getIdempotencyKey() { return attemptId; }
    public void setIdempotencyKey(String idempotencyKey) { this.attemptId = idempotencyKey; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Long getAmountPaise() { return amountPaise; }
    public void setAmountPaise(Long amountPaise) { this.amountPaise = amountPaise; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getUtr() { return utr; }
    public void setUtr(String utr) { this.utr = utr; }

    public String getVerificationTag() { return verificationTag; }
    public void setVerificationTag(String verificationTag) { this.verificationTag = verificationTag; }

    public Integer getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(Integer verificationLevel) { this.verificationLevel = verificationLevel; }

    public String getSettlementState() { return settlementState; }
    public void setSettlementState(String settlementState) { this.settlementState = settlementState; }

    public String getCompletedAt() { return completedAt; }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }
}
