package com.bakeconnect.payment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_event_inbox")
public class WebhookEventInbox {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "delivery_id", nullable = false, unique = true)
    private String deliveryId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "raw_payload", nullable = false, columnDefinition = "TEXT")
    private String rawPayload;

    @Column(name = "signature_header", columnDefinition = "TEXT")
    private String signatureHeader;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 50)
    private WebhookVerificationStatus verificationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 50)
    private WebhookProcessingStatus processingStatus;

    @Column(name = "payload_hash", length = 64)
    private String payloadHash;

    @Column(name = "attempt_count")
    private int attemptCount = 0;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "payment_attempt_id")
    private UUID paymentAttemptId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public WebhookEventInbox() {}

    public WebhookEventInbox(String provider, String deliveryId, String eventType, String rawPayload,
                             String signatureHeader, WebhookVerificationStatus verificationStatus,
                             WebhookProcessingStatus processingStatus) {
        this.provider = provider;
        this.deliveryId = deliveryId;
        this.eventType = eventType;
        this.rawPayload = rawPayload;
        this.signatureHeader = signatureHeader;
        this.verificationStatus = verificationStatus;
        this.processingStatus = processingStatus;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getDeliveryId() { return deliveryId; }
    public void setDeliveryId(String deliveryId) { this.deliveryId = deliveryId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getRawPayload() { return rawPayload; }
    public void setRawPayload(String rawPayload) { this.rawPayload = rawPayload; }

    public String getSignatureHeader() { return signatureHeader; }
    public void setSignatureHeader(String signatureHeader) { this.signatureHeader = signatureHeader; }

    public WebhookVerificationStatus getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(WebhookVerificationStatus verificationStatus) { this.verificationStatus = verificationStatus; }

    public WebhookProcessingStatus getProcessingStatus() { return processingStatus; }
    public void setProcessingStatus(WebhookProcessingStatus processingStatus) { this.processingStatus = processingStatus; }

    public String getPayloadHash() { return payloadHash; }
    public void setPayloadHash(String payloadHash) { this.payloadHash = payloadHash; }

    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public UUID getPaymentAttemptId() { return paymentAttemptId; }
    public void setPaymentAttemptId(UUID paymentAttemptId) { this.paymentAttemptId = paymentAttemptId; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }

    public Instant getCreatedAt() { return createdAt; }
}
