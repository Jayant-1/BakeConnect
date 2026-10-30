package com.bakeconnect.billing.repository;

import com.bakeconnect.billing.entity.RetailerLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RetailerLedgerRepository extends JpaRepository<RetailerLedgerEntry, UUID> {

    Page<RetailerLedgerEntry> findByRetailerIdOrderByEntryTimestampDesc(UUID retailerId, Pageable pageable);

    Optional<RetailerLedgerEntry> findFirstByRetailerIdOrderByEntryTimestampDesc(UUID retailerId);
}
