package com.bakeconnect.payment.repository;

import com.bakeconnect.payment.entity.BankReconciliationRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankReconciliationRecordRepository extends JpaRepository<BankReconciliationRecord, UUID> {

    Optional<BankReconciliationRecord> findByPaymentAttemptId(UUID paymentAttemptId);

    Optional<BankReconciliationRecord> findByBankReferenceNumber(String bankReferenceNumber);

    Page<BankReconciliationRecord> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
