package com.bakeconnect.payment.spi;

import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.payment.security.WebhookSecurityService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class YouPiPgPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(YouPiPgPaymentProvider.class);

    private final WebhookSecurityService webhookSecurityService;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String merchantId;
    private final String apiKey;
    private final String webhookSecret;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;
    private final HttpClient httpClient;

    @Autowired
    public YouPiPgPaymentProvider(
            WebhookSecurityService webhookSecurityService,
            ObjectMapper objectMapper,
            @Value("${bakeconnect.payment.youpi-pg.base-url:http://localhost:7000}") String baseUrl,
            @Value("${bakeconnect.payment.youpi-pg.merchant-id:00000000-0000-0000-0000-000000000001}") String merchantId,
            @Value("${bakeconnect.payment.youpi-pg.api-key:mock_key}") String apiKey,
            @Value("${bakeconnect.payment.youpi-pg.webhook-secret:mock_webhook_secret_32_bytes_long!}") String webhookSecret,
            @Value("${bakeconnect.payment.youpi-pg.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${bakeconnect.payment.youpi-pg.read-timeout-ms:5000}") int readTimeoutMs) {
        this(webhookSecurityService, objectMapper, baseUrl, merchantId, apiKey, webhookSecret,
                connectTimeoutMs, readTimeoutMs,
                HttpClient.newBuilder().connectTimeout(Duration.ofMillis(connectTimeoutMs)).build());
    }

    public YouPiPgPaymentProvider(
            WebhookSecurityService webhookSecurityService,
            ObjectMapper objectMapper,
            String baseUrl,
            String merchantId,
            String apiKey,
            String webhookSecret,
            int connectTimeoutMs,
            int readTimeoutMs,
            HttpClient httpClient) {
        this.webhookSecurityService = webhookSecurityService;
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.merchantId = merchantId;
        this.apiKey = apiKey;
        this.webhookSecret = webhookSecret;
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
        this.httpClient = httpClient;
    }

    @Override
    public String getProviderName() {
        return "YOUPI_PG";
    }

    @Override
    public PaymentSessionResult initiatePaymentSession(PaymentSessionRequest request) {
        String formattedAmount = request.amount().setScale(2, RoundingMode.UNNECESSARY).toPlainString();
        long amountPaise = request.amount().multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.UNNECESSARY).longValueExact();

        Map<String, Object> customerMap = new HashMap<>();
        if (request.customerEmail() != null) customerMap.put("email", request.customerEmail());
        if (request.customerPhone() != null) customerMap.put("phoneNumber", request.customerPhone());

        Map<String, Object> safeMetadata = new HashMap<>();
        safeMetadata.put("orderId", request.orderId().toString());
        safeMetadata.put("orderNumber", request.orderNumber());

        Map<String, Object> payloadMap = new HashMap<>();
        payloadMap.put("orderId", request.orderNumber());
        payloadMap.put("amount", formattedAmount);
        payloadMap.put("currency", "INR");
        payloadMap.put("description", "BakeConnect Order #" + request.orderNumber());
        payloadMap.put("customer", customerMap);
        payloadMap.put("metadata", safeMetadata);

        try {
            String jsonPayload = objectMapper.writeValueAsString(payloadMap);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/v1/payments"))
                    .timeout(Duration.ofMillis(readTimeoutMs))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("X-Merchant-Id", merchantId)
                    .header("X-Merchant-Key", apiKey)
                    .header("Idempotency-Key", request.idempotencyKey())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 201) {
                JsonNode root = objectMapper.readTree(response.body());
                String paymentId = root.path("paymentId").asText();
                String checkoutUrl = root.path("checkoutUrl").asText();
                String status = root.path("status").asText("INITIATED");
                int queuePosition = root.path("queuePosition").asInt(0);

                Map<String, String> meta = new HashMap<>();
                meta.put("provider", "YOUPI_PG");
                meta.put("gatewayPaymentId", paymentId);
                meta.put("status", status);
                meta.put("amountPaise", String.valueOf(amountPaise));

                return new PaymentSessionResult(paymentId, checkoutUrl, meta, queuePosition, status, null, null);
            } else if (response.statusCode() == 503) {
                log.warn("YouPI-PG rejected initiation with 503 (observers offline): {}", response.body());
                throw new BusinessRuleException("UPI payments are temporarily paused because banking observers are offline. Please choose Cash on Delivery.");
            } else if (response.statusCode() == 409) {
                log.warn("YouPI-PG session conflict 409: {}", response.body());
                throw new BusinessRuleException("Conflicting payment session already exists on payment gateway.");
            } else {
                log.error("YouPI-PG payment initiation failed with status {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("YouPI-PG initiation returned status " + response.statusCode());
            }
        } catch (IOException | InterruptedException e) {
            log.error("Network failure communicating with YouPI-PG at {}", baseUrl, e);
            throw new RuntimeException("Payment gateway network timeout or communication error", e);
        }
    }

    @Override
    public PaymentVerificationResult verifyPayment(String providerReference) {
        if (providerReference == null || providerReference.isBlank()) {
            return new PaymentVerificationResult(providerReference, null, "INR", false, "Missing provider reference");
        }

        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/v1/payments/" + providerReference))
                    .timeout(Duration.ofMillis(readTimeoutMs))
                    .header("Accept", "application/json")
                    .header("X-Merchant-Id", merchantId)
                    .header("X-Merchant-Key", apiKey)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String status = root.path("status").asText();
                String settlementState = root.path("settlementState").asText("NOT_RECONCILED");
                String utr = root.path("utr").asText(null);
                String amountStr = root.path("amount").asText(null);
                String currency = root.path("currency").asText("INR");

                BigDecimal amount = (amountStr != null) ? new BigDecimal(amountStr) : null;
                boolean isSuccess = "SUCCESS".equalsIgnoreCase(status)
                        || "OBSERVED_SUCCESS".equalsIgnoreCase(status)
                        || "RECONCILED".equalsIgnoreCase(status);

                return new PaymentVerificationResult(
                        providerReference,
                        amount,
                        currency,
                        isSuccess,
                        isSuccess ? null : "Gateway status: " + status,
                        status,
                        settlementState,
                        utr
                );
            } else if (response.statusCode() == 404) {
                return new PaymentVerificationResult(providerReference, null, "INR", false, "Session not found", "NOT_FOUND", null, null);
            } else {
                return new PaymentVerificationResult(providerReference, null, "INR", false, "Gateway returned HTTP " + response.statusCode());
            }
        } catch (Exception e) {
            log.error("Failed to verify payment {} with YouPI-PG", providerReference, e);
            return new PaymentVerificationResult(providerReference, null, "INR", false, "Verification request failed: " + e.getMessage());
        }
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader) {
        return webhookSecurityService.verifySignature(rawPayload, signatureHeader, webhookSecret);
    }

    @Override
    public boolean verifyWebhookSignatureV2(byte[] rawPayload, String signatureHeader, String timestampHeader) {
        return webhookSecurityService.verifySignatureV2(rawPayload, signatureHeader, timestampHeader, webhookSecret);
    }

    @Override
    public boolean isObserverHealthy() {
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/v1/checkout/server-health?merchantId=" + merchantId))
                    .timeout(Duration.ofMillis(connectTimeoutMs))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                boolean isWorking = root.path("isWorking").asBoolean(false);
                boolean smsHealthy = root.path("smsHealthy").asBoolean(false);
                return isWorking && smsHealthy;
            }
            return false;
        } catch (Exception e) {
            log.warn("Failed to check YouPI-PG server health: {}", e.getMessage());
            return false;
        }
    }
}
