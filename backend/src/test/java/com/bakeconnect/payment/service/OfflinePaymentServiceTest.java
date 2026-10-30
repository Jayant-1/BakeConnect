package com.bakeconnect.payment.service;

import com.bakeconnect.billing.service.BillingService;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.OfflinePaymentDto;
import com.bakeconnect.payment.dto.RecordOfflinePaymentRequest;
import com.bakeconnect.payment.entity.OfflinePayment;
import com.bakeconnect.payment.repository.OfflinePaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfflinePaymentServiceTest {

    @Mock
    private OfflinePaymentRepository offlinePaymentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private BillingService billingService;

    @Mock
    private UserRepository userRepository;

    private OfflinePaymentService offlinePaymentService;

    private User staffUser;
    private User customer;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        offlinePaymentService = new OfflinePaymentService(
                offlinePaymentRepository, orderRepository, billingService, userRepository);

        staffUser = new User("manager@bakeconnect.com", "hash", "Manager Alice", "9876543210", UserRole.BAKERY_MANAGER);
        staffUser.setId(UUID.randomUUID());

        customer = new User("buyer@bakeconnect.com", "hash", "Customer Bob", "9876543211", UserRole.DIRECT_CUSTOMER);
        customer.setId(UUID.randomUUID());

        testOrder = new Order(
                "BC-ORD-100",
                customer,
                OrderType.PERSONAL,
                OrderStatus.PENDING_REVIEW,
                PaymentStatus.PENDING,
                DeliveryType.STORE_PICKUP,
                "{}",
                null,
                null,
                new BigDecimal("500.00"),
                BigDecimal.ZERO,
                new BigDecimal("25.00"),
                new BigDecimal("525.00"),
                null
        );
        testOrder.setId(UUID.randomUUID());

        lenient().when(userRepository.findById(staffUser.getId())).thenReturn(Optional.of(staffUser));
        lenient().when(offlinePaymentRepository.save(any(OfflinePayment.class))).thenAnswer(inv -> {
            OfflinePayment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });
    }

    @Test
    @DisplayName("Partial offline payment does NOT mark order PAID, marks PARTIALLY_PAID")
    void recordOfflinePayment_PartialAmount_MarksPartiallyPaid() {
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(offlinePaymentRepository.findByOrderIdOrderByRecordedAtDesc(testOrder.getId()))
                .thenReturn(List.of());

        RecordOfflinePaymentRequest req = new RecordOfflinePaymentRequest(
                testOrder.getId(), null, new BigDecimal("200.00"), "CASH", "CASH-REC-1", "Advance payment"
        );

        OfflinePaymentDto result = offlinePaymentService.recordOfflinePayment(req, staffUser.getId());

        assertThat(result).isNotNull();
        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_PAID);
        verify(orderRepository).save(testOrder);
    }

    @Test
    @DisplayName("Full offline payment covers order total and marks order PAID")
    void recordOfflinePayment_FullAmount_MarksPaid() {
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(offlinePaymentRepository.findByOrderIdOrderByRecordedAtDesc(testOrder.getId()))
                .thenReturn(List.of());

        RecordOfflinePaymentRequest req = new RecordOfflinePaymentRequest(
                testOrder.getId(), null, new BigDecimal("525.00"), "CASH", "CASH-FULL", "Paid in full at counter"
        );

        OfflinePaymentDto result = offlinePaymentService.recordOfflinePayment(req, staffUser.getId());

        assertThat(result).isNotNull();
        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        verify(orderRepository).save(testOrder);
    }

    @Test
    @DisplayName("Cumulative offline payments reach order total and mark order PAID")
    void recordOfflinePayment_CumulativePayments_MarksPaidWhenCovered() {
        OfflinePayment previousPayment = new OfflinePayment(
                testOrder, null, staffUser, new BigDecimal("300.00"), "CASH", "CASH-PREV", "Part 1"
        );

        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(offlinePaymentRepository.findByOrderIdOrderByRecordedAtDesc(testOrder.getId()))
                .thenReturn(List.of(previousPayment));

        // Adding 225.00 brings total to 525.00
        RecordOfflinePaymentRequest req = new RecordOfflinePaymentRequest(
                testOrder.getId(), null, new BigDecimal("225.00"), "UPI", "UPI-OFFLINE-2", "Part 2"
        );

        OfflinePaymentDto result = offlinePaymentService.recordOfflinePayment(req, staffUser.getId());

        assertThat(result).isNotNull();
        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        verify(orderRepository).save(testOrder);
    }

    @Test
    @DisplayName("Recording payment without orderId or invoiceId throws BusinessRuleException")
    void recordOfflinePayment_MissingTargets_ThrowsBusinessRule() {
        RecordOfflinePaymentRequest req = new RecordOfflinePaymentRequest(
                null, null, new BigDecimal("100.00"), "CASH", "REC", "notes"
        );

        assertThatThrownBy(() -> offlinePaymentService.recordOfflinePayment(req, staffUser.getId()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Either orderId or invoiceId must be provided");
    }
}
