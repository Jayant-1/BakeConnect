package com.bakeconnect.identity.dto;

import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import java.time.Instant;
import java.util.UUID;

public record UserProfileDto(
        UUID id,
        String email,
        String fullName,
        String phone,
        UserRole role,
        boolean isEmailVerified,
        Instant createdAt
) {
    public static UserProfileDto fromEntity(User user) {
        return new UserProfileDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getRole(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
