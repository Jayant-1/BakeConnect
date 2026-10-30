package com.bakeconnect.payment.spi;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentSessionRequest(
        UUID orderId,
        String orderNumber,
        BigDecimal amount,
        String currency,
        String idempotencyKey,
        String customerEmail,
        String customerPhone
) {}
