package com.bakeconnect.payment.service;

import com.bakeconnect.billing.repository.InvoiceRepository;
import com.bakeconnect.billing.service.BillingService;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.PaymentInitiateRequest;
import com.bakeconnect.payment.dto.PaymentSessionResponse;
import com.bakeconnect.payment.entity.PaymentAttempt;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.repository.BankReconciliationRecordRepository;
import com.bakeconnect.payment.repository.PaymentAttemptRepository;
import com.bakeconnect.payment.repository.PaymentRefundRecordRepository;
import com.bakeconnect.payment.repository.WebhookEventInboxRepository;
import com.bakeconnect.payment.spi.PaymentProvider;
import com.bakeconnect.payment.spi.PaymentProviderFactory;
import com.bakeconnect.payment.spi.PaymentSessionRequest;
import com.bakeconnect.payment.spi.PaymentSessionResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentConcurrencyIntegrationTest {

    @Mock
    private PaymentAttemptRepository paymentAttemptRepository;

    @Mock
    private WebhookEventInboxRepository webhookEventInboxRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private BillingService billingService;

    @Mock
    private PaymentProviderFactory paymentProviderFactory;

    @Mock
    private NotificationOutboxRepository notificationOutboxRepository;

    @Mock
    private BankReconciliationRecordRepository bankReconciliationRecordRepository;

    @Mock
    private PaymentRefundRecordRepository paymentRefundRecordRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentProvider mockProvider;

    private PaymentService paymentService;
    private ObjectMapper objectMapper;

    private User testUser;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        WebhookInboxService inboxService = new WebhookInboxService(webhookEventInboxRepository);

        paymentService = new PaymentService(
                paymentAttemptRepository,
                webhookEventInboxRepository,
                inboxService,
                orderRepository,
                invoiceRepository,
                billingService,
                paymentProviderFactory,
                notificationOutboxRepository,
                bankReconciliationRecordRepository,
                paymentRefundRecordRepository,
                userRepository,
                objectMapper
        );

        testUser = new User("buyer@bakeconnect.com", "hash", "John Buyer", "9876543210", UserRole.DIRECT_CUSTOMER);
        testUser.setId(UUID.randomUUID());

        testOrder = new Order(
                "BC-CONCURRENT-100",
                testUser,
                OrderType.PERSONAL,
                OrderStatus.PENDING_REVIEW,
                PaymentStatus.PENDING,
                DeliveryType.DELIVERY,
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

        lenient().when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        lenient().when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        lenient().when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        lenient().when(mockProvider.isObserverHealthy()).thenReturn(true);
    }

    @Test
    @DisplayName("Simulate 10 simultaneous checkout attempts: strictly 1 active slot is acquired while others return active/queued session")
    void tenSimultaneousCheckoutAttempts_SingleActiveAttemptEnforced() throws Exception {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        List<PaymentAttempt> store = Collections.synchronizedList(new ArrayList<>());
        AtomicInteger providerCalls = new AtomicInteger(0);

        lenient().when(paymentAttemptRepository.findByIdempotencyKey(any())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return store.stream().filter(a -> key.equals(a.getIdempotencyKey())).findFirst();
        });

        lenient().when(paymentAttemptRepository.findFirstByOrderIdAndStatusIn(eq(testOrder.getId()), any()))
                .thenAnswer(inv -> store.stream()
                        .filter(a -> a.getStatus().isActive())
                        .findFirst());

        lenient().when(paymentAttemptRepository.saveAndFlush(any(PaymentAttempt.class))).thenAnswer(inv -> {
            PaymentAttempt a = inv.getArgument(0);
            synchronized (store) {
                boolean hasActive = store.stream().anyMatch(existing ->
                        !Objects.equals(existing.getId(), a.getId()) &&
                        existing.getOrder().getId().equals(a.getOrder().getId()) &&
                        existing.getStatus().isActive());
                if (hasActive) {
                    throw new org.springframework.dao.DataIntegrityViolationException(
                            "ERROR: duplicate key value violates unique constraint \"uq_payment_attempts_active_order\"");
                }
                if (a.getId() == null) a.setId(UUID.randomUUID());
                if (!store.contains(a)) {
                    store.add(a);
                }
                return a;
            }
        });

        lenient().when(paymentAttemptRepository.save(any(PaymentAttempt.class))).thenAnswer(inv -> {
            PaymentAttempt a = inv.getArgument(0);
            synchronized (store) {
                if (a.getId() == null) a.setId(UUID.randomUUID());
                return a;
            }
        });

        lenient().when(paymentAttemptRepository.findById(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return store.stream().filter(a -> id.equals(a.getId())).findFirst();
        });

        lenient().when(mockProvider.initiatePaymentSession(any(PaymentSessionRequest.class))).thenAnswer(inv -> {
            providerCalls.incrementAndGet();
            // Simulate 50ms gateway latency
            Thread.sleep(50);
            return new PaymentSessionResult(
                    "YOUPI-CONCURRENT-001",
                    "https://pay.bakeconnect.local/checkout?ref=YOUPI-CONCURRENT-001",
                    Map.of("account", "HDFC_XX1234"),
                    0,
                    "AWAITING_PAYMENT",
                    Instant.now().plusSeconds(900),
                    "HDFC_XX1234"
            );
        });

        List<PaymentSessionResponse> results = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    PaymentInitiateRequest req = new PaymentInitiateRequest(
                            testOrder.getId(), null, "YOUPI_PG", "IDEMP-KEY-CONCURRENT-" + index
                    );
                    PaymentSessionResponse resp = paymentService.initiatePayment(req, testUser.getId(), testUser.getRole());
                    results.add(resp);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Release all 10 threads simultaneously
        startLatch.countDown();
        boolean completed = finishLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(errors).isEmpty();
        assertThat(results).hasSize(threadCount);

        // Every request got a valid session response
        for (PaymentSessionResponse response : results) {
            assertThat(response).isNotNull();
            assertThat(response.baseAmount()).isEqualByComparingTo("525.00");
            assertThat(response.amount()).isGreaterThanOrEqualTo(new BigDecimal("525.01"));
        }

        // Verify provider was called at most once or all other threads received the active in-flight attempt
        assertThat(providerCalls.get()).isLessThanOrEqualTo(1);
    }
}
