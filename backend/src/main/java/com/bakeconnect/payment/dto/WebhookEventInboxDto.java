package com.bakeconnect.payment.dto;

import com.bakeconnect.payment.entity.WebhookEventInbox;
import com.bakeconnect.payment.entity.WebhookProcessingStatus;
import com.bakeconnect.payment.entity.WebhookVerificationStatus;
import java.time.Instant;
import java.util.UUID;

public record WebhookEventInboxDto(
        UUID id,
        String provider,
        String deliveryId,
        String eventType,
        String payloadHash,
        WebhookVerificationStatus verificationStatus,
        WebhookProcessingStatus processingStatus,
        int attemptCount,
        UUID orderId,
        UUID paymentAttemptId,
        String errorMessage,
        Instant processedAt,
        Instant createdAt
) {
    public static WebhookEventInboxDto fromEntity(WebhookEventInbox inbox) {
        return new WebhookEventInboxDto(
                inbox.getId(),
                inbox.getProvider(),
                inbox.getDeliveryId(),
                inbox.getEventType(),
                inbox.getPayloadHash(),
                inbox.getVerificationStatus(),
                inbox.getProcessingStatus(),
                inbox.getAttemptCount(),
                inbox.getOrderId(),
                inbox.getPaymentAttemptId(),
                inbox.getErrorMessage(),
                inbox.getProcessedAt(),
                inbox.getCreatedAt()
        );
    }
}
