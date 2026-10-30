package com.bakeconnect.identity.service;

import com.bakeconnect.common.exception.BadRequestException;
import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.common.exception.ForbiddenException;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.common.exception.UnauthorizedException;
import com.bakeconnect.identity.dto.AuthResponse;
import com.bakeconnect.identity.dto.ForgotPasswordRequest;
import com.bakeconnect.identity.dto.LoginRequest;
import com.bakeconnect.identity.dto.RegisterRequest;
import com.bakeconnect.identity.dto.ResetPasswordRequest;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.identity.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.role() != UserRole.DIRECT_CUSTOMER && request.role() != UserRole.RETAILER) {
            throw new BadRequestException("Public registration is only permitted for DIRECT_CUSTOMER or RETAILER roles");
        }

        String normalizedEmail = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("Email is already registered: " + normalizedEmail);
        }

        User user = new User(
                normalizedEmail,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                request.phone() != null ? request.phone().trim() : null,
                request.role()
        );
        user.setVerificationToken(UUID.randomUUID().toString());
        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser);
        return new AuthResponse(token, savedUser.getId(), savedUser.getEmail(), savedUser.getFullName(), savedUser.getRole());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new ForbiddenException("Account is deactivated. Please contact support.");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    @Transactional
    public void verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired verification token"));

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
    }

    @Transactional
    public String requestPasswordReset(ForgotPasswordRequest request) {
        String normalizedEmail = request.email().toLowerCase().trim();
        userRepository.findByEmail(normalizedEmail).ifPresent(user -> {
            user.setResetToken(UUID.randomUUID().toString());
            user.setResetExpiresAt(Instant.now().plus(Duration.ofHours(1)));
            userRepository.save(user);
        });
        return "If an account matches that email, a password reset link has been dispatched.";
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByResetToken(request.token())
                .orElseThrow(() -> new BadRequestException("Invalid or expired password reset token"));

        if (user.getResetExpiresAt() == null || user.getResetExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Password reset token has expired. Please request a new one.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setResetToken(null);
        user.setResetExpiresAt(null);
        userRepository.save(user);
    }
}
