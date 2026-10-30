package com.bakeconnect.identity.dto;

import com.bakeconnect.identity.entity.Address;
import java.util.UUID;

public record AddressDto(
        UUID id,
        String type,
        String contactName,
        String contactPhone,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String deliveryInstructions,
        boolean isDefault
) {
    public static AddressDto fromEntity(Address address) {
        return new AddressDto(
                address.getId(),
                address.getType(),
                address.getContactName(),
                address.getContactPhone(),
                address.getAddressLine1(),
                address.getAddressLine2(),
                address.getCity(),
                address.getState(),
                address.getPostalCode(),
                address.getDeliveryInstructions(),
                address.isDefault()
        );
    }
}
