package com.bakeconnect.payment.dto;

import java.math.BigDecimal;

public record PaymentFinancialMetricsDto(
        BigDecimal reconciledAmount,
        BigDecimal observedUnreconciledAmount,
        long observedSuccessCount,
        long reconciledCount,
        long manualReviewCount,
        long failedCount,
        long totalAttemptsCount
) {}
