package com.bakeconnect.identity.service;

import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.identity.dto.AddressCreateRequest;
import com.bakeconnect.identity.dto.AddressDto;
import com.bakeconnect.identity.entity.Address;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.repository.AddressRepository;
import com.bakeconnect.identity.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public AddressService(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AddressDto> getUserAddresses(UUID userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .stream()
                .map(AddressDto::fromEntity)
                .toList();
    }

    @Transactional
    public AddressDto addAddress(UUID userId, AddressCreateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (req.isDefault()) {
            addressRepository.resetDefaultAddressForUser(userId);
        }

        Address address = new Address(
                user,
                req.contactName().trim(),
                req.contactPhone().trim(),
                req.addressLine1().trim(),
                req.addressLine2() != null ? req.addressLine2().trim() : null,
                req.city().trim(),
                req.state().trim(),
                req.postalCode().trim(),
                req.deliveryInstructions(),
                req.isDefault()
        );
        if (req.type() != null) {
            address.setType(req.type());
        }

        Address saved = addressRepository.save(address);
        return AddressDto.fromEntity(saved);
    }

    @Transactional
    public AddressDto updateAddress(UUID userId, UUID addressId, AddressCreateRequest req) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", addressId));

        if (req.isDefault() && !address.isDefault()) {
            addressRepository.resetDefaultAddressForUser(userId);
        }

        address.setContactName(req.contactName().trim());
        address.setContactPhone(req.contactPhone().trim());
        address.setAddressLine1(req.addressLine1().trim());
        address.setAddressLine2(req.addressLine2() != null ? req.addressLine2().trim() : null);
        address.setCity(req.city().trim());
        address.setState(req.state().trim());
        address.setPostalCode(req.postalCode().trim());
        address.setDeliveryInstructions(req.deliveryInstructions());
        address.setDefault(req.isDefault());
        if (req.type() != null) {
            address.setType(req.type());
        }

        Address saved = addressRepository.save(address);
        return AddressDto.fromEntity(saved);
    }

    @Transactional
    public void deleteAddress(UUID userId, UUID addressId) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", addressId));
        addressRepository.delete(address);
    }
}
