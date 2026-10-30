package com.bakeconnect.notification.repository;

import com.bakeconnect.notification.entity.StaffNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffNotificationRepository extends JpaRepository<StaffNotification, UUID> {

    List<StaffNotification> findTop50ByOrderByCreatedAtDesc();

    Page<StaffNotification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByIsReadFalse();

    @Modifying
    @Query("UPDATE StaffNotification n SET n.isRead = true WHERE n.isRead = false")
    int markAllAsRead();
}
