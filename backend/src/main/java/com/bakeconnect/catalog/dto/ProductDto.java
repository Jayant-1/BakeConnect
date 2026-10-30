package com.bakeconnect.catalog.dto;

import com.bakeconnect.catalog.entity.Product;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductDto(
        UUID id,
        String name,
        String slug,
        String description,
        String imageUrl,
        UUID categoryId,
        String categoryName,
        BigDecimal retailPrice,
        BigDecimal wholesalePrice,
        String unitOfMeasure,
        int moq,
        int moqIncrement,
        int stockQuantity,
        boolean isAvailable,
        boolean isEggless,
        boolean isVegetarian,
        String dietaryTags,
        String allergens,
        String packDetails,
        Integer shelfLifeDays
) {
    public static ProductDto fromEntity(Product product, boolean includeWholesalePrice) {
        return new ProductDto(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                product.getImageUrl(),
                product.getCategory() != null ? product.getCategory().getId() : null,
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getRetailPrice(),
                includeWholesalePrice ? product.getWholesalePrice() : null,
                product.getUnitOfMeasure(),
                product.getMoq(),
                product.getMoqIncrement(),
                product.getStockQuantity(),
                product.isAvailable(),
                product.isEggless(),
                product.isVegetarian(),
                product.getDietaryTags(),
                product.getAllergens(),
                product.getPackDetails(),
                product.getShelfLifeDays()
        );
    }
}
