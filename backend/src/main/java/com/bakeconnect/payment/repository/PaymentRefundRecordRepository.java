package com.bakeconnect.payment.repository;

import com.bakeconnect.payment.entity.PaymentRefundRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRefundRecordRepository extends JpaRepository<PaymentRefundRecord, UUID> {

    List<PaymentRefundRecord> findByPaymentAttemptId(UUID paymentAttemptId);

    List<PaymentRefundRecord> findByOrderId(UUID orderId);

    Page<PaymentRefundRecord> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
