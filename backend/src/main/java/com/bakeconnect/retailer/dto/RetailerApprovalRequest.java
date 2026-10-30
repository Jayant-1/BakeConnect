package com.bakeconnect.retailer.dto;

import com.bakeconnect.retailer.entity.PaymentTerms;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record RetailerApprovalRequest(
        @NotNull(message = "Approval status is required")
        RetailerApprovalStatus approvalStatus,

        PaymentTerms paymentTerms,

        Integer customTermDays,

        @DecimalMin(value = "0.00", message = "Credit limit cannot be negative")
        BigDecimal creditLimit,

        String reason
) {}
