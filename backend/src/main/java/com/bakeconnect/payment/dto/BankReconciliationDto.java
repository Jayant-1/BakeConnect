package com.bakeconnect.payment.dto;

import com.bakeconnect.payment.entity.BankReconciliationRecord;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record BankReconciliationDto(
        UUID id,
        UUID paymentAttemptId,
        String bankReferenceNumber,
        String receivingAccount,
        BigDecimal amount,
        UUID reconciledById,
        String reconciledByName,
        LocalDate statementDate,
        String notes,
        Instant createdAt
) {
    public static BankReconciliationDto fromEntity(BankReconciliationRecord record) {
        return new BankReconciliationDto(
                record.getId(),
                record.getPaymentAttempt().getId(),
                record.getBankReferenceNumber(),
                record.getReceivingAccount(),
                record.getAmount(),
                record.getReconciledBy() != null ? record.getReconciledBy().getId() : null,
                record.getReconciledBy() != null ? record.getReconciledBy().getFullName() : "N/A",
                record.getStatementDate(),
                record.getNotes(),
                record.getCreatedAt()
        );
    }
}
