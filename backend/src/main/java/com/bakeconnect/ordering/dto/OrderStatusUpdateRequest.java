package com.bakeconnect.ordering.dto;

import com.bakeconnect.ordering.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record OrderStatusUpdateRequest(
        @NotNull(message = "New status is required")
        OrderStatus status,

        String reasonCode,

        String customerMessage
) {}
