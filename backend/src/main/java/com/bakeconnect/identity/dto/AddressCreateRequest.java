package com.bakeconnect.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AddressCreateRequest(
        String type,

        @NotBlank(message = "Contact name is required")
        String contactName,

        @NotBlank(message = "Contact phone is required")
        String contactPhone,

        @NotBlank(message = "Address line 1 is required")
        String addressLine1,

        String addressLine2,

        @NotBlank(message = "City is required")
        String city,

        @NotBlank(message = "State is required")
        String state,

        @NotBlank(message = "Postal code is required")
        @Pattern(regexp = "^[0-9]{5,10}$", message = "Postal code must be numeric between 5 and 10 digits")
        String postalCode,

        String deliveryInstructions,

        boolean isDefault
) {}
