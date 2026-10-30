package com.bakeconnect.notification.service;

import com.bakeconnect.notification.entity.StaffNotification;
import com.bakeconnect.notification.repository.StaffNotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StaffNotificationService {

    private final StaffNotificationRepository repository;

    public StaffNotificationService(StaffNotificationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public StaffNotification createNotification(UUID orderId, String orderNumber, String channel, String title, String message) {
        StaffNotification notification = new StaffNotification(orderId, orderNumber, channel, title, message);
        return repository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<StaffNotification> getRecentNotifications() {
        return repository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Page<StaffNotification> getNotifications(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return repository.countByIsReadFalse();
    }

    @Transactional
    public void markAsRead(UUID id) {
        repository.findById(id).ifPresent(n -> {
            n.setRead(true);
            repository.save(n);
        });
    }

    @Transactional
    public int markAllAsRead() {
        return repository.markAllAsRead();
    }
}
