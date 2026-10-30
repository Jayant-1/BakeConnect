package com.bakeconnect.ordering.entity;

public enum OrderStatus {
    PENDING_REVIEW,
    AWAITING_PAYMENT,
    CONFIRMED,
    DELAYED,
    DECLINED,
    PROCESSING,
    READY_FOR_PICKUP,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED,
    REFUNDED
}
