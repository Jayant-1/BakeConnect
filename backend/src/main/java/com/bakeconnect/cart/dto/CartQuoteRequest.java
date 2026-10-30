package com.bakeconnect.cart.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CartQuoteRequest(
        @NotEmpty(message = "Cart cannot be empty")
        List<@Valid CartItemRequest> items,

        String couponCode
) {}
