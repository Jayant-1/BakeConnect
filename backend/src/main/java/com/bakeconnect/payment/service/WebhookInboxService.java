package com.bakeconnect.payment.service;

import com.bakeconnect.payment.entity.WebhookEventInbox;
import com.bakeconnect.payment.entity.WebhookProcessingStatus;
import com.bakeconnect.payment.entity.WebhookVerificationStatus;
import com.bakeconnect.payment.repository.WebhookEventInboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class WebhookInboxService {

    private static final Logger log = LoggerFactory.getLogger(WebhookInboxService.class);

    private final WebhookEventInboxRepository inboxRepository;

    public WebhookInboxService(WebhookEventInboxRepository inboxRepository) {
        this.inboxRepository = inboxRepository;
    }

    public enum DuplicateStatus {
        NEW,
        IDEMPOTENT_DUPLICATE,
        CONFLICTING_PAYLOAD
    }

    public record DuplicateCheckResult(DuplicateStatus status, WebhookEventInbox existingInbox) {}

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public DuplicateCheckResult checkDuplicate(String deliveryId, String payloadHash) {
        if (deliveryId == null || deliveryId.isBlank()) {
            return new DuplicateCheckResult(DuplicateStatus.NEW, null);
        }

        Optional<WebhookEventInbox> existing = inboxRepository.findByDeliveryId(deliveryId);
        if (existing.isEmpty()) {
            return new DuplicateCheckResult(DuplicateStatus.NEW, null);
        }

        WebhookEventInbox inbox = existing.get();
        if (inbox.getPayloadHash() != null && !inbox.getPayloadHash().equals(payloadHash)) {
            log.warn("Conflict detected for deliveryId {}: stored hash {} differs from incoming {}",
                    deliveryId, inbox.getPayloadHash(), payloadHash);
            return new DuplicateCheckResult(DuplicateStatus.CONFLICTING_PAYLOAD, inbox);
        }

        return new DuplicateCheckResult(DuplicateStatus.IDEMPOTENT_DUPLICATE, inbox);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public WebhookEventInbox recordIncoming(String provider, String deliveryId, String eventType,
                                           String rawPayload, String signatureHeader, String payloadHash,
                                           WebhookVerificationStatus verificationStatus,
                                           WebhookProcessingStatus processingStatus) {
        WebhookEventInbox inbox = new WebhookEventInbox(
                provider,
                (deliveryId != null && !deliveryId.isBlank()) ? deliveryId : "GEN-" + UUID.randomUUID(),
                (eventType != null && !eventType.isBlank()) ? eventType : "UNKNOWN",
                rawPayload,
                signatureHeader,
                verificationStatus,
                processingStatus
        );
        inbox.setPayloadHash(payloadHash);
        inbox.setAttemptCount(1);
        WebhookEventInbox saved = inboxRepository.saveAndFlush(inbox);
        if (saved != null) {
            return saved;
        }
        if (inbox.getId() == null) {
            inbox.setId(UUID.randomUUID());
        }
        return inbox;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessed(UUID inboxId, UUID orderId, UUID paymentAttemptId, String eventType) {
        if (inboxId == null) return;
        inboxRepository.findById(inboxId).ifPresent(inbox -> {
            inbox.setProcessingStatus(WebhookProcessingStatus.PROCESSED);
            inbox.setProcessedAt(Instant.now());
            if (eventType != null) inbox.setEventType(eventType);
            if (orderId != null) inbox.setOrderId(orderId);
            if (paymentAttemptId != null) inbox.setPaymentAttemptId(paymentAttemptId);
            inboxRepository.saveAndFlush(inbox);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID inboxId, String errorMessage) {
        if (inboxId == null) return;
        inboxRepository.findById(inboxId).ifPresent(inbox -> {
            inbox.setProcessingStatus(WebhookProcessingStatus.FAILED);
            inbox.setErrorMessage(errorMessage);
            inbox.setProcessedAt(Instant.now());
            inboxRepository.saveAndFlush(inbox);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markIgnored(UUID inboxId, String reason) {
        if (inboxId == null) return;
        inboxRepository.findById(inboxId).ifPresent(inbox -> {
            inbox.setProcessingStatus(WebhookProcessingStatus.IGNORED);
            inbox.setErrorMessage(reason);
            inbox.setProcessedAt(Instant.now());
            inboxRepository.saveAndFlush(inbox);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markConflict(UUID inboxId, String conflictMessage) {
        if (inboxId == null) return;
        inboxRepository.findById(inboxId).ifPresent(inbox -> {
            inbox.setProcessingStatus(WebhookProcessingStatus.CONFLICT);
            inbox.setErrorMessage(conflictMessage);
            inbox.setProcessedAt(Instant.now());
            inboxRepository.saveAndFlush(inbox);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markUnderInvestigation(UUID inboxId, String reason) {
        if (inboxId == null) return;
        inboxRepository.findById(inboxId).ifPresent(inbox -> {
            inbox.setProcessingStatus(WebhookProcessingStatus.UNDER_INVESTIGATION);
            inbox.setErrorMessage(reason);
            inbox.setProcessedAt(Instant.now());
            inboxRepository.saveAndFlush(inbox);
        });
    }
}
