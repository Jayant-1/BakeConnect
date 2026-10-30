package com.bakeconnect.issue.repository;

import com.bakeconnect.issue.entity.IssueMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IssueMessageRepository extends JpaRepository<IssueMessage, UUID> {

    List<IssueMessage> findByIssueIdOrderByCreatedAtAsc(UUID issueId);

    List<IssueMessage> findByIssueIdAndIsInternalNoteFalseOrderByCreatedAtAsc(UUID issueId);
}
