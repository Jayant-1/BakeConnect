package com.bakeconnect.retailer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RetailerProfileCreateUpdateRequest(
        @NotBlank(message = "Business name is required")
        @Size(max = 255, message = "Business name must not exceed 255 characters")
        String businessName,

        @Size(max = 15, message = "GST number must not exceed 15 characters")
        String gstNumber,

        @Size(max = 255, message = "Contact person name must not exceed 255 characters")
        String contactPersonName,

        @Size(max = 50, message = "Contact phone must not exceed 50 characters")
        String contactPhone
) {}
