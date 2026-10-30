package com.bakeconnect.payment.service;

import com.bakeconnect.payment.entity.WebhookEventInbox;
import com.bakeconnect.payment.entity.WebhookProcessingStatus;
import com.bakeconnect.payment.repository.WebhookEventInboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class WebhookInboxWorker {

    private static final Logger log = LoggerFactory.getLogger(WebhookInboxWorker.class);

    private final WebhookEventInboxRepository inboxRepository;
    private final PaymentService paymentService;
    private final int maxRetries;

    public WebhookInboxWorker(
            WebhookEventInboxRepository inboxRepository,
            PaymentService paymentService,
            @Value("${bakeconnect.webhook.max-retries:5}") int maxRetries) {
        this.inboxRepository = inboxRepository;
        this.paymentService = paymentService;
        this.maxRetries = maxRetries;
    }

    @Scheduled(fixedDelayString = "${bakeconnect.webhook.poll-rate-ms:5000}")
    public int processPendingDeliveries() {
        List<WebhookEventInbox> pending = inboxRepository.findByProcessingStatus(WebhookProcessingStatus.RECEIVED);
        if (pending.isEmpty()) {
            return 0;
        }

        int processed = 0;
        Instant now = Instant.now();

        for (WebhookEventInbox item : pending) {
            // Give synchronous HTTP thread 5 seconds to finish before worker takes over
            if (item.getCreatedAt() != null && item.getCreatedAt().isAfter(now.minusSeconds(5))) {
                continue;
            }

            int currentAttempts = item.getAttemptCount();
            if (currentAttempts >= maxRetries) {
                item.setProcessingStatus(WebhookProcessingStatus.DEAD_LETTER);
                item.setErrorMessage("Max delivery processing retries (" + maxRetries + ") exceeded. Moved to DEAD_LETTER.");
                item.setProcessedAt(now);
                inboxRepository.save(item);
                log.error("Webhook inbox item {} reached max retries ({}), moved to DEAD_LETTER",
                        item.getId(), maxRetries);
                continue;
            }

            try {
                item.setAttemptCount(currentAttempts + 1);
                inboxRepository.save(item);

                paymentService.processRawInboxEvent(item.getId());
                processed++;
                log.info("Recoverable inbox worker successfully processed webhook item {}", item.getId());
            } catch (Exception e) {
                log.warn("Recoverable inbox worker retry {}/{} failed for item {}: {}",
                        item.getAttemptCount(), maxRetries, item.getId(), e.getMessage());
                item.setErrorMessage("Worker retry failure: " + e.getMessage());
                inboxRepository.save(item);
            }
        }

        return processed;
    }
}
