package com.bakeconnect.issue.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.issue.dto.CustomerIssueDto;
import com.bakeconnect.issue.dto.IssueMessageRequest;
import com.bakeconnect.issue.entity.IssueStatus;
import com.bakeconnect.issue.service.CustomerIssueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager/issues")
@PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
@Tag(name = "Manager Issues", description = "Staff interface for reviewing customer support issues and resolution")
@SecurityRequirement(name = "BearerAuth")
public class StaffIssueController {

    private final CustomerIssueService issueService;

    public StaffIssueController(CustomerIssueService issueService) {
        this.issueService = issueService;
    }

    @GetMapping
    @Operation(summary = "List all customer support issues with optional status filter")
    public ResponseEntity<ApiResponse<Page<CustomerIssueDto>>> getAllIssues(
            @RequestParam(required = false) IssueStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CustomerIssueDto> issues = issueService.getAllIssuesForStaff(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(issues));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get full issue thread including internal staff notes")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> getIssueDetails(@PathVariable UUID id) {
        CustomerIssueDto issue = issueService.getIssueDetailsForStaff(id);
        return ResponseEntity.ok(ApiResponse.success(issue));
    }

    @PostMapping("/{id}/messages")
    @Operation(summary = "Staff reply or internal staff note on an issue")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> addMessage(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody IssueMessageRequest request) {
        CustomerIssueDto updated = issueService.addMessage(id, currentUser.getId(), true, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Message posted successfully"));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update issue status (e.g. RESOLVED, CLOSED) with resolution notes")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> updateStatus(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        String resolutionNotes = body.get("resolutionNotes");
        IssueStatus status = IssueStatus.valueOf(statusStr);
        CustomerIssueDto updated = issueService.updateStatus(id, status, resolutionNotes, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(updated, "Issue status updated successfully"));
    }

    @PatchMapping("/{id}/assign")
    @Operation(summary = "Assign issue to staff member")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> assignIssue(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @RequestParam(required = false) UUID staffId) {
        UUID assignee = staffId != null ? staffId : currentUser.getId();
        CustomerIssueDto updated = issueService.assignIssue(id, assignee);
        return ResponseEntity.ok(ApiResponse.success(updated, "Issue assigned successfully"));
    }
}
