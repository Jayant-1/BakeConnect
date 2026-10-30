package com.bakeconnect.billing.service;

import com.bakeconnect.billing.dto.BillingSummaryDto;
import com.bakeconnect.billing.dto.InvoiceDto;
import com.bakeconnect.billing.dto.LedgerEntryDto;
import com.bakeconnect.billing.entity.Invoice;
import com.bakeconnect.billing.entity.InvoiceStatus;
import com.bakeconnect.billing.entity.LedgerEntryType;
import com.bakeconnect.billing.entity.RetailerLedgerEntry;
import com.bakeconnect.billing.repository.InvoiceRepository;
import com.bakeconnect.billing.repository.RetailerLedgerRepository;
import com.bakeconnect.billing.util.DueDateCalculator;
import com.bakeconnect.common.exception.BadRequestException;
import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ForbiddenException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.notification.entity.NotificationOutbox;
import com.bakeconnect.notification.repository.NotificationOutboxRepository;
import com.bakeconnect.ordering.entity.Order;
import com.bakeconnect.ordering.entity.OrderType;
import com.bakeconnect.ordering.entity.PaymentStatus;
import com.bakeconnect.ordering.repository.OrderRepository;
import com.bakeconnect.retailer.entity.PaymentTerms;
import com.bakeconnect.retailer.entity.RetailerProfile;
import com.bakeconnect.retailer.repository.RetailerProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final InvoiceRepository invoiceRepository;
    private final RetailerLedgerRepository retailerLedgerRepository;
    private final RetailerProfileRepository retailerProfileRepository;
    private final OrderRepository orderRepository;
    private final NotificationOutboxRepository notificationOutboxRepository;
    private final ObjectMapper objectMapper;

    public BillingService(InvoiceRepository invoiceRepository,
                          RetailerLedgerRepository retailerLedgerRepository,
                          RetailerProfileRepository retailerProfileRepository,
                          OrderRepository orderRepository,
                          NotificationOutboxRepository notificationOutboxRepository,
                          ObjectMapper objectMapper) {
        this.invoiceRepository = invoiceRepository;
        this.retailerLedgerRepository = retailerLedgerRepository;
        this.retailerProfileRepository = retailerProfileRepository;
        this.orderRepository = orderRepository;
        this.notificationOutboxRepository = notificationOutboxRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public InvoiceDto createInvoiceForOrder(Order order) {
        // Check if invoice already exists for this order
        Optional<Invoice> existingInvoice = invoiceRepository.findByOrderId(order.getId());
        if (existingInvoice.isPresent()) {
            return InvoiceDto.fromEntity(existingInvoice.get());
        }

        // Determine payment terms
        PaymentTerms terms = PaymentTerms.IMMEDIATE;
        Integer customDays = null;
        Optional<RetailerProfile> profileOpt = retailerProfileRepository.findByUserId(order.getUser().getId());
        if (profileOpt.isPresent()) {
            terms = profileOpt.get().getPaymentTerms();
            customDays = profileOpt.get().getCustomTermDays();
        }

        LocalDate issueDate = LocalDate.now();
        LocalDate dueDate = DueDateCalculator.calculateDueDate(issueDate, terms, customDays);

        String invoiceNumber = "INV-" + issueDate.format(DATE_FMT) + "-" +
                UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        BigDecimal total = order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);

        Invoice invoice = new Invoice(
                invoiceNumber,
                order,
                order.getUser(),
                issueDate,
                dueDate,
                total
        );
        Invoice savedInvoice = invoiceRepository.save(invoice);

        // Append-only ledger debit
        Optional<RetailerLedgerEntry> latestEntry = retailerLedgerRepository
                .findFirstByRetailerIdOrderByEntryTimestampDesc(order.getUser().getId());
        BigDecimal prevBalance = latestEntry.map(RetailerLedgerEntry::getRunningBalance)
                .orElse(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        BigDecimal newBalance = prevBalance.add(total).setScale(2, RoundingMode.HALF_UP);

        RetailerLedgerEntry ledgerEntry = new RetailerLedgerEntry(
                order.getUser(),
                order,
                savedInvoice,
                LedgerEntryType.INVOICE_DEBIT,
                total,
                newBalance,
                savedInvoice.getInvoiceNumber(),
                "Invoice debit for Order " + order.getOrderNumber()
        );
        retailerLedgerRepository.save(ledgerEntry);

        // Outbox notification
        enqueueNotification(
                order.getUser().getEmail(),
                "Invoice " + savedInvoice.getInvoiceNumber() + " Issued for Order " + order.getOrderNumber(),
                "INVOICE_GENERATED",
                Map.of(
                        "invoiceNumber", savedInvoice.getInvoiceNumber(),
                        "orderNumber", order.getOrderNumber(),
                        "totalAmount", total.toString(),
                        "dueDate", dueDate.toString()
                )
        );

        log.info("Invoice {} generated for order {} (retailer: {})",
                savedInvoice.getInvoiceNumber(), order.getOrderNumber(), order.getUser().getEmail());

        return InvoiceDto.fromEntity(savedInvoice);
    }

    @Transactional
    public InvoiceDto recordPayment(UUID invoiceId, BigDecimal amount, String referenceNumber,
                                   String notes, UUID adminId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BusinessRuleException("Invoice " + invoice.getInvoiceNumber() + " is already fully paid");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BusinessRuleException("Cannot record payment against cancelled invoice");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero");
        }

        BigDecimal scaledAmount = amount.setScale(2, RoundingMode.HALF_UP);
        if (scaledAmount.compareTo(invoice.getBalanceAmount()) > 0) {
            throw new BadRequestException("Payment amount " + scaledAmount +
                    " exceeds remaining balance " + invoice.getBalanceAmount());
        }

        BigDecimal newPaidAmount = invoice.getPaidAmount().add(scaledAmount).setScale(2, RoundingMode.HALF_UP);
        BigDecimal newBalanceAmount = invoice.getBalanceAmount().subtract(scaledAmount).setScale(2, RoundingMode.HALF_UP);

        invoice.setPaidAmount(newPaidAmount);
        invoice.setBalanceAmount(newBalanceAmount);

        boolean isFullyPaid = newBalanceAmount.compareTo(BigDecimal.ZERO) == 0;
        if (isFullyPaid) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        Invoice updatedInvoice = invoiceRepository.save(invoice);

        // Update linked order's payment status if present
        if (invoice.getOrder() != null) {
            Order order = invoice.getOrder();
            if (isFullyPaid) {
                order.setPaymentStatus(PaymentStatus.PAID);
            } else {
                order.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
            }
            orderRepository.save(order);
        }

        // Append-only ledger credit
        Optional<RetailerLedgerEntry> latestEntry = retailerLedgerRepository
                .findFirstByRetailerIdOrderByEntryTimestampDesc(invoice.getRetailer().getId());
        BigDecimal prevBalance = latestEntry.map(RetailerLedgerEntry::getRunningBalance)
                .orElse(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        BigDecimal newBalance = prevBalance.subtract(scaledAmount).setScale(2, RoundingMode.HALF_UP);

        RetailerLedgerEntry ledgerEntry = new RetailerLedgerEntry(
                invoice.getRetailer(),
                invoice.getOrder(),
                updatedInvoice,
                LedgerEntryType.PAYMENT_CREDIT,
                scaledAmount,
                newBalance,
                referenceNumber,
                (notes != null && !notes.isBlank()) ? notes : "Payment credit for invoice " + invoice.getInvoiceNumber()
        );
        retailerLedgerRepository.save(ledgerEntry);

        // Outbox notification
        enqueueNotification(
                invoice.getRetailer().getEmail(),
                "Payment Received for Invoice " + invoice.getInvoiceNumber(),
                "PAYMENT_RECEIVED",
                Map.of(
                        "invoiceNumber", invoice.getInvoiceNumber(),
                        "amountPaid", scaledAmount.toString(),
                        "remainingBalance", newBalanceAmount.toString(),
                        "referenceNumber", referenceNumber
                )
        );

        log.info("Payment of {} recorded for invoice {} by admin {}. New balance: {}",
                scaledAmount, invoice.getInvoiceNumber(), adminId, newBalanceAmount);

        return InvoiceDto.fromEntity(updatedInvoice);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceDto> getRetailerInvoices(UUID retailerId, Pageable pageable, UUID requesterId, UserRole requesterRole) {
        validateRetailerAccess(retailerId, requesterId, requesterRole);
        return invoiceRepository.findByRetailerId(retailerId, pageable).map(InvoiceDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceById(UUID invoiceId, UUID requesterId, UserRole requesterRole) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));

        if (requesterRole != UserRole.BAKERY_ADMIN && !invoice.getRetailer().getId().equals(requesterId)) {
            throw new ForbiddenException("Access denied: You cannot view invoices belonging to another account");
        }

        return InvoiceDto.fromEntity(invoice);
    }

    @Transactional(readOnly = true)
    public Page<LedgerEntryDto> getRetailerLedger(UUID retailerId, Pageable pageable, UUID requesterId, UserRole requesterRole) {
        validateRetailerAccess(retailerId, requesterId, requesterRole);
        return retailerLedgerRepository.findByRetailerIdOrderByEntryTimestampDesc(retailerId, pageable)
                .map(LedgerEntryDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public BillingSummaryDto getBillingSummary(UUID retailerId, UUID requesterId, UserRole requesterRole) {
        validateRetailerAccess(retailerId, requesterId, requesterRole);

        Optional<RetailerProfile> profileOpt = retailerProfileRepository.findByUserId(retailerId);
        String businessName = profileOpt.map(RetailerProfile::getBusinessName).orElse("N/A");
        BigDecimal creditLimit = profileOpt.map(RetailerProfile::getCreditLimit)
                .orElse(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        BigDecimal totalOutstanding = invoiceRepository.sumOutstandingBalanceByRetailerId(retailerId);
        if (totalOutstanding == null) {
            totalOutstanding = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal totalOverdue = invoiceRepository.sumOverdueBalanceByRetailerId(retailerId, LocalDate.now());
        if (totalOverdue == null) {
            totalOverdue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal availableCredit = creditLimit.subtract(totalOutstanding).setScale(2, RoundingMode.HALF_UP);
        long openCount = invoiceRepository.countByRetailerIdAndStatusIn(
                retailerId, List.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID));
        long overdueCount = invoiceRepository.countOverdueByRetailerId(retailerId, LocalDate.now());

        return new BillingSummaryDto(
                retailerId,
                businessName,
                creditLimit,
                totalOutstanding,
                availableCredit,
                totalOverdue,
                openCount,
                overdueCount
        );
    }

    private void validateRetailerAccess(UUID retailerId, UUID requesterId, UserRole requesterRole) {
        if (requesterRole != UserRole.BAKERY_ADMIN && !requesterId.equals(retailerId)) {
            throw new ForbiddenException("Access denied: You cannot view financial records of another retailer");
        }
    }

    private void enqueueNotification(String email, String subject, String templateName, Map<String, Object> data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            NotificationOutbox outbox = new NotificationOutbox(email, subject, templateName, json);
            notificationOutboxRepository.save(outbox);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize notification data for template: {}", templateName, e);
        }
    }
}
