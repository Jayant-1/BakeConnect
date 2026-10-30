package com.bakeconnect.payment.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class WebhookSecurityService {

    private static final Logger log = LoggerFactory.getLogger(WebhookSecurityService.class);
    private static final String HMAC_SHA256 = "HmacSHA256";

    /**
     * Computes the HMAC-SHA256 signature for a raw byte array payload.
     */
    public String calculateSignature(byte[] payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256);
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(payload);
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            log.error("Failed to calculate HMAC signature", e);
            throw new RuntimeException("HMAC calculation failure", e);
        }
    }

    /**
     * Verifies the signature in constant time against raw byte array payload.
     * Prevents timing attacks and deserialization exploits.
     * Supports both bare 64-char hex strings and prefixed 'sha256=' format.
     */
    public boolean verifySignature(byte[] payload, String signatureHeader, String secret) {
        if (payload == null || signatureHeader == null || secret == null) {
            return false;
        }

        try {
            String cleanProvided = signatureHeader.trim();
            if (cleanProvided.toLowerCase().startsWith("sha256=")) {
                cleanProvided = cleanProvided.substring(7).trim();
            }

            String calculatedHex = calculateSignature(payload, secret);
            byte[] calculatedBytes = calculatedHex.getBytes(StandardCharsets.UTF_8);
            byte[] providedBytes = cleanProvided.getBytes(StandardCharsets.UTF_8);

            // Constant-time equality comparison
            return MessageDigest.isEqual(calculatedBytes, providedBytes);
        } catch (Exception e) {
            log.warn("Webhook signature verification encountered error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Calculates timestamped V2 signature: HMAC-SHA256(secret, "<timestamp>.<rawRequestBody>")
     */
    public String calculateSignatureV2(byte[] payload, String timestamp, String secret) {
        if (payload == null || timestamp == null || secret == null) {
            throw new IllegalArgumentException("Payload, timestamp, and secret must not be null");
        }
        byte[] prefix = (timestamp.trim() + ".").getBytes(StandardCharsets.UTF_8);
        byte[] concatenated = new byte[prefix.length + payload.length];
        System.arraycopy(prefix, 0, concatenated, 0, prefix.length);
        System.arraycopy(payload, 0, concatenated, prefix.length, payload.length);
        return calculateSignature(concatenated, secret);
    }

    /**
     * Verifies timestamped V2 signature: HMAC-SHA256(secret, "<timestamp>.<rawRequestBody>")
     * Upstream YouPI-PG bindings: generateHmac(`${timestamp}.${payloadString}`, merchant.webhookSecret)
     */
    public boolean verifySignatureV2(byte[] payload, String signatureHeader, String timestampHeader, String secret) {
        if (payload == null || signatureHeader == null || timestampHeader == null || secret == null) {
            return false;
        }

        try {
            byte[] prefix = (timestampHeader.trim() + ".").getBytes(StandardCharsets.UTF_8);
            byte[] concatenated = new byte[prefix.length + payload.length];
            System.arraycopy(prefix, 0, concatenated, 0, prefix.length);
            System.arraycopy(payload, 0, concatenated, prefix.length, payload.length);

            return verifySignature(concatenated, signatureHeader, secret);
        } catch (Exception e) {
            log.warn("Webhook V2 signature verification encountered error: {}", e.getMessage());
            return false;
        }
    }
}
