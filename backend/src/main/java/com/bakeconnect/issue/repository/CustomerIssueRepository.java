package com.bakeconnect.issue.repository;

import com.bakeconnect.issue.entity.CustomerIssue;
import com.bakeconnect.issue.entity.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CustomerIssueRepository extends JpaRepository<CustomerIssue, UUID> {

    Page<CustomerIssue> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<CustomerIssue> findByStatusOrderByCreatedAtDesc(IssueStatus status, Pageable pageable);

    Page<CustomerIssue> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<CustomerIssue> findByOrderId(UUID orderId);

    long countByStatus(IssueStatus status);
}
