package com.bakeconnect.payment.spi;

public interface PaymentProvider {

    String getProviderName();

    PaymentSessionResult initiatePaymentSession(PaymentSessionRequest request);

    PaymentVerificationResult verifyPayment(String providerReference);

    boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader);

    default boolean verifyWebhookSignatureV2(byte[] rawPayload, String signatureHeader, String timestampHeader) {
        return verifyWebhookSignature(rawPayload, signatureHeader);
    }

    default boolean isObserverHealthy() {
        return true;
    }
}
