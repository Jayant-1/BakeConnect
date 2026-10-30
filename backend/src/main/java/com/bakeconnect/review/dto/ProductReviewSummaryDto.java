package com.bakeconnect.review.dto;

import java.util.UUID;

public class ProductReviewSummaryDto {

    private UUID productId;
    private double averageRating;
    private long totalReviews;

    public ProductReviewSummaryDto() {}

    public ProductReviewSummaryDto(UUID productId, double averageRating, long totalReviews) {
        this.productId = productId;
        this.averageRating = averageRating;
        this.totalReviews = totalReviews;
    }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public double getAverageRating() { return averageRating; }
    public void setAverageRating(double averageRating) { this.averageRating = averageRating; }

    public long getTotalReviews() { return totalReviews; }
    public void setTotalReviews(long totalReviews) { this.totalReviews = totalReviews; }
}
