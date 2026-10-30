package com.bakeconnect.identity.service;

import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.common.exception.ForbiddenException;
import com.bakeconnect.common.exception.UnauthorizedException;
import com.bakeconnect.identity.dto.AuthResponse;
import com.bakeconnect.identity.dto.LoginRequest;
import com.bakeconnect.identity.dto.RegisterRequest;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void shouldRegisterNewUserSuccessfully() {
        RegisterRequest request = new RegisterRequest("customer@example.com", "Password123!", "Jane Doe", "9876543210", UserRole.DIRECT_CUSTOMER);
        when(userRepository.existsByEmail("customer@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");

        User savedUser = new User("customer@example.com", "hashed_pass", "Jane Doe", "9876543210", UserRole.DIRECT_CUSTOMER);
        savedUser.setId(UUID.randomUUID());
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(any(User.class))).thenReturn("mock.jwt.token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("customer@example.com", response.email());
        assertEquals("mock.jwt.token", response.token());
        assertEquals(UserRole.DIRECT_CUSTOMER, response.role());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void shouldThrowConflictWhenRegisteringExistingEmail() {
        RegisterRequest request = new RegisterRequest("existing@example.com", "Password123!", "Jane Doe", null, UserRole.DIRECT_CUSTOMER);
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(ConflictException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldLoginSuccessfullyWithValidCredentials() {
        LoginRequest request = new LoginRequest("baker@bakeconnect.local", "ValidPassword123!");
        User user = new User("baker@bakeconnect.local", "hashed_pass", "Master Baker", null, UserRole.BAKERY_ADMIN);
        user.setId(UUID.randomUUID());

        when(userRepository.findByEmail("baker@bakeconnect.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("ValidPassword123!", "hashed_pass")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("mock.jwt.token");

        AuthResponse response = authService.login(request);
        assertNotNull(response);
        assertEquals("mock.jwt.token", response.token());
    }

    @Test
    void shouldRejectLoginWithWrongPassword() {
        LoginRequest request = new LoginRequest("baker@bakeconnect.local", "WrongPassword!");
        User user = new User("baker@bakeconnect.local", "hashed_pass", "Master Baker", null, UserRole.BAKERY_ADMIN);

        when(userRepository.findByEmail("baker@bakeconnect.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword!", "hashed_pass")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }

    @Test
    void shouldRejectLoginForDeactivatedUser() {
        LoginRequest request = new LoginRequest("baker@bakeconnect.local", "ValidPassword123!");
        User user = new User("baker@bakeconnect.local", "hashed_pass", "Master Baker", null, UserRole.BAKERY_ADMIN);
        user.setActive(false);

        when(userRepository.findByEmail("baker@bakeconnect.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("ValidPassword123!", "hashed_pass")).thenReturn(true);

        assertThrows(ForbiddenException.class, () -> authService.login(request));
    }

    @Test
    void shouldRejectRegistrationForAdminRole() {
        RegisterRequest request = new RegisterRequest("hacker@example.com", "Password123!", "Sneaky Admin", null, UserRole.BAKERY_ADMIN);
        com.bakeconnect.common.exception.BadRequestException ex =
                assertThrows(com.bakeconnect.common.exception.BadRequestException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("only permitted for DIRECT_CUSTOMER or RETAILER"));
        verify(userRepository, never()).save(any(User.class));
    }
}
