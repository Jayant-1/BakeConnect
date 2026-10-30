package com.bakeconnect.payment.spi;

import java.time.Instant;
import java.util.Map;

public record PaymentSessionResult(
        String providerReference,
        String paymentUrl,
        Map<String, String> metadata,
        int queuePosition,
        String status,
        Instant expiresAt,
        String receivingAccount
) {
    public PaymentSessionResult(String providerReference, String paymentUrl, Map<String, String> metadata) {
        this(providerReference, paymentUrl, metadata, 0, "INITIATED", null, null);
    }
}
