package com.bakeconnect.identity.dto;

import com.bakeconnect.identity.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters long")
        String password,

        @NotBlank(message = "Full name is required")
        String fullName,

        String phone,

        @NotNull(message = "Role is required")
        UserRole role,

        @Size(max = 255, message = "Business name must not exceed 255 characters")
        String businessName,

        @Size(max = 15, message = "GST number must not exceed 15 characters")
        String gstNumber,

        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode
) {
    public RegisterRequest(String email, String password, String fullName, String phone, UserRole role) {
        this(email, password, fullName, phone, role, null, null, null, null, null, null, null);
    }
}
