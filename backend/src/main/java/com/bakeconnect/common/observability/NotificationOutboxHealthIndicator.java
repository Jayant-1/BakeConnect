package com.bakeconnect.common.observability;

import com.bakeconnect.notification.entity.OutboxStatus;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class NotificationOutboxHealthIndicator implements HealthIndicator {

    private final NotificationOutboxRepository outboxRepository;

    public NotificationOutboxHealthIndicator(NotificationOutboxRepository outboxRepository) {
        this.outboxRepository = outboxRepository;
    }

    @Override
    public Health health() {
        long pendingCount = outboxRepository.countByStatus(OutboxStatus.PENDING);
        long deadLetterCount = outboxRepository.countByStatus(OutboxStatus.DEAD_LETTER);
        long sentCount = outboxRepository.countByStatus(OutboxStatus.SENT);

        Health.Builder builder = (deadLetterCount > 50) ? Health.down() : Health.up();

        return builder
                .withDetail("pendingNotifications", pendingCount)
                .withDetail("deadLetterNotifications", deadLetterCount)
                .withDetail("sentNotifications", sentCount)
                .withDetail("status", (deadLetterCount > 50) ? "CRITICAL_DEAD_LETTER_BACKLOG" : "HEALTHY")
                .build();
    }
}
