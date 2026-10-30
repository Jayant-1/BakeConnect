package com.bakeconnect.cart.service;

import com.bakeconnect.cart.dto.CartItemQuoteDto;
import com.bakeconnect.cart.dto.CartItemRequest;
import com.bakeconnect.cart.dto.CartQuoteRequest;
import com.bakeconnect.cart.dto.CartQuoteResponse;
import com.bakeconnect.catalog.entity.Product;
import com.bakeconnect.catalog.repository.ProductRepository;
import com.bakeconnect.identity.entity.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CartQuoteService {

    private final ProductRepository productRepository;

    public static final BigDecimal BULK_DISCOUNT_THRESHOLD = new BigDecimal("10000.00");
    public static final BigDecimal BULK_DISCOUNT_RATE = new BigDecimal("0.025"); // 2.5%
    public static final BigDecimal TAX_RATE = new BigDecimal("0.05"); // 5% Bakery GST

    public CartQuoteService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public CartQuoteResponse calculateQuote(CartQuoteRequest request, UserRole callerRole) {
        boolean isWholesale = callerRole == UserRole.RETAILER || callerRole == UserRole.BAKERY_ADMIN;
        String channel = isWholesale ? "WHOLESALE" : "RETAIL";

        List<CartItemQuoteDto> itemQuotes = new ArrayList<>();
        List<String> validationErrors = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        boolean hasUnavailableItems = false;

        for (CartItemRequest itemReq : request.items()) {
            Optional<Product> productOpt = productRepository.findById(itemReq.productId());
            if (productOpt.isEmpty() || !productOpt.get().isActive()) {
                hasUnavailableItems = true;
                String error = "Product " + itemReq.productId() + " is no longer active in the catalog.";
                validationErrors.add(error);
                itemQuotes.add(new CartItemQuoteDto(
                        itemReq.productId(), "Unknown Product", null, BigDecimal.ZERO, itemReq.quantity(),
                        BigDecimal.ZERO, false, 0, error
                ));
                continue;
            }

            Product product = productOpt.get();
            BigDecimal unitPrice = isWholesale ? product.getWholesalePrice() : product.getRetailPrice();
            int requestedQty = itemReq.quantity();
            String itemError = null;

            if (!product.isAvailable() || product.getStockQuantity() < requestedQty) {
                hasUnavailableItems = true;
                itemError = String.format("Insufficient stock for '%s'. Requested: %d, Available: %d",
                        product.getName(), requestedQty, product.getStockQuantity());
                validationErrors.add(itemError);
            } else if (isWholesale && requestedQty < product.getMoq()) {
                hasUnavailableItems = true;
                itemError = String.format("Minimum wholesale order quantity for '%s' is %d", product.getName(), product.getMoq());
                validationErrors.add(itemError);
            } else if (isWholesale && ((requestedQty - product.getMoq()) % product.getMoqIncrement() != 0)) {
                hasUnavailableItems = true;
                itemError = String.format("Wholesale quantity for '%s' must follow pack increment of %d", product.getName(), product.getMoqIncrement());
                validationErrors.add(itemError);
            } else if (!isWholesale && requestedQty < 1) {
                hasUnavailableItems = true;
                itemError = "Quantity must be at least 1";
                validationErrors.add(itemError);
            }

            BigDecimal lineSubtotal = unitPrice.multiply(BigDecimal.valueOf(requestedQty)).setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineSubtotal);

            itemQuotes.add(new CartItemQuoteDto(
                    product.getId(),
                    product.getName(),
                    product.getSlug(),
                    unitPrice,
                    requestedQty,
                    lineSubtotal,
                    itemError == null,
                    product.getStockQuantity(),
                    itemError
            ));
        }

        // Conditional Discount Evaluation
        BigDecimal discountAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        String appliedDiscountDesc = null;

        if (subtotal.compareTo(BULK_DISCOUNT_THRESHOLD) >= 0) {
            discountAmount = subtotal.multiply(BULK_DISCOUNT_RATE).setScale(2, RoundingMode.HALF_UP);
            appliedDiscountDesc = "Conditional Volume Discount: 2.5% off orders >= ₹10,000";
        }

        BigDecimal netSubtotal = subtotal.subtract(discountAmount);
        BigDecimal taxAmount = netSubtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = netSubtotal.add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        boolean isValidForCheckout = !hasUnavailableItems && validationErrors.isEmpty() && !itemQuotes.isEmpty();

        return new CartQuoteResponse(
                itemQuotes,
                subtotal,
                discountAmount,
                appliedDiscountDesc,
                null,
                taxAmount,
                totalAmount,
                isValidForCheckout,
                validationErrors,
                channel
        );
    }
}
