package com.bakeconnect.payment.dto;

import com.bakeconnect.payment.entity.OfflinePayment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OfflinePaymentDto(
        UUID id,
        UUID orderId,
        String orderNumber,
        UUID invoiceId,
        UUID recordedById,
        String recordedByName,
        BigDecimal amount,
        String paymentMethod,
        String referenceNumber,
        String notes,
        Instant recordedAt
) {
    public static OfflinePaymentDto fromEntity(OfflinePayment p) {
        return new OfflinePaymentDto(
                p.getId(),
                p.getOrder() != null ? p.getOrder().getId() : null,
                p.getOrder() != null ? p.getOrder().getOrderNumber() : null,
                p.getInvoiceId(),
                p.getRecordedBy().getId(),
                p.getRecordedBy().getFullName(),
                p.getAmount(),
                p.getPaymentMethod(),
                p.getReferenceNumber(),
                p.getNotes(),
                p.getRecordedAt()
        );
    }
}
