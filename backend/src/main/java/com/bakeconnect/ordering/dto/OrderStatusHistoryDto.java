package com.bakeconnect.ordering.dto;

import com.bakeconnect.ordering.entity.OrderStatus;
import com.bakeconnect.ordering.entity.OrderStatusHistory;
import java.time.Instant;
import java.util.UUID;

public record OrderStatusHistoryDto(
        UUID id,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        String reasonCode,
        String customerMessage,
        UUID actorUserId,
        String actorRole,
        Instant createdAt
) {
    public static OrderStatusHistoryDto fromEntity(OrderStatusHistory history) {
        return new OrderStatusHistoryDto(
                history.getId(),
                history.getFromStatus(),
                history.getToStatus(),
                history.getReasonCode(),
                history.getCustomerMessage(),
                history.getActorUserId(),
                history.getActorRole(),
                history.getCreatedAt()
        );
    }
}
