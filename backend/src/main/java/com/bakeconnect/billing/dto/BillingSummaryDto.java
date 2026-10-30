package com.bakeconnect.billing.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class BillingSummaryDto {

    private UUID retailerId;
    private String businessName;
    private BigDecimal creditLimit;
    private BigDecimal totalOutstandingBalance;
    private BigDecimal availableCredit;
    private BigDecimal totalOverdueAmount;
    private long openInvoicesCount;
    private long overdueInvoicesCount;

    public BillingSummaryDto() {}

    public BillingSummaryDto(UUID retailerId, String businessName, BigDecimal creditLimit,
                             BigDecimal totalOutstandingBalance, BigDecimal availableCredit,
                             BigDecimal totalOverdueAmount, long openInvoicesCount, long overdueInvoicesCount) {
        this.retailerId = retailerId;
        this.businessName = businessName;
        this.creditLimit = creditLimit;
        this.totalOutstandingBalance = totalOutstandingBalance;
        this.availableCredit = availableCredit;
        this.totalOverdueAmount = totalOverdueAmount;
        this.openInvoicesCount = openInvoicesCount;
        this.overdueInvoicesCount = overdueInvoicesCount;
    }

    public UUID getRetailerId() { return retailerId; }
    public void setRetailerId(UUID retailerId) { this.retailerId = retailerId; }

    public String getBusinessName() { return businessName; }
    public void setBusinessName(String businessName) { this.businessName = businessName; }

    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }

    public BigDecimal getTotalOutstandingBalance() { return totalOutstandingBalance; }
    public void setTotalOutstandingBalance(BigDecimal totalOutstandingBalance) { this.totalOutstandingBalance = totalOutstandingBalance; }

    public BigDecimal getAvailableCredit() { return availableCredit; }
    public void setAvailableCredit(BigDecimal availableCredit) { this.availableCredit = availableCredit; }

    public BigDecimal getTotalOverdueAmount() { return totalOverdueAmount; }
    public void setTotalOverdueAmount(BigDecimal totalOverdueAmount) { this.totalOverdueAmount = totalOverdueAmount; }

    public long getOpenInvoicesCount() { return openInvoicesCount; }
    public void setOpenInvoicesCount(long openInvoicesCount) { this.openInvoicesCount = openInvoicesCount; }

    public long getOverdueInvoicesCount() { return overdueInvoicesCount; }
    public void setOverdueInvoicesCount(long overdueInvoicesCount) { this.overdueInvoicesCount = overdueInvoicesCount; }
}
