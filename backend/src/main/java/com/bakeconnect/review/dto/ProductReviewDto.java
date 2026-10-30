package com.bakeconnect.review.dto;

import com.bakeconnect.review.entity.ProductReview;
import java.time.Instant;
import java.util.UUID;

public class ProductReviewDto {

    private UUID id;
    private UUID productId;
    private String productName;
    private UUID userId;
    private String authorName;
    private UUID orderId;
    private int rating;
    private String comment;
    private boolean verifiedPurchase;
    private Instant createdAt;

    public ProductReviewDto() {}

    public static ProductReviewDto fromEntity(ProductReview review) {
        ProductReviewDto dto = new ProductReviewDto();
        dto.setId(review.getId());
        if (review.getProduct() != null) {
            dto.setProductId(review.getProduct().getId());
            dto.setProductName(review.getProduct().getName());
        }
        if (review.getUser() != null) {
            dto.setUserId(review.getUser().getId());
            dto.setAuthorName(review.getUser().getFullName());
        }
        if (review.getOrder() != null) {
            dto.setOrderId(review.getOrder().getId());
        }
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setVerifiedPurchase(review.isVerifiedPurchase());
        dto.setCreatedAt(review.getCreatedAt());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public boolean isVerifiedPurchase() { return verifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { this.verifiedPurchase = verifiedPurchase; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
