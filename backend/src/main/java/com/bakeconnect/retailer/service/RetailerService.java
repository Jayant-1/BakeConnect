package com.bakeconnect.retailer.service;

import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.common.util.GstValidator;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.retailer.dto.RetailerApprovalRequest;
import com.bakeconnect.retailer.dto.RetailerProfileCreateUpdateRequest;
import com.bakeconnect.retailer.dto.RetailerProfileDto;
import com.bakeconnect.retailer.entity.PaymentTerms;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.entity.RetailerProfile;
import com.bakeconnect.retailer.repository.RetailerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class RetailerService {

    private static final Logger log = LoggerFactory.getLogger(RetailerService.class);

    private final RetailerProfileRepository retailerProfileRepository;
    private final UserRepository userRepository;
    private final NotificationOutboxRepository notificationOutboxRepository;

    public RetailerService(RetailerProfileRepository retailerProfileRepository,
                           UserRepository userRepository,
                           NotificationOutboxRepository notificationOutboxRepository) {
        this.retailerProfileRepository = retailerProfileRepository;
        this.userRepository = userRepository;
        this.notificationOutboxRepository = notificationOutboxRepository;
    }

    @Transactional
    public RetailerProfileDto submitProfile(UUID userId, RetailerProfileCreateUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.getRole() != UserRole.RETAILER && user.getRole() != UserRole.BAKERY_ADMIN) {
            throw new BusinessRuleException("Only users with RETAILER role can create a retailer profile");
        }

        String gstNumber = null;
        if (request.gstNumber() != null && !request.gstNumber().isBlank()) {
            gstNumber = request.gstNumber().trim().toUpperCase();
            if (!GstValidator.isValid(gstNumber)) {
                throw new BusinessRuleException("Invalid GSTIN format: " + gstNumber);
            }
        }

        RetailerProfile profile = retailerProfileRepository.findByUserId(userId).orElse(null);

        if (profile == null) {
            if (gstNumber != null && retailerProfileRepository.existsByGstNumber(gstNumber)) {
                throw new BusinessRuleException("A retailer profile with this GSTIN already exists: " + gstNumber);
            }
            profile = new RetailerProfile(
                    user,
                    request.businessName().trim(),
                    gstNumber,
                    request.contactPersonName(),
                    request.contactPhone()
            );
        } else {
            if (gstNumber != null && !gstNumber.equals(profile.getGstNumber())) {
                if (retailerProfileRepository.existsByGstNumber(gstNumber)) {
                    throw new BusinessRuleException("A retailer profile with this GSTIN already exists: " + gstNumber);
                }
                profile.setGstNumber(gstNumber);
            }
            profile.setBusinessName(request.businessName().trim());
            profile.setContactPersonName(request.contactPersonName());
            profile.setContactPhone(request.contactPhone());
            profile.setApprovalStatus(RetailerApprovalStatus.PENDING_APPROVAL);
        }

        RetailerProfile saved = retailerProfileRepository.save(profile);
        log.info("Retailer profile {} submitted for user {}", saved.getId(), user.getEmail());
        return RetailerProfileDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public RetailerProfileDto getMyProfile(UUID currentUserId) {
        RetailerProfile profile = retailerProfileRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Retailer profile not found for user: " + currentUserId));
        return RetailerProfileDto.fromEntity(profile);
    }

    @Transactional(readOnly = true)
    public RetailerProfileDto getProfileById(UUID profileId, UUID currentUserId, boolean isAdmin) {
        RetailerProfile profile = retailerProfileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("RetailerProfile", "id", profileId));

        if (!isAdmin && !profile.getUser().getId().equals(currentUserId)) {
            throw new BusinessRuleException("Unauthorized to access this retailer profile");
        }

        return RetailerProfileDto.fromEntity(profile);
    }

    @Transactional(readOnly = true)
    public Page<RetailerProfileDto> getAllProfiles(RetailerApprovalStatus status, Pageable pageable) {
        if (status != null) {
            return retailerProfileRepository.findByApprovalStatusOrderByCreatedAtDesc(status, pageable)
                    .map(RetailerProfileDto::fromEntity);
        }
        return retailerProfileRepository.findAll(pageable)
                .map(RetailerProfileDto::fromEntity);
    }

    @Transactional
    public RetailerProfileDto updateApprovalStatus(UUID profileId, RetailerApprovalRequest request) {
        RetailerProfile profile = retailerProfileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("RetailerProfile", "id", profileId));

        profile.setApprovalStatus(request.approvalStatus());

        if (request.paymentTerms() != null) {
            profile.setPaymentTerms(request.paymentTerms());
            if (request.paymentTerms() == PaymentTerms.CUSTOM) {
                if (request.customTermDays() == null || request.customTermDays() <= 0) {
                    throw new BusinessRuleException("Custom payment terms require positive customTermDays");
                }
                profile.setCustomTermDays(request.customTermDays());
            } else {
                profile.setCustomTermDays(null);
            }
        }

        if (request.creditLimit() != null) {
            profile.setCreditLimit(request.creditLimit());
        }

        RetailerProfile saved = retailerProfileRepository.save(profile);

        // Queue notification outbox entry
        try {
            NotificationOutbox outbox = new NotificationOutbox(
                    profile.getUser().getEmail(),
                    "Retailer Account Status: " + request.approvalStatus(),
                    "RETAILER_APPROVAL_UPDATE",
                    String.format("{\"status\":\"%s\",\"paymentTerms\":\"%s\",\"creditLimit\":\"%s\",\"reason\":\"%s\"}",
                            request.approvalStatus(),
                            profile.getPaymentTerms(),
                            profile.getCreditLimit(),
                            request.reason() != null ? request.reason() : "")
            );
            notificationOutboxRepository.save(outbox);
        } catch (Exception e) {
            log.error("Failed to enqueue approval notification for retailer {}", profile.getUser().getEmail(), e);
        }

        log.info("Retailer profile {} updated to status {} by admin", profileId, request.approvalStatus());
        return RetailerProfileDto.fromEntity(saved);
    }
}
