package com.bakeconnect.billing.service;

import com.bakeconnect.billing.dto.BillingSummaryDto;
import com.bakeconnect.billing.dto.InvoiceDto;
import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.billing.entity.InvoiceStatus;
import com.bakeconnect.billing.entity.LedgerEntryType;
import com.bakeconnect.billing.entity.RetailerLedgerEntry;
import com.bakeconnect.billing.repository.InvoiceRepository;
import com.bakeconnect.billing.repository.RetailerLedgerRepository;
import com.bakeconnect.common.exception.BadRequestException;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ForbiddenException;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.ordering.entity.*;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.retailer.entity.PaymentTerms;
import com.bakeconnect.retailer.entity.RetailerProfile;
import com.bakeconnect.retailer.repository.RetailerProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private RetailerLedgerRepository retailerLedgerRepository;

    @Mock
    private RetailerProfileRepository retailerProfileRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private NotificationOutboxRepository notificationOutboxRepository;

    private BillingService billingService;
    private User retailerUser;
    private User adminUser;
    private Order testOrder;
    private RetailerProfile retailerProfile;

    @BeforeEach
    void setUp() {
        billingService = new BillingService(
                invoiceRepository,
                retailerLedgerRepository,
                retailerProfileRepository,
                orderRepository,
                notificationOutboxRepository,
                new ObjectMapper()
        );

        retailerUser = new User("retailer@bakeconnect.com", "hash", "Acme Retailer", "9876543210", UserRole.RETAILER);
        retailerUser.setId(UUID.randomUUID());

        adminUser = new User("admin@bakeconnect.com", "hash", "Bakery Admin", "9123456789", UserRole.BAKERY_ADMIN);
        adminUser.setId(UUID.randomUUID());

        testOrder = new Order(
                "BC-20261028-001",
                retailerUser,
                OrderType.BUSINESS,
                OrderStatus.PENDING_REVIEW,
                PaymentStatus.PENDING,
                DeliveryType.DELIVERY,
                "{}",
                "27AAPFU0939F1ZV",
                "Acme Stores",
                new BigDecimal("10000.00"),
                new BigDecimal("250.00"),
                new BigDecimal("487.50"),
                new BigDecimal("10237.50"),
                "Urgent delivery"
        );
        testOrder.setId(UUID.randomUUID());

        retailerProfile = new RetailerProfile(retailerUser, "Acme Stores", "27AAPFU0939F1ZV", "John Doe", "9876543210");
        retailerProfile.setPaymentTerms(PaymentTerms.NET_15_DAYS);
        retailerProfile.setCreditLimit(new BigDecimal("50000.00"));
    }

    @Test
    @DisplayName("createInvoiceForOrder generates invoice, due date from terms, and debit ledger entry")
    void createInvoiceForOrder_Success_DebitLedgerCreated() {
        when(invoiceRepository.findByOrderId(testOrder.getId())).thenReturn(Optional.empty());
        when(retailerProfileRepository.findByUserId(retailerUser.getId())).thenReturn(Optional.of(retailerProfile));

        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> {
            Invoice i = inv.getArgument(0);
            i.setId(UUID.randomUUID());
            return i;
        });

        // Previous running balance was 5000.00
        RetailerLedgerEntry prevEntry = new RetailerLedgerEntry();
        prevEntry.setRunningBalance(new BigDecimal("5000.00"));
        when(retailerLedgerRepository.findFirstByRetailerIdOrderByEntryTimestampDesc(retailerUser.getId()))
                .thenReturn(Optional.of(prevEntry));

        InvoiceDto invoiceDto = billingService.createInvoiceForOrder(testOrder);

        assertThat(invoiceDto).isNotNull();
        assertThat(invoiceDto.getTotalAmount()).isEqualByComparingTo("10237.50");
        assertThat(invoiceDto.getPaidAmount()).isEqualByComparingTo("0.00");
        assertThat(invoiceDto.getBalanceAmount()).isEqualByComparingTo("10237.50");
        assertThat(invoiceDto.getStatus()).isEqualTo(InvoiceStatus.ISSUED);
        assertThat(invoiceDto.getDueDate()).isEqualTo(LocalDate.now().plusDays(15));

        // Verify ledger entry
        ArgumentCaptor<RetailerLedgerEntry> ledgerCaptor = ArgumentCaptor.forClass(RetailerLedgerEntry.class);
        verify(retailerLedgerRepository).save(ledgerCaptor.capture());
        RetailerLedgerEntry capturedLedger = ledgerCaptor.getValue();
        assertThat(capturedLedger.getEntryType()).isEqualTo(LedgerEntryType.INVOICE_DEBIT);
        assertThat(capturedLedger.getAmount()).isEqualByComparingTo("10237.50");
        // 5000.00 + 10237.50 = 15237.50
        assertThat(capturedLedger.getRunningBalance()).isEqualByComparingTo("15237.50");

        // Verify outbox notification
        verify(notificationOutboxRepository).save(any(NotificationOutbox.class));
    }

    @Test
    @DisplayName("createInvoiceForOrder returns existing invoice if already generated")
    void createInvoiceForOrder_ExistingInvoice_ReturnsExisting() {
        Invoice existingInvoice = new Invoice("INV-EXISTING-01", testOrder, retailerUser,
                LocalDate.now(), LocalDate.now().plusDays(15), new BigDecimal("10237.50"));
        existingInvoice.setId(UUID.randomUUID());

        when(invoiceRepository.findByOrderId(testOrder.getId())).thenReturn(Optional.of(existingInvoice));

        InvoiceDto invoiceDto = billingService.createInvoiceForOrder(testOrder);

        assertThat(invoiceDto.getInvoiceNumber()).isEqualTo("INV-EXISTING-01");
        verify(invoiceRepository, never()).save(any(Invoice.class));
        verify(retailerLedgerRepository, never()).save(any(RetailerLedgerEntry.class));
    }

    @Test
    @DisplayName("recordPayment full payment marks invoice PAID, order PAID, and logs credit entry")
    void recordPayment_FullPayment_Success() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice("INV-20261028-001", testOrder, retailerUser,
                LocalDate.now(), LocalDate.now().plusDays(15), new BigDecimal("10237.50"));
        invoice.setId(invoiceId);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        RetailerLedgerEntry prevEntry = new RetailerLedgerEntry();
        prevEntry.setRunningBalance(new BigDecimal("15237.50"));
        when(retailerLedgerRepository.findFirstByRetailerIdOrderByEntryTimestampDesc(retailerUser.getId()))
                .thenReturn(Optional.of(prevEntry));

        InvoiceDto result = billingService.recordPayment(
                invoiceId,
                new BigDecimal("10237.50"),
                "NEFT-REF-998877",
                "Full settlement",
                adminUser.getId()
        );

        assertThat(result.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(result.getBalanceAmount()).isEqualByComparingTo("0.00");
        assertThat(result.getPaidAmount()).isEqualByComparingTo("10237.50");

        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        verify(orderRepository).save(testOrder);

        ArgumentCaptor<RetailerLedgerEntry> captor = ArgumentCaptor.forClass(RetailerLedgerEntry.class);
        verify(retailerLedgerRepository).save(captor.capture());
        RetailerLedgerEntry creditEntry = captor.getValue();
        assertThat(creditEntry.getEntryType()).isEqualTo(LedgerEntryType.PAYMENT_CREDIT);
        assertThat(creditEntry.getAmount()).isEqualByComparingTo("10237.50");
        // 15237.50 - 10237.50 = 5000.00
        assertThat(creditEntry.getRunningBalance()).isEqualByComparingTo("5000.00");
    }

    @Test
    @DisplayName("recordPayment partial payment marks invoice and order PARTIALLY_PAID")
    void recordPayment_PartialPayment_Success() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice("INV-20261028-002", testOrder, retailerUser,
                LocalDate.now(), LocalDate.now().plusDays(15), new BigDecimal("10000.00"));
        invoice.setId(invoiceId);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        RetailerLedgerEntry prevEntry = new RetailerLedgerEntry();
        prevEntry.setRunningBalance(new BigDecimal("10000.00"));
        when(retailerLedgerRepository.findFirstByRetailerIdOrderByEntryTimestampDesc(retailerUser.getId()))
                .thenReturn(Optional.of(prevEntry));

        InvoiceDto result = billingService.recordPayment(
                invoiceId,
                new BigDecimal("4000.00"),
                "UPI-TXN-112233",
                "40% advance",
                adminUser.getId()
        );

        assertThat(result.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(result.getPaidAmount()).isEqualByComparingTo("4000.00");
        assertThat(result.getBalanceAmount()).isEqualByComparingTo("6000.00");

        assertThat(testOrder.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_PAID);
        verify(orderRepository).save(testOrder);

        ArgumentCaptor<RetailerLedgerEntry> captor = ArgumentCaptor.forClass(RetailerLedgerEntry.class);
        verify(retailerLedgerRepository).save(captor.capture());
        RetailerLedgerEntry creditEntry = captor.getValue();
        assertThat(creditEntry.getRunningBalance()).isEqualByComparingTo("6000.00");
    }

    @Test
    @DisplayName("recordPayment throws BadRequestException when payment exceeds balance")
    void recordPayment_ExceedsBalance_ThrowsBadRequest() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice("INV-20261028-003", testOrder, retailerUser,
                LocalDate.now(), LocalDate.now().plusDays(15), new BigDecimal("5000.00"));
        invoice.setId(invoiceId);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> billingService.recordPayment(
                invoiceId,
                new BigDecimal("6000.00"),
                "REF",
                null,
                adminUser.getId()
        )).isInstanceOf(BadRequestException.class)
                .hasMessageContaining("exceeds remaining balance");
    }

    @Test
    @DisplayName("recordPayment throws BusinessRuleException when invoice is already paid")
    void recordPayment_AlreadyPaid_ThrowsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice("INV-20261028-004", testOrder, retailerUser,
                LocalDate.now(), LocalDate.now().plusDays(15), new BigDecimal("5000.00"));
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setId(invoiceId);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> billingService.recordPayment(
                invoiceId,
                new BigDecimal("1000.00"),
                "REF",
                null,
                adminUser.getId()
        )).isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("already fully paid");
    }

    @Test
    @DisplayName("getInvoiceById protects against IDOR for unauthorized retailer")
    void getInvoiceById_IdorProtection() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice("INV-20261028-005", testOrder, retailerUser,
                LocalDate.now(), LocalDate.now().plusDays(15), new BigDecimal("5000.00"));
        invoice.setId(invoiceId);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        UUID anotherRetailerId = UUID.randomUUID();

        assertThatThrownBy(() -> billingService.getInvoiceById(invoiceId, anotherRetailerId, UserRole.RETAILER))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("getBillingSummary computes outstanding balance and available credit")
    void getBillingSummary_Success() {
        when(retailerProfileRepository.findByUserId(retailerUser.getId())).thenReturn(Optional.of(retailerProfile));
        when(invoiceRepository.sumOutstandingBalanceByRetailerId(retailerUser.getId()))
                .thenReturn(new BigDecimal("12000.00"));
        when(invoiceRepository.sumOverdueBalanceByRetailerId(eq(retailerUser.getId()), any(LocalDate.class)))
                .thenReturn(new BigDecimal("3000.00"));
        when(invoiceRepository.countByRetailerIdAndStatusIn(eq(retailerUser.getId()), any()))
                .thenReturn(3L);
        when(invoiceRepository.countOverdueByRetailerId(eq(retailerUser.getId()), any(LocalDate.class)))
                .thenReturn(1L);

        BillingSummaryDto summary = billingService.getBillingSummary(
                retailerUser.getId(), retailerUser.getId(), UserRole.RETAILER);

        assertThat(summary.getCreditLimit()).isEqualByComparingTo("50000.00");
        assertThat(summary.getTotalOutstandingBalance()).isEqualByComparingTo("12000.00");
        // 50000.00 - 12000.00 = 38000.00
        assertThat(summary.getAvailableCredit()).isEqualByComparingTo("38000.00");
        assertThat(summary.getTotalOverdueAmount()).isEqualByComparingTo("3000.00");
        assertThat(summary.getOpenInvoicesCount()).isEqualTo(3L);
        assertThat(summary.getOverdueInvoicesCount()).isEqualTo(1L);
    }
}
