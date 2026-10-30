package com.bakeconnect.ordering.service;

import com.bakeconnect.cart.dto.CartItemRequest;
import com.bakeconnect.catalog.entity.Category;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.identity.entity.Address;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.AddressRepository;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.ordering.dto.OrderCreateRequest;
import com.bakeconnect.ordering.dto.OrderResponseDto;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.ordering.repository.OrderStatusHistoryRepository;
import com.bakeconnect.retailer.entity.RetailerApprovalStatus;
import com.bakeconnect.retailer.entity.RetailerProfile;
import com.bakeconnect.retailer.repository.RetailerProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private NotificationOutboxRepository notificationOutboxRepository;

    @Mock
    private com.bakeconnect.billing.service.BillingService billingService;

    @Mock
    private RetailerProfileRepository retailerProfileRepository;

    @Mock
    private com.bakeconnect.notification.service.StaffNotificationService staffNotificationService;

    @InjectMocks
    private OrderService orderService;

    private User b2cUser;
    private User retailerUser;
    private Product product;
    private Address address;

    @BeforeEach
    void setUp() {
        b2cUser = new User("customer@test.com", "hash", "John Doe", "9876543210", UserRole.DIRECT_CUSTOMER);
        b2cUser.setId(UUID.randomUUID());

        retailerUser = new User("retailer@test.com", "hash", "Jane Store", "9876543211", UserRole.RETAILER);
        retailerUser.setId(UUID.randomUUID());

        Category category = new Category("Breads", "breads", "Freshly baked", null, 1);
        product = new Product(
                category,
                "Sourdough Loaf",
                "sourdough-loaf",
                "Artisan loaf",
                null,
                new BigDecimal("100.00"), // retail price
                new BigDecimal("70.00"),  // wholesale price
                new BigDecimal("40.00"),  // unit cost
                "PIECE",
                1,
                1,
                50                        // stock
        );
        product.setId(UUID.randomUUID());

        address = new Address(
                b2cUser,
                "John Doe",
                "9876543210",
                "123 Main St",
                "Apt 4B",
                "Mumbai",
                "Maharashtra",
                "400001",
                "Leave at door",
                true
        );
        address.setId(UUID.randomUUID());
    }

    @Test
    void createOrder_Success_PersonalB2C() {
        when(userRepository.findById(b2cUser.getId())).thenReturn(Optional.of(b2cUser));
        when(addressRepository.findById(address.getId())).thenReturn(Optional.of(address));
        when(productRepository.findByIdWithPessimisticLock(product.getId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        OrderCreateRequest request = new OrderCreateRequest(
                List.of(new CartItemRequest(product.getId(), 2)),
                OrderType.PERSONAL,
                DeliveryType.DELIVERY,
                address.getId(),
                null,
                null,
                "Careful with packaging"
        );

        OrderResponseDto response = orderService.createOrder(b2cUser.getId(), request);

        assertNotNull(response);
        assertNotNull(response.orderNumber());
        assertEquals(OrderStatus.PENDING_REVIEW, response.status());
        // Subtotal = 2 * 100 = 200.00. Tax = 5% of 200 = 10.00. Total = 210.00
        assertEquals(new BigDecimal("200.00"), response.subtotalAmount());
        assertEquals(new BigDecimal("0.00"), response.discountAmount());
        assertEquals(new BigDecimal("10.00"), response.taxAmount());
        assertEquals(new BigDecimal("210.00"), response.totalAmount());
        assertEquals(48, product.getStockQuantity()); // Decremented by 2

        verify(notificationOutboxRepository, times(1)).save(any(NotificationOutbox.class));
    }

    @Test
    void createOrder_Success_BusinessB2B_WithBulkDiscount() {
        when(userRepository.findById(retailerUser.getId())).thenReturn(Optional.of(retailerUser));
        when(productRepository.findByIdWithPessimisticLock(product.getId())).thenReturn(Optional.of(product));
        product.setStockQuantity(500);

        RetailerProfile approvedProfile = new RetailerProfile(retailerUser, "Retailer Store Inc", "27AAPFU0939F1ZV", "Jane Store", "9876543211");
        approvedProfile.setApprovalStatus(RetailerApprovalStatus.APPROVED);
        when(retailerProfileRepository.findByUserId(retailerUser.getId())).thenReturn(Optional.of(approvedProfile));

        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        // 200 items @ wholesale 70.00 = 14,000.00 (> 10,000 threshold for 2.5% discount)
        // Discount = 14,000 * 0.025 = 350.00
        // Discounted subtotal = 13,650.00
        // GST (5%) = 13,650 * 0.05 = 682.50
        // Total = 13,650 + 682.50 = 14,332.50
        OrderCreateRequest request = new OrderCreateRequest(
                List.of(new CartItemRequest(product.getId(), 200)),
                OrderType.BUSINESS,
                DeliveryType.STORE_PICKUP,
                null,
                "27AAPFU0939F1ZV",
                "Retailer Store Inc",
                "Call before loading"
        );

        OrderResponseDto response = orderService.createOrder(retailerUser.getId(), request);

        assertNotNull(response);
        assertEquals(new BigDecimal("14000.00"), response.subtotalAmount());
        assertEquals(new BigDecimal("350.00"), response.discountAmount());
        assertEquals(new BigDecimal("682.50"), response.taxAmount());
        assertEquals(new BigDecimal("14332.50"), response.totalAmount());
        assertEquals(300, product.getStockQuantity());
    }

    @Test
    void createOrder_InsufficientStock_ThrowsException() {
        when(userRepository.findById(b2cUser.getId())).thenReturn(Optional.of(b2cUser));
        when(addressRepository.findById(address.getId())).thenReturn(Optional.of(address));
        when(productRepository.findByIdWithPessimisticLock(product.getId())).thenReturn(Optional.of(product));

        product.setStockQuantity(5);

        OrderCreateRequest request = new OrderCreateRequest(
                List.of(new CartItemRequest(product.getId(), 10)),
                OrderType.PERSONAL,
                DeliveryType.DELIVERY,
                address.getId(),
                null,
                null,
                null
        );

        BusinessRuleException ex = assertThrows(BusinessRuleException.class, () ->
                orderService.createOrder(b2cUser.getId(), request));

        assertTrue(ex.getMessage().contains("Insufficient stock"));
    }

    @Test
    void createOrder_PersonalOrderWithGst_ThrowsException() {
        when(userRepository.findById(b2cUser.getId())).thenReturn(Optional.of(b2cUser));

        OrderCreateRequest request = new OrderCreateRequest(
                List.of(new CartItemRequest(product.getId(), 2)),
                OrderType.PERSONAL,
                DeliveryType.STORE_PICKUP,
                null,
                "27AAPFU0939F1ZV",
                null,
                null
        );

        BusinessRuleException ex = assertThrows(BusinessRuleException.class, () ->
                orderService.createOrder(b2cUser.getId(), request));

        assertTrue(ex.getMessage().contains("GST number cannot be applied to personal B2C orders"));
    }

    @Test
    void updateOrderStatus_Cancel_ReplenishesStock() {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setUser(b2cUser);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setOrderType(OrderType.PERSONAL);
        order.setDeliveryType(DeliveryType.STORE_PICKUP);
        order.setSubtotalAmount(new BigDecimal("100.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(new BigDecimal("5.00"));
        order.setTotalAmount(new BigDecimal("105.00"));

        OrderItem item = new OrderItem(product, product.getName(), product.getSlug(),
                new BigDecimal("100.00"), 5, BigDecimal.ZERO, new BigDecimal("5.00"), new BigDecimal("100.00"));
        order.addItem(item);

        product.setStockQuantity(20);

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponseDto updated = orderService.updateOrderStatus(
                order.getId(),
                OrderStatus.CANCELLED,
                "CUSTOMER_REQUEST",
                "Customer requested cancellation",
                b2cUser.getId(),
                UserRole.DIRECT_CUSTOMER
        );

        assertEquals(OrderStatus.CANCELLED, updated.status());
        assertEquals(25, product.getStockQuantity()); // 20 + 5 replenished
    }

    @Test
    void getOrderById_IDOR_ThrowsException() {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setUser(b2cUser);

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        UUID otherUserId = UUID.randomUUID();
        assertThrows(BusinessRuleException.class, () ->
                orderService.getOrderById(order.getId(), otherUserId, false));
    }

    @Test
    void acceptOrder_B2B_Success_GeneratesInvoice() {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderNumber("BC-B2B-101");
        order.setUser(retailerUser);
        order.setOrderType(OrderType.BUSINESS);
        order.setStatus(OrderStatus.PENDING_REVIEW);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setDeliveryType(DeliveryType.DELIVERY);
        order.setSubtotalAmount(new BigDecimal("1000.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(new BigDecimal("50.00"));
        order.setTotalAmount(new BigDecimal("1050.00"));

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID adminId = UUID.randomUUID();
        OrderResponseDto response = orderService.acceptOrder(order.getId(), adminId);

        assertEquals(OrderStatus.CONFIRMED, response.status());
        verify(billingService).createInvoiceForOrder(any(Order.class));
        verify(notificationOutboxRepository).save(any(NotificationOutbox.class));
    }

    @Test
    void delayOrder_Success_CustomerNotified() {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderNumber("BC-B2C-102");
        order.setUser(b2cUser);
        order.setOrderType(OrderType.PERSONAL);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setDeliveryType(DeliveryType.DELIVERY);
        order.setSubtotalAmount(new BigDecimal("100.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(new BigDecimal("5.00"));
        order.setTotalAmount(new BigDecimal("105.00"));

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID adminId = UUID.randomUUID();
        java.time.Instant newEstimated = java.time.Instant.now().plusSeconds(3600);
        com.bakeconnect.ordering.dto.OrderDelayRequest delayReq =
                new com.bakeconnect.ordering.dto.OrderDelayRequest("OVEN_BACKLOG", "Minor delay due to high oven volume", newEstimated);

        OrderResponseDto response = orderService.delayOrder(order.getId(), delayReq, adminId);

        assertEquals(OrderStatus.DELAYED, response.status());
        verify(notificationOutboxRepository).save(any(NotificationOutbox.class));
    }

    @Test
    void declineOrder_Success_ReplenishesInventory() {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderNumber("BC-B2C-103");
        order.setUser(b2cUser);
        order.setOrderType(OrderType.PERSONAL);
        order.setStatus(OrderStatus.PENDING_REVIEW);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setDeliveryType(DeliveryType.DELIVERY);
        order.setSubtotalAmount(new BigDecimal("100.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTaxAmount(new BigDecimal("5.00"));
        order.setTotalAmount(new BigDecimal("105.00"));

        OrderItem item = new OrderItem(product, product.getName(), product.getSlug(),
                new BigDecimal("100.00"), 4, BigDecimal.ZERO, new BigDecimal("5.00"), new BigDecimal("100.00"));
        order.addItem(item);
        product.setStockQuantity(10);

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID adminId = UUID.randomUUID();
        com.bakeconnect.ordering.dto.OrderDeclineRequest declineReq =
                new com.bakeconnect.ordering.dto.OrderDeclineRequest("CAPACITY_REACHED", "Bakery is at maximum production capacity today");

        OrderResponseDto response = orderService.declineOrder(order.getId(), declineReq, adminId);

        assertEquals(OrderStatus.DECLINED, response.status());
        assertEquals(14, product.getStockQuantity()); // 10 + 4 replenished
        verify(productRepository).save(product);
        verify(notificationOutboxRepository).save(any(NotificationOutbox.class));
    }

    @Test
    void createOrder_Fails_WhenRetailerPendingApproval() {
        when(userRepository.findById(retailerUser.getId())).thenReturn(Optional.of(retailerUser));

        RetailerProfile pendingProfile = new RetailerProfile(retailerUser, "Pending Store", "27AAPFU0939F1ZV", "Jane Store", "9876543211");
        pendingProfile.setApprovalStatus(RetailerApprovalStatus.PENDING_APPROVAL);
        when(retailerProfileRepository.findByUserId(retailerUser.getId())).thenReturn(Optional.of(pendingProfile));

        OrderCreateRequest request = new OrderCreateRequest(
                List.of(new CartItemRequest(product.getId(), 50)),
                OrderType.BUSINESS,
                DeliveryType.STORE_PICKUP,
                null,
                "27AAPFU0939F1ZV",
                "Pending Store",
                null
        );

        BusinessRuleException ex = assertThrows(BusinessRuleException.class, () ->
                orderService.createOrder(retailerUser.getId(), request)
        );
        assertTrue(ex.getMessage().contains("awaiting bakery approval"));
    }

    @Test
    void createOrder_Success_CustomerSingleItemWithoutMoqRestriction() {
        product.setMoq(10); // Wholesale MOQ is 10
        product.setMoqIncrement(5);

        when(userRepository.findById(b2cUser.getId())).thenReturn(Optional.of(b2cUser));
        when(addressRepository.findById(address.getId())).thenReturn(Optional.of(address));
        when(productRepository.findByIdWithPessimisticLock(product.getId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        // Customer buys 1 item (well below wholesale MOQ of 10)
        OrderCreateRequest request = new OrderCreateRequest(
                List.of(new CartItemRequest(product.getId(), 1)),
                OrderType.PERSONAL,
                DeliveryType.DELIVERY,
                address.getId(),
                null,
                null,
                null
        );

        OrderResponseDto response = orderService.createOrder(b2cUser.getId(), request);
        assertNotNull(response);
        assertEquals(new BigDecimal("100.00"), response.subtotalAmount());
        assertEquals(new BigDecimal("5.00"), response.taxAmount());
        assertEquals(new BigDecimal("105.00"), response.totalAmount());
    }
}
