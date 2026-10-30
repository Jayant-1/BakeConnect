package com.bakeconnect.payment.spi;

import java.math.BigDecimal;

public record PaymentVerificationResult(
        String providerReference,
        BigDecimal amount,
        String currency,
        boolean success,
        String failureReason,
        String status,
        String settlementState,
        String utr
) {
    public PaymentVerificationResult(String providerReference, BigDecimal amount, String currency, boolean success, String failureReason) {
        this(providerReference, amount, currency, success, failureReason, success ? "SUCCESS" : "FAILED", null, null);
    }
}
