package com.bakeconnect.catalog.dto;

import com.bakeconnect.catalog.entity.InventoryAuditLog;

import java.time.Instant;
import java.util.UUID;

public record InventoryAuditLogDto(
        UUID id,
        UUID productId,
        String productName,
        UUID adjustedById,
        String adjustedByName,
        int previousQuantity,
        int newQuantity,
        int changeAmount,
        String reasonCode,
        String notes,
        Instant createdAt
) {
    public static InventoryAuditLogDto fromEntity(InventoryAuditLog log) {
        return new InventoryAuditLogDto(
                log.getId(),
                log.getProduct().getId(),
                log.getProduct().getName(),
                log.getAdjustedBy().getId(),
                log.getAdjustedBy().getFullName(),
                log.getPreviousQuantity(),
                log.getNewQuantity(),
                log.getChangeAmount(),
                log.getReasonCode(),
                log.getNotes(),
                log.getCreatedAt()
        );
    }
}
