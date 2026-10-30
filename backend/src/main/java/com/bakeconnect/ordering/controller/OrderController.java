package com.bakeconnect.ordering.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.ordering.dto.OrderCreateRequest;
import com.bakeconnect.ordering.dto.OrderDeclineRequest;
import com.bakeconnect.ordering.dto.OrderDelayRequest;
import com.bakeconnect.ordering.dto.OrderResponseDto;
import com.bakeconnect.ordering.dto.OrderStatusUpdateRequest;
import com.bakeconnect.ordering.entity.OrderStatus;
import com.bakeconnect.ordering.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Orders", description = "Order management, checkout, and status lifecycle endpoints")
@SecurityRequirement(name = "BearerAuth")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/orders")
    @Operation(summary = "Checkout and place a new order with authoritative pricing and inventory locking")
    public ResponseEntity<ApiResponse<OrderResponseDto>> createOrder(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody OrderCreateRequest request) {
        OrderResponseDto order = orderService.createOrder(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(order, "Order created successfully"));
    }

    @GetMapping("/orders")
    @Operation(summary = "Get order history for the authenticated user")
    public ResponseEntity<ApiResponse<Page<OrderResponseDto>>> getMyOrders(
            @AuthenticationPrincipal SecurityUser currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<OrderResponseDto> orders = orderService.getMyOrders(currentUser.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @GetMapping("/orders/{id}")
    @Operation(summary = "Get order details by ID (IDOR protected)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrderById(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id) {
        boolean isStaff = currentUser.getRole() == UserRole.BAKERY_ADMIN || currentUser.getRole() == UserRole.BAKERY_MANAGER;
        OrderResponseDto order = orderService.getOrderById(id, currentUser.getId(), isStaff);
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    @GetMapping("/orders/by-number/{orderNumber}")
    @Operation(summary = "Get order details by order number (IDOR protected)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> getOrderByNumber(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable String orderNumber) {
        boolean isStaff = currentUser.getRole() == UserRole.BAKERY_ADMIN || currentUser.getRole() == UserRole.BAKERY_MANAGER;
        OrderResponseDto order = orderService.getOrderByNumber(orderNumber, currentUser.getId(), isStaff);
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    @GetMapping({"/admin/orders", "/manager/orders"})
    @PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
    @Operation(summary = "Staff: List all orders across the system with optional status filter")
    public ResponseEntity<ApiResponse<Page<OrderResponseDto>>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<OrderResponseDto> orders = orderService.getAllOrders(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @PatchMapping({"/admin/orders/{id}/status", "/manager/orders/{id}/status"})
    @PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
    @Operation(summary = "Staff: Transition order status with audit history")
    public ResponseEntity<ApiResponse<OrderResponseDto>> updateOrderStatus(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        OrderResponseDto updated = orderService.updateOrderStatus(
                id,
                request.status(),
                request.reasonCode(),
                request.customerMessage(),
                currentUser.getId(),
                currentUser.getRole()
        );
        return ResponseEntity.ok(ApiResponse.success(updated, "Order status updated successfully"));
    }

    @PostMapping({"/admin/orders/{id}/accept", "/manager/orders/{id}/accept"})
    @PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
    @Operation(summary = "Staff: Accept order (transitions to CONFIRMED and generates invoice if B2B)")
    public ResponseEntity<ApiResponse<OrderResponseDto>> acceptOrder(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id) {
        OrderResponseDto updated = orderService.acceptOrder(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(updated, "Order accepted successfully"));
    }

    @PostMapping({"/admin/orders/{id}/delay", "/manager/orders/{id}/delay"})
    @PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
    @Operation(summary = "Staff: Delay order with reason code, customer message, and estimated delivery time")
    public ResponseEntity<ApiResponse<OrderDelayRequest>> delayOrder(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody OrderDelayRequest request) {
        OrderResponseDto updated = orderService.delayOrder(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(null, "Order delay recorded and customer notified"));
    }

    @PostMapping({"/admin/orders/{id}/decline", "/manager/orders/{id}/decline"})
    @PreAuthorize("hasAnyRole('BAKERY_ADMIN', 'BAKERY_MANAGER')")
    @Operation(summary = "Staff: Decline order with reason code, customer message, and inventory replenishment")
    public ResponseEntity<ApiResponse<OrderResponseDto>> declineOrder(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody OrderDeclineRequest request) {
        OrderResponseDto updated = orderService.declineOrder(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(updated, "Order declined and inventory replenished"));
    }
}
