package com.bakeconnect.ordering.dto;

import com.bakeconnect.ordering.entity.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponseDto(
        UUID id,
        String orderNumber,
        UUID userId,
        String userEmail,
        String userFullName,
        OrderType orderType,
        OrderStatus status,
        PaymentStatus paymentStatus,
        DeliveryType deliveryType,
        String deliveryAddressJson,
        String businessGst,
        String businessName,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        UUID appliedDiscountRuleId,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String notes,
        String delayReason,
        String declineReason,
        Instant estimatedDeliveryAt,
        Instant deliveredAt,
        Instant confirmedAt,
        Long version,
        List<OrderItemDto> items,
        List<OrderStatusHistoryDto> statusHistory,
        Instant createdAt,
        Instant updatedAt
) {
    public static OrderResponseDto fromEntity(Order order) {
        List<OrderItemDto> itemDtos = order.getItems() != null ?
                order.getItems().stream().map(OrderItemDto::fromEntity).toList() : List.of();
        List<OrderStatusHistoryDto> historyDtos = order.getStatusHistory() != null ?
                order.getStatusHistory().stream().map(OrderStatusHistoryDto::fromEntity).toList() : List.of();

        return new OrderResponseDto(
                order.getId(),
                order.getOrderNumber(),
                order.getUser() != null ? order.getUser().getId() : null,
                order.getUser() != null ? order.getUser().getEmail() : null,
                order.getUser() != null ? order.getUser().getFullName() : null,
                order.getOrderType(),
                order.getStatus(),
                order.getPaymentStatus(),
                order.getDeliveryType(),
                order.getDeliveryAddressJson(),
                order.getBusinessGst(),
                order.getBusinessName(),
                order.getSubtotalAmount(),
                order.getDiscountAmount(),
                order.getAppliedDiscountRuleId(),
                order.getTaxAmount(),
                order.getTotalAmount(),
                order.getNotes(),
                order.getDelayReason(),
                order.getDeclineReason(),
                order.getEstimatedDeliveryAt(),
                order.getDeliveredAt(),
                order.getConfirmedAt(),
                order.getVersion(),
                itemDtos,
                historyDtos,
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }
}
