package com.bakeconnect.ordering.entity;

import com.bakeconnect.catalog.entity.Product;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "product_name_snapshot", nullable = false)
    private String productNameSnapshot;

    @Column(name = "product_sku_snapshot")
    private String productSkuSnapshot;

    @Column(name = "unit_price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceSnapshot;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "discount_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountSnapshot = BigDecimal.ZERO;

    @Column(name = "tax_rate_snapshot", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRateSnapshot = BigDecimal.ZERO;

    @Column(name = "total_price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPriceSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public OrderItem() {}

    public OrderItem(Product product, String productNameSnapshot, String productSkuSnapshot,
                     BigDecimal unitPriceSnapshot, int quantity, BigDecimal discountSnapshot,
                     BigDecimal taxRateSnapshot, BigDecimal totalPriceSnapshot) {
        this.product = product;
        this.productNameSnapshot = productNameSnapshot;
        this.productSkuSnapshot = productSkuSnapshot;
        this.unitPriceSnapshot = unitPriceSnapshot;
        this.quantity = quantity;
        this.discountSnapshot = discountSnapshot != null ? discountSnapshot : BigDecimal.ZERO;
        this.taxRateSnapshot = taxRateSnapshot != null ? taxRateSnapshot : BigDecimal.ZERO;
        this.totalPriceSnapshot = totalPriceSnapshot;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public String getProductNameSnapshot() { return productNameSnapshot; }
    public void setProductNameSnapshot(String productNameSnapshot) { this.productNameSnapshot = productNameSnapshot; }

    public String getProductSkuSnapshot() { return productSkuSnapshot; }
    public void setProductSkuSnapshot(String productSkuSnapshot) { this.productSkuSnapshot = productSkuSnapshot; }

    public BigDecimal getUnitPriceSnapshot() { return unitPriceSnapshot; }
    public void setUnitPriceSnapshot(BigDecimal unitPriceSnapshot) { this.unitPriceSnapshot = unitPriceSnapshot; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public BigDecimal getDiscountSnapshot() { return discountSnapshot; }
    public void setDiscountSnapshot(BigDecimal discountSnapshot) { this.discountSnapshot = discountSnapshot; }

    public BigDecimal getTaxRateSnapshot() { return taxRateSnapshot; }
    public void setTaxRateSnapshot(BigDecimal taxRateSnapshot) { this.taxRateSnapshot = taxRateSnapshot; }

    public BigDecimal getTotalPriceSnapshot() { return totalPriceSnapshot; }
    public void setTotalPriceSnapshot(BigDecimal totalPriceSnapshot) { this.totalPriceSnapshot = totalPriceSnapshot; }

    public Instant getCreatedAt() { return createdAt; }
}
