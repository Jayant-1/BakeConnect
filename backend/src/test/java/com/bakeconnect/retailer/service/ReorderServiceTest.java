package com.bakeconnect.retailer.service;

import com.bakeconnect.catalog.entity.Category;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.retailer.dto.ReorderSuggestionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReorderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ReorderService reorderService;

    private User retailer;
    private Product product;

    @BeforeEach
    void setUp() {
        retailer = new User("retailer@bakeconnect.com", "hash", "Super Mart", "9876543210", UserRole.RETAILER);
        retailer.setId(UUID.randomUUID());

        Category cat = new Category("Breads", "breads", "Artisan Breads", null, 1);
        product = new Product(
                cat, "Croissant Batch", "croissant-batch", "Buttery croissants",
                null, new BigDecimal("100.00"), new BigDecimal("80.00"),
                new BigDecimal("40.00"), "BATCH", 10, 5, 200
        );
        product.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("getReorderSuggestions calculates purchase cadence, MOQ compliance, and explainable reason")
    void getReorderSuggestions_CalculatesCadence() {
        Instant now = Instant.now();

        // Order 1: 30 days ago, 12 units
        Order order1 = new Order();
        order1.setId(UUID.randomUUID());
        order1.setUser(retailer);
        order1.setStatus(OrderStatus.DELIVERED);
        order1.setCreatedAt(now.minus(30, ChronoUnit.DAYS));
        OrderItem item1 = new OrderItem(product, product.getName(), product.getSlug(),
                new BigDecimal("80.00"), 12, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("960.00"));
        order1.addItem(item1);

        // Order 2: 15 days ago, 14 units
        Order order2 = new Order();
        order2.setId(UUID.randomUUID());
        order2.setUser(retailer);
        order2.setStatus(OrderStatus.DELIVERED);
        order2.setCreatedAt(now.minus(15, ChronoUnit.DAYS));
        OrderItem item2 = new OrderItem(product, product.getName(), product.getSlug(),
                new BigDecimal("80.00"), 14, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("1120.00"));
        order2.addItem(item2);

        // Order 3: 2 days ago, 13 units
        Order order3 = new Order();
        order3.setId(UUID.randomUUID());
        order3.setUser(retailer);
        order3.setStatus(OrderStatus.DELIVERED);
        order3.setCreatedAt(now.minus(2, ChronoUnit.DAYS));
        OrderItem item3 = new OrderItem(product, product.getName(), product.getSlug(),
                new BigDecimal("80.00"), 13, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("1040.00"));
        order3.addItem(item3);

        when(orderRepository.findRecentRetailerOrders(eq(retailer.getId()), any(Instant.class)))
                .thenReturn(List.of(order1, order2, order3));

        List<ReorderSuggestionDto> suggestions = reorderService.getReorderSuggestions(retailer.getId());

        assertThat(suggestions).hasSize(1);
        ReorderSuggestionDto suggestion = suggestions.get(0);
        assertThat(suggestion.getProductId()).isEqualTo(product.getId());
        assertThat(suggestion.getProductName()).isEqualTo("Croissant Batch");
        assertThat(suggestion.getUnitPrice()).isEqualByComparingTo("80.00");
        // Average qty is (12+14+13)/3 = 13. MOQ is 10, inc is 5.
        // Rec qty is rounded up from 13 to next multiple: 15.
        assertThat(suggestion.getRecommendedQuantity()).isEqualTo(15);
        assertThat(suggestion.getSuggestedTotalPrice()).isEqualByComparingTo("1200.00"); // 15 * 80
        assertThat(suggestion.getMoq()).isEqualTo(10);
        // Interval: 28 days / 2 = 14 days
        assertThat(suggestion.getAverageOrderIntervalDays()).isEqualTo(14);
        assertThat(suggestion.getDaysSinceLastOrder()).isGreaterThanOrEqualTo(2);
        assertThat(suggestion.getFrequencyReason()).contains("Ordered 3 times in last 90 days");
    }

    @Test
    @DisplayName("getReorderSuggestions returns empty list if retailer has no past orders")
    void getReorderSuggestions_NoPastOrders_ReturnsEmpty() {
        when(orderRepository.findRecentRetailerOrders(eq(retailer.getId()), any(Instant.class)))
                .thenReturn(Collections.emptyList());

        List<ReorderSuggestionDto> suggestions = reorderService.getReorderSuggestions(retailer.getId());
        assertThat(suggestions).isEmpty();
    }
}
