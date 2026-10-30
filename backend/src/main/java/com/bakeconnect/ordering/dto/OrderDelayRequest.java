package com.bakeconnect.ordering.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public class OrderDelayRequest {

    @NotBlank(message = "Reason code is required")
    @Size(max = 100, message = "Reason code cannot exceed 100 characters")
    private String reasonCode;

    @NotBlank(message = "Customer message is required")
    @Size(max = 1000, message = "Customer message cannot exceed 1000 characters")
    private String customerMessage;

    @NotNull(message = "Estimated delivery time is required")
    @Future(message = "Estimated delivery time must be in the future")
    private Instant estimatedDeliveryAt;

    public OrderDelayRequest() {}

    public OrderDelayRequest(String reasonCode, String customerMessage, Instant estimatedDeliveryAt) {
        this.reasonCode = reasonCode;
        this.customerMessage = customerMessage;
        this.estimatedDeliveryAt = estimatedDeliveryAt;
    }

    public String getReasonCode() { return reasonCode; }
    public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }

    public String getCustomerMessage() { return customerMessage; }
    public void setCustomerMessage(String customerMessage) { this.customerMessage = customerMessage; }

    public Instant getEstimatedDeliveryAt() { return estimatedDeliveryAt; }
    public void setEstimatedDeliveryAt(Instant estimatedDeliveryAt) { this.estimatedDeliveryAt = estimatedDeliveryAt; }
}
