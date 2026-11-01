package com.bakeconnect.cart.service;

import com.bakeconnect.cart.dto.CartItemRequest;
import com.bakeconnect.cart.dto.CartQuoteRequest;
import com.bakeconnect.cart.dto.CartQuoteResponse;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.identity.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartQuoteServiceTest {

    @Mock
    private ProductRepository productRepository;

    private CartQuoteService cartQuoteService;
    private Product testCroissant;
    private UUID productId;

    @BeforeEach
    void setUp() {
        cartQuoteService = new CartQuoteService(productRepository);
        productId = UUID.randomUUID();

        testCroissant = new Product(
                null,
                "Butter Croissant",
                "butter-croissant",
                "Flaky butter croissant",
                null,
                new BigDecimal("120.00"), // Retail Price
                new BigDecimal("80.00"),  // Wholesale Price
                new BigDecimal("45.00"),
                "PIECE",
                5, // MOQ = 5
                5, // MOQ Increment = 5
                200 // Stock Quantity
        );
        testCroissant.setId(productId);
    }

    @Test
    void shouldCalculateRetailPricingForCustomerUnderDiscountThreshold() {
        when(productRepository.findById(productId)).thenReturn(Optional.of(testCroissant));

        CartQuoteRequest request = new CartQuoteRequest(List.of(new CartItemRequest(productId, 10)), null);
        CartQuoteResponse response = cartQuoteService.calculateQuote(request, UserRole.DIRECT_CUSTOMER);

        assertTrue(response.isValidForCheckout());
        assertEquals("RETAIL", response.channel());
        assertEquals(new BigDecimal("1200.00"), response.subtotal()); // 10 * 120 = 1200
        assertEquals(new BigDecimal("0.00"), response.discountAmount()); // Under 10,000 threshold
        assertEquals(new BigDecimal("60.00"), response.taxAmount());    // 5% of 1200 = 60
        assertEquals(new BigDecimal("1260.00"), response.totalAmount());
    }

    @Test
    void shouldApplyWholesalePricingAndBulkDiscountWhenThresholdExceeded() {
        when(productRepository.findById(productId)).thenReturn(Optional.of(testCroissant));

        // Retailer buys 200 croissants @ 80.00 = 16,000.00 subtotal (>= 10,000 threshold)
        CartQuoteRequest request = new CartQuoteRequest(List.of(new CartItemRequest(productId, 200)), null);
        CartQuoteResponse response = cartQuoteService.calculateQuote(request, UserRole.RETAILER);

        assertTrue(response.isValidForCheckout());
        assertEquals("WHOLESALE", response.channel());
        assertEquals(new BigDecimal("16000.00"), response.subtotal());

        // 2.5% of 16,000 = 400.00
        assertEquals(new BigDecimal("400.00"), response.discountAmount());
        assertNotNull(response.appliedDiscountDescription());

        // Net = 15,600. Tax 5% of 15,600 = 780. Total = 16,380.00
        assertEquals(new BigDecimal("780.00"), response.taxAmount());
        assertEquals(new BigDecimal("16380.00"), response.totalAmount());
    }

    @Test
    void shouldRejectCheckoutWhenStockIsInsufficient() {
        testCroissant.setStockQuantity(10);
        when(productRepository.findById(productId)).thenReturn(Optional.of(testCroissant));

        CartQuoteRequest request = new CartQuoteRequest(List.of(new CartItemRequest(productId, 25)), null);
        CartQuoteResponse response = cartQuoteService.calculateQuote(request, UserRole.DIRECT_CUSTOMER);

        assertFalse(response.isValidForCheckout());
        assertFalse(response.validationErrors().isEmpty());
        assertTrue(response.validationErrors().get(0).contains("Insufficient stock"));
    }

    @Test
    void shouldRejectWholesaleCheckoutWhenBelowMoq() {
        when(productRepository.findById(productId)).thenReturn(Optional.of(testCroissant));

        // MOQ is 5, requested is 2 for wholesale
        CartQuoteRequest request = new CartQuoteRequest(List.of(new CartItemRequest(productId, 2)), null);
        CartQuoteResponse response = cartQuoteService.calculateQuote(request, UserRole.RETAILER);

        assertFalse(response.isValidForCheckout());
        assertTrue(response.validationErrors().get(0).contains("Minimum wholesale order quantity"));
    }

    @Test
    void shouldAllowCustomerToBuySingleItemWithoutWholesaleMoqRestriction() {
        when(productRepository.findById(productId)).thenReturn(Optional.of(testCroissant));

        // Customer buys 1 croissant (below wholesale MOQ of 5)
        CartQuoteRequest request = new CartQuoteRequest(List.of(new CartItemRequest(productId, 1)), null);
        CartQuoteResponse response = cartQuoteService.calculateQuote(request, UserRole.DIRECT_CUSTOMER);

        assertTrue(response.isValidForCheckout());
        assertEquals("RETAIL", response.channel());
        assertEquals(new BigDecimal("120.00"), response.subtotal());
        assertEquals(new BigDecimal("6.00"), response.taxAmount());
        assertEquals(new BigDecimal("126.00"), response.totalAmount());
    }

    @Test
    void shouldApplyQazwsxCouponToReduceBaseTotalToOneRupee() {
        when(productRepository.findById(productId)).thenReturn(Optional.of(testCroissant));

        // Subtotal = 1 * 120.00 = 120.00
        CartQuoteRequest request = new CartQuoteRequest(List.of(new CartItemRequest(productId, 1)), "qazwsx");
        CartQuoteResponse response = cartQuoteService.calculateQuote(request, UserRole.DIRECT_CUSTOMER);

        assertTrue(response.isValidForCheckout());
        assertEquals(new BigDecimal("120.00"), response.subtotal());
        assertEquals(new BigDecimal("119.00"), response.discountAmount());
        assertEquals(new BigDecimal("0.00"), response.taxAmount());
        assertEquals(new BigDecimal("1.00"), response.totalAmount());
        assertTrue(response.appliedDiscountDescription().contains("qazwsx"));
    }
}
