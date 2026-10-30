package com.bakeconnect.payment.dto;

import com.bakeconnect.ordering.entity.DeliveryType;
import com.bakeconnect.ordering.entity.OrderStatus;
import com.bakeconnect.ordering.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CodOrderDto(
        UUID orderId,
        String orderNumber,
        String customerEmail,
        String customerName,
        OrderStatus orderStatus,
        PaymentStatus paymentStatus,
        DeliveryType deliveryType,
        BigDecimal totalAmount,
        BigDecimal collectedAmount,
        BigDecimal outstandingBalance,
        Instant createdAt
) {}
