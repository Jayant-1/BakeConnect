package com.bakeconnect.issue.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateIssueRequest(
        UUID orderId,

        @NotBlank(message = "Category is required")
        String category,

        @NotBlank(message = "Short description is required")
        @Size(max = 255, message = "Description must be within 255 characters")
        String shortDescription,

        @NotBlank(message = "Initial message is required")
        String message
) {}
