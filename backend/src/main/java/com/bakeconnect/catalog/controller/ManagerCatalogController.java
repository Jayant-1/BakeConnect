package com.bakeconnect.catalog.controller;

import com.bakeconnect.catalog.dto.*;
import com.bakeconnect.catalog.service.CatalogService;
import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager")
@PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
@Tag(name = "Manager Inventory", description = "Bakery Manager stock controls, inventory audit logs, and catalog management")
@SecurityRequirement(name = "BearerAuth")
public class ManagerCatalogController {

    private final CatalogService catalogService;

    public ManagerCatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    @Operation(summary = "Manager: Get all catalog products with wholesale prices, MOQ, and stock")
    public ResponseEntity<ApiResponse<Page<ProductDto>>> getProducts(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<ProductDto> products = catalogService.getProducts(categoryId, search, PageRequest.of(page, size), UserRole.BAKERY_MANAGER);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @PostMapping("/products")
    @Operation(summary = "Manager: Create product with pack details and MOQ")
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@Valid @RequestBody ProductCreateUpdateRequest request) {
        ProductDto created = catalogService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Product created successfully"));
    }

    @PutMapping("/products/{id}")
    @Operation(summary = "Manager: Update product pack details, MOQ, pricing, and availability")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody ProductCreateUpdateRequest request) {
        ProductDto updated = catalogService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Product updated successfully"));
    }

    @PostMapping("/products/{id}/adjust-stock")
    @Operation(summary = "Manager: Audited stock adjustment with reason code and operational notes")
    public ResponseEntity<ApiResponse<InventoryAuditLogDto>> adjustStock(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody StockAdjustmentRequest request) {
        InventoryAuditLogDto auditLog = catalogService.adjustStockWithAudit(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(auditLog, "Stock adjusted successfully with audit trail"));
    }

    @GetMapping("/products/{id}/audit-logs")
    @Operation(summary = "Manager: Get audit history for a specific product")
    public ResponseEntity<ApiResponse<Page<InventoryAuditLogDto>>> getProductAuditLogs(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<InventoryAuditLogDto> logs = catalogService.getProductAuditLogs(id, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/inventory/audit-logs")
    @Operation(summary = "Manager: Get recent 50 inventory stock adjustments across bakery")
    public ResponseEntity<ApiResponse<List<InventoryAuditLogDto>>> getRecentAuditLogs() {
        List<InventoryAuditLogDto> recent = catalogService.getRecentAuditLogs();
        return ResponseEntity.ok(ApiResponse.success(recent));
    }
}
