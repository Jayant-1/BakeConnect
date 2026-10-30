package com.bakeconnect.review.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.review.dto.ProductReviewDto;
import com.bakeconnect.review.dto.ProductReviewSummaryDto;
import com.bakeconnect.review.dto.ReviewCreateRequest;
import com.bakeconnect.review.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reviews")
@Tag(name = "Product Reviews", description = "Verified purchase product reviews and rating summaries")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @SecurityRequirement(name = "BearerAuth")
    @Operation(summary = "Submit a verified purchase product review (Requires delivered order)")
    public ResponseEntity<ApiResponse<ProductReviewDto>> createReview(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody ReviewCreateRequest request) {
        ProductReviewDto review = reviewService.createReview(request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(review, "Review submitted successfully"));
    }

    @GetMapping("/products/{productId}")
    @Operation(summary = "Get published reviews for a product (public, paginated)")
    public ResponseEntity<ApiResponse<Page<ProductReviewDto>>> getProductReviews(
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ProductReviewDto> reviews = reviewService.getProductReviews(
                productId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    @GetMapping("/products/{productId}/summary")
    @Operation(summary = "Get average rating and review count for a product (cached)")
    public ResponseEntity<ApiResponse<ProductReviewSummaryDto>> getProductReviewSummary(
            @PathVariable UUID productId) {
        ProductReviewSummaryDto summary = reviewService.getProductReviewSummary(productId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
