package com.bakeconnect.retailer.dto;

import com.bakeconnect.retailer.entity.PaymentTerms;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.entity.RetailerProfile;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RetailerProfileDto(
        UUID id,
        UUID userId,
        String userEmail,
        String userFullName,
        String businessName,
        String gstNumber,
        String contactPersonName,
        String contactPhone,
        RetailerApprovalStatus approvalStatus,
        PaymentTerms paymentTerms,
        Integer customTermDays,
        BigDecimal creditLimit,
        Instant createdAt,
        Instant updatedAt
) {
    public static RetailerProfileDto fromEntity(RetailerProfile profile) {
        return new RetailerProfileDto(
                profile.getId(),
                profile.getUser().getId(),
                profile.getUser().getEmail(),
                profile.getUser().getFullName(),
                profile.getBusinessName(),
                profile.getGstNumber(),
                profile.getContactPersonName(),
                profile.getContactPhone(),
                profile.getApprovalStatus(),
                profile.getPaymentTerms(),
                profile.getCustomTermDays(),
                profile.getCreditLimit(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
