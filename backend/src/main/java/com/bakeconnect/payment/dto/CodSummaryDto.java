package com.bakeconnect.payment.dto;

import java.math.BigDecimal;

public record CodSummaryDto(
        BigDecimal totalCollected,
        BigDecimal totalOutstanding,
        long collectedOrderCount,
        long outstandingOrderCount
) {}
