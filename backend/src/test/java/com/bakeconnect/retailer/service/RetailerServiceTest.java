package com.bakeconnect.retailer.service;

import com.bakeconnect.common.exception.BusinessRuleException;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RetailerServiceTest {

    @Mock
    private RetailerProfileRepository retailerProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationOutboxRepository notificationOutboxRepository;

    @InjectMocks
    private RetailerService retailerService;

    private User retailerUser;
    private User customerUser;
    private RetailerProfile profile;

    @BeforeEach
    void setUp() {
        retailerUser = new User("retailer@test.com", "hash", "Jane Retailer", "9876543210", UserRole.RETAILER);
        retailerUser.setId(UUID.randomUUID());

        customerUser = new User("customer@test.com", "hash", "John Customer", "9876543211", UserRole.DIRECT_CUSTOMER);
        customerUser.setId(UUID.randomUUID());

        profile = new RetailerProfile(
                retailerUser,
                "Baker Street Treats",
                "27AAPFU0939F1ZV",
                "Jane Retailer",
                "9876543210"
        );
        profile.setId(UUID.randomUUID());
    }

    @Test
    void submitProfile_Success_NewProfile() {
        when(userRepository.findById(retailerUser.getId())).thenReturn(Optional.of(retailerUser));
        when(retailerProfileRepository.findByUserId(retailerUser.getId())).thenReturn(Optional.empty());
        when(retailerProfileRepository.existsByGstNumber("27AAPFU0939F1ZV")).thenReturn(false);
        when(retailerProfileRepository.save(any(RetailerProfile.class))).thenAnswer(inv -> {
            RetailerProfile p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        RetailerProfileCreateUpdateRequest request = new RetailerProfileCreateUpdateRequest(
                "Baker Street Treats",
                "27AAPFU0939F1ZV",
                "Jane Retailer",
                "9876543210"
        );

        RetailerProfileDto result = retailerService.submitProfile(retailerUser.getId(), request);

        assertNotNull(result);
        assertEquals("Baker Street Treats", result.businessName());
        assertEquals("27AAPFU0939F1ZV", result.gstNumber());
        assertEquals(RetailerApprovalStatus.PENDING_APPROVAL, result.approvalStatus());
        assertEquals(PaymentTerms.IMMEDIATE, result.paymentTerms());
    }

    @Test
    void submitProfile_InvalidGst_ThrowsException() {
        when(userRepository.findById(retailerUser.getId())).thenReturn(Optional.of(retailerUser));

        RetailerProfileCreateUpdateRequest request = new RetailerProfileCreateUpdateRequest(
                "Baker Street Treats",
                "INVALID_GST_123",
                "Jane Retailer",
                "9876543210"
        );

        BusinessRuleException ex = assertThrows(BusinessRuleException.class, () ->
                retailerService.submitProfile(retailerUser.getId(), request));

        assertTrue(ex.getMessage().contains("Invalid GSTIN format"));
    }

    @Test
    void submitProfile_NonRetailerRole_ThrowsException() {
        when(userRepository.findById(customerUser.getId())).thenReturn(Optional.of(customerUser));

        RetailerProfileCreateUpdateRequest request = new RetailerProfileCreateUpdateRequest(
                "Baker Street Treats",
                "27AAPFU0939F1ZV",
                "Jane Retailer",
                "9876543210"
        );

        BusinessRuleException ex = assertThrows(BusinessRuleException.class, () ->
                retailerService.submitProfile(customerUser.getId(), request));

        assertTrue(ex.getMessage().contains("Only users with RETAILER role"));
    }

    @Test
    void updateApprovalStatus_Approved_WithTermsAndCreditLimit() {
        when(retailerProfileRepository.findById(profile.getId())).thenReturn(Optional.of(profile));
        when(retailerProfileRepository.save(any(RetailerProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        RetailerApprovalRequest request = new RetailerApprovalRequest(
                RetailerApprovalStatus.APPROVED,
                PaymentTerms.NET_15_DAYS,
                null,
                new BigDecimal("50000.00"),
                "Approved after credit verification"
        );

        RetailerProfileDto updated = retailerService.updateApprovalStatus(profile.getId(), request);

        assertEquals(RetailerApprovalStatus.APPROVED, updated.approvalStatus());
        assertEquals(PaymentTerms.NET_15_DAYS, updated.paymentTerms());
        assertEquals(new BigDecimal("50000.00"), updated.creditLimit());

        verify(notificationOutboxRepository, times(1)).save(any(NotificationOutbox.class));
    }

    @Test
    void getProfileById_IDOR_ThrowsException() {
        when(retailerProfileRepository.findById(profile.getId())).thenReturn(Optional.of(profile));

        UUID otherUserId = UUID.randomUUID();
        assertThrows(BusinessRuleException.class, () ->
                retailerService.getProfileById(profile.getId(), otherUserId, false));
    }
}
