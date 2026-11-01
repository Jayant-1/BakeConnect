package com.bakeconnect.payment.repository;

import com.bakeconnect.payment.entity.PaymentAttempt;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.entity.PaymentSettlementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, UUID> {

    Optional<PaymentAttempt> findByIdempotencyKey(String idempotencyKey);

    Optional<PaymentAttempt> findByProviderReference(String providerReference);

    Optional<PaymentAttempt> findByProviderAndProviderReference(String provider, String providerReference);

    List<PaymentAttempt> findByOrderId(UUID orderId);

    Optional<PaymentAttempt> findFirstByOrderIdAndStatusIn(UUID orderId, Collection<PaymentAttemptStatus> statuses);

    Optional<PaymentAttempt> findByReceivingAccountAndUtr(String receivingAccount, String utr);

    Page<PaymentAttempt> findByStatusIn(Collection<PaymentAttemptStatus> statuses, Pageable pageable);

    Page<PaymentAttempt> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT pa FROM PaymentAttempt pa WHERE (:status IS NULL OR pa.status = :status) AND (:provider IS NULL OR pa.provider = :provider) ORDER BY pa.createdAt DESC")
    Page<PaymentAttempt> findWithFilters(@Param("status") PaymentAttemptStatus status,
                                         @Param("provider") String provider,
                                         Pageable pageable);

    @Query("SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAttempt pa WHERE pa.status = 'RECONCILED' OR pa.settlementStatus = 'RECONCILED'")
    BigDecimal sumReconciledAmount();

    @Query("SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAttempt pa WHERE pa.status = 'OBSERVED_SUCCESS' AND (pa.settlementStatus IS NULL OR pa.settlementStatus = 'NOT_RECONCILED')")
    BigDecimal sumObservedUnreconciledAmount();

    long countByStatus(PaymentAttemptStatus status);

    @Query("SELECT pa.amount FROM PaymentAttempt pa WHERE pa.status IN :statuses AND (pa.receivingAccount = :receivingAccount OR :receivingAccount IS NULL OR pa.receivingAccount IS NULL) AND pa.amount >= :minAmount AND pa.amount <= :maxAmount")
    List<BigDecimal> findActiveAmounts(
            @Param("receivingAccount") String receivingAccount,
            @Param("statuses") Collection<PaymentAttemptStatus> statuses,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount
    );

    @Query("SELECT COUNT(pa) FROM PaymentAttempt pa WHERE pa.user.id = :userId AND pa.status IN :statuses")
    long countActiveAttemptsByUser(
            @Param("userId") UUID userId,
            @Param("statuses") Collection<PaymentAttemptStatus> statuses
    );

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE PaymentAttempt pa SET pa.status = com.bakeconnect.payment.entity.PaymentAttemptStatus.EXPIRED, pa.updatedAt = CURRENT_TIMESTAMP WHERE pa.status IN :activeStatuses AND pa.expiresAt IS NOT NULL AND pa.expiresAt < :now")
    int sweepExpiredAttempts(
            @Param("activeStatuses") Collection<PaymentAttemptStatus> activeStatuses,
            @Param("now") java.time.Instant now
    );
}
