package com.bakeconnect.payment.dto;

import com.bakeconnect.payment.entity.PaymentRefundRecord;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentRefundDto(
        UUID id,
        UUID paymentAttemptId,
        UUID orderId,
        String orderNumber,
        BigDecimal amount,
        String currency,
        String reason,
        String referenceNumber,
        UUID recordedById,
        String recordedByName,
        Instant createdAt
) {
    public static PaymentRefundDto fromEntity(PaymentRefundRecord record) {
        return new PaymentRefundDto(
                record.getId(),
                record.getPaymentAttempt().getId(),
                record.getOrder() != null ? record.getOrder().getId() : null,
                record.getOrder() != null ? record.getOrder().getOrderNumber() : "N/A",
                record.getAmount(),
                record.getCurrency(),
                record.getReason(),
                record.getReferenceNumber(),
                record.getRecordedBy() != null ? record.getRecordedBy().getId() : null,
                record.getRecordedBy() != null ? record.getRecordedBy().getFullName() : "N/A",
                record.getCreatedAt()
        );
    }
}
