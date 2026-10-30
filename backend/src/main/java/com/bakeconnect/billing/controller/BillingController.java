package com.bakeconnect.billing.controller;

import com.bakeconnect.billing.dto.BillingSummaryDto;
import com.bakeconnect.billing.dto.InvoiceDto;
import com.bakeconnect.billing.dto.InvoicePaymentRequest;
import com.bakeconnect.billing.dto.LedgerEntryDto;
import com.bakeconnect.billing.service.BillingService;
import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Billing & Invoicing", description = "Endpoints for invoices, append-only receivables ledger, and payments")
@SecurityRequirement(name = "BearerAuth")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    // --- Retailer Self-Service Endpoints ---

    @GetMapping("/billing/invoices")
    @Operation(summary = "Get current authenticated retailer's invoices (paginated)")
    public ResponseEntity<ApiResponse<Page<InvoiceDto>>> getMyInvoices(
            @AuthenticationPrincipal SecurityUser currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<InvoiceDto> invoices = billingService.getRetailerInvoices(
                currentUser.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")),
                currentUser.getId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(invoices));
    }

    @GetMapping("/billing/invoices/{id}")
    @Operation(summary = "Get invoice by ID (IDOR protected)")
    public ResponseEntity<ApiResponse<InvoiceDto>> getInvoiceById(
            @PathVariable UUID id,
            @AuthenticationPrincipal SecurityUser currentUser) {
        InvoiceDto invoice = billingService.getInvoiceById(id, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    @GetMapping("/billing/ledger")
    @Operation(summary = "Get current authenticated retailer's receivables ledger history (paginated)")
    public ResponseEntity<ApiResponse<Page<LedgerEntryDto>>> getMyLedger(
            @AuthenticationPrincipal SecurityUser currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LedgerEntryDto> ledger = billingService.getRetailerLedger(
                currentUser.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "entryTimestamp")),
                currentUser.getId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(ledger));
    }

    @GetMapping("/billing/summary")
    @Operation(summary = "Get current authenticated retailer's billing and credit balance summary")
    public ResponseEntity<ApiResponse<BillingSummaryDto>> getMyBillingSummary(
            @AuthenticationPrincipal SecurityUser currentUser) {
        BillingSummaryDto summary = billingService.getBillingSummary(
                currentUser.getId(),
                currentUser.getId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    // --- Admin Endpoints ---

    @PostMapping("/admin/billing/invoices/{id}/payments")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Record payment receipt against an invoice (Admin only)")
    public ResponseEntity<ApiResponse<InvoiceDto>> recordInvoicePayment(
            @PathVariable UUID id,
            @Valid @RequestBody InvoicePaymentRequest request,
            @AuthenticationPrincipal SecurityUser admin) {
        InvoiceDto updatedInvoice = billingService.recordPayment(
                id,
                request.getAmount(),
                request.getReferenceNumber(),
                request.getNotes(),
                admin.getId()
        );
        return ResponseEntity.ok(ApiResponse.success(updatedInvoice, "Payment recorded successfully"));
    }

    @GetMapping("/admin/billing/retailers/{retailerId}/invoices")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Get specific retailer's invoices (Admin only)")
    public ResponseEntity<ApiResponse<Page<InvoiceDto>>> getRetailerInvoicesByAdmin(
            @PathVariable UUID retailerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal SecurityUser admin) {
        Page<InvoiceDto> invoices = billingService.getRetailerInvoices(
                retailerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")),
                admin.getId(),
                admin.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(invoices));
    }

    @GetMapping("/admin/billing/retailers/{retailerId}/ledger")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Get specific retailer's ledger history (Admin only)")
    public ResponseEntity<ApiResponse<Page<LedgerEntryDto>>> getRetailerLedgerByAdmin(
            @PathVariable UUID retailerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal SecurityUser admin) {
        Page<LedgerEntryDto> ledger = billingService.getRetailerLedger(
                retailerId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "entryTimestamp")),
                admin.getId(),
                admin.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(ledger));
    }

    @GetMapping("/admin/billing/retailers/{retailerId}/summary")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Get specific retailer's billing summary (Admin only)")
    public ResponseEntity<ApiResponse<BillingSummaryDto>> getRetailerBillingSummaryByAdmin(
            @PathVariable UUID retailerId,
            @AuthenticationPrincipal SecurityUser admin) {
        BillingSummaryDto summary = billingService.getBillingSummary(
                retailerId,
                admin.getId(),
                admin.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
