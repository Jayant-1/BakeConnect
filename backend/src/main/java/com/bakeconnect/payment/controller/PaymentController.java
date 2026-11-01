package com.bakeconnect.payment.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.payment.dto.PaymentAttemptDto;
import com.bakeconnect.payment.dto.PaymentInitiateRequest;
import com.bakeconnect.payment.dto.PaymentSessionResponse;
import com.bakeconnect.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments & Webhooks", description = "Endpoints for initiating payments, checking attempt status, and receiving secure webhooks")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Initiate an authoritative payment session with chosen provider and idempotency key")
    public ResponseEntity<ApiResponse<PaymentSessionResponse>> initiatePayment(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody PaymentInitiateRequest request) {
        PaymentSessionResponse session = paymentService.initiatePayment(
                request, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(session, "Payment session initiated successfully"));
    }

    @GetMapping("/{paymentAttemptId}")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Get payment attempt details (IDOR protected)")
    public ResponseEntity<ApiResponse<PaymentAttemptDto>> getPaymentAttempt(
            @PathVariable UUID paymentAttemptId,
            @AuthenticationPrincipal SecurityUser currentUser) {
        PaymentAttemptDto attempt = paymentService.getPaymentAttempt(
                paymentAttemptId, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success(attempt));
    }

    @PostMapping("/{paymentAttemptId}/cancel")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Cancel an active payment attempt to immediately release its fractional reservation slot")
    public ResponseEntity<ApiResponse<PaymentAttemptDto>> cancelPaymentAttempt(
            @PathVariable UUID paymentAttemptId,
            @AuthenticationPrincipal SecurityUser currentUser) {
        PaymentAttemptDto attempt = paymentService.cancelPaymentAttempt(
                paymentAttemptId, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success(attempt, "Payment attempt cancelled successfully"));
    }

    @GetMapping("/order/{orderId}")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Get payment attempts for an order (IDOR protected)")
    public ResponseEntity<ApiResponse<java.util.List<PaymentAttemptDto>>> getPaymentAttemptsForOrder(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal SecurityUser currentUser) {
        java.util.List<PaymentAttemptDto> attempts = paymentService.getPaymentAttemptsByOrder(
                orderId, currentUser.getId(), currentUser.getRole());
        return ResponseEntity.ok(ApiResponse.success(attempts));
    }

    @PostMapping("/webhook/{provider}")
    @Operation(summary = "Receive payment gateway webhook with raw-byte HMAC verification and deduplication")
    public ResponseEntity<ApiResponse<Void>> receiveWebhook(
            @PathVariable String provider,
            @RequestHeader(value = "X-Gateway-Delivery-Id", required = false) String deliveryId,
            @RequestHeader(value = "X-Delivery-Id", required = false) String altDeliveryId,
            @RequestHeader(value = "X-Gateway-Signature", required = false) String signature,
            @RequestHeader(value = "X-Signature", required = false) String altSignature,
            @RequestHeader(value = "X-Gateway-Signature-V2", required = false) String signatureV2,
            @RequestHeader(value = "X-Gateway-Timestamp", required = false) String timestamp,
            @RequestBody(required = false) byte[] rawPayload) {

        String effectiveDeliveryId = (deliveryId != null && !deliveryId.isBlank()) ? deliveryId : altDeliveryId;
        String effectiveSignature = (signature != null && !signature.isBlank()) ? signature : altSignature;
        byte[] effectivePayload = (rawPayload != null) ? rawPayload : new byte[0];

        paymentService.processWebhook(provider, effectiveDeliveryId, effectiveSignature, signatureV2, timestamp, effectivePayload);
        return ResponseEntity.ok(ApiResponse.success(null, "Webhook processed successfully"));
    }
}
