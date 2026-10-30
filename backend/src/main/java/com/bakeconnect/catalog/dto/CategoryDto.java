package com.bakeconnect.catalog.dto;

import com.bakeconnect.catalog.entity.Category;
import java.util.UUID;

public record CategoryDto(
        UUID id,
        String name,
        String slug,
        String description,
        String imageUrl,
        int displayOrder
) {
    public static CategoryDto fromEntity(Category category) {
        return new CategoryDto(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getDescription(),
                category.getImageUrl(),
                category.getDisplayOrder()
        );
    }
}
