package com.bakeconnect.retailer.entity;

import com.bakeconnect.identity.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "retailer_profiles")
public class RetailerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "business_name", nullable = false)
    private String businessName;

    @Column(name = "gst_number", length = 15)
    private String gstNumber;

    @Column(name = "contact_person_name")
    private String contactPersonName;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 50)
    private RetailerApprovalStatus approvalStatus = RetailerApprovalStatus.PENDING_APPROVAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_terms", nullable = false, length = 50)
    private PaymentTerms paymentTerms = PaymentTerms.IMMEDIATE;

    @Column(name = "custom_term_days")
    private Integer customTermDays;

    @Column(name = "credit_limit", nullable = false, precision = 14, scale = 2)
    private BigDecimal creditLimit = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public RetailerProfile() {}

    public RetailerProfile(User user, String businessName, String gstNumber,
                           String contactPersonName, String contactPhone) {
        this.user = user;
        this.businessName = businessName;
        this.gstNumber = gstNumber;
        this.contactPersonName = contactPersonName;
        this.contactPhone = contactPhone;
        this.approvalStatus = RetailerApprovalStatus.PENDING_APPROVAL;
        this.paymentTerms = PaymentTerms.IMMEDIATE;
        this.creditLimit = BigDecimal.ZERO;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }

    public String getContactPersonName() { return contactPersonName; }
    public void setContactPersonName(String contactPersonName) { this.contactPersonName = contactPersonName; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public RetailerApprovalStatus getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(RetailerApprovalStatus approvalStatus) { this.approvalStatus = approvalStatus; }

    public PaymentTerms getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(PaymentTerms paymentTerms) { this.paymentTerms = paymentTerms; }

    public Integer getCustomTermDays() { return customTermDays; }
    public void setCustomTermDays(Integer customTermDays) { this.customTermDays = customTermDays; }

    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
