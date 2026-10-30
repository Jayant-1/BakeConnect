package com.bakeconnect.reporting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class RetailerChurnSignalDto {

    private UUID retailerId;
    private String businessName;
    private String contactPerson;
    private String contactPhone;
    private long daysSinceLastOrder;
    private LocalDate lastOrderDate;
    private long lifetimeOrderCount;
    private BigDecimal lifetimeRevenue;

    public RetailerChurnSignalDto() {}

    public RetailerChurnSignalDto(UUID retailerId, String businessName, String contactPerson,
                                  String contactPhone, long daysSinceLastOrder, LocalDate lastOrderDate,
                                  long lifetimeOrderCount, BigDecimal lifetimeRevenue) {
        this.retailerId = retailerId;
        this.businessName = businessName;
        this.contactPerson = contactPerson;
        this.contactPhone = contactPhone;
        this.daysSinceLastOrder = daysSinceLastOrder;
        this.lastOrderDate = lastOrderDate;
        this.lifetimeOrderCount = lifetimeOrderCount;
        this.lifetimeRevenue = lifetimeRevenue;
    }

    public UUID getRetailerId() { return retailerId; }
    public void setRetailerId(UUID retailerId) { this.retailerId = retailerId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public long getDaysSinceLastOrder() { return daysSinceLastOrder; }
    public void setDaysSinceLastOrder(long daysSinceLastOrder) { this.daysSinceLastOrder = daysSinceLastOrder; }

    public LocalDate getLastOrderDate() { return lastOrderDate; }
    public void setLastOrderDate(LocalDate lastOrderDate) { this.lastOrderDate = lastOrderDate; }

    public long getLifetimeOrderCount() { return lifetimeOrderCount; }
    public void setLifetimeOrderCount(long lifetimeOrderCount) { this.lifetimeOrderCount = lifetimeOrderCount; }

    public BigDecimal getLifetimeRevenue() { return lifetimeRevenue; }
    public void setLifetimeRevenue(BigDecimal lifetimeRevenue) { this.lifetimeRevenue = lifetimeRevenue; }
}
