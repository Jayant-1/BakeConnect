package com.bakeconnect.payment.service;

import com.bakeconnect.billing.dto.InvoiceDto;
import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.billing.repository.InvoiceRepository;
import com.bakeconnect.billing.service.BillingService;
import com.bakeconnect.common.exception.*;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.payment.dto.*;
import com.bakeconnect.payment.entity.*;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

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
    private WebhookInboxService webhookInboxService;
    private ObjectMapper objectMapper;

    private User testUser;
    private User testRetailer;
    private User managerUser;
    private Order testOrder;
    private Order wholesaleOrder;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        webhookInboxService = new WebhookInboxService(webhookEventInboxRepository);

        paymentService = new PaymentService(
                paymentAttemptRepository,
                webhookEventInboxRepository,
                webhookInboxService,
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

        testRetailer = new User("retailer@bakeconnect.com", "hash", "Retail Store", "9876543211", UserRole.RETAILER);
        testRetailer.setId(UUID.randomUUID());

        managerUser = new User("manager@bakeconnect.com", "hash", "Manager Mary", "9876543212", UserRole.BAKERY_MANAGER);
        managerUser.setId(UUID.randomUUID());

        testOrder = new Order(
                "BC-20261028-100",
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

        wholesaleOrder = new Order(
                "BC-20261028-B2B",
                testRetailer,
                OrderType.BUSINESS,
                OrderStatus.PENDING_REVIEW,
                PaymentStatus.PENDING,
                DeliveryType.DELIVERY,
                "{}",
                null,
                null,
                new BigDecimal("5000.00"),
                BigDecimal.ZERO,
                new BigDecimal("250.00"),
                new BigDecimal("5250.00"),
                null
        );
        wholesaleOrder.setId(UUID.randomUUID());

        Map<UUID, PaymentAttempt> attemptStore = new HashMap<>();
        lenient().when(paymentAttemptRepository.findById(any(UUID.class))).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.ofNullable(attemptStore.get(id));
        });
        lenient().when(paymentAttemptRepository.saveAndFlush(any(PaymentAttempt.class))).thenAnswer(inv -> {
            PaymentAttempt p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            attemptStore.put(p.getId(), p);
            return p;
        });
        lenient().when(paymentAttemptRepository.save(any(PaymentAttempt.class))).thenAnswer(inv -> {
            PaymentAttempt p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            attemptStore.put(p.getId(), p);
            return p;
        });
    }

    // --- Initiation Tests ---

    @Test
    @DisplayName("initiatePayment creates attempt and returns session response with checkout URL")
    void initiatePayment_Success() {
        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-KEY-001"
        );

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-KEY-001")).thenReturn(Optional.empty());
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(paymentAttemptRepository.findFirstByOrderIdAndStatusIn(eq(testOrder.getId()), any())).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.isObserverHealthy()).thenReturn(true);

        PaymentSessionResult sessionResult = new PaymentSessionResult(
                "YOUPI-TXN-123", "https://pay.bakeconnect.local/checkout?ref=YOUPI-TXN-123",
                Map.of("mode", "upi"), 0, "AWAITING_PAYMENT", Instant.now().plusSeconds(900), "HDFC_XX1234"
        );
        when(mockProvider.initiatePaymentSession(any(PaymentSessionRequest.class))).thenReturn(sessionResult);

        PaymentSessionResponse response = paymentService.initiatePayment(
                request, testUser.getId(), testUser.getRole()
        );

        assertThat(response).isNotNull();
        assertThat(response.idempotencyKey()).isEqualTo("IDEMP-KEY-001");
        assertThat(response.providerReference()).isEqualTo("YOUPI-TXN-123");
        assertThat(response.paymentUrl()).contains("YOUPI-TXN-123");
        assertThat(response.amount()).isEqualByComparingTo("525.00");
        assertThat(response.status()).isEqualTo(PaymentAttemptStatus.AWAITING_PAYMENT);
    }

    @Test
    @DisplayName("initiatePayment returns existing session if idempotency key was already used by same user")
    void initiatePayment_Idempotent_ReturnsExisting() {
        PaymentAttempt existing = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-EXISTING", new BigDecimal("525.00"), "INR"
        );
        existing.setId(UUID.randomUUID());
        existing.setProviderReference("YOUPI-REF-999");
        existing.setCheckoutUrl("https://pay.bakeconnect.local/checkout?ref=YOUPI-REF-999");
        existing.setStatus(PaymentAttemptStatus.AWAITING_PAYMENT);

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-EXISTING")).thenReturn(Optional.of(existing));

        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-EXISTING"
        );

        PaymentSessionResponse response = paymentService.initiatePayment(
                request, testUser.getId(), testUser.getRole()
        );

        assertThat(response.idempotencyKey()).isEqualTo("IDEMP-EXISTING");
        assertThat(response.providerReference()).isEqualTo("YOUPI-REF-999");
        verify(orderRepository, never()).findById(any());
    }

    @Test
    @DisplayName("initiatePayment throws ForbiddenException if another user attempts cross-user idempotency attack")
    void initiatePayment_CrossUserIdempotencyAttack_ThrowsForbidden() {
        PaymentAttempt existing = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-STOLEN", new BigDecimal("525.00"), "INR"
        );
        existing.setId(UUID.randomUUID());

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-STOLEN")).thenReturn(Optional.of(existing));

        UUID attackerId = UUID.randomUUID();
        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-STOLEN"
        );

        assertThatThrownBy(() -> paymentService.initiatePayment(
                request, attackerId, UserRole.DIRECT_CUSTOMER
        )).isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Idempotency key belongs to another user");
    }

    @Test
    @DisplayName("initiatePayment throws ConflictException if idempotency key reused with different parameters")
    void initiatePayment_IdempotencyKeyReuseConflict_ThrowsConflict() {
        PaymentAttempt existing = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-REUSED", new BigDecimal("525.00"), "INR"
        );
        existing.setId(UUID.randomUUID());

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-REUSED")).thenReturn(Optional.of(existing));

        UUID differentOrderId = UUID.randomUUID();
        PaymentInitiateRequest request = new PaymentInitiateRequest(
                differentOrderId, null, "YOUPI_PG", "IDEMP-REUSED"
        );

        assertThatThrownBy(() -> paymentService.initiatePayment(
                request, testUser.getId(), testUser.getRole()
        )).isInstanceOf(ConflictException.class)
                .hasMessageContaining("request parameters differ");
    }

    @Test
    @DisplayName("initiatePayment throws ForbiddenException on IDOR attack paying for someone else's order")
    void initiatePayment_IDOR_ThrowsForbidden() {
        UUID otherUserId = UUID.randomUUID();
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-002")).thenReturn(Optional.empty());
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));

        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-002"
        );

        assertThatThrownBy(() -> paymentService.initiatePayment(
                request, otherUserId, UserRole.DIRECT_CUSTOMER
        )).isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Access denied: You cannot pay for another user's order");
    }

    @Test
    @DisplayName("initiatePayment returns existing active attempt if one is already in progress for order")
    void initiatePayment_ActiveAttemptInProgress_ReturnsActiveAttempt() {
        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-NEW-REQ"
        );

        PaymentAttempt activeAttempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-PREV-ACTIVE", new BigDecimal("525.00"), "INR"
        );
        activeAttempt.setId(UUID.randomUUID());
        activeAttempt.setStatus(PaymentAttemptStatus.AWAITING_PAYMENT);
        activeAttempt.setCheckoutUrl("https://pay.bakeconnect.local/checkout?ref=ACT-1");

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-NEW-REQ")).thenReturn(Optional.empty());
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(paymentAttemptRepository.findFirstByOrderIdAndStatusIn(eq(testOrder.getId()), any()))
                .thenReturn(Optional.of(activeAttempt));

        PaymentSessionResponse response = paymentService.initiatePayment(
                request, testUser.getId(), testUser.getRole()
        );

        assertThat(response.paymentAttemptId()).isEqualTo(activeAttempt.getId());
        assertThat(response.customerMessage()).contains("An active payment attempt is already in progress");
        verify(paymentProviderFactory, never()).getProvider(any());
    }

    @Test
    @DisplayName("initiatePayment rejects when observer daemon is offline")
    void initiatePayment_ObserverOffline_ThrowsBusinessRule() {
        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-OBS-DOWN"
        );

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-OBS-DOWN")).thenReturn(Optional.empty());
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(paymentAttemptRepository.findFirstByOrderIdAndStatusIn(eq(testOrder.getId()), any())).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.isObserverHealthy()).thenReturn(false);

        assertThatThrownBy(() -> paymentService.initiatePayment(
                request, testUser.getId(), testUser.getRole()
        )).isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("banking observers are offline");
    }

    @Test
    @DisplayName("initiatePayment gateway timeout marks attempt UNCERTAIN_INITIATION")
    void initiatePayment_GatewayTimeout_MarksUncertainInitiation() {
        PaymentInitiateRequest request = new PaymentInitiateRequest(
                testOrder.getId(), null, "YOUPI_PG", "IDEMP-TIMEOUT"
        );

        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-TIMEOUT")).thenReturn(Optional.empty());
        when(orderRepository.findById(testOrder.getId())).thenReturn(Optional.of(testOrder));
        when(paymentAttemptRepository.findFirstByOrderIdAndStatusIn(eq(testOrder.getId()), any())).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.isObserverHealthy()).thenReturn(true);
        when(mockProvider.initiatePaymentSession(any()))
                .thenThrow(new RuntimeException("Connection timed out"));

        assertThatThrownBy(() -> paymentService.initiatePayment(
                request, testUser.getId(), testUser.getRole()
        )).isInstanceOf(RuntimeException.class);

        verify(paymentAttemptRepository).save(argThat(attempt ->
                attempt.getStatus() == PaymentAttemptStatus.UNCERTAIN_INITIATION
        ));
    }

    // --- Webhook Processing Tests ---

    @Test
    @DisplayName("processWebhook with V1 signature reconciles payment and confirms order")
    void processWebhook_ValidV1Signature_ReconcilesPayment() {
        String payloadJson = "{\"status\":\"RECONCILED\",\"deliveryId\":\"DEL-V1-1\",\"idempotencyKey\":\"IDEMP-V1\",\"amount\":525.00,\"currency\":\"INR\",\"utr\":\"UTR123456789012\"}";
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);

        PaymentAttempt attempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-V1", new BigDecimal("525.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());

        when(webhookEventInboxRepository.findByDeliveryId("DEL-V1-1")).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignature(payloadBytes, "sig_v1")).thenReturn(true);
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-V1")).thenReturn(Optional.of(attempt));

        paymentService.processWebhook("YOUPI_PG", "DEL-V1-1", "sig_v1", payloadBytes);

        assertThat(attempt.getStatus()).isEqualTo(PaymentAttemptStatus.RECONCILED);
        assertThat(attempt.getSettlementStatus()).isEqualTo(PaymentSettlementStatus.RECONCILED);
        assertThat(attempt.getUtr()).isEqualTo("UTR123456789012");
        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(testOrder.getStatus()).isEqualTo(OrderStatus.CONFIRMED);

        verify(notificationOutboxRepository).save(any(NotificationOutbox.class));
    }

    @Test
    @DisplayName("processWebhook with V2 signature for OBSERVED_SUCCESS marks AUTHORIZED without reconciling ledger")
    void processWebhook_ValidV2Signature_ObservedSuccess() {
        String payloadJson = "{\"event\":\"OBSERVED_SUCCESS\",\"status\":\"OBSERVED_SUCCESS\",\"deliveryId\":\"DEL-V2-1\",\"idempotencyKey\":\"IDEMP-V2\",\"amount\":525.00,\"currency\":\"INR\",\"utr\":\"UTR987654321012\",\"verificationLevel\":2}";
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);

        PaymentAttempt attempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-V2", new BigDecimal("525.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());

        when(webhookEventInboxRepository.findByDeliveryId("DEL-V2-1")).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignatureV2(payloadBytes, "sig_v2", "1730280000")).thenReturn(true);
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-V2")).thenReturn(Optional.of(attempt));

        paymentService.processWebhook("YOUPI_PG", "DEL-V2-1", null, "sig_v2", "1730280000", payloadBytes);

        assertThat(attempt.getStatus()).isEqualTo(PaymentAttemptStatus.OBSERVED_SUCCESS);
        assertThat(attempt.getSettlementStatus()).isEqualTo(PaymentSettlementStatus.NOT_RECONCILED);
        assertThat(attempt.getUtr()).isEqualTo("UTR987654321012");
        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.AUTHORIZED);
    }

    @Test
    @DisplayName("processWebhook auto-creates and settles invoice for wholesale B2B orders")
    void processWebhook_WholesaleB2B_AutoCreatesInvoice() {
        String payloadJson = "{\"status\":\"RECONCILED\",\"deliveryId\":\"DEL-B2B-1\",\"idempotencyKey\":\"IDEMP-B2B\",\"amount\":5250.00,\"currency\":\"INR\",\"utr\":\"UTR-WHOLESALE-1\"}";
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);

        PaymentAttempt attempt = new PaymentAttempt(
                wholesaleOrder, null, "YOUPI_PG", "IDEMP-B2B", new BigDecimal("5250.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());

        InvoiceDto invoiceDto = new InvoiceDto();
        invoiceDto.setId(UUID.randomUUID());
        invoiceDto.setTotalAmount(new BigDecimal("5250.00"));

        Invoice invoiceEntity = new Invoice("INV-001", wholesaleOrder, testRetailer, LocalDate.now(), LocalDate.now().plusDays(7), new BigDecimal("5250.00"));

        when(webhookEventInboxRepository.findByDeliveryId("DEL-B2B-1")).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignature(payloadBytes, "sig")).thenReturn(true);
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-B2B")).thenReturn(Optional.of(attempt));
        when(billingService.createInvoiceForOrder(wholesaleOrder)).thenReturn(invoiceDto);
        when(invoiceRepository.findById(invoiceDto.getId())).thenReturn(Optional.of(invoiceEntity));

        paymentService.processWebhook("YOUPI_PG", "DEL-B2B-1", "sig", payloadBytes);

        verify(billingService).createInvoiceForOrder(wholesaleOrder);
        verify(billingService).recordPayment(eq(invoiceEntity.getId()), eq(new BigDecimal("5250.00")), eq("UTR-WHOLESALE-1"), any(), any());
    }

    @Test
    @DisplayName("processWebhook rejects invalid signature and throws UnauthorizedException")
    void processWebhook_InvalidSignature_ThrowsUnauthorized() {
        byte[] payloadBytes = "{\"status\":\"RECONCILED\"}".getBytes(StandardCharsets.UTF_8);

        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignature(payloadBytes, "tampered_sig")).thenReturn(false);

        assertThatThrownBy(() -> paymentService.processWebhook("YOUPI_PG", "DEL-INVALID", "tampered_sig", payloadBytes))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid webhook signature");
    }

    @Test
    @DisplayName("processWebhook duplicate delivery ID is skipped idempotently if payload hash matches")
    void processWebhook_DuplicateDeliveryId_Idempotent() {
        byte[] payloadBytes = "{\"status\":\"RECONCILED\"}".getBytes(StandardCharsets.UTF_8);
        String hash;
        try {
            hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payloadBytes));
        } catch (Exception e) {
            hash = "dummy";
        }

        WebhookEventInbox existingInbox = new WebhookEventInbox("YOUPI_PG", "DEL-DUP", "RECONCILED", "{}", "sig",
                WebhookVerificationStatus.VERIFIED, WebhookProcessingStatus.PROCESSED);
        existingInbox.setPayloadHash(hash);

        when(webhookEventInboxRepository.findByDeliveryId("DEL-DUP")).thenReturn(Optional.of(existingInbox));

        paymentService.processWebhook("YOUPI_PG", "DEL-DUP", "sig", payloadBytes);

        verify(paymentAttemptRepository, never()).findByIdempotencyKey(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("processWebhook duplicate delivery ID with modified body throws ConflictException")
    void processWebhook_DuplicateDeliveryId_ConflictingPayloadHash_ThrowsConflict() {
        byte[] payloadBytes = "{\"status\":\"RECONCILED\",\"amount\":525.00}".getBytes(StandardCharsets.UTF_8);

        WebhookEventInbox existingInbox = new WebhookEventInbox("YOUPI_PG", "DEL-CONFLICT", "RECONCILED", "{}", "sig",
                WebhookVerificationStatus.VERIFIED, WebhookProcessingStatus.PROCESSED);
        existingInbox.setPayloadHash("original_hash_value");

        when(webhookEventInboxRepository.findByDeliveryId("DEL-CONFLICT")).thenReturn(Optional.of(existingInbox));

        assertThatThrownBy(() -> paymentService.processWebhook("YOUPI_PG", "DEL-CONFLICT", "sig", payloadBytes))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("conflicting payload hash");
    }

    @Test
    @DisplayName("processWebhook detects tampered amount and throws BadRequestException")
    void processWebhook_TamperedAmount_ThrowsBadRequest() {
        String payloadJson = "{\"status\":\"RECONCILED\",\"deliveryId\":\"DEL-FRAUD\",\"idempotencyKey\":\"IDEMP-FRAUD\",\"amount\":50.00,\"currency\":\"INR\"}";
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);

        PaymentAttempt attempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-FRAUD", new BigDecimal("525.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());

        when(webhookEventInboxRepository.findByDeliveryId("DEL-FRAUD")).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignature(payloadBytes, "valid_sig")).thenReturn(true);
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-FRAUD")).thenReturn(Optional.of(attempt));

        assertThatThrownBy(() -> paymentService.processWebhook("YOUPI_PG", "DEL-FRAUD", "valid_sig", payloadBytes))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("amount mismatch");
    }

    @Test
    @DisplayName("processWebhook duplicate UTR on different attempt throws ConflictException")
    void processWebhook_DuplicateUtr_ThrowsConflict() {
        String payloadJson = "{\"status\":\"RECONCILED\",\"deliveryId\":\"DEL-DUP-UTR\",\"idempotencyKey\":\"IDEMP-CURR\",\"amount\":525.00,\"currency\":\"INR\",\"utr\":\"DUPLICATE-UTR-999\"}";
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);

        PaymentAttempt currentAttempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-CURR", new BigDecimal("525.00"), "INR"
        );
        currentAttempt.setId(UUID.randomUUID());
        currentAttempt.setReceivingAccount("HDFC_XX1234");

        PaymentAttempt existingAttempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-OTHER", new BigDecimal("525.00"), "INR"
        );
        existingAttempt.setId(UUID.randomUUID());

        when(webhookEventInboxRepository.findByDeliveryId("DEL-DUP-UTR")).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignature(payloadBytes, "sig")).thenReturn(true);
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-CURR")).thenReturn(Optional.of(currentAttempt));
        when(paymentAttemptRepository.findByReceivingAccountAndUtr("HDFC_XX1234", "DUPLICATE-UTR-999"))
                .thenReturn(Optional.of(existingAttempt));

        assertThatThrownBy(() -> paymentService.processWebhook("YOUPI_PG", "DEL-DUP-UTR", "sig", payloadBytes))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Duplicate transaction reference UTR");
    }

    @Test
    @DisplayName("processWebhook late credit alert on expired attempt routes to MANUAL_REVIEW")
    void processWebhook_LateCreditOnExpired_RoutesToManualReview() {
        String payloadJson = "{\"event\":\"EXPIRED\",\"status\":\"EXPIRED\",\"deliveryId\":\"DEL-LATE-1\",\"idempotencyKey\":\"IDEMP-EXP\",\"amount\":525.00,\"currency\":\"INR\"}";
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);

        PaymentAttempt attempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-EXP", new BigDecimal("525.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());
        attempt.setStatus(PaymentAttemptStatus.OBSERVED_SUCCESS); // Late SMS arrived earlier

        when(webhookEventInboxRepository.findByDeliveryId("DEL-LATE-1")).thenReturn(Optional.empty());
        when(paymentProviderFactory.getProvider("YOUPI_PG")).thenReturn(mockProvider);
        when(mockProvider.getProviderName()).thenReturn("YOUPI_PG");
        when(mockProvider.verifyWebhookSignature(payloadBytes, "sig")).thenReturn(true);
        when(paymentAttemptRepository.findByIdempotencyKey("IDEMP-EXP")).thenReturn(Optional.of(attempt));

        paymentService.processWebhook("YOUPI_PG", "DEL-LATE-1", "sig", payloadBytes);

        assertThat(attempt.getStatus()).isEqualTo(PaymentAttemptStatus.MANUAL_REVIEW);
    }

    // --- Manager Operations & Metrics Tests ---

    @Test
    @DisplayName("reconcilePayment records statement reconciliation and marks order PAID")
    void reconcilePayment_Success() {
        PaymentAttempt attempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-REC", new BigDecimal("525.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());
        attempt.setStatus(PaymentAttemptStatus.OBSERVED_SUCCESS);

        when(paymentAttemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userRepository.findById(managerUser.getId())).thenReturn(Optional.of(managerUser));
        when(bankReconciliationRecordRepository.findByBankReferenceNumber("STMT-REF-999")).thenReturn(Optional.empty());
        when(bankReconciliationRecordRepository.save(any(BankReconciliationRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        BankReconciliationRequest req = new BankReconciliationRequest(
                attempt.getId(), "STMT-REF-999", "HDFC_XX1234", new BigDecimal("525.00"),
                LocalDate.now(), "Verified against HDFC Netbanking statement"
        );

        BankReconciliationDto result = paymentService.reconcilePayment(req, managerUser.getId());

        assertThat(result).isNotNull();
        assertThat(result.bankReferenceNumber()).isEqualTo("STMT-REF-999");
        assertThat(attempt.getStatus()).isEqualTo(PaymentAttemptStatus.RECONCILED);
        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    @DisplayName("recordRefund updates settlementStatus to REFUNDED and creates refund record")
    void recordRefund_Success() {
        PaymentAttempt attempt = new PaymentAttempt(
                testOrder, null, "YOUPI_PG", "IDEMP-REFUND", new BigDecimal("525.00"), "INR"
        );
        attempt.setId(UUID.randomUUID());
        attempt.setStatus(PaymentAttemptStatus.RECONCILED);

        when(paymentAttemptRepository.findById(attempt.getId())).thenReturn(Optional.of(attempt));
        when(userRepository.findById(managerUser.getId())).thenReturn(Optional.of(managerUser));
        when(paymentRefundRecordRepository.save(any(PaymentRefundRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        RecordRefundRequest req = new RecordRefundRequest(
                attempt.getId(), new BigDecimal("525.00"), "Customer requested cancellation before baking", "REF-TXN-101"
        );

        PaymentRefundDto result = paymentService.recordRefund(req, managerUser.getId());

        assertThat(result).isNotNull();
        assertThat(result.amount()).isEqualByComparingTo("525.00");
        assertThat(attempt.getSettlementStatus()).isEqualTo(PaymentSettlementStatus.REFUNDED);
    }

    @Test
    @DisplayName("getPaymentMetrics aggregates reconciled vs observed sums and status counts accurately")
    void getPaymentMetrics_AccurateBreakdown() {
        when(paymentAttemptRepository.sumReconciledAmount()).thenReturn(new BigDecimal("15000.00"));
        when(paymentAttemptRepository.sumObservedUnreconciledAmount()).thenReturn(new BigDecimal("2100.00"));
        when(paymentAttemptRepository.countByStatus(PaymentAttemptStatus.OBSERVED_SUCCESS)).thenReturn(4L);
        when(paymentAttemptRepository.countByStatus(PaymentAttemptStatus.RECONCILED)).thenReturn(25L);
        when(paymentAttemptRepository.countByStatus(PaymentAttemptStatus.MANUAL_REVIEW)).thenReturn(1L);
        when(paymentAttemptRepository.countByStatus(PaymentAttemptStatus.FAILED)).thenReturn(2L);
        when(paymentAttemptRepository.count()).thenReturn(35L);

        PaymentFinancialMetricsDto metrics = paymentService.getPaymentMetrics();

        assertThat(metrics.reconciledAmount()).isEqualByComparingTo("15000.00");
        assertThat(metrics.observedUnreconciledAmount()).isEqualByComparingTo("2100.00");
        assertThat(metrics.observedSuccessCount()).isEqualTo(4L);
        assertThat(metrics.reconciledCount()).isEqualTo(25L);
        assertThat(metrics.manualReviewCount()).isEqualTo(1L);
        assertThat(metrics.failedCount()).isEqualTo(2L);
        assertThat(metrics.totalAttemptsCount()).isEqualTo(35L);
    }
}
