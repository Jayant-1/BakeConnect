package com.bakeconnect.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record RecordRefundRequest(
        @NotNull(message = "Payment attempt ID is required")
        UUID paymentAttemptId,

        @NotNull(message = "Refund amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Reason is required")
        String reason,

        String referenceNumber
) {}
