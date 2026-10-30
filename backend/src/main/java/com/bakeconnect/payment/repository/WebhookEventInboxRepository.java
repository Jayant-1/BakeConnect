package com.bakeconnect.payment.repository;

import com.bakeconnect.payment.entity.WebhookEventInbox;
import com.bakeconnect.payment.entity.WebhookProcessingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WebhookEventInboxRepository extends JpaRepository<WebhookEventInbox, UUID> {

    Optional<WebhookEventInbox> findByDeliveryId(String deliveryId);

    Optional<WebhookEventInbox> findByProviderAndDeliveryId(String provider, String deliveryId);

    boolean existsByDeliveryId(String deliveryId);

    List<WebhookEventInbox> findByProcessingStatus(WebhookProcessingStatus status);

    Page<WebhookEventInbox> findByProcessingStatus(WebhookProcessingStatus status, Pageable pageable);

    Page<WebhookEventInbox> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
