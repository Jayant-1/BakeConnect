package com.bakeconnect.identity.security;

import com.bakeconnect.identity.entity.User;
import com.bakeconnect.identity.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        String testSecret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        jwtService = new JwtService(testSecret, 3600000);
    }

    @Test
    void shouldGenerateAndValidateTokenSuccessfully() {
        User user = new User("baker@bakeconnect.local", "hash", "Master Baker", "9876543210", UserRole.BAKERY_ADMIN);
        UUID userId = UUID.randomUUID();
        user.setId(userId);

        String token = jwtService.generateToken(user);
        assertNotNull(token);
        assertTrue(jwtService.validateToken(token));

        assertEquals("baker@bakeconnect.local", jwtService.extractEmail(token));
        assertEquals(userId, jwtService.extractUserId(token));
        assertEquals(UserRole.BAKERY_ADMIN.name(), jwtService.extractRole(token));
    }

    @Test
    void shouldRejectInvalidOrTamperedToken() {
        assertFalse(jwtService.validateToken("invalid.jwt.token"));
        assertFalse(jwtService.validateToken(""));
        assertFalse(jwtService.validateToken(null));
    }
}
