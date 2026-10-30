package com.bakeconnect.identity.controller;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.common.exception.ResourceNotFoundException;
import com.bakeconnect.identity.dto.UserProfileDto;
import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.repository.UserRepository;
import com.bakeconnect.identity.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Profile", description = "Endpoints for user profile inspection")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated user profile")
    public ResponseEntity<ApiResponse<UserProfileDto>> getCurrentUser(@AuthenticationPrincipal SecurityUser currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", currentUser.getId()));
        return ResponseEntity.ok(ApiResponse.success(UserProfileDto.fromEntity(user)));
    }
}
