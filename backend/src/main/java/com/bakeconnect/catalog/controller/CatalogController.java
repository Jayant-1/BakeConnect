package com.bakeconnect.catalog.controller;

import com.bakeconnect.catalog.dto.*;
import com.bakeconnect.catalog.service.CatalogService;
import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Product Catalog & Categories", description = "Public browsing and admin catalog management endpoints")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    // --- Public Catalog Endpoints ---

    @GetMapping("/catalog/categories")
    @Operation(summary = "Get all active product categories")
    public ResponseEntity<ApiResponse<List<CategoryDto>>> getCategories() {
        List<CategoryDto> categories = catalogService.getActiveCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    @GetMapping("/catalog/products")
    @Operation(summary = "List and search active products with pagination and channel-specific pricing")
    public ResponseEntity<ApiResponse<Page<ProductDto>>> getProducts(
            @RequestParam(value = "categoryId", required = false) UUID categoryId,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "name,asc") String sort,
            @AuthenticationPrincipal SecurityUser currentUser
    ) {
        int boundedSize = Math.min(Math.max(1, size), 500);
        String[] sortParams = sort.split(",");
        Sort.Direction direction = (sortParams.length > 1 && sortParams[1].equalsIgnoreCase("desc"))
                ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(Math.max(0, page), boundedSize, Sort.by(direction, sortParams[0]));

        UserRole role = currentUser != null ? currentUser.getRole() : null;
        Page<ProductDto> products = catalogService.getProducts(categoryId, query, pageable, role);
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/catalog/products/{idOrSlug}")
    @Operation(summary = "Get single product by UUID identifier or unique slug")
    public ResponseEntity<ApiResponse<ProductDto>> getProduct(
            @PathVariable("idOrSlug") String idOrSlug,
            @AuthenticationPrincipal SecurityUser currentUser
    ) {
        UserRole role = currentUser != null ? currentUser.getRole() : null;
        ProductDto product = catalogService.getProductByIdOrSlug(idOrSlug, role);
        return ResponseEntity.ok(ApiResponse.success(product));
    }

    // --- Admin Catalog Operations ---

    @PostMapping("/admin/categories")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Create a new category")
    public ResponseEntity<ApiResponse<CategoryDto>> createCategory(@Valid @RequestBody CategoryCreateUpdateRequest request) {
        CategoryDto created = catalogService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Category created successfully"));
    }

    @PutMapping("/admin/categories/{id}")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Update an existing category")
    public ResponseEntity<ApiResponse<CategoryDto>> updateCategory(
            @PathVariable("id") UUID id,
            @Valid @RequestBody CategoryCreateUpdateRequest request
    ) {
        CategoryDto updated = catalogService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Category updated successfully"));
    }

    @PostMapping("/admin/products")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Create a new bakery product")
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@Valid @RequestBody ProductCreateUpdateRequest request) {
        ProductDto created = catalogService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Product created successfully"));
    }

    @PutMapping("/admin/products/{id}")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Update product details, pricing, and availability")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(
            @PathVariable("id") UUID id,
            @Valid @RequestBody ProductCreateUpdateRequest request
    ) {
        ProductDto updated = catalogService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Product updated successfully"));
    }

    @PatchMapping("/admin/products/{id}/stock")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Adjust product inventory stock level")
    public ResponseEntity<ApiResponse<Void>> updateStock(
            @PathVariable("id") UUID id,
            @Valid @RequestBody StockUpdateRequest request
    ) {
        catalogService.updateStock(id, request.stockQuantity());
        return ResponseEntity.ok(ApiResponse.success(null, "Stock quantity updated successfully"));
    }

    @DeleteMapping("/admin/products/{id}")
    @PreAuthorize("hasRole('BAKERY_ADMIN')")
    @Operation(summary = "Admin: Deactivate product from catalog")
    public ResponseEntity<ApiResponse<Void>> deactivateProduct(@PathVariable("id") UUID id) {
        catalogService.deactivateProduct(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Product deactivated successfully"));
    }
}
