package com.bakeconnect.payment.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class WebhookSecurityServiceTest {

    private WebhookSecurityService securityService;
    private final String secret = "secret_key_for_webhook_testing_32b";

    @BeforeEach
    void setUp() {
        securityService = new WebhookSecurityService();
    }

    @Test
    @DisplayName("Signature calculation and verification succeeds on exact raw bytes")
    void verifySignature_ValidPayload_ReturnsTrue() {
        byte[] payload = "{\"status\":\"SUCCESS\",\"deliveryId\":\"DEL-001\",\"amount\":100.50}".getBytes(StandardCharsets.UTF_8);
        String signature = securityService.calculateSignature(payload, secret);

        assertThat(signature).isNotBlank();
        boolean isValid = securityService.verifySignature(payload, signature, secret);
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Verification fails if a single byte in payload is tampered")
    void verifySignature_TamperedPayload_ReturnsFalse() {
        byte[] payload = "{\"status\":\"SUCCESS\",\"deliveryId\":\"DEL-001\",\"amount\":100.50}".getBytes(StandardCharsets.UTF_8);
        String signature = securityService.calculateSignature(payload, secret);

        // Tamper with payload (changed amount)
        byte[] tamperedPayload = "{\"status\":\"SUCCESS\",\"deliveryId\":\"DEL-001\",\"amount\":10.50}".getBytes(StandardCharsets.UTF_8);

        boolean isValid = securityService.verifySignature(tamperedPayload, signature, secret);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Verification fails if secret key is incorrect")
    void verifySignature_WrongSecret_ReturnsFalse() {
        byte[] payload = "{\"status\":\"SUCCESS\"}".getBytes(StandardCharsets.UTF_8);
        String signature = securityService.calculateSignature(payload, secret);

        boolean isValid = securityService.verifySignature(payload, signature, "different_secret_key");
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Verification returns false on null inputs without throwing exception")
    void verifySignature_NullInputs_ReturnsFalse() {
        assertThat(securityService.verifySignature(null, "sig", secret)).isFalse();
        assertThat(securityService.verifySignature("payload".getBytes(), null, secret)).isFalse();
        assertThat(securityService.verifySignature("payload".getBytes(), "sig", null)).isFalse();
    }

    @Test
    @DisplayName("V2 signature verification binds timestamp and raw payload")
    void verifySignatureV2_Valid_ReturnsTrue() {
        byte[] payload = "{\"status\":\"RECONCILED\"}".getBytes(StandardCharsets.UTF_8);
        String timestamp = "1730280000";
        String v2Sig = securityService.calculateSignatureV2(payload, timestamp, secret);

        assertThat(securityService.verifySignatureV2(payload, v2Sig, timestamp, secret)).isTrue();
        assertThat(securityService.verifySignatureV2(payload, "sha256=" + v2Sig, timestamp, secret)).isTrue();

        // Mismatched timestamp fails
        assertThat(securityService.verifySignatureV2(payload, v2Sig, "1730280001", secret)).isFalse();
    }
}
