package com.bakeconnect.notification.service;

import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.entity.OutboxStatus;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPollerWorkerTest {

    @Mock
    private NotificationOutboxRepository outboxRepository;

    @Mock
    private EmailService emailService;

    private OutboxPollerWorker pollerWorker;

    @BeforeEach
    void setUp() {
        pollerWorker = new OutboxPollerWorker(outboxRepository, emailService, 20);
    }

    @Test
    @DisplayName("processBatch dispatches emails and updates status to SENT")
    void processBatch_Success_MarksSent() {
        NotificationOutbox item = new NotificationOutbox(
                "customer@test.com", "Order Confirmation", "ORDER_PLACED", "{\"order\":\"BC-01\"}");
        item.setId(UUID.randomUUID());

        when(outboxRepository.findPendingNotifications(eq(OutboxStatus.PENDING), any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(item));

        int processed = pollerWorker.processBatch();

        assertThat(processed).isEqualTo(1);
        verify(emailService).sendEmail(item.getRecipientEmail(), item.getSubject(), item.getTemplateDataJson());
        assertThat(item.getStatus()).isEqualTo(OutboxStatus.SENT);
        assertThat(item.getSentAt()).isNotNull();
        verify(outboxRepository).save(item);
    }

    @Test
    @DisplayName("processBatch handles failure with exponential backoff")
    void processBatch_Failure_IncrementsRetryAndBackoff() {
        NotificationOutbox item = new NotificationOutbox(
                "customer@test.com", "Order Confirmation", "ORDER_PLACED", "{\"order\":\"BC-01\"}");
        item.setId(UUID.randomUUID());
        item.setRetryCount(1);
        item.setMaxRetries(5);

        when(outboxRepository.findPendingNotifications(eq(OutboxStatus.PENDING), any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(item));
        doThrow(new RuntimeException("SMTP connection timeout")).when(emailService)
                .sendEmail(any(), any(), any());

        int processed = pollerWorker.processBatch();

        assertThat(processed).isEqualTo(0);
        assertThat(item.getStatus()).isEqualTo(OutboxStatus.PENDING);
        assertThat(item.getRetryCount()).isEqualTo(2);
        assertThat(item.getLastError()).isEqualTo("SMTP connection timeout");
        // Next retry must be in the future
        assertThat(item.getNextRetryAt()).isAfter(Instant.now());
        verify(outboxRepository).save(item);
    }

    @Test
    @DisplayName("processBatch marks DEAD_LETTER when maxRetries is reached")
    void processBatch_MaxRetriesReached_MarksDeadLetter() {
        NotificationOutbox item = new NotificationOutbox(
                "customer@test.com", "Order Confirmation", "ORDER_PLACED", "{\"order\":\"BC-01\"}");
        item.setId(UUID.randomUUID());
        item.setRetryCount(4);
        item.setMaxRetries(5);

        when(outboxRepository.findPendingNotifications(eq(OutboxStatus.PENDING), any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(item));
        doThrow(new RuntimeException("Mailbox not found")).when(emailService)
                .sendEmail(any(), any(), any());

        int processed = pollerWorker.processBatch();

        assertThat(processed).isEqualTo(0);
        assertThat(item.getRetryCount()).isEqualTo(5);
        assertThat(item.getStatus()).isEqualTo(OutboxStatus.DEAD_LETTER);
        assertThat(item.getLastError()).isEqualTo("Mailbox not found");
        verify(outboxRepository).save(item);
    }

    @Test
    @DisplayName("processBatch returns zero when no pending items")
    void processBatch_EmptyQueue_ReturnsZero() {
        when(outboxRepository.findPendingNotifications(eq(OutboxStatus.PENDING), any(Instant.class), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        int processed = pollerWorker.processBatch();

        assertThat(processed).isEqualTo(0);
        verify(emailService, never()).sendEmail(any(), any(), any());
    }
}
