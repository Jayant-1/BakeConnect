package com.bakeconnect.payment.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.payment.dto.*;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.entity.WebhookProcessingStatus;
import com.bakeconnect.payment.service.OfflinePaymentService;
import com.bakeconnect.payment.service.PaymentService;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager/payments")
@PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
@Tag(name = "Manager Payments & Auditing", description = "Record and audit online/offline payments, bank reconciliation, observer health, and refunds")
@SecurityRequirement(name = "BearerAuth")
public class ManagerPaymentController {

    private final OfflinePaymentService offlinePaymentService;
    private final PaymentService paymentService;

    public ManagerPaymentController(OfflinePaymentService offlinePaymentService, PaymentService paymentService) {
        this.offlinePaymentService = offlinePaymentService;
        this.paymentService = paymentService;
    }

    // --- Offline Payment Endpoints ---

    @PostMapping("/offline")
    @Operation(summary = "Record offline payment (cash, UPI, cheque) for order or invoice")
    public ResponseEntity<ApiResponse<OfflinePaymentDto>> recordOfflinePayment(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody RecordOfflinePaymentRequest request) {
        OfflinePaymentDto payment = offlinePaymentService.recordOfflinePayment(request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(payment, "Offline payment recorded successfully"));
    }

    @GetMapping("/offline/recent")
    @Operation(summary = "Get recent 50 recorded offline payments")
    public ResponseEntity<ApiResponse<List<OfflinePaymentDto>>> getRecentOfflinePayments() {
        List<OfflinePaymentDto> list = offlinePaymentService.getRecentPayments();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/offline/by-order/{orderId}")
    @Operation(summary = "Get offline payments for a specific order")
    public ResponseEntity<ApiResponse<List<OfflinePaymentDto>>> getOfflinePaymentsByOrder(@PathVariable UUID orderId) {
        List<OfflinePaymentDto> list = offlinePaymentService.getPaymentsForOrder(orderId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/cod/summary")
    @Operation(summary = "Get COD outstanding and collected summary")
    public ResponseEntity<ApiResponse<CodSummaryDto>> getCodSummary() {
        CodSummaryDto summary = offlinePaymentService.getCodSummary();
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/cod/orders")
    @Operation(summary = "Get paginated COD delivery orders and collection status")
    public ResponseEntity<ApiResponse<Page<CodOrderDto>>> getCodOrders(
            @RequestParam(required = false) com.bakeconnect.ordering.entity.PaymentStatus paymentStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CodOrderDto> orders = offlinePaymentService.getCodOrders(paymentStatus, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    // --- Payment Attempts & Reconciliation Cases ---

    @GetMapping("/attempts")
    @Operation(summary = "Get paginated payment attempts filtered by status or provider")
    public ResponseEntity<ApiResponse<Page<PaymentAttemptDto>>> getPaymentAttempts(
            @RequestParam(required = false) PaymentAttemptStatus status,
            @RequestParam(required = false) String provider,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PaymentAttemptDto> attempts = paymentService.getPaymentAttempts(
                status, provider, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.success(attempts));
    }

    @GetMapping("/attempts/{paymentAttemptId}")
    @Operation(summary = "Get payment attempt details for managers")
    public ResponseEntity<ApiResponse<PaymentAttemptDto>> getPaymentAttemptDetails(
            @PathVariable UUID paymentAttemptId,
            @AuthenticationPrincipal SecurityUser currentUser) {
        PaymentAttemptDto attempt = paymentService.getPaymentAttempt(
                paymentAttemptId, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success(attempt));
    }

    // --- Financial Reconciliation & Metrics ---

    @GetMapping("/metrics")
    @Operation(summary = "Get financial reconciliation breakdown (reconciled vs observed unreconciled)")
    public ResponseEntity<ApiResponse<PaymentFinancialMetricsDto>> getPaymentMetrics() {
        PaymentFinancialMetricsDto metrics = paymentService.getPaymentMetrics();
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    @PostMapping("/reconcile")
    @Operation(summary = "Record bank statement reconciliation against an observed UPI payment attempt")
    public ResponseEntity<ApiResponse<BankReconciliationDto>> reconcilePayment(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody BankReconciliationRequest request) {
        BankReconciliationDto result = paymentService.reconcilePayment(request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(result, "Bank reconciliation recorded successfully"));
    }

    // --- Refunds ---

    @PostMapping("/refund")
    @Operation(summary = "Record a refund for a payment attempt")
    public ResponseEntity<ApiResponse<PaymentRefundDto>> recordRefund(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody RecordRefundRequest request) {
        PaymentRefundDto result = paymentService.recordRefund(request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(result, "Payment refund recorded successfully"));
    }

    @GetMapping("/refunds")
    @Operation(summary = "Get paginated recorded payment refunds")
    public ResponseEntity<ApiResponse<Page<PaymentRefundDto>>> getRefunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PaymentRefundDto> refunds = paymentService.getRefunds(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(refunds));
    }

    // --- Observer Health & Gateway Failure Auditing ---

    @GetMapping("/observer/health")
    @Operation(summary = "Check health and connectivity of banking SMS observer daemon")
    public ResponseEntity<ApiResponse<ObserverHealthDto>> getObserverHealth() {
        ObserverHealthDto health = paymentService.getObserverHealth();
        return ResponseEntity.ok(ApiResponse.success(health));
    }

    @GetMapping("/webhooks/inbox")
    @Operation(summary = "Audit incoming webhook deliveries and check for failures, conflicts, or fraud alerts")
    public ResponseEntity<ApiResponse<Page<WebhookEventInboxDto>>> getWebhookInbox(
            @RequestParam(required = false) WebhookProcessingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<WebhookEventInboxDto> inboxPage = paymentService.getWebhookEvents(
                status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(inboxPage));
    }

    // --- Admin-only device/credential diagnostic endpoint ---

    @GetMapping("/admin/config")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin only: View payment configuration summary with redacted credentials")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminPaymentConfig() {
        Map<String, Object> config = Map.of(
                "provider", "YOUPI_PG",
                "observerType", "ANDROID_HDFC_SMS",
                "currency", "INR",
                "maxConcurrentActiveSlots", 1,
                "roleRestrictions", "Admin-only credentials and device observer configuration"
        );
        return ResponseEntity.ok(ApiResponse.success(config));
    }
}
