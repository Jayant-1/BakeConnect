package com.bakeconnect.issue.dto;

import jakarta.validation.constraints.NotBlank;

public record IssueMessageRequest(
        @NotBlank(message = "Message content is required")
        String message,

        boolean isInternalNote
) {}
