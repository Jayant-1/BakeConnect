package com.bakeconnect.payment.repository;

import com.bakeconnect.payment.entity.OfflinePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OfflinePaymentRepository extends JpaRepository<OfflinePayment, UUID> {

    List<OfflinePayment> findByOrderIdOrderByRecordedAtDesc(UUID orderId);

    List<OfflinePayment> findByInvoiceIdOrderByRecordedAtDesc(UUID invoiceId);

    List<OfflinePayment> findTop50ByOrderByRecordedAtDesc();
}
