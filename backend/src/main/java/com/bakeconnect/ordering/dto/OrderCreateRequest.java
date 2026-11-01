package com.bakeconnect.ordering.dto;

import com.bakeconnect.cart.dto.CartItemRequest;
import com.bakeconnect.ordering.entity.DeliveryType;
import com.bakeconnect.ordering.entity.OrderType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record OrderCreateRequest(
        @NotEmpty(message = "Order must contain at least one item")
        @Valid
        List<CartItemRequest> items,

        @NotNull(message = "Order type is required (PERSONAL or BUSINESS)")
        OrderType orderType,

        @NotNull(message = "Delivery type is required (DELIVERY or STORE_PICKUP)")
        DeliveryType deliveryType,

        UUID deliveryAddressId,

        String businessGst,

        String businessName,

        String notes,
        String couponCode
) {
    public OrderCreateRequest(
            List<CartItemRequest> items,
            OrderType orderType,
            DeliveryType deliveryType,
            UUID deliveryAddressId,
            String businessGst,
            String businessName,
            String notes
    ) {
        this(items, orderType, deliveryType, deliveryAddressId, businessGst, businessName, notes, null);
    }
}
