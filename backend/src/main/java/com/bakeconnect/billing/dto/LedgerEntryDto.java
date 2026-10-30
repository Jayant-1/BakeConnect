package com.bakeconnect.billing.dto;

import com.bakeconnect.billing.entity.LedgerEntryType;
import com.bakeconnect.billing.entity.RetailerLedgerEntry;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class LedgerEntryDto {

    private UUID id;
    private UUID retailerId;
    private UUID orderId;
    private String orderNumber;
    private UUID invoiceId;
    private String invoiceNumber;
    private LedgerEntryType entryType;
    private BigDecimal amount;
    private BigDecimal runningBalance;
    private String referenceNumber;
    private String notes;
    private Instant entryTimestamp;

    public LedgerEntryDto() {}

    public static LedgerEntryDto fromEntity(RetailerLedgerEntry entry) {
        LedgerEntryDto dto = new LedgerEntryDto();
        dto.setId(entry.getId());
        if (entry.getRetailer() != null) {
            dto.setRetailerId(entry.getRetailer().getId());
        }
        if (entry.getOrder() != null) {
            dto.setOrderId(entry.getOrder().getId());
            dto.setOrderNumber(entry.getOrder().getOrderNumber());
        }
        if (entry.getInvoice() != null) {
            dto.setInvoiceId(entry.getInvoice().getId());
            dto.setInvoiceNumber(entry.getInvoice().getInvoiceNumber());
        }
        dto.setEntryType(entry.getEntryType());
        dto.setAmount(entry.getAmount());
        dto.setRunningBalance(entry.getRunningBalance());
        dto.setReferenceNumber(entry.getReferenceNumber());
        dto.setNotes(entry.getNotes());
        dto.setEntryTimestamp(entry.getEntryTimestamp());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getRetailerId() { return retailerId; }
    public void setRetailerId(UUID retailerId) { this.retailerId = retailerId; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public UUID getInvoiceId() { return invoiceId; }
    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LedgerEntryType getEntryType() { return entryType; }
    public void setEntryType(LedgerEntryType entryType) { this.entryType = entryType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getRunningBalance() { return runningBalance; }
    public void setRunningBalance(BigDecimal runningBalance) { this.runningBalance = runningBalance; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getEntryTimestamp() { return entryTimestamp; }
    public void setEntryTimestamp(Instant entryTimestamp) { this.entryTimestamp = entryTimestamp; }
}
