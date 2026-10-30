package com.bakeconnect.catalog.service;

import com.bakeconnect.catalog.dto.CategoryCreateUpdateRequest;
import com.bakeconnect.catalog.dto.ProductDto;
import com.bakeconnect.catalog.entity.Category;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.CategoryRepository;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.catalog.repository.InventoryAuditLogRepository;
import com.bakeconnect.identity.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private InventoryAuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    private CatalogService catalogService;

    private Product testProduct;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        catalogService = new CatalogService(productRepository, categoryRepository, auditLogRepository, userRepository);

        testCategory = new Category("Breads", "breads", "Fresh artisan breads", null, 1);
        testCategory.setId(UUID.randomUUID());

        testProduct = new Product(
                testCategory,
                "Sourdough Loaf",
                "sourdough-loaf",
                "Fermented sourdough",
                null,
                new BigDecimal("150.00"), // Retail Price
                new BigDecimal("100.00"), // Wholesale Price
                new BigDecimal("60.00"),  // Unit Cost
                "PIECE",
                1,
                1,
                50
        );
        testProduct.setId(UUID.randomUUID());
    }

    @Test
    void shouldHideWholesalePriceFromAnonymousAndB2CCustomers() {
        Pageable pageable = PageRequest.of(0, 10);
        when(productRepository.findActiveAndAvailable(pageable))
                .thenReturn(new PageImpl<>(List.of(testProduct), pageable, 1));

        // Anonymous user (null role)
        Page<ProductDto> anonPage = catalogService.getProducts(null, null, pageable, null);
        assertNotNull(anonPage);
        ProductDto anonProduct = anonPage.getContent().get(0);
        assertEquals(new BigDecimal("150.00"), anonProduct.retailPrice());
        assertNull(anonProduct.wholesalePrice(), "Wholesale price must be null for anonymous users");

        // B2C Customer
        Page<ProductDto> b2cPage = catalogService.getProducts(null, null, pageable, UserRole.DIRECT_CUSTOMER);
        ProductDto b2cProduct = b2cPage.getContent().get(0);
        assertNull(b2cProduct.wholesalePrice(), "Wholesale price must be null for Direct Customer");
    }

    @Test
    void shouldDiscloseWholesalePriceToRetailersAndAdmins() {
        Pageable pageable = PageRequest.of(0, 10);
        when(productRepository.findActiveAndAvailable(pageable))
                .thenReturn(new PageImpl<>(List.of(testProduct), pageable, 1));

        // Retailer
        Page<ProductDto> retailerPage = catalogService.getProducts(null, null, pageable, UserRole.RETAILER);
        ProductDto retailerProduct = retailerPage.getContent().get(0);
        assertEquals(new BigDecimal("100.00"), retailerProduct.wholesalePrice(), "Wholesale price must be visible to Retailers");

        // Admin
        Page<ProductDto> adminPage = catalogService.getProducts(null, null, pageable, UserRole.BAKERY_ADMIN);
        ProductDto adminProduct = adminPage.getContent().get(0);
        assertEquals(new BigDecimal("100.00"), adminProduct.wholesalePrice(), "Wholesale price must be visible to Admin");
    }

    @Test
    void shouldThrowConflictWhenCategorySlugAlreadyExists() {
        CategoryCreateUpdateRequest req = new CategoryCreateUpdateRequest("Breads", "breads", "Description", null, 1);
        when(categoryRepository.existsBySlug("breads")).thenReturn(true);

        assertThrows(ConflictException.class, () -> catalogService.createCategory(req));
    }
}
