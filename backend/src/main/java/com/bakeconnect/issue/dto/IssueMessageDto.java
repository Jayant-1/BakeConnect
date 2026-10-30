package com.bakeconnect.issue.dto;

import com.bakeconnect.issue.entity.IssueMessage;

import java.time.Instant;
import java.util.UUID;

public record IssueMessageDto(
        UUID id,
        UUID senderId,
        String senderName,
        String senderRole,
        String message,
        boolean isInternalNote,
        Instant createdAt
) {
    public static IssueMessageDto fromEntity(IssueMessage msg) {
        return new IssueMessageDto(
                msg.getId(),
                msg.getSender().getId(),
                msg.getSender().getFullName(),
                msg.getSender().getRole().name(),
                msg.getMessage(),
                msg.isInternalNote(),
                msg.getCreatedAt()
        );
    }
}
