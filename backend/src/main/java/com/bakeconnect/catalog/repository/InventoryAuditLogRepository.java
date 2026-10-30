package com.bakeconnect.catalog.repository;

import com.bakeconnect.catalog.entity.InventoryAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryAuditLogRepository extends JpaRepository<InventoryAuditLog, UUID> {

    List<InventoryAuditLog> findTop50ByOrderByCreatedAtDesc();

    Page<InventoryAuditLog> findByProductIdOrderByCreatedAtDesc(UUID productId, Pageable pageable);

    Page<InventoryAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
