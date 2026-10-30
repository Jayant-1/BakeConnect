package com.bakeconnect.reporting.service;

import com.bakeconnect.catalog.entity.Category;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.reporting.dto.RetailerGrowthDto;
import com.bakeconnect.reporting.dto.SalesSummaryReportDto;
import com.bakeconnect.reporting.dto.TopProductItemDto;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.entity.RetailerProfile;
import com.bakeconnect.retailer.repository.RetailerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportingServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private RetailerProfileRepository retailerProfileRepository;

    @InjectMocks
    private ReportingService reportingService;

    private Product productWithCost;
    private Product productWithoutCost;
    private User b2cUser;
    private User retailerUser;

    @BeforeEach
    void setUp() {
        Category category = new Category("Breads", "breads", "Artisan", null, 1);

        productWithCost = new Product(
                category, "Sourdough", "sourdough", "Loaf", null,
                new BigDecimal("100.00"), new BigDecimal("80.00"),
                new BigDecimal("40.00"), "PIECE", 1, 1, 100
        );
        productWithCost.setId(UUID.randomUUID());

        productWithoutCost = new Product(
                category, "Focaccia", "focaccia", "Herb Focaccia", null,
                new BigDecimal("120.00"), new BigDecimal("95.00"),
                null, "PIECE", 1, 1, 100 // Unit cost is null!
        );
        productWithoutCost.setId(UUID.randomUUID());

        b2cUser = new User("b2c@test.com", "hash", "B2C Customer", "9876543210", UserRole.DIRECT_CUSTOMER);
        b2cUser.setId(UUID.randomUUID());

        retailerUser = new User("b2b@test.com", "hash", "B2B Retailer", "9876543211", UserRole.RETAILER);
        retailerUser.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("getSalesSummary calculates metrics and margins when unit costs are available")
    void getSalesSummary_AvailableMargin() {
        // Order 1: B2C order, 2 units of sourdough @ 100.00 = 200.00, tax 10.00, total 210.00
        Order order1 = new Order("BC-B2C-001", b2cUser, OrderType.PERSONAL, OrderStatus.DELIVERED,
                PaymentStatus.PAID, DeliveryType.DELIVERY, "{}", null, null,
                new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("10.00"), new BigDecimal("210.00"), null);
        OrderItem item1 = new OrderItem(productWithCost, "Sourdough", "sourdough",
                new BigDecimal("100.00"), 2, BigDecimal.ZERO, new BigDecimal("10.00"), new BigDecimal("200.00"));
        order1.addItem(item1);

        // Order 2: B2B order, 10 units of sourdough @ 80.00 = 800.00, discount 20.00, tax 39.00, total 819.00
        Order order2 = new Order("BC-B2B-001", retailerUser, OrderType.BUSINESS, OrderStatus.DELIVERED,
                PaymentStatus.PAID, DeliveryType.DELIVERY, "{}", "27GST", "Mart",
                new BigDecimal("800.00"), new BigDecimal("20.00"), new BigDecimal("39.00"), new BigDecimal("819.00"), null);
        OrderItem item2 = new OrderItem(productWithCost, "Sourdough", "sourdough",
                new BigDecimal("80.00"), 10, new BigDecimal("20.00"), new BigDecimal("39.00"), new BigDecimal("780.00"));
        order2.addItem(item2);

        when(orderRepository.findOrdersBetweenDatesAndStatuses(any(), any(), any()))
                .thenReturn(List.of(order1, order2));

        SalesSummaryReportDto report = reportingService.getSalesSummary(LocalDate.now().minusDays(7), LocalDate.now());

        assertThat(report.getTotalOrders()).isEqualTo(2);
        assertThat(report.getGrossSales()).isEqualByComparingTo("1000.00"); // 200 + 800
        assertThat(report.getTotalDiscounts()).isEqualByComparingTo("20.00");
        assertThat(report.getNetSales()).isEqualByComparingTo("980.00"); // 1000 - 20
        assertThat(report.getTotalTax()).isEqualByComparingTo("49.00");
        assertThat(report.getTotalRevenue()).isEqualByComparingTo("1029.00");

        assertThat(report.getB2cOrdersCount()).isEqualTo(1);
        assertThat(report.getB2cAov()).isEqualByComparingTo("200.00");

        assertThat(report.getB2bOrdersCount()).isEqualTo(1);
        assertThat(report.getB2bAov()).isEqualByComparingTo("800.00");

        assertThat(report.getBlendedAov()).isEqualByComparingTo("500.00"); // 1000 / 2

        // Total COGS: (2 + 10) * 40.00 = 480.00
        assertThat(report.getMarginStatus()).isEqualTo("AVAILABLE");
        assertThat(report.getTotalCostOfGoodsSold()).isEqualByComparingTo("480.00");
        // Gross margin: 980.00 - 480.00 = 500.00
        assertThat(report.getGrossMargin()).isEqualByComparingTo("500.00");
        // Margin %: (500.00 / 980.00) * 100 = 51.02%
        assertThat(report.getGrossMarginPercentage()).isEqualByComparingTo("51.02");
    }

    @Test
    @DisplayName("getSalesSummary gates margin calculation and sets NOT_AVAILABLE when any product lacks unit cost")
    void getSalesSummary_MissingUnitCost_MarginGated() {
        Order order = new Order("BC-B2C-002", b2cUser, OrderType.PERSONAL, OrderStatus.DELIVERED,
                PaymentStatus.PAID, DeliveryType.DELIVERY, "{}", null, null,
                new BigDecimal("120.00"), BigDecimal.ZERO, new BigDecimal("6.00"), new BigDecimal("126.00"), null);
        OrderItem item = new OrderItem(productWithoutCost, "Focaccia", "focaccia",
                new BigDecimal("120.00"), 1, BigDecimal.ZERO, new BigDecimal("6.00"), new BigDecimal("120.00"));
        order.addItem(item);

        when(orderRepository.findOrdersBetweenDatesAndStatuses(any(), any(), any()))
                .thenReturn(List.of(order));

        SalesSummaryReportDto report = reportingService.getSalesSummary(LocalDate.now().minusDays(1), LocalDate.now());

        assertThat(report.getMarginStatus()).isEqualTo("NOT_AVAILABLE");
        assertThat(report.getTotalCostOfGoodsSold()).isNull();
        assertThat(report.getGrossMargin()).isNull();
        assertThat(report.getGrossMarginPercentage()).isNull();
        assertThat(report.getMarginExplanatoryNote()).contains("do not have a configured unit cost");
    }

    @Test
    @DisplayName("getTopProducts aggregates quantity sold and revenue, sorted descending")
    void getTopProducts_Success() {
        Order order = new Order("BC-B2C-003", b2cUser, OrderType.PERSONAL, OrderStatus.DELIVERED,
                PaymentStatus.PAID, DeliveryType.DELIVERY, "{}", null, null,
                new BigDecimal("500.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("500.00"), null);

        OrderItem item1 = new OrderItem(productWithCost, "Sourdough", "sourdough",
                new BigDecimal("100.00"), 5, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("500.00"));
        OrderItem item2 = new OrderItem(productWithoutCost, "Focaccia", "focaccia",
                new BigDecimal("120.00"), 1, BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("120.00"));
        order.addItem(item1);
        order.addItem(item2);

        when(orderRepository.findOrdersBetweenDatesAndStatuses(any(), any(), any()))
                .thenReturn(List.of(order));

        List<TopProductItemDto> topProducts = reportingService.getTopProducts(LocalDate.now().minusDays(7), LocalDate.now(), 5);

        assertThat(topProducts).hasSize(2);
        assertThat(topProducts.get(0).getProductName()).isEqualTo("Sourdough");
        assertThat(topProducts.get(0).getTotalQuantitySold()).isEqualTo(5);
        assertThat(topProducts.get(1).getProductName()).isEqualTo("Focaccia");
        assertThat(topProducts.get(1).getTotalQuantitySold()).isEqualTo(1);
    }

    @Test
    @DisplayName("getRetailerGrowth detects approved retailers who have not ordered in >= 30 days")
    void getRetailerGrowth_DetectsChurnSignals() {
        RetailerProfile profile = new RetailerProfile(retailerUser, "Daily Mart", "27GST", "Bob", "9876543211");
        profile.setApprovalStatus(RetailerApprovalStatus.APPROVED);
        profile.setCreatedAt(Instant.now().minus(60, ChronoUnit.DAYS));

        when(retailerProfileRepository.findAll()).thenReturn(List.of(profile));
        // No orders in the last 30 days
        when(orderRepository.findRecentRetailerOrders(eq(retailerUser.getId()), any(Instant.class)))
                .thenReturn(Collections.emptyList());

        RetailerGrowthDto growth = reportingService.getRetailerGrowth(LocalDate.now().minusDays(30), LocalDate.now());

        assertThat(growth.getTotalActiveRetailers()).isEqualTo(1);
        assertThat(growth.getChurnRiskCount()).isEqualTo(1);
        assertThat(growth.getChurnRiskRetailers().get(0).getBusinessName()).isEqualTo("Daily Mart");
    }
}
