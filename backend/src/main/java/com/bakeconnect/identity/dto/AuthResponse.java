package com.bakeconnect.identity.dto;

import com.bakeconnect.identity.entity.UserRole;
import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        String email,
        String fullName,
        UserRole role
) {}
