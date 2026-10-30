package com.bakeconnect.retailer.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class ReorderSuggestionDto {

    private UUID productId;
    private String productName;
    private String productSku;
    private int recommendedQuantity;
    private BigDecimal unitPrice;
    private BigDecimal suggestedTotalPrice;
    private int moq;
    private long averageOrderIntervalDays;
    private long daysSinceLastOrder;
    private String frequencyReason;
    private boolean available;

    public ReorderSuggestionDto() {}

    public ReorderSuggestionDto(UUID productId, String productName, String productSku,
                                int recommendedQuantity, BigDecimal unitPrice, BigDecimal suggestedTotalPrice,
                                int moq, long averageOrderIntervalDays, long daysSinceLastOrder,
                                String frequencyReason, boolean available) {
        this.productId = productId;
        this.productName = productName;
        this.productSku = productSku;
        this.recommendedQuantity = recommendedQuantity;
        this.unitPrice = unitPrice;
        this.suggestedTotalPrice = suggestedTotalPrice;
        this.moq = moq;
        this.averageOrderIntervalDays = averageOrderIntervalDays;
        this.daysSinceLastOrder = daysSinceLastOrder;
        this.frequencyReason = frequencyReason;
        this.available = available;
    }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public int getRecommendedQuantity() { return recommendedQuantity; }
    public void setRecommendedQuantity(int recommendedQuantity) { this.recommendedQuantity = recommendedQuantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getSuggestedTotalPrice() { return suggestedTotalPrice; }
    public void setSuggestedTotalPrice(BigDecimal suggestedTotalPrice) { this.suggestedTotalPrice = suggestedTotalPrice; }

    public int getMoq() { return moq; }
    public void setMoq(int moq) { this.moq = moq; }

    public long getAverageOrderIntervalDays() { return averageOrderIntervalDays; }
    public void setAverageOrderIntervalDays(long averageOrderIntervalDays) { this.averageOrderIntervalDays = averageOrderIntervalDays; }

    public long getDaysSinceLastOrder() { return daysSinceLastOrder; }
    public void setDaysSinceLastOrder(long daysSinceLastOrder) { this.daysSinceLastOrder = daysSinceLastOrder; }

    public String getFrequencyReason() { return frequencyReason; }
    public void setFrequencyReason(String frequencyReason) { this.frequencyReason = frequencyReason; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
