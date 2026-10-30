package com.bakeconnect.reporting.dto;

import java.util.List;

public class RetailerGrowthDto {

    private long totalActiveRetailers;
    private long newRetailersInPeriod;
    private long churnRiskCount;
    private List<RetailerChurnSignalDto> churnRiskRetailers;

    public RetailerGrowthDto() {}

    public RetailerGrowthDto(long totalActiveRetailers, long newRetailersInPeriod,
                             long churnRiskCount, List<RetailerChurnSignalDto> churnRiskRetailers) {
        this.totalActiveRetailers = totalActiveRetailers;
        this.newRetailersInPeriod = newRetailersInPeriod;
        this.churnRiskCount = churnRiskCount;
        this.churnRiskRetailers = churnRiskRetailers;
    }

    public long getTotalActiveRetailers() { return totalActiveRetailers; }
    public void setTotalActiveRetailers(long totalActiveRetailers) { this.totalActiveRetailers = totalActiveRetailers; }

    public long getNewRetailersInPeriod() { return newRetailersInPeriod; }
    public void setNewRetailersInPeriod(long newRetailersInPeriod) { this.newRetailersInPeriod = newRetailersInPeriod; }

    public long getChurnRiskCount() { return churnRiskCount; }
    public void setChurnRiskCount(long churnRiskCount) { this.churnRiskCount = churnRiskCount; }

    public List<RetailerChurnSignalDto> getChurnRiskRetailers() { return churnRiskRetailers; }
    public void setChurnRiskRetailers(List<RetailerChurnSignalDto> churnRiskRetailers) { this.churnRiskRetailers = churnRiskRetailers; }
}
