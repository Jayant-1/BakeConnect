package com.bakeconnect.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class PaymentInitiateRequest {

    @NotNull(message = "Order ID is required")
    private UUID orderId;

    private UUID invoiceId;

    private String provider;

    @NotBlank(message = "Idempotency key is required")
    private String idempotencyKey;

    public PaymentInitiateRequest() {}

    public PaymentInitiateRequest(UUID orderId, UUID invoiceId, String provider, String idempotencyKey) {
        this.orderId = orderId;
        this.invoiceId = invoiceId;
        this.provider = provider;
        this.idempotencyKey = idempotencyKey;
    }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public UUID getInvoiceId() { return invoiceId; }
    public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}
