package com.bakeconnect.payment.entity;

import com.bakeconnect.identity.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "bank_reconciliation_records")
public class BankReconciliationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_attempt_id", nullable = false)
    private PaymentAttempt paymentAttempt;

    @Column(name = "bank_reference_number", nullable = false, length = 64)
    private String bankReferenceNumber;

    @Column(name = "receiving_account", nullable = false, length = 100)
    private String receivingAccount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciled_by", nullable = false)
    private User reconciledBy;

    @Column(name = "statement_date")
    private LocalDate statementDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public BankReconciliationRecord() {}

    public BankReconciliationRecord(PaymentAttempt paymentAttempt, String bankReferenceNumber,
                                    String receivingAccount, BigDecimal amount, User reconciledBy,
                                    LocalDate statementDate, String notes) {
        this.paymentAttempt = paymentAttempt;
        this.bankReferenceNumber = bankReferenceNumber;
        this.receivingAccount = receivingAccount;
        this.amount = amount;
        this.reconciledBy = reconciledBy;
        this.statementDate = statementDate;
        this.notes = notes;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public PaymentAttempt getPaymentAttempt() { return paymentAttempt; }
    public String getBankReferenceNumber() { return bankReferenceNumber; }
    public String getReceivingAccount() { return receivingAccount; }
    public BigDecimal getAmount() { return amount; }
    public User getReconciledBy() { return reconciledBy; }
    public LocalDate getStatementDate() { return statementDate; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
