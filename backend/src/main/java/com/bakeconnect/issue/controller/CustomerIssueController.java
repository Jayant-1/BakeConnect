package com.bakeconnect.issue.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.issue.dto.CreateIssueRequest;
import com.bakeconnect.issue.dto.CustomerIssueDto;
import com.bakeconnect.issue.dto.IssueMessageRequest;
import com.bakeconnect.issue.service.CustomerIssueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/issues")
@Tag(name = "Customer Issues", description = "Customer support tickets, dispute reports, and order problem resolution")
@SecurityRequirement(name = "BearerAuth")
public class CustomerIssueController {

    private final CustomerIssueService issueService;

    public CustomerIssueController(CustomerIssueService issueService) {
        this.issueService = issueService;
    }

    @PostMapping
    @Operation(summary = "Submit a customer support or order issue ticket")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> createIssue(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody CreateIssueRequest request) {
        CustomerIssueDto issue = issueService.createIssue(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(issue, "Support ticket created successfully"));
    }

    @GetMapping
    @Operation(summary = "Get user's submitted support issues")
    public ResponseEntity<ApiResponse<Page<CustomerIssueDto>>> getMyIssues(
            @AuthenticationPrincipal SecurityUser currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CustomerIssueDto> issues = issueService.getMyIssues(currentUser.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(issues));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get support ticket details and customer messages")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> getMyIssueDetails(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id) {
        CustomerIssueDto issue = issueService.getMyIssueDetails(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(issue));
    }

    @PostMapping("/{id}/messages")
    @Operation(summary = "Reply to a support ticket")
    public ResponseEntity<ApiResponse<CustomerIssueDto>> addMessage(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody IssueMessageRequest request) {
        // Customer cannot submit internal notes
        IssueMessageRequest customerRequest = new IssueMessageRequest(request.message(), false);
        CustomerIssueDto updated = issueService.addMessage(id, currentUser.getId(), false, customerRequest);
        return ResponseEntity.ok(ApiResponse.success(updated, "Message sent successfully"));
    }
}
