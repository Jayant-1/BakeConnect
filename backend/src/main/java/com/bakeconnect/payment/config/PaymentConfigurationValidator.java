package com.bakeconnect.payment.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PaymentConfigurationValidator {

    private static final Logger log = LoggerFactory.getLogger(PaymentConfigurationValidator.class);

    private final String mode;
    private final String defaultProvider;
    private final String baseUrl;
    private final String merchantId;
    private final String apiKey;
    private final String webhookSecret;

    public PaymentConfigurationValidator(
            @Value("${bakeconnect.payment.mode:dev}") String mode,
            @Value("${bakeconnect.payment.provider:MOCK}") String defaultProvider,
            @Value("${bakeconnect.payment.youpi-pg.base-url:http://localhost:7000}") String baseUrl,
            @Value("${bakeconnect.payment.youpi-pg.merchant-id:00000000-0000-0000-0000-000000000001}") String merchantId,
            @Value("${bakeconnect.payment.youpi-pg.api-key:mock_key}") String apiKey,
            @Value("${bakeconnect.payment.youpi-pg.webhook-secret:mock_webhook_secret_32_bytes_long!}") String webhookSecret) {
        this.mode = mode;
        this.defaultProvider = defaultProvider;
        this.baseUrl = baseUrl;
        this.merchantId = merchantId;
        this.apiKey = apiKey;
        this.webhookSecret = webhookSecret;
    }

    @PostConstruct
    public void validate() {
        boolean isLiveMode = "live".equalsIgnoreCase(mode) || "production".equalsIgnoreCase(mode);

        if (isLiveMode) {
            log.info("Validating BakeConnect payment configuration for LIVE mode...");

            if ("MOCK".equalsIgnoreCase(defaultProvider)) {
                throw new IllegalStateException("FATAL CONFIGURATION ERROR: MOCK payment provider is strictly forbidden in live mode. Set bakeconnect.payment.provider=YOUPI_PG.");
            }

            if (apiKey == null || apiKey.isBlank() || "mock_key".equalsIgnoreCase(apiKey.trim())) {
                throw new IllegalStateException("FATAL CONFIGURATION ERROR: Missing or mock YOUPI_PG_API_KEY in live mode.");
            }

            if (webhookSecret == null || webhookSecret.isBlank() || "mock_webhook_secret_32_bytes_long!".equalsIgnoreCase(webhookSecret.trim())) {
                throw new IllegalStateException("FATAL CONFIGURATION ERROR: Missing or mock YOUPI_PG_WEBHOOK_SECRET in live mode.");
            }

            if (baseUrl == null || baseUrl.isBlank() || baseUrl.contains("localhost") || !baseUrl.startsWith("https://")) {
                throw new IllegalStateException("FATAL CONFIGURATION ERROR: YOUPI_PG_BASE_URL must be an authenticated public HTTPS URL in live mode. Received: " + baseUrl);
            }

            log.info("BakeConnect payment configuration validated successfully for LIVE mode.");
        } else {
            log.info("BakeConnect payment running in DEV/TEST mode with provider: {}", defaultProvider);
        }
    }

    public boolean isLiveMode() {
        return "live".equalsIgnoreCase(mode) || "production".equalsIgnoreCase(mode);
    }
}
