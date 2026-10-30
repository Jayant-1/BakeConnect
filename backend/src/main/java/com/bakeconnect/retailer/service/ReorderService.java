package com.bakeconnect.retailer.service;

import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.OrderItem;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.retailer.dto.ReorderSuggestionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class ReorderService {

    private static final Logger log = LoggerFactory.getLogger(ReorderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public ReorderService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<ReorderSuggestionDto> getReorderSuggestions(UUID retailerId) {
        Instant ninetyDaysAgo = Instant.now().minus(90, ChronoUnit.DAYS);
        List<Order> pastOrders = orderRepository.findRecentRetailerOrders(retailerId, ninetyDaysAgo);

        if (pastOrders.isEmpty()) {
            return Collections.emptyList();
        }

        // Aggregate product stats: product ID -> list of (Order, OrderItem)
        Map<UUID, ProductPurchaseStats> statsMap = new HashMap<>();

        for (Order order : pastOrders) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() == null) continue;
                UUID prodId = item.getProduct().getId();

                statsMap.computeIfAbsent(prodId, k -> new ProductPurchaseStats(item.getProduct()))
                        .recordPurchase(order.getCreatedAt(), item.getQuantity());
            }
        }

        Instant now = Instant.now();
        List<ReorderSuggestionDto> suggestions = new ArrayList<>();

        for (ProductPurchaseStats stats : statsMap.values()) {
            Product product = stats.product;
            if (!product.isActive()) continue; // Don't suggest inactive products

            long avgInterval = stats.calculateAverageIntervalDays();
            long daysSinceLast = Duration.between(stats.latestOrderTime, now).toDays();
            int recommendedQty = stats.calculateRecommendedQuantity();

            BigDecimal unitPrice = product.getWholesalePrice() != null
                    ? product.getWholesalePrice()
                    : product.getRetailPrice();
            BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(recommendedQty)).setScale(2, RoundingMode.HALF_UP);

            String reason = String.format("Ordered %d times in last 90 days (avg every %d days). Last ordered %d days ago.",
                    stats.orderCount, avgInterval, daysSinceLast);

            suggestions.add(new ReorderSuggestionDto(
                    product.getId(),
                    product.getName(),
                    product.getSlug(),
                    recommendedQty,
                    unitPrice,
                    totalPrice,
                    product.getMoq(),
                    avgInterval,
                    daysSinceLast,
                    reason,
                    product.isAvailable() && product.getStockQuantity() >= recommendedQty
            ));
        }

        // Sort: products due for reorder first (daysSinceLast >= avgInterval), then by order count descending
        suggestions.sort((a, b) -> {
            boolean aDue = a.getDaysSinceLastOrder() >= a.getAverageOrderIntervalDays();
            boolean bDue = b.getDaysSinceLastOrder() >= b.getAverageOrderIntervalDays();
            if (aDue != bDue) {
                return aDue ? -1 : 1;
            }
            return Long.compare(b.getDaysSinceLastOrder(), a.getDaysSinceLastOrder());
        });

        return suggestions;
    }

    private static class ProductPurchaseStats {
        final Product product;
        int totalQuantity = 0;
        int orderCount = 0;
        Instant earliestOrderTime = null;
        Instant latestOrderTime = null;

        ProductPurchaseStats(Product product) {
            this.product = product;
        }

        void recordPurchase(Instant orderTime, int quantity) {
            totalQuantity += quantity;
            orderCount++;
            if (earliestOrderTime == null || orderTime.isBefore(earliestOrderTime)) {
                earliestOrderTime = orderTime;
            }
            if (latestOrderTime == null || orderTime.isAfter(latestOrderTime)) {
                latestOrderTime = orderTime;
            }
        }

        long calculateAverageIntervalDays() {
            if (orderCount <= 1 || earliestOrderTime == null || latestOrderTime == null) {
                return 7; // Default weekly cadence for single-order items
            }
            long totalDays = Duration.between(earliestOrderTime, latestOrderTime).toDays();
            long interval = totalDays / (orderCount - 1);
            return Math.max(1, interval);
        }

        int calculateRecommendedQuantity() {
            int avgQty = (int) Math.round((double) totalQuantity / orderCount);
            int moq = Math.max(1, product.getMoq());
            int rec = Math.max(avgQty, moq);

            int inc = Math.max(1, product.getMoqIncrement());
            int excess = (rec - moq) % inc;
            if (excess != 0) {
                rec += (inc - excess);
            }
            return rec;
        }
    }
}
