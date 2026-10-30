package com.bakeconnect.review.service;

import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.common.exception.ForbiddenException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.OrderStatus;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.review.dto.ProductReviewDto;
import com.bakeconnect.review.dto.ProductReviewSummaryDto;
import com.bakeconnect.review.dto.ReviewCreateRequest;
import com.bakeconnect.review.entity.ProductReview;
import com.bakeconnect.review.repository.ProductReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    public ReviewService(ProductReviewRepository reviewRepository,
                         ProductRepository productRepository,
                         OrderRepository orderRepository,
                         UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    @CacheEvict(value = "product-reviews", key = "#request.productId")
    public ProductReviewDto createReview(ReviewCreateRequest request, UUID userId) {
        if (reviewRepository.existsByProductIdAndUserIdAndOrderId(request.getProductId(), userId, request.getOrderId())) {
            throw new ConflictException("You have already reviewed this product for order: " + request.getOrderId());
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        if (!order.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Access denied: You cannot review an order belonging to another customer");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BusinessRuleException("Only delivered orders can be reviewed for verified purchases. Current status: " + order.getStatus());
        }

        boolean itemFound = order.getItems().stream()
                .anyMatch(item -> item.getProduct() != null && item.getProduct().getId().equals(product.getId()));
        if (!itemFound) {
            throw new BusinessRuleException("Product '" + product.getName() + "' was not found in order " + order.getOrderNumber());
        }

        ProductReview review = new ProductReview(
                product,
                user,
                order,
                request.getRating(),
                request.getComment()
        );

        ProductReview saved = reviewRepository.save(review);
        log.info("Verified review submitted for product {} by user {} (Rating: {})",
                product.getName(), user.getEmail(), request.getRating());

        return ProductReviewDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Page<ProductReviewDto> getProductReviews(UUID productId, Pageable pageable) {
        return reviewRepository.findByProductIdAndStatus(productId, "PUBLISHED", pageable)
                .map(ProductReviewDto::fromEntity);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "product-reviews", key = "#productId")
    public ProductReviewSummaryDto getProductReviewSummary(UUID productId) {
        Double avgRating = reviewRepository.getAverageRatingByProductId(productId);
        long count = reviewRepository.countPublishedReviewsByProductId(productId);

        double roundedAvg = (avgRating != null)
                ? BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        return new ProductReviewSummaryDto(productId, roundedAvg, count);
    }
}
