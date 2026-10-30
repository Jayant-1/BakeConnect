package com.bakeconnect.retailer.repository;

import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.entity.RetailerProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RetailerProfileRepository extends JpaRepository<RetailerProfile, UUID> {

    Optional<RetailerProfile> findByUserId(UUID userId);

    Page<RetailerProfile> findByApprovalStatusOrderByCreatedAtDesc(RetailerApprovalStatus approvalStatus, Pageable pageable);

    boolean existsByGstNumber(String gstNumber);
}
