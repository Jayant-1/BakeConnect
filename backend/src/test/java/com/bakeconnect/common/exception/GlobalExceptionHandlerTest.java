package com.bakeconnect.common.exception;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.common.filter.CorrelationIdFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setAttribute(CorrelationIdFilter.CORRELATION_ID_ATTRIBUTE, "test-corr-123");
    }

    @Test
    void shouldHandleResourceNotFoundException() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Product", "prod-456");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleNotFound(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().success());
        assertEquals("NOT_FOUND", response.getBody().code());
        assertEquals("test-corr-123", response.getBody().correlationId());
        assertTrue(response.getBody().message().contains("Product not found"));
    }

    @Test
    void shouldHandleConflictException() {
        ConflictException ex = new ConflictException("Email already in use");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleConflict(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("CONFLICT", response.getBody().code());
    }

    @Test
    void shouldHandleBusinessRuleException() {
        BusinessRuleException ex = new BusinessRuleException("GST_REQUIRED", "GST number is required for business orders");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleBusinessRule(ex, request);

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("GST_REQUIRED", response.getBody().code());
    }

    @Test
    void shouldHandleGenericExceptionWithoutLeakingInternals() {
        RuntimeException ex = new RuntimeException("SQL syntax error near SELECT * FROM password_dump");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleGenericException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INTERNAL_SERVER_ERROR", response.getBody().code());
        assertFalse(response.getBody().message().contains("SELECT * FROM"));
        assertTrue(response.getBody().message().contains("test-corr-123"));
    }
}
