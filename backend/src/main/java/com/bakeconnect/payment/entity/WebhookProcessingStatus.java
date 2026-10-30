package com.bakeconnect.payment.entity;

public enum WebhookProcessingStatus {
    RECEIVED,
    PROCESSED,
    IGNORED,
    FAILED,
    DEAD_LETTER,
    CONFLICT,
    UNDER_INVESTIGATION
}
