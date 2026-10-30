package com.bakeconnect.payment.integration;

import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.*;
import com.bakeconnect.payment.entity.*;
import com.bakeconnect.payment.repository.*;
import com.bakeconnect.payment.service.PaymentInitiationPersistenceService;
import com.bakeconnect.payment.service.PaymentService;
import com.bakeconnect.payment.spi.PaymentProvider;
import com.bakeconnect.payment.spi.PaymentProviderFactory;
import com.bakeconnect.payment.spi.PaymentSessionRequest;
import com.bakeconnect.payment.spi.PaymentSessionResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
public class PaymentPostgresIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(PaymentPostgresIntegrationTest.class);

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private PaymentInitiationPersistenceService persistenceService;

    @Autowired
    private PaymentAttemptRepository paymentAttemptRepository;

    @Autowired
    private PaymentRefundRecordRepository paymentRefundRecordRepository;

    @Autowired
    private BankReconciliationRecordRepository bankReconciliationRecordRepository;

    @Autowired
    private WebhookEventInboxRepository webhookEventInboxRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private PaymentProviderFactory paymentProviderFactory;

    private PaymentProvider mockProvider;
    private User testUser;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        mockProvider = mock(PaymentProvider.class);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.isObserverHealthy()).thenReturn(true);
        when(mockProvider.verifyWebhookSignature(any(), any())).thenReturn(true);
        when(mockProvider.verifyWebhookSignatureV2(any(), any(), any())).thenReturn(true);
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);

        testUser = new User("pg-test-" + UUID.randomUUID() + "@bakeconnect.com", "hash", "PG Tester", "9876543299", UserRole.DIRECT_CUSTOMER);
        testUser = userRepository.save(testUser);

        testOrder = new Order(
                "BC-PG-" + System.currentTimeMillis(),
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
        testOrder = orderRepository.save(testOrder);
    }

    @AfterEach
    void tearDown() {
        if (testOrder != null) {
            paymentRefundRecordRepository.findAll().stream()
                    .filter(r -> r.getOrder().getId().equals(testOrder.getId()))
                    .forEach(paymentRefundRecordRepository::delete);

            List<PaymentAttempt> attempts = paymentAttemptRepository.findByOrderId(testOrder.getId());
            for (PaymentAttempt attempt : attempts) {
                bankReconciliationRecordRepository.findByPaymentAttemptId(attempt.getId())
                        .ifPresent(bankReconciliationRecordRepository::delete);
            }
            webhookEventInboxRepository.findAll().stream()
                    .filter(inbox -> testOrder.getId().equals(inbox.getOrderId()))
                    .forEach(webhookEventInboxRepository::delete);

            paymentAttemptRepository.deleteAll(attempts);
            orderRepository.findById(testOrder.getId()).ifPresent(orderRepository::delete);
        }
        if (testUser != null) {
            userRepository.findById(testUser.getId()).ifPresent(userRepository::delete);
        }
    }

    @Test
    @DisplayName("Real PostgreSQL Concurrency: 10 simultaneous checkouts strictly enforce 1 active slot, measure API latency & error rate")
    void tenSimultaneousCheckoutAttempts_RealPostgreSql_StrictOneActiveSlot_MeasuresLatency() throws Exception {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(threadCount);

        AtomicInteger providerCalls = new AtomicInteger(0);

        when(mockProvider.initiatePaymentSession(any(PaymentSessionRequest.class))).thenAnswer(inv -> {
            providerCalls.incrementAndGet();
            Thread.sleep(30); // 30ms simulated gateway response
            return new PaymentSessionResult(
                    "PG-SESSION-001",
                    "https://pay.bakeconnect.local/checkout?ref=PG-SESSION-001",
                    Map.of("mode", "upi"),
                    0,
                    "AWAITING_PAYMENT",
                    Instant.now().plusSeconds(900),
                    "HDFC_XX1234"
            );
        });

        List<PaymentSessionResponse> responses = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());
        List<Long> latenciesMs = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    long startTime = System.nanoTime();

                    PaymentInitiateRequest req = new PaymentInitiateRequest(
                            testOrder.getId(), null, "YOUPI_PG", "IDEMP-PG-CONCURRENT-" + index
                    );
                    PaymentSessionResponse resp = paymentService.initiatePayment(req, testUser.getId(), testUser.getRole());
                    long durationMs = (System.nanoTime() - startTime) / 1_000_000;

                    responses.add(resp);
                    latenciesMs.add(durationMs);
                } catch (Throwable t) {
                    exceptions.add(t);
                    log.error("Concurrent checkout thread {} failed: {}", index, t.getMessage(), t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = finishLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(exceptions).isEmpty();
        assertThat(responses).hasSize(threadCount);

        // Strict Single-Active Invariant: Provider was invoked strictly ONCE
        assertThat(providerCalls.get()).isEqualTo(1);

        // Check latency statistics
        Collections.sort(latenciesMs);
        long min = latenciesMs.get(0);
        long max = latenciesMs.get(latenciesMs.size() - 1);
        double avg = latenciesMs.stream().mapToLong(Long::longValue).average().orElse(0.0);
        int p95Index = (int) Math.ceil(latenciesMs.size() * 0.95) - 1;
        long p95 = latenciesMs.get(Math.max(0, p95Index));

        log.info("CONCURRENCY METRICS — Threads: {}, Min: {}ms, Max: {}ms, Avg: {}ms, P95: {}ms, Errors: 0",
                threadCount, min, max, String.format("%.2f", avg), p95);

        // Exactly one active attempt exists in real PostgreSQL
        List<PaymentAttempt> dbAttempts = paymentAttemptRepository.findByOrderId(testOrder.getId());
        long activeCount = dbAttempts.stream().filter(a -> a.getStatus().isActive()).count();
        assertThat(activeCount).isEqualTo(1);

        // All threads received the identical payment attempt ID
        UUID activeAttemptId = dbAttempts.stream().filter(a -> a.getStatus().isActive()).findFirst().get().getId();
        for (PaymentSessionResponse resp : responses) {
            assertThat(resp.paymentAttemptId()).isEqualTo(activeAttemptId);
            assertThat(resp.amount()).isEqualByComparingTo("525.00");
        }
    }

    @Test
    @DisplayName("PostgreSQL Partial Unique Index: uq_payment_attempts_active_order blocks duplicate active insert")
    void postgreSqlPartialUniqueIndex_CatchesDuplicateActiveInsert() {
        PaymentAttempt firstAttempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-UQ-1", new BigDecimal("525.00"), "INR"
        );
        firstAttempt.setUser(testUser);
        firstAttempt.setStatus(PaymentAttemptStatus.INITIATED);
        paymentAttemptRepository.saveAndFlush(firstAttempt);

        PaymentAttempt secondAttempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-UQ-2", new BigDecimal("525.00"), "INR"
        );
        secondAttempt.setUser(testUser);
        secondAttempt.setStatus(PaymentAttemptStatus.INITIATED);

        assertThatThrownBy(() -> paymentAttemptRepository.saveAndFlush(secondAttempt))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("uq_payment_attempts_active_order");
    }

    @Test
    @DisplayName("Two-Phase Settlement: OBSERVED_SUCCESS sets AUTHORIZED; RECONCILED sets PAID & CONFIRMED")
    void twoPhaseSettlement_ObservedSuccessThenReconciled() {
        PaymentInitiateRequest initReq = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-2PHASE"
        );
        when(mockProvider.initiatePaymentSession(any())).thenReturn(new PaymentSessionResult(
                "YOUPI-2PHASE-REF", "https://pay.bakeconnect.local/checkout?ref=YOUPI-2PHASE-REF",
                Map.of(), 0, "AWAITING_PAYMENT", Instant.now().plusSeconds(900), "HDFC_XX1234"
        ));

        PaymentSessionResponse session = paymentService.initiatePayment(initReq, testUser.getId(), testUser.getRole());

        // Phase 1: Android SMS observer matches transaction -> OBSERVED_SUCCESS
        String observedPayload = String.format("""
                {
                    "event": "OBSERVED_SUCCESS",
                    "paymentId": "YOUPI-2PHASE-REF",
                    "idempotencyKey": "IDEMP-2PHASE",
                    "amount": 525.00,
                    "currency": "INR",
                    "utr": "123456789012",
                    "verificationLevel": 2
                }
                """);
        paymentService.processWebhook("YOUPI_PG", "DEL-OBS-" + UUID.randomUUID(), "sig1", "sig2",
                String.valueOf(System.currentTimeMillis()), observedPayload.getBytes(StandardCharsets.UTF_8));

        PaymentAttempt afterObserved = paymentAttemptRepository.findById(session.paymentAttemptId()).orElseThrow();
        Order orderAfterObserved = orderRepository.findById(testOrder.getId()).orElseThrow();

        assertThat(afterObserved.getStatus()).isEqualTo(PaymentAttemptStatus.OBSERVED_SUCCESS);
        assertThat(afterObserved.getSettlementStatus()).isEqualTo(PaymentSettlementStatus.NOT_RECONCILED);
        assertThat(afterObserved.getUtr()).isEqualTo("123456789012");
        assertThat(orderAfterObserved.getPaymentStatus()).isEqualTo(PaymentStatus.AUTHORIZED);
        assertThat(orderAfterObserved.getStatus()).isEqualTo(OrderStatus.PENDING_REVIEW);

        // Phase 2: Bank Statement Reconciliation -> RECONCILED
        String reconciledPayload = String.format("""
                {
                    "event": "RECONCILED",
                    "paymentId": "YOUPI-2PHASE-REF",
                    "idempotencyKey": "IDEMP-2PHASE",
                    "amount": 525.00,
                    "currency": "INR",
                    "utr": "123456789012"
                }
                """);
        paymentService.processWebhook("YOUPI_PG", "DEL-REC-" + UUID.randomUUID(), "sig1", "sig2",
                String.valueOf(System.currentTimeMillis()), reconciledPayload.getBytes(StandardCharsets.UTF_8));

        PaymentAttempt afterReconciled = paymentAttemptRepository.findById(session.paymentAttemptId()).orElseThrow();
        Order orderAfterReconciled = orderRepository.findById(testOrder.getId()).orElseThrow();

        assertThat(afterReconciled.getStatus()).isEqualTo(PaymentAttemptStatus.RECONCILED);
        assertThat(afterReconciled.getSettlementStatus()).isEqualTo(PaymentSettlementStatus.RECONCILED);
        assertThat(orderAfterReconciled.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(orderAfterReconciled.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Late Credit Guard: Credit on cancelled order moves to MANUAL_REVIEW without reviving order or overselling")
    void lateCredit_CancelledOrder_RoutesToManualReviewAndFlagsRefund() {
        PaymentInitiateRequest initReq = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-LATE-CREDIT"
        );
        when(mockProvider.initiatePaymentSession(any())).thenReturn(new PaymentSessionResult(
                "YOUPI-LATE-REF", "https://pay.bakeconnect.local/checkout?ref=YOUPI-LATE-REF",
                Map.of(), 0, "AWAITING_PAYMENT", Instant.now().plusSeconds(900), "HDFC_XX1234"
        ));

        PaymentSessionResponse session = paymentService.initiatePayment(initReq, testUser.getId(), testUser.getRole());

        // Customer times out or staff cancels the order to release inventory
        testOrder.setStatus(OrderStatus.CANCELLED);
        orderRepository.saveAndFlush(testOrder);

        PaymentAttempt attempt = paymentAttemptRepository.findById(session.paymentAttemptId()).orElseThrow();
        attempt.setStatus(PaymentAttemptStatus.EXPIRED);
        paymentAttemptRepository.saveAndFlush(attempt);

        // Late money arrives in bank 10 minutes later:
        String latePayload = String.format("""
                {
                    "event": "OBSERVED_SUCCESS",
                    "paymentId": "YOUPI-LATE-REF",
                    "idempotencyKey": "IDEMP-LATE-CREDIT",
                    "amount": 525.00,
                    "currency": "INR",
                    "utr": "999888777111"
                }
                """);
        paymentService.processWebhook("YOUPI_PG", "DEL-LATE-" + UUID.randomUUID(), "sig1", "sig2",
                String.valueOf(System.currentTimeMillis()), latePayload.getBytes(StandardCharsets.UTF_8));

        PaymentAttempt afterLateCredit = paymentAttemptRepository.findById(session.paymentAttemptId()).orElseThrow();
        Order orderAfterLateCredit = orderRepository.findById(testOrder.getId()).orElseThrow();

        // Must NOT revive order or mark it CONFIRMED (prevents overselling)
        assertThat(orderAfterLateCredit.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(afterLateCredit.getStatus()).isEqualTo(PaymentAttemptStatus.MANUAL_REVIEW);
        assertThat(afterLateCredit.getUtr()).isEqualTo("999888777111");

        // Verify PaymentRefundRecord was created in PostgreSQL
        List<PaymentRefundRecord> refunds = paymentRefundRecordRepository.findAll().stream()
                .filter(r -> r.getOrder().getId().equals(testOrder.getId()))
                .toList();
        assertThat(refunds).hasSize(1);
        assertThat(refunds.get(0).getAmount()).isEqualByComparingTo("525.00");
        assertThat(refunds.get(0).getReason()).contains("Late credit received");
    }

    @Test
    @DisplayName("Webhook Out-of-Order: Webhook arriving before initiation completes preserves OBSERVED_SUCCESS")
    void webhookBeforeInitiationCompletes_PreservesObservedStatus() {
        PaymentAttempt newAttempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-RACE-1", new BigDecimal("525.00"), "INR"
        );
        newAttempt.setUser(testUser);
        newAttempt.setStatus(PaymentAttemptStatus.INITIATED);
        newAttempt.setProviderReference("YOUPI-RACE-REF");
        newAttempt = paymentAttemptRepository.saveAndFlush(newAttempt);

        // Fast webhook arrives while initiation thread is in-flight:
        String fastWebhook = String.format("""
                {
                    "event": "OBSERVED_SUCCESS",
                    "paymentId": "YOUPI-RACE-REF",
                    "idempotencyKey": "IDEMP-RACE-1",
                    "amount": 525.00,
                    "currency": "INR",
                    "utr": "888777666555"
                }
                """);
        paymentService.processWebhook("YOUPI_PG", "DEL-RACE-" + UUID.randomUUID(), "sig1", "sig2",
                String.valueOf(System.currentTimeMillis()), fastWebhook.getBytes(StandardCharsets.UTF_8));

        // Later, the initiation thread finishes and calls completeInitiation:
        PaymentSessionResult slowResult = new PaymentSessionResult(
                "YOUPI-RACE-REF", "https://pay.bakeconnect.local/checkout?ref=YOUPI-RACE-REF",
                Map.of(), 0, "AWAITING_PAYMENT", Instant.now().plusSeconds(900), "HDFC_XX1234"
        );
        PaymentAttempt completed = persistenceService.completeInitiation(newAttempt.getId(), slowResult);

        // Must retain OBSERVED_SUCCESS, NOT be overwritten with AWAITING_PAYMENT
        assertThat(completed.getStatus()).isEqualTo(PaymentAttemptStatus.OBSERVED_SUCCESS);
    }
}
