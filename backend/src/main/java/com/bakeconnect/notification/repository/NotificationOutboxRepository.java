package com.bakeconnect.notification.repository;

import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.entity.OutboxStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, UUID> {

    @Query("SELECT n FROM NotificationOutbox n " +
           "WHERE n.status = :status AND n.nextRetryAt <= :now " +
           "ORDER BY n.nextRetryAt ASC")
    List<NotificationOutbox> findPendingNotifications(@Param("status") OutboxStatus status,
                                                      @Param("now") Instant now,
                                                      Pageable pageable);

    long countByStatus(OutboxStatus status);
}
