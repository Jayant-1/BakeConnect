package com.bakeconnect.review.service;

import com.bakeconnect.catalog.entity.Category;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.common.exception.ForbiddenException;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.review.dto.ProductReviewDto;
import com.bakeconnect.review.dto.ProductReviewSummaryDto;
import com.bakeconnect.review.dto.ReviewCreateRequest;
import com.bakeconnect.review.entity.ProductReview;
import com.bakeconnect.review.repository.ProductReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ProductReviewRepository reviewRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReviewService reviewService;

    private User user;
    private Product product;
    private Order deliveredOrder;

    @BeforeEach
    void setUp() {
        user = new User("reviewer@test.com", "hash", "Reviewer", "9876543210", UserRole.DIRECT_CUSTOMER);
        user.setId(UUID.randomUUID());

        Category category = new Category("Breads", "breads", "Freshly baked artisan breads", null, 1);
        product = new Product(
                category, "Sourdough Loaf", "sourdough-loaf", "Naturally fermented sourdough",
                null, new BigDecimal("150.00"), new BigDecimal("120.00"),
                new BigDecimal("60.00"), "PIECE", 1, 1, 50
        );
        product.setId(UUID.randomUUID());

        deliveredOrder = new Order(
                "BC-20261028-REV",
                user,
                OrderType.PERSONAL,
                OrderStatus.DELIVERED,
                PaymentStatus.PAID,
                DeliveryType.DELIVERY,
                "{}",
                null,
                null,
                new BigDecimal("150.00"),
                BigDecimal.ZERO,
                new BigDecimal("7.50"),
                new BigDecimal("157.50"),
                null
        );
        deliveredOrder.setId(UUID.randomUUID());

        OrderItem item = new OrderItem(product, product.getName(), product.getSlug(),
                new BigDecimal("150.00"), 1, BigDecimal.ZERO, new BigDecimal("7.50"), new BigDecimal("150.00"));
        deliveredOrder.addItem(item);
    }

    @Test
    @DisplayName("createReview succeeds for verified purchase on delivered order")
    void createReview_Success() {
        ReviewCreateRequest request = new ReviewCreateRequest(
                product.getId(), deliveredOrder.getId(), 5, "Exquisite crust and flavor!"
        );

        when(reviewRepository.existsByProductIdAndUserIdAndOrderId(product.getId(), user.getId(), deliveredOrder.getId()))
                .thenReturn(false);
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(orderRepository.findById(deliveredOrder.getId())).thenReturn(Optional.of(deliveredOrder));

        when(reviewRepository.save(any(ProductReview.class))).thenAnswer(inv -> {
            ProductReview r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        ProductReviewDto reviewDto = reviewService.createReview(request, user.getId());

        assertThat(reviewDto).isNotNull();
        assertThat(reviewDto.getRating()).isEqualTo(5);
        assertThat(reviewDto.getComment()).isEqualTo("Exquisite crust and flavor!");
        assertThat(reviewDto.isVerifiedPurchase()).isTrue();
        verify(reviewRepository).save(any(ProductReview.class));
    }

    @Test
    @DisplayName("createReview throws BusinessRuleException when order is not delivered")
    void createReview_NotDelivered_ThrowsException() {
        deliveredOrder.setStatus(OrderStatus.CONFIRMED);

        ReviewCreateRequest request = new ReviewCreateRequest(
                product.getId(), deliveredOrder.getId(), 5, "Great bread!"
        );

        when(reviewRepository.existsByProductIdAndUserIdAndOrderId(product.getId(), user.getId(), deliveredOrder.getId()))
                .thenReturn(false);
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(orderRepository.findById(deliveredOrder.getId())).thenReturn(Optional.of(deliveredOrder));

        assertThatThrownBy(() -> reviewService.createReview(request, user.getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Only delivered orders can be reviewed");
    }

    @Test
    @DisplayName("createReview throws BusinessRuleException when product was not in order")
    void createReview_ProductNotInOrder_ThrowsException() {
        Product differentProduct = new Product();
        differentProduct.setId(UUID.randomUUID());
        differentProduct.setName("Brioche");

        ReviewCreateRequest request = new ReviewCreateRequest(
                differentProduct.getId(), deliveredOrder.getId(), 4, "Nice"
        );

        when(reviewRepository.existsByProductIdAndUserIdAndOrderId(differentProduct.getId(), user.getId(), deliveredOrder.getId()))
                .thenReturn(false);
        when(productRepository.findById(differentProduct.getId())).thenReturn(Optional.of(differentProduct));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(orderRepository.findById(deliveredOrder.getId())).thenReturn(Optional.of(deliveredOrder));

        assertThatThrownBy(() -> reviewService.createReview(request, user.getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("was not found in order");
    }

    @Test
    @DisplayName("createReview throws ConflictException on duplicate review for same order")
    void createReview_Duplicate_ThrowsConflict() {
        ReviewCreateRequest request = new ReviewCreateRequest(
                product.getId(), deliveredOrder.getId(), 5, "Repeat"
        );

        when(reviewRepository.existsByProductIdAndUserIdAndOrderId(product.getId(), user.getId(), deliveredOrder.getId()))
                .thenReturn(true);

        assertThatThrownBy(() -> reviewService.createReview(request, user.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already reviewed this product");
    }

    @Test
    @DisplayName("getProductReviewSummary computes average rating and total count correctly")
    void getProductReviewSummary_Success() {
        when(reviewRepository.getAverageRatingByProductId(product.getId())).thenReturn(4.6666);
        when(reviewRepository.countPublishedReviewsByProductId(product.getId())).thenReturn(15L);

        ProductReviewSummaryDto summary = reviewService.getProductReviewSummary(product.getId());

        assertThat(summary.getAverageRating()).isEqualTo(4.7);
        assertThat(summary.getTotalReviews()).isEqualTo(15L);
    }
}
