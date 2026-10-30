package com.bakeconnect.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BankReconciliationRequest(
        @NotNull(message = "Payment attempt ID is required")
        UUID paymentAttemptId,

        @NotBlank(message = "Bank reference number is required")
        String bankReferenceNumber,

        @NotBlank(message = "Receiving account is required")
        String receivingAccount,

        @NotNull(message = "Reconciled amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        LocalDate statementDate,
        String notes
) {}
