package com.bakeconnect.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductCreateUpdateRequest(
        @NotBlank(message = "Product name is required")
        String name,

        @NotBlank(message = "Slug is required")
        String slug,

        String description,
        String imageUrl,
        UUID categoryId,

        @NotNull(message = "Retail price is required")
        @DecimalMin(value = "0.01", message = "Retail price must be greater than zero")
        BigDecimal retailPrice,

        @NotNull(message = "Wholesale price is required")
        @DecimalMin(value = "0.01", message = "Wholesale price must be greater than zero")
        BigDecimal wholesalePrice,

        BigDecimal unitCost,

        String unitOfMeasure,

        @Min(value = 1, message = "MOQ must be at least 1")
        Integer moq,

        @Min(value = 1, message = "MOQ increment must be at least 1")
        Integer moqIncrement,

        @Min(value = 0, message = "Stock quantity cannot be negative")
        Integer stockQuantity
) {}
