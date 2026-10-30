package com.bakeconnect.ordering.repository;

import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<Order> findByIdAndUserId(UUID id, UUID userId);

    Optional<Order> findByOrderNumberAndUserId(String orderNumber, UUID userId);

    Page<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Order o " +
           "JOIN o.items item " +
           "WHERE o.user.id = :userId " +
           "AND o.status = :status " +
           "AND item.product.id = :productId")
    boolean existsByUserIdAndStatusAndProductId(@Param("userId") UUID userId,
                                                @Param("status") OrderStatus status,
                                                @Param("productId") UUID productId);

    @Query("SELECT o FROM Order o " +
           "WHERE o.user.id = :userId " +
           "AND o.status IN ('CONFIRMED', 'DELIVERED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY') " +
           "AND o.createdAt >= :since " +
           "ORDER BY o.createdAt DESC")
    java.util.List<Order> findRecentRetailerOrders(@Param("userId") UUID userId,
                                                   @Param("since") java.time.Instant since);

    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items item " +
           "LEFT JOIN FETCH item.product p " +
           "WHERE o.createdAt >= :start AND o.createdAt <= :end " +
           "AND o.status IN :statuses " +
           "ORDER BY o.createdAt ASC")
    java.util.List<Order> findOrdersBetweenDatesAndStatuses(
            @Param("start") java.time.Instant start,
            @Param("end") java.time.Instant end,
            @Param("statuses") java.util.Collection<OrderStatus> statuses);

    Page<Order> findByDeliveryTypeOrderByCreatedAtDesc(com.bakeconnect.ordering.entity.DeliveryType deliveryType, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.deliveryType = :deliveryType AND (:paymentStatus IS NULL OR o.paymentStatus = :paymentStatus) ORDER BY o.createdAt DESC")
    Page<Order> findByDeliveryTypeAndPaymentStatus(
            @Param("deliveryType") com.bakeconnect.ordering.entity.DeliveryType deliveryType,
            @Param("paymentStatus") com.bakeconnect.ordering.entity.PaymentStatus paymentStatus,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.deliveryType = com.bakeconnect.ordering.entity.DeliveryType.DELIVERY AND o.paymentStatus = com.bakeconnect.ordering.entity.PaymentStatus.PAID")
    java.math.BigDecimal sumPaidDeliveryOrders();

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.deliveryType = com.bakeconnect.ordering.entity.DeliveryType.DELIVERY AND o.paymentStatus != com.bakeconnect.ordering.entity.PaymentStatus.PAID")
    java.math.BigDecimal sumUnpaidDeliveryOrders();

    long countByDeliveryTypeAndPaymentStatus(com.bakeconnect.ordering.entity.DeliveryType deliveryType, com.bakeconnect.ordering.entity.PaymentStatus paymentStatus);
}
