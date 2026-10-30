package com.bakeconnect.payment.spi;

import com.bakeconnect.payment.security.WebhookSecurityService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class MockPaymentProvider implements PaymentProvider {

    private final WebhookSecurityService webhookSecurityService;
    private final String webhookSecret;

    public MockPaymentProvider(
            WebhookSecurityService webhookSecurityService,
            @Value("${bakeconnect.payment.youpi-pg.webhook-secret:mock_webhook_secret_32_bytes_long!}") String webhookSecret) {
        this.webhookSecurityService = webhookSecurityService;
        this.webhookSecret = webhookSecret;
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }

    @Override
    public PaymentSessionResult initiatePaymentSession(PaymentSessionRequest request) {
        String ref = "MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String url = "https://pay.bakeconnect.local/checkout?ref=" + ref + "&amt=" + request.amount();
        return new PaymentSessionResult(ref, url, Map.of("provider", "MOCK", "status", "INITIATED"));
    }

    @Override
    public PaymentVerificationResult verifyPayment(String providerReference) {
        return new PaymentVerificationResult(providerReference, null, "INR", true, null);
    }

    @Override
    public boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader) {
        if ("mock-valid-signature".equals(signatureHeader)) {
            return true;
        }
        return webhookSecurityService.verifySignature(rawPayload, signatureHeader, webhookSecret);
    }
}
