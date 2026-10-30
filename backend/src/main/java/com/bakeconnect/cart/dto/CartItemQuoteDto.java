package com.bakeconnect.cart.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemQuoteDto(
        UUID productId,
        String productName,
        String sku,
        BigDecimal authoritativeUnitPrice,
        int requestedQuantity,
        BigDecimal subtotal,
        boolean isAvailable,
        int availableStock,
        String validationMessage
) {}
