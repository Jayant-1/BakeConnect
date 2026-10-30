package com.bakeconnect.payment.dto;

import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentSessionResponse(
        UUID paymentAttemptId,
        String idempotencyKey,
        String provider,
        String providerReference,
        String paymentUrl,
        BigDecimal amount,
        String currency,
        PaymentAttemptStatus status,
        int queuePosition,
        Instant expiresAt,
        String customerMessage,
        boolean retryEligible
) {
    public PaymentSessionResponse(
            UUID paymentAttemptId,
            String idempotencyKey,
            String provider,
            String providerReference,
            String paymentUrl,
            BigDecimal amount,
            String currency,
            PaymentAttemptStatus status
    ) {
        this(paymentAttemptId, idempotencyKey, provider, providerReference, paymentUrl,
                amount, currency, status, 0, null, null, false);
    }
}
