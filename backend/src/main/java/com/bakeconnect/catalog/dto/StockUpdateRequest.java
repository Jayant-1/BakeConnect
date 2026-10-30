package com.bakeconnect.catalog.dto;

import jakarta.validation.constraints.Min;

public record StockUpdateRequest(
        @Min(value = 0, message = "Stock quantity cannot be negative")
        int stockQuantity
) {}
