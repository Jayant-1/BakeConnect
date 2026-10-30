package com.bakeconnect.billing.repository;

import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.billing.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    Optional<Invoice> findByOrderId(UUID orderId);

    Page<Invoice> findByRetailerId(UUID retailerId, Pageable pageable);

    Page<Invoice> findByRetailerIdAndStatus(UUID retailerId, InvoiceStatus status, Pageable pageable);

    List<Invoice> findByRetailerIdAndStatusIn(UUID retailerId, Collection<InvoiceStatus> statuses);

    @Query("SELECT i FROM Invoice i WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :currentDate")
    List<Invoice> findOverdueInvoices(@Param("currentDate") LocalDate currentDate);

    @Query("SELECT COALESCE(SUM(i.balanceAmount), 0.00) FROM Invoice i WHERE i.retailer.id = :retailerId AND i.status IN ('ISSUED', 'PARTIALLY_PAID')")
    BigDecimal sumOutstandingBalanceByRetailerId(@Param("retailerId") UUID retailerId);

    @Query("SELECT COALESCE(SUM(i.balanceAmount), 0.00) FROM Invoice i WHERE i.retailer.id = :retailerId AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :currentDate")
    BigDecimal sumOverdueBalanceByRetailerId(@Param("retailerId") UUID retailerId, @Param("currentDate") LocalDate currentDate);

    long countByRetailerIdAndStatusIn(UUID retailerId, Collection<InvoiceStatus> statuses);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.retailer.id = :retailerId AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.dueDate < :currentDate")
    long countOverdueByRetailerId(@Param("retailerId") UUID retailerId, @Param("currentDate") LocalDate currentDate);
}
