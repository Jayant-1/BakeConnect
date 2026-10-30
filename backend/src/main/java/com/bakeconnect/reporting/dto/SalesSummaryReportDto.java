package com.bakeconnect.reporting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class SalesSummaryReportDto {

    private LocalDate periodStart;
    private LocalDate periodEnd;
    private BigDecimal grossSales;
    private BigDecimal totalDiscounts;
    private BigDecimal netSales;
    private BigDecimal totalTax;
    private BigDecimal totalRevenue;
    private long totalOrders;

    private long b2cOrdersCount;
    private BigDecimal b2cGrossSales;
    private BigDecimal b2cAov;

    private long b2bOrdersCount;
    private BigDecimal b2bGrossSales;
    private BigDecimal b2bAov;

    private BigDecimal blendedAov;

    private BigDecimal totalCostOfGoodsSold;
    private BigDecimal grossMargin;
    private BigDecimal grossMarginPercentage;
    private String marginStatus; // "AVAILABLE" or "NOT_AVAILABLE"
    private String marginExplanatoryNote;

    public SalesSummaryReportDto() {}

    public LocalDate getPeriodStart() { return periodStart; }
    public void setPeriodStart(LocalDate periodStart) { this.periodStart = periodStart; }

    public LocalDate getPeriodEnd() { return periodEnd; }
    public void setPeriodEnd(LocalDate periodEnd) { this.periodEnd = periodEnd; }

    public BigDecimal getGrossSales() { return grossSales; }
    public void setGrossSales(BigDecimal grossSales) { this.grossSales = grossSales; }

    public BigDecimal getTotalDiscounts() { return totalDiscounts; }
    public void setTotalDiscounts(BigDecimal totalDiscounts) { this.totalDiscounts = totalDiscounts; }

    public BigDecimal getNetSales() { return netSales; }
    public void setNetSales(BigDecimal netSales) { this.netSales = netSales; }

    public BigDecimal getTotalTax() { return totalTax; }
    public void setTotalTax(BigDecimal totalTax) { this.totalTax = totalTax; }

    public BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }

    public long getTotalOrders() { return totalOrders; }
    public void setTotalOrders(long totalOrders) { this.totalOrders = totalOrders; }

    public long getB2cOrdersCount() { return b2cOrdersCount; }
    public void setB2cOrdersCount(long b2cOrdersCount) { this.b2cOrdersCount = b2cOrdersCount; }

    public BigDecimal getB2cGrossSales() { return b2cGrossSales; }
    public void setB2cGrossSales(BigDecimal b2cGrossSales) { this.b2cGrossSales = b2cGrossSales; }

    public BigDecimal getB2cAov() { return b2cAov; }
    public void setB2cAov(BigDecimal b2cAov) { this.b2cAov = b2cAov; }

    public long getB2bOrdersCount() { return b2bOrdersCount; }
    public void setB2bOrdersCount(long b2bOrdersCount) { this.b2bOrdersCount = b2bOrdersCount; }

    public BigDecimal getB2bGrossSales() { return b2bGrossSales; }
    public void setB2bGrossSales(BigDecimal b2bGrossSales) { this.b2bGrossSales = b2bGrossSales; }

    public BigDecimal getB2bAov() { return b2bAov; }
    public void setB2bAov(BigDecimal b2bAov) { this.b2bAov = b2bAov; }

    public BigDecimal getBlendedAov() { return blendedAov; }
    public void setBlendedAov(BigDecimal blendedAov) { this.blendedAov = blendedAov; }

    public BigDecimal getTotalCostOfGoodsSold() { return totalCostOfGoodsSold; }
    public void setTotalCostOfGoodsSold(BigDecimal totalCostOfGoodsSold) { this.totalCostOfGoodsSold = totalCostOfGoodsSold; }

    public BigDecimal getGrossMargin() { return grossMargin; }
    public void setGrossMargin(BigDecimal grossMargin) { this.grossMargin = grossMargin; }

    public BigDecimal getGrossMarginPercentage() { return grossMarginPercentage; }
    public void setGrossMarginPercentage(BigDecimal grossMarginPercentage) { this.grossMarginPercentage = grossMarginPercentage; }

    public String getMarginStatus() { return marginStatus; }
    public void setMarginStatus(String marginStatus) { this.marginStatus = marginStatus; }

    public String getMarginExplanatoryNote() { return marginExplanatoryNote; }
    public void setMarginExplanatoryNote(String marginExplanatoryNote) { this.marginExplanatoryNote = marginExplanatoryNote; }
}
