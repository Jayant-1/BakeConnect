package com.bakeconnect.payment.entity;

public enum PaymentAttemptStatus {
    INITIATED,
    QUEUED,
    AWAITING_PAYMENT,
    PENDING,
    PROCESSING,
    OBSERVED_SUCCESS,
    MANUAL_REVIEW,
    RECONCILED,
    SUCCESS,
    FAILED,
    EXPIRED,
    CANCELLED,
    UNCERTAIN_INITIATION;

    public boolean isTerminal() {
        return this == RECONCILED || this == SUCCESS || this == FAILED || this == EXPIRED || this == CANCELLED;
    }

    public boolean isActive() {
        return this == INITIATED || this == QUEUED || this == AWAITING_PAYMENT || this == PENDING || this == PROCESSING;
    }
}
