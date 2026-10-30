package com.bakeconnect.ordering.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class OrderDeclineRequest {

    @NotBlank(message = "Reason code is required")
    @Size(max = 100, message = "Reason code cannot exceed 100 characters")
    private String reasonCode;

    @NotBlank(message = "Customer message is required")
    @Size(max = 1000, message = "Customer message cannot exceed 1000 characters")
    private String customerMessage;

    public OrderDeclineRequest() {}

    public OrderDeclineRequest(String reasonCode, String customerMessage) {
        this.reasonCode = reasonCode;
        this.customerMessage = customerMessage;
    }

    public String getReasonCode() { return reasonCode; }
    public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }

    public String getCustomerMessage() { return customerMessage; }
    public void setCustomerMessage(String customerMessage) { this.customerMessage = customerMessage; }
}
