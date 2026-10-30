package com.bakeconnect.cart.controller;

import com.bakeconnect.cart.dto.CartQuoteRequest;
import com.bakeconnect.cart.dto.CartQuoteResponse;
import com.bakeconnect.cart.service.CartQuoteService;
import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
@Tag(name = "Cart & Checkout Quotation", description = "Server-side authoritative cart pricing, stock checks, and checkout quotation")
public class CartController {

    private final CartQuoteService cartQuoteService;

    public CartController(CartQuoteService cartQuoteService) {
        this.cartQuoteService = cartQuoteService;
    }

    @PostMapping("/quote")
    @Operation(summary = "Quote authoritative checkout totals for cart items, validating prices, discounts, and inventory")
    public ResponseEntity<ApiResponse<CartQuoteResponse>> quoteCart(
            @Valid @RequestBody CartQuoteRequest request,
            @AuthenticationPrincipal SecurityUser currentUser
    ) {
        UserRole role = currentUser != null ? currentUser.getRole() : null;
        CartQuoteResponse quote = cartQuoteService.calculateQuote(request, role);
        return ResponseEntity.ok(ApiResponse.success(quote));
    }
}
