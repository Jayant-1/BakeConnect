package com.bakeconnect.retailer.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.retailer.dto.ReorderSuggestionDto;
import com.bakeconnect.retailer.dto.RetailerApprovalRequest;
import com.bakeconnect.retailer.dto.RetailerProfileCreateUpdateRequest;
import com.bakeconnect.retailer.dto.RetailerProfileDto;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.service.ReorderService;
import com.bakeconnect.retailer.service.RetailerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Retailers", description = "Retailer profiles, B2B payment terms, and approval workflows")
@SecurityRequirement(name = "BearerAuth")
public class RetailerController {

    private final RetailerService retailerService;
    private final ReorderService reorderService;

    public RetailerController(RetailerService retailerService, ReorderService reorderService) {
        this.retailerService = retailerService;
        this.reorderService = reorderService;
    }

    @PostMapping("/retailers/profile")
    @Operation(summary = "Submit or update retailer business profile")
    public ResponseEntity<ApiResponse<RetailerProfileDto>> submitProfile(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody RetailerProfileCreateUpdateRequest request) {
        RetailerProfileDto profile = retailerService.submitProfile(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(profile, "Retailer profile submitted successfully"));
    }

    @GetMapping("/retailers/me")
    @Operation(summary = "Get the current authenticated retailer's profile")
    public ResponseEntity<ApiResponse<RetailerProfileDto>> getMyProfile(
            @AuthenticationPrincipal SecurityUser currentUser) {
        RetailerProfileDto profile = retailerService.getMyProfile(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @GetMapping("/retailers/{id}")
    @Operation(summary = "Get retailer profile by ID (IDOR protected)")
    public ResponseEntity<ApiResponse<RetailerProfileDto>> getProfileById(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id) {
        boolean isAdmin = currentUser.getRole() == UserRole.BAKERY_ADMIN;
        RetailerProfileDto profile = retailerService.getProfileById(id, currentUser.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @GetMapping("/admin/retailers")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: List retailer profiles with optional approval status filter")
    public ResponseEntity<ApiResponse<Page<RetailerProfileDto>>> getAllProfiles(
            @RequestParam(required = false) RetailerApprovalStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<RetailerProfileDto> profiles = retailerService.getAllProfiles(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(profiles));
    }

    @PatchMapping("/admin/retailers/{id}/approval")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Approve, reject, or assign credit terms to a retailer")
    public ResponseEntity<ApiResponse<RetailerProfileDto>> updateApproval(
            @PathVariable UUID id,
            @Valid @RequestBody RetailerApprovalRequest request) {
        RetailerProfileDto updated = retailerService.updateApprovalStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Retailer status updated successfully"));
    }

    @GetMapping("/retailers/reorder-suggestions")
    @Operation(summary = "Get deterministic reorder suggestions based on 90-day purchase history and cadence")
    public ResponseEntity<ApiResponse<List<ReorderSuggestionDto>>> getReorderSuggestions(
            @AuthenticationPrincipal SecurityUser currentUser) {
        List<ReorderSuggestionDto> suggestions = reorderService.getReorderSuggestions(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(suggestions));
    }
}
