package com.bakeconnect.catalog.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryCreateUpdateRequest(
        @NotBlank(message = "Category name is required")
        String name,

        @NotBlank(message = "Slug is required")
        String slug,

        String description,
        String imageUrl,
        int displayOrder
) {}
