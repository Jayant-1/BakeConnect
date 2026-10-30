package com.bakeconnect.cart.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CartQuoteResponse(
        List<CartItemQuoteDto> items,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        String appliedDiscountDescription,
        UUID appliedDiscountRuleId,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        boolean isValidForCheckout,
        List<String> validationErrors,
        String channel
) {}
