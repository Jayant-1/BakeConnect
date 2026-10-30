package com.bakeconnect.issue.dto;

import com.bakeconnect.issue.entity.CustomerIssue;
import com.bakeconnect.issue.entity.IssueStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CustomerIssueDto(
        UUID id,
        UUID userId,
        String userName,
        String userEmail,
        UUID orderId,
        String category,
        String shortDescription,
        IssueStatus status,
        UUID assignedToId,
        String assignedToName,
        String resolutionNotes,
        Instant createdAt,
        Instant updatedAt,
        List<IssueMessageDto> messages
) {
    public static CustomerIssueDto fromEntity(CustomerIssue issue, boolean includeInternalNotes) {
        List<IssueMessageDto> msgs = issue.getMessages().stream()
                .filter(m -> includeInternalNotes || !m.isInternalNote())
                .map(IssueMessageDto::fromEntity)
                .toList();

        return new CustomerIssueDto(
                issue.getId(),
                issue.getUser().getId(),
                issue.getUser().getFullName(),
                issue.getUser().getEmail(),
                issue.getOrderId(),
                issue.getCategory(),
                issue.getShortDescription(),
                issue.getStatus(),
                issue.getAssignedTo() != null ? issue.getAssignedTo().getId() : null,
                issue.getAssignedTo() != null ? issue.getAssignedTo().getFullName() : null,
                issue.getResolutionNotes(),
                issue.getCreatedAt(),
                issue.getUpdatedAt(),
                msgs
        );
    }
}
