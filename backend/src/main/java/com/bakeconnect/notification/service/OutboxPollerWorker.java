package com.bakeconnect.notification.service;

import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.entity.OutboxStatus;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class OutboxPollerWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxPollerWorker.class);

    private final NotificationOutboxRepository outboxRepository;
    private final EmailService emailService;
    private final int batchSize;

    public OutboxPollerWorker(
            NotificationOutboxRepository outboxRepository,
            EmailService emailService,
            @Value("${bakeconnect.outbox.batch-size:20}") int batchSize) {
        this.outboxRepository = outboxRepository;
        this.emailService = emailService;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${bakeconnect.outbox.poll-rate-ms:3000}")
    public void pollOutbox() {
        processBatch();
    }

    @Transactional
    public int processBatch() {
        Instant now = Instant.now();
        List<NotificationOutbox> pending = outboxRepository.findPendingNotifications(
                OutboxStatus.PENDING, now, PageRequest.of(0, batchSize));

        if (pending.isEmpty()) {
            return 0;
        }

        log.debug("Found {} pending notification outbox items for processing", pending.size());
        int processedCount = 0;

        for (NotificationOutbox item : pending) {
            try {
                emailService.sendEmail(
                        item.getRecipientEmail(),
                        item.getSubject(),
                        item.getTemplateDataJson()
                );

                item.setStatus(OutboxStatus.SENT);
                item.setSentAt(Instant.now());
                item.setLastError(null);
                outboxRepository.save(item);
                processedCount++;
            } catch (Exception e) {
                int newRetryCount = item.getRetryCount() + 1;
                item.setRetryCount(newRetryCount);
                item.setLastError(e.getMessage());

                if (newRetryCount >= item.getMaxRetries()) {
                    item.setStatus(OutboxStatus.DEAD_LETTER);
                    log.error("Notification outbox item {} reached max retries ({}), moved to DEAD_LETTER: {}",
                            item.getId(), item.getMaxRetries(), e.getMessage());
                } else {
                    // Exponential backoff: 2^retry * 10 seconds
                    long backoffSeconds = (long) Math.pow(2, newRetryCount) * 10;
                    item.setNextRetryAt(Instant.now().plusSeconds(backoffSeconds));
                    log.warn("Notification outbox item {} delivery failed (retry {}/{}). Next retry in {}s: {}",
                            item.getId(), newRetryCount, item.getMaxRetries(), backoffSeconds, e.getMessage());
                }
                outboxRepository.save(item);
            }
        }

        return processedCount;
    }
}
