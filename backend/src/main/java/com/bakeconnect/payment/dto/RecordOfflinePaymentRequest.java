package com.bakeconnect.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record RecordOfflinePaymentRequest(
        UUID orderId,
        UUID invoiceId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        @NotBlank(message = "Payment method is required (CASH, UPI, CHEQUE, BANK_TRANSFER)")
        String paymentMethod,

        String referenceNumber,
        String notes
) {}
