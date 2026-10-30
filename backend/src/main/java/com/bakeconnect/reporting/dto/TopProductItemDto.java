package com.bakeconnect.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class TopProductItemDto {

    private UUID productId;
    private String productName;
    private String productSlug;
    private String channel = "ALL";
    private long totalQuantitySold;
    private BigDecimal totalRevenue = BigDecimal.ZERO;
    private long orderCount;
    private long previousPeriodQuantitySold;
    private BigDecimal previousPeriodRevenue = BigDecimal.ZERO;
    private long previousPeriodOrderCount;
    private BigDecimal quantityGrowthPercentage;
    private BigDecimal revenueGrowthPercentage;

    public TopProductItemDto() {}

    public TopProductItemDto(UUID productId, String productName, String productSlug,
                             long totalQuantitySold, BigDecimal totalRevenue) {
        this.productId = productId;
        this.productName = productName;
        this.productSlug = productSlug;
        this.totalQuantitySold = totalQuantitySold;
        this.totalRevenue = totalRevenue;
    }

    public TopProductItemDto(UUID productId, String productName, String productSlug, String channel,
                             long totalQuantitySold, BigDecimal totalRevenue, long orderCount,
                             long previousPeriodQuantitySold, BigDecimal previousPeriodRevenue, long previousPeriodOrderCount,
                             BigDecimal quantityGrowthPercentage, BigDecimal revenueGrowthPercentage) {
        this.productId = productId;
        this.productName = productName;
        this.productSlug = productSlug;
        this.channel = channel;
        this.totalQuantitySold = totalQuantitySold;
        this.totalRevenue = totalRevenue;
        this.orderCount = orderCount;
        this.previousPeriodQuantitySold = previousPeriodQuantitySold;
        this.previousPeriodRevenue = previousPeriodRevenue;
        this.previousPeriodOrderCount = previousPeriodOrderCount;
        this.quantityGrowthPercentage = quantityGrowthPercentage;
        this.revenueGrowthPercentage = revenueGrowthPercentage;
    }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductSlug() { return productSlug; }
    public void setProductSlug(String productSlug) { this.productSlug = productSlug; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public long getTotalQuantitySold() { return totalQuantitySold; }
    public void setTotalQuantitySold(long totalQuantitySold) { this.totalQuantitySold = totalQuantitySold; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public long getOrderCount() { return orderCount; }
    public void setOrderCount(long orderCount) { this.orderCount = orderCount; }

    public long getPreviousPeriodQuantitySold() { return previousPeriodQuantitySold; }
    public void setPreviousPeriodQuantitySold(long previousPeriodQuantitySold) { this.previousPeriodQuantitySold = previousPeriodQuantitySold; }

    public BigDecimal getPreviousPeriodRevenue() { return previousPeriodRevenue; }
    public void setPreviousPeriodRevenue(BigDecimal previousPeriodRevenue) { this.previousPeriodRevenue = previousPeriodRevenue; }

    public long getPreviousPeriodOrderCount() { return previousPeriodOrderCount; }
    public void setPreviousPeriodOrderCount(long previousPeriodOrderCount) { this.previousPeriodOrderCount = previousPeriodOrderCount; }

    public BigDecimal getQuantityGrowthPercentage() { return quantityGrowthPercentage; }
    public void setQuantityGrowthPercentage(BigDecimal quantityGrowthPercentage) { this.quantityGrowthPercentage = quantityGrowthPercentage; }

    public BigDecimal getRevenueGrowthPercentage() { return revenueGrowthPercentage; }
    public void setRevenueGrowthPercentage(BigDecimal revenueGrowthPercentage) { this.revenueGrowthPercentage = revenueGrowthPercentage; }
}
