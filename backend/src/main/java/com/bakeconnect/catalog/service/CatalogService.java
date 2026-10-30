package com.bakeconnect.catalog.service;

import com.bakeconnect.catalog.dto.*;
import com.bakeconnect.catalog.entity.Category;
import com.bakeconnect.catalog.entity.InventoryAuditLog;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.CategoryRepository;
import com.bakeconnect.catalog.repository.InventoryAuditLogRepository;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.config.RedisCacheConfig;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class CatalogService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public CatalogService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            InventoryAuditLogRepository auditLogRepository,
            UserRepository userRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_CATEGORIES)
    public List<CategoryDto> getActiveCategories() {
        return categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(CategoryDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ProductDto> getProducts(UUID categoryId, String query, Pageable pageable, UserRole callerRole) {
        boolean canSeeWholesale = callerRole == UserRole.RETAILER || callerRole == UserRole.BAKERY_ADMIN || callerRole == UserRole.BAKERY_MANAGER;
        Page<Product> page;

        if (StringUtils.hasText(query)) {
            page = productRepository.searchActiveProducts(query.trim(), pageable);
        } else if (categoryId != null) {
            page = productRepository.findActiveByCategoryId(categoryId, pageable);
        } else {
            page = productRepository.findActiveAndAvailable(pageable);
        }

        return page.map(p -> ProductDto.fromEntity(p, canSeeWholesale));
    }

    @Transactional(readOnly = true)
    public ProductDto getProductByIdOrSlug(String identifier, UserRole callerRole) {
        boolean canSeeWholesale = callerRole == UserRole.RETAILER || callerRole == UserRole.BAKERY_ADMIN || callerRole == UserRole.BAKERY_MANAGER;
        Product product;

        try {
            UUID id = UUID.fromString(identifier);
            product = productRepository.findActiveByIdWithCategory(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        } catch (IllegalArgumentException e) {
            product = productRepository.findActiveBySlugWithCategory(identifier)
                    .orElseThrow(() -> new ResourceNotFoundException("Product", identifier));
        }

        return ProductDto.fromEntity(product, canSeeWholesale);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_CATEGORIES, RedisCacheConfig.CACHE_PRODUCTS}, allEntries = true)
    public CategoryDto createCategory(CategoryCreateUpdateRequest req) {
        if (categoryRepository.existsBySlug(req.slug())) {
            throw new ConflictException("Category with slug '" + req.slug() + "' already exists");
        }
        if (categoryRepository.existsByName(req.name())) {
            throw new ConflictException("Category with name '" + req.name() + "' already exists");
        }

        Category category = new Category(
                req.name().trim(),
                req.slug().trim().toLowerCase(),
                req.description(),
                req.imageUrl(),
                req.displayOrder()
        );
        Category saved = categoryRepository.save(category);
        return CategoryDto.fromEntity(saved);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_CATEGORIES, RedisCacheConfig.CACHE_PRODUCTS}, allEntries = true)
    public CategoryDto updateCategory(UUID id, CategoryCreateUpdateRequest req) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));

        category.setName(req.name().trim());
        category.setSlug(req.slug().trim().toLowerCase());
        category.setDescription(req.description());
        category.setImageUrl(req.imageUrl());
        category.setDisplayOrder(req.displayOrder());

        Category saved = categoryRepository.save(category);
        return CategoryDto.fromEntity(saved);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_PRODUCTS, RedisCacheConfig.CACHE_PRODUCT_DETAIL}, allEntries = true)
    public ProductDto createProduct(ProductCreateUpdateRequest req) {
        if (productRepository.existsBySlug(req.slug())) {
            throw new ConflictException("Product with slug '" + req.slug() + "' already exists");
        }

        Category category = null;
        if (req.categoryId() != null) {
            category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", req.categoryId()));
        }

        Product product = new Product(
                category,
                req.name().trim(),
                req.slug().trim().toLowerCase(),
                req.description(),
                req.imageUrl(),
                req.retailPrice(),
                req.wholesalePrice(),
                req.unitCost(),
                req.unitOfMeasure(),
                req.moq() != null ? req.moq() : 1,
                req.moqIncrement() != null ? req.moqIncrement() : 1,
                req.stockQuantity() != null ? req.stockQuantity() : 0
        );

        Product saved = productRepository.save(product);
        return ProductDto.fromEntity(saved, true);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_PRODUCTS, RedisCacheConfig.CACHE_PRODUCT_DETAIL}, allEntries = true)
    public ProductDto updateProduct(UUID id, ProductCreateUpdateRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));

        if (req.categoryId() != null) {
            Category category = categoryRepository.findById(req.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", req.categoryId()));
            product.setCategory(category);
        }

        product.setName(req.name().trim());
        product.setSlug(req.slug().trim().toLowerCase());
        product.setDescription(req.description());
        product.setImageUrl(req.imageUrl());
        product.setRetailPrice(req.retailPrice());
        product.setWholesalePrice(req.wholesalePrice());
        product.setUnitCost(req.unitCost());
        if (req.unitOfMeasure() != null) product.setUnitOfMeasure(req.unitOfMeasure());
        if (req.moq() != null) product.setMoq(req.moq());
        if (req.moqIncrement() != null) product.setMoqIncrement(req.moqIncrement());
        if (req.stockQuantity() != null) product.setStockQuantity(req.stockQuantity());

        Product saved = productRepository.save(product);
        return ProductDto.fromEntity(saved, true);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_PRODUCTS, RedisCacheConfig.CACHE_PRODUCT_DETAIL}, allEntries = true)
    public void updateStock(UUID id, int newStock) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        product.setStockQuantity(newStock);
        product.setAvailable(newStock > 0);
        productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_PRODUCTS, RedisCacheConfig.CACHE_PRODUCT_DETAIL}, allEntries = true)
    public InventoryAuditLogDto adjustStockWithAudit(UUID id, StockAdjustmentRequest req, UUID adjustedByUserId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));

        User user = userRepository.findById(adjustedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", adjustedByUserId));

        int previousQty = product.getStockQuantity();
        int newQty = req.newQuantity();
        int changeAmount = newQty - previousQty;

        product.setStockQuantity(newQty);
        product.setAvailable(newQty > 0);
        productRepository.save(product);

        InventoryAuditLog auditLog = new InventoryAuditLog(
                product,
                user,
                previousQty,
                newQty,
                changeAmount,
                req.reasonCode(),
                req.notes()
        );
        InventoryAuditLog savedLog = auditLogRepository.save(auditLog);
        return InventoryAuditLogDto.fromEntity(savedLog);
    }

    @Transactional(readOnly = true)
    public List<InventoryAuditLogDto> getRecentAuditLogs() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc()
                .stream()
                .map(InventoryAuditLogDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<InventoryAuditLogDto> getProductAuditLogs(UUID productId, Pageable pageable) {
        return auditLogRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable)
                .map(InventoryAuditLogDto::fromEntity);
    }

    @Transactional
    @CacheEvict(value = {RedisCacheConfig.CACHE_PRODUCTS, RedisCacheConfig.CACHE_PRODUCT_DETAIL}, allEntries = true)
    public void deactivateProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        product.setActive(false);
        product.setAvailable(false);
        productRepository.save(product);
    }
}
