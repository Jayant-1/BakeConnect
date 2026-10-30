package com.bakeconnect.reporting.service;

import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.OrderItem;
import com.bakeconnect.ordering.entity.OrderStatus;
import com.bakeconnect.ordering.entity.OrderType;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.reporting.dto.*;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.entity.RetailerProfile;
import com.bakeconnect.retailer.repository.RetailerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class ReportingService {

    private static final Logger log = LoggerFactory.getLogger(ReportingService.class);
    private static final ZoneId PUNE_ZONE = ZoneId.of("Asia/Kolkata");

    private static final List<OrderStatus> ACTIVE_ORDER_STATUSES = List.of(
            OrderStatus.CONFIRMED,
            OrderStatus.DELIVERED,
            OrderStatus.PROCESSING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.OUT_FOR_DELIVERY
    );

    private final OrderRepository orderRepository;
    private final RetailerProfileRepository retailerProfileRepository;

    public ReportingService(OrderRepository orderRepository,
                            RetailerProfileRepository retailerProfileRepository) {
        this.orderRepository = orderRepository;
        this.retailerProfileRepository = retailerProfileRepository;
    }

    @Transactional(readOnly = true)
    public SalesSummaryReportDto getSalesSummary(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now(PUNE_ZONE).minusDays(30);
        if (endDate == null) endDate = LocalDate.now(PUNE_ZONE);

        Instant startInstant = startDate.atStartOfDay(PUNE_ZONE).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(PUNE_ZONE).toInstant().minusNanos(1);

        List<Order> orders = orderRepository.findOrdersBetweenDatesAndStatuses(
                startInstant, endInstant, ACTIVE_ORDER_STATUSES);

        SalesSummaryReportDto report = new SalesSummaryReportDto();
        report.setPeriodStart(startDate);
        report.setPeriodEnd(endDate);
        report.setTotalOrders(orders.size());

        BigDecimal grossSales = BigDecimal.ZERO;
        BigDecimal totalDiscounts = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        long b2cCount = 0;
        BigDecimal b2cSales = BigDecimal.ZERO;

        long b2bCount = 0;
        BigDecimal b2bSales = BigDecimal.ZERO;

        boolean missingUnitCost = false;
        BigDecimal totalCogs = BigDecimal.ZERO;

        for (Order order : orders) {
            grossSales = grossSales.add(order.getSubtotalAmount());
            totalDiscounts = totalDiscounts.add(order.getDiscountAmount());
            totalTax = totalTax.add(order.getTaxAmount());
            totalRevenue = totalRevenue.add(order.getTotalAmount());

            if (order.getOrderType() == OrderType.PERSONAL) {
                b2cCount++;
                b2cSales = b2cSales.add(order.getSubtotalAmount());
            } else if (order.getOrderType() == OrderType.BUSINESS) {
                b2bCount++;
                b2bSales = b2bSales.add(order.getSubtotalAmount());
            }

            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                if (product == null || product.getUnitCost() == null) {
                    missingUnitCost = true;
                } else {
                    BigDecimal itemCost = product.getUnitCost().multiply(BigDecimal.valueOf(item.getQuantity()));
                    totalCogs = totalCogs.add(itemCost);
                }
            }
        }

        BigDecimal netSales = grossSales.subtract(totalDiscounts).setScale(2, RoundingMode.HALF_UP);

        report.setGrossSales(grossSales.setScale(2, RoundingMode.HALF_UP));
        report.setTotalDiscounts(totalDiscounts.setScale(2, RoundingMode.HALF_UP));
        report.setNetSales(netSales);
        report.setTotalTax(totalTax.setScale(2, RoundingMode.HALF_UP));
        report.setTotalRevenue(totalRevenue.setScale(2, RoundingMode.HALF_UP));

        report.setB2cOrdersCount(b2cCount);
        report.setB2cGrossSales(b2cSales.setScale(2, RoundingMode.HALF_UP));
        report.setB2cAov(b2cCount > 0
                ? b2cSales.divide(BigDecimal.valueOf(b2cCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        report.setB2bOrdersCount(b2bCount);
        report.setB2bGrossSales(b2bSales.setScale(2, RoundingMode.HALF_UP));
        report.setB2bAov(b2bCount > 0
                ? b2bSales.divide(BigDecimal.valueOf(b2bCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        report.setBlendedAov(orders.size() > 0
                ? grossSales.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        // Margin calculation strictly gated by historized unit cost
        if (missingUnitCost || orders.isEmpty()) {
            report.setMarginStatus("NOT_AVAILABLE");
            report.setTotalCostOfGoodsSold(null);
            report.setGrossMargin(null);
            report.setGrossMarginPercentage(null);
            report.setMarginExplanatoryNote("Margin calculation unavailable: One or more products sold during this period do not have a configured unit cost.");
        } else {
            BigDecimal cogs = totalCogs.setScale(2, RoundingMode.HALF_UP);
            BigDecimal grossMargin = netSales.subtract(cogs).setScale(2, RoundingMode.HALF_UP);
            BigDecimal marginPct = (netSales.compareTo(BigDecimal.ZERO) > 0)
                    ? grossMargin.multiply(BigDecimal.valueOf(100)).divide(netSales, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            report.setMarginStatus("AVAILABLE");
            report.setTotalCostOfGoodsSold(cogs);
            report.setGrossMargin(grossMargin);
            report.setGrossMarginPercentage(marginPct);
            report.setMarginExplanatoryNote("Gross margin computed authoritatively from configured product unit costs.");
        }

        return report;
    }

    @Transactional(readOnly = true)
    public List<TopProductItemDto> getTopProducts(LocalDate startDate, LocalDate endDate, int limit) {
        return getTopProducts(startDate, endDate, "ALL", "QUANTITY", limit);
    }

    @Transactional(readOnly = true)
    public List<TopProductItemDto> getTopProducts(LocalDate startDate, LocalDate endDate, String channel, String sortBy, int limit) {
        if (startDate == null) startDate = LocalDate.now(PUNE_ZONE).minusDays(30);
        if (endDate == null) endDate = LocalDate.now(PUNE_ZONE);
        if (limit <= 0) limit = 10;
        if (channel == null || channel.isBlank()) channel = "ALL";
        if (sortBy == null || sortBy.isBlank()) sortBy = "QUANTITY";

        Instant startInstant = startDate.atStartOfDay(PUNE_ZONE).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(PUNE_ZONE).toInstant().minusNanos(1);

        long days = Math.max(1, ChronoUnit.DAYS.between(startDate, endDate) + 1);
        LocalDate prevStartDate = startDate.minusDays(days);
        LocalDate prevEndDate = startDate.minusDays(1);
        Instant prevStartInstant = prevStartDate.atStartOfDay(PUNE_ZONE).toInstant();
        Instant prevEndInstant = prevEndDate.plusDays(1).atStartOfDay(PUNE_ZONE).toInstant().minusNanos(1);

        List<Order> currentOrders = orderRepository.findOrdersBetweenDatesAndStatuses(
                startInstant, endInstant, ACTIVE_ORDER_STATUSES);

        List<Order> prevOrders = orderRepository.findOrdersBetweenDatesAndStatuses(
                prevStartInstant, prevEndInstant, ACTIVE_ORDER_STATUSES);

        String channelFilter = channel.trim().toUpperCase();
        if (channelFilter.equals("CUSTOMER") || channelFilter.equals("B2C") || channelFilter.equals("PERSONAL")) {
            currentOrders = currentOrders.stream().filter(o -> o.getOrderType() == OrderType.PERSONAL).toList();
            prevOrders = prevOrders.stream().filter(o -> o.getOrderType() == OrderType.PERSONAL).toList();
        } else if (channelFilter.equals("WHOLESALE") || channelFilter.equals("B2B") || channelFilter.equals("BUSINESS")) {
            currentOrders = currentOrders.stream().filter(o -> o.getOrderType() == OrderType.BUSINESS).toList();
            prevOrders = prevOrders.stream().filter(o -> o.getOrderType() == OrderType.BUSINESS).toList();
        }

        Map<UUID, ProductSaleAccumulator> currentMap = new HashMap<>();
        for (Order order : currentOrders) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() == null) continue;
                UUID prodId = item.getProduct().getId();
                currentMap.computeIfAbsent(prodId, k -> new ProductSaleAccumulator(
                        prodId, item.getProduct().getName(), item.getProduct().getSlug()))
                        .addSale(item.getQuantity(), item.getTotalPriceSnapshot(), order.getId());
            }
        }

        Map<UUID, ProductSaleAccumulator> prevMap = new HashMap<>();
        for (Order order : prevOrders) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() == null) continue;
                UUID prodId = item.getProduct().getId();
                prevMap.computeIfAbsent(prodId, k -> new ProductSaleAccumulator(
                        prodId, item.getProduct().getName(), item.getProduct().getSlug()))
                        .addSale(item.getQuantity(), item.getTotalPriceSnapshot(), order.getId());
            }
        }

        Comparator<ProductSaleAccumulator> comparator;
        if (sortBy.equalsIgnoreCase("REVENUE") || sortBy.equalsIgnoreCase("NET_SALES")) {
            comparator = (a, b) -> b.totalRevenue.compareTo(a.totalRevenue);
        } else if (sortBy.equalsIgnoreCase("ORDER_COUNT")) {
            comparator = (a, b) -> Long.compare(b.orderIds.size(), a.orderIds.size());
        } else {
            comparator = (a, b) -> Long.compare(b.quantitySold, a.quantitySold);
        }

        String finalChannel = channelFilter;
        return currentMap.values().stream()
                .sorted(comparator)
                .limit(limit)
                .map(acc -> {
                    ProductSaleAccumulator prevAcc = prevMap.get(acc.productId);
                    long prevQty = prevAcc != null ? prevAcc.quantitySold : 0;
                    BigDecimal prevRev = prevAcc != null ? prevAcc.totalRevenue : BigDecimal.ZERO;
                    long prevOrderCount = prevAcc != null ? prevAcc.orderIds.size() : 0;

                    BigDecimal qtyGrowth = null;
                    if (prevQty > 0) {
                        qtyGrowth = BigDecimal.valueOf(acc.quantitySold - prevQty)
                                .multiply(BigDecimal.valueOf(100))
                                .divide(BigDecimal.valueOf(prevQty), 2, RoundingMode.HALF_UP);
                    } else if (acc.quantitySold > 0) {
                        qtyGrowth = new BigDecimal("100.00");
                    }

                    BigDecimal revGrowth = null;
                    if (prevRev.compareTo(BigDecimal.ZERO) > 0) {
                        revGrowth = acc.totalRevenue.subtract(prevRev)
                                .multiply(BigDecimal.valueOf(100))
                                .divide(prevRev, 2, RoundingMode.HALF_UP);
                    } else if (acc.totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
                        revGrowth = new BigDecimal("100.00");
                    }

                    return new TopProductItemDto(
                            acc.productId,
                            acc.productName,
                            acc.productSlug,
                            finalChannel,
                            acc.quantitySold,
                            acc.totalRevenue.setScale(2, RoundingMode.HALF_UP),
                            acc.orderIds.size(),
                            prevQty,
                            prevRev.setScale(2, RoundingMode.HALF_UP),
                            prevOrderCount,
                            qtyGrowth,
                            revGrowth
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public RetailerGrowthDto getRetailerGrowth(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now(PUNE_ZONE).minusDays(30);
        if (endDate == null) endDate = LocalDate.now(PUNE_ZONE);

        Instant startInstant = startDate.atStartOfDay(PUNE_ZONE).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(PUNE_ZONE).toInstant().minusNanos(1);

        List<RetailerProfile> allRetailers = retailerProfileRepository.findAll();
        List<RetailerProfile> approvedRetailers = allRetailers.stream()
                .filter(p -> p.getApprovalStatus() == RetailerApprovalStatus.APPROVED)
                .toList();

        long newRetailersCount = approvedRetailers.stream()
                .filter(p -> !p.getCreatedAt().isBefore(startInstant) && !p.getCreatedAt().isAfter(endInstant))
                .count();

        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant now = Instant.now();
        List<RetailerChurnSignalDto> churnSignals = new ArrayList<>();

        for (RetailerProfile profile : approvedRetailers) {
            List<Order> recentOrders = orderRepository.findRecentRetailerOrders(
                    profile.getUser().getId(), thirtyDaysAgo);

            if (recentOrders.isEmpty()) {
                // Find all lifetime orders to compute churn context
                List<Order> lifetimeOrders = orderRepository.findRecentRetailerOrders(
                        profile.getUser().getId(), Instant.EPOCH);

                Instant lastOrderTime = lifetimeOrders.isEmpty() ? null : lifetimeOrders.get(0).getCreatedAt();
                long daysSinceLast = (lastOrderTime != null)
                        ? Duration.between(lastOrderTime, now).toDays()
                        : Duration.between(profile.getCreatedAt(), now).toDays();

                LocalDate lastOrderDate = (lastOrderTime != null)
                        ? LocalDate.ofInstant(lastOrderTime, PUNE_ZONE)
                        : null;

                BigDecimal lifetimeRevenue = lifetimeOrders.stream()
                        .map(Order::getTotalAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .setScale(2, RoundingMode.HALF_UP);

                churnSignals.add(new RetailerChurnSignalDto(
                        profile.getUser().getId(),
                        profile.getBusinessName(),
                        profile.getContactPersonName(),
                        profile.getContactPhone(),
                        daysSinceLast,
                        lastOrderDate,
                        lifetimeOrders.size(),
                        lifetimeRevenue
                ));
            }
        }

        churnSignals.sort((a, b) -> Long.compare(b.getDaysSinceLastOrder(), a.getDaysSinceLastOrder()));

        return new RetailerGrowthDto(
                approvedRetailers.size(),
                newRetailersCount,
                churnSignals.size(),
                churnSignals
        );
    }

    private static class ProductSaleAccumulator {
        final UUID productId;
        final String productName;
        final String productSlug;
        long quantitySold = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        final Set<UUID> orderIds = new HashSet<>();

        ProductSaleAccumulator(UUID productId, String productName, String productSlug) {
            this.productId = productId;
            this.productName = productName;
            this.productSlug = productSlug;
        }

        void addSale(int qty, BigDecimal rev, UUID orderId) {
            this.quantitySold += qty;
            if (rev != null) {
                this.totalRevenue = this.totalRevenue.add(rev);
            }
            if (orderId != null) {
                this.orderIds.add(orderId);
            }
        }
    }
}
