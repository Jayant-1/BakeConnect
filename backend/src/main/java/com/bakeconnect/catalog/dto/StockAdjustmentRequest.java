package com.bakeconnect.catalog.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockAdjustmentRequest(
        @NotNull(message = "New stock quantity is required")
        @Min(value = 0, message = "Stock cannot be negative")
        Integer newQuantity,

        @NotBlank(message = "Reason code is required (e.g., OVEN_SPOILAGE, RESTOCK_BATCH, INVENTORY_COUNT, DAMAGED)")
        String reasonCode,

        String notes
) {}
