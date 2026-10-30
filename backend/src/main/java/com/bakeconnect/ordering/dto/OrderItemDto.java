package com.bakeconnect.ordering.dto;

import com.bakeconnect.ordering.entity.OrderItem;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderItemDto(
        UUID id,
        UUID productId,
        String productNameSnapshot,
        String productSkuSnapshot,
        BigDecimal unitPriceSnapshot,
        int quantity,
        BigDecimal discountSnapshot,
        BigDecimal taxRateSnapshot,
        BigDecimal totalPriceSnapshot,
        Instant createdAt
) {
    public static OrderItemDto fromEntity(OrderItem item) {
        return new OrderItemDto(
                item.getId(),
                item.getProduct() != null ? item.getProduct().getId() : null,
                item.getProductNameSnapshot(),
                item.getProductSkuSnapshot(),
                item.getUnitPriceSnapshot(),
                item.getQuantity(),
                item.getDiscountSnapshot(),
                item.getTaxRateSnapshot(),
                item.getTotalPriceSnapshot(),
                item.getCreatedAt()
        );
    }
}
