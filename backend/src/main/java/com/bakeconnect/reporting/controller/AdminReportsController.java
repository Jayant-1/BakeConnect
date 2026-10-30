package com.bakeconnect.reporting.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.reporting.dto.RetailerGrowthDto;
import com.bakeconnect.reporting.dto.SalesSummaryReportDto;
import com.bakeconnect.reporting.dto.TopProductItemDto;
import com.bakeconnect.reporting.service.ReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/reports", "/api/v1/manager/reports"})
@PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
@Tag(name = "Business Reports & Insights", description = "Admin analytics: Gross/Net sales, AOV, margin guardrails, top products, and churn signals")
@SecurityRequirement(name = "BearerAuth")
public class AdminReportsController {

    private final ReportingService reportingService;

    public AdminReportsController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/sales-summary")
    @Operation(summary = "Get sales summary report with B2B/B2C breakdown and gated margin calculations")
    public ResponseEntity<ApiResponse<SalesSummaryReportDto>> getSalesSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        SalesSummaryReportDto report = reportingService.getSalesSummary(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
    @Operation(summary = "Get top-selling products leaderboard with channel filter (B2C/B2B/ALL), metric sorting, and previous period comparisons")
    public ResponseEntity<ApiResponse<List<TopProductItemDto>>> getTopProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String channel,
            @RequestParam(required = false, defaultValue = "QUANTITY") String sortBy,
            @RequestParam(defaultValue = "10") int limit) {
        List<TopProductItemDto> topProducts = reportingService.getTopProducts(startDate, endDate, channel, sortBy, limit);
        return ResponseEntity.ok(ApiResponse.success(topProducts));
    }

    @GetMapping("/retailer-growth")
    @Operation(summary = "Get retailer growth metrics and churn risk signals (inactive >= 30 days)")
    public ResponseEntity<ApiResponse<RetailerGrowthDto>> getRetailerGrowth(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        RetailerGrowthDto growth = reportingService.getRetailerGrowth(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(growth));
    }
}
