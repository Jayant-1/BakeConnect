package com.bakeconnect.identity.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.identity.dto.AddressCreateRequest;
import com.bakeconnect.identity.dto.AddressDto;
import com.bakeconnect.identity.security.SecurityUser;
import com.bakeconnect.identity.service.AddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/addresses")
@Tag(name = "Customer Addresses", description = "Endpoints for managing authenticated user addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    @Operation(summary = "List all addresses for the authenticated user")
    public ResponseEntity<ApiResponse<List<AddressDto>>> getAddresses(@AuthenticationPrincipal SecurityUser currentUser) {
        List<AddressDto> addresses = addressService.getUserAddresses(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(addresses));
    }

    @PostMapping
    @Operation(summary = "Add a new address for the authenticated user")
    public ResponseEntity<ApiResponse<AddressDto>> addAddress(
            @AuthenticationPrincipal SecurityUser currentUser,
            @Valid @RequestBody AddressCreateRequest request
    ) {
        AddressDto address = addressService.addAddress(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(address, "Address added successfully"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing address owned by the authenticated user")
    public ResponseEntity<ApiResponse<AddressDto>> updateAddress(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable("id") UUID addressId,
            @Valid @RequestBody AddressCreateRequest request
    ) {
        AddressDto updated = addressService.updateAddress(currentUser.getId(), addressId, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Address updated successfully"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an address owned by the authenticated user")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable("id") UUID addressId
    ) {
        addressService.deleteAddress(currentUser.getId(), addressId);
        return ResponseEntity.ok(ApiResponse.success(null, "Address deleted successfully"));
    }
}
