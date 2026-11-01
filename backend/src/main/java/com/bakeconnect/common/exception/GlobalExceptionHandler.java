package com.bakeconnect.common.exception;

import com.bakeconnect.common.dto.ApiResponse;
import com.bakeconnect.common.dto.FieldErrorItem;
import com.bakeconnect.common.filter.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private String getCorrelationId(HttpServletRequest request) {
        Object attr = request.getAttribute(CorrelationIdFilter.CORRELATION_ID_ATTRIBUTE);
        return attr != null ? attr.toString() : null;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex,
                                                                       HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        List<FieldErrorItem> fieldErrors = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.add(new FieldErrorItem(fe.getField(), fe.getDefaultMessage(), fe.getRejectedValue()));
        }

        ApiResponse<Void> body = ApiResponse.error(
                "VALIDATION_ERROR",
                "Request validation failed",
                fieldErrors,
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex,
                                                                       HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        List<FieldErrorItem> fieldErrors = ex.getConstraintViolations().stream()
                .map(v -> new FieldErrorItem(v.getPropertyPath().toString(), v.getMessage(), v.getInvalidValue()))
                .toList();

        ApiResponse<Void> body = ApiResponse.error(
                "VALIDATION_ERROR",
                "Constraint validation failed",
                fieldErrors,
                correlationId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex,
            HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        String msg = String.format("Parameter '%s' with value '%s' is in an invalid format.", ex.getName(), ex.getValue());
        ApiResponse<Void> body = ApiResponse.error("INVALID_PARAMETER", msg, correlationId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error("BAD_REQUEST", ex.getMessage(), correlationId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex,
                                                              HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error("BAD_REQUEST", ex.getMessage(), correlationId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler({UnauthorizedException.class, AuthenticationException.class})
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(Exception ex,
                                                                HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error("UNAUTHORIZED", ex.getMessage(), correlationId);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
    public ResponseEntity<ApiResponse<Void>> handleForbidden(Exception ex,
                                                             HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error("FORBIDDEN", "Access denied: insufficient permissions or unauthorized object access", correlationId);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex,
                                                            HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error("NOT_FOUND", ex.getMessage(), correlationId);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<Void>> handleConflict(ConflictException ex,
                                                            HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error("CONFLICT", ex.getMessage(), correlationId);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRule(BusinessRuleException ex,
                                                                HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        ApiResponse<Void> body = ApiResponse.error(ex.getErrorCode(), ex.getMessage(), correlationId);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex,
                                                                    HttpServletRequest request) {
        String correlationId = getCorrelationId(request);
        log.error("Unhandled exception occurred [correlationId={}]", correlationId, ex);

        ApiResponse<Void> body = ApiResponse.error(
                "INTERNAL_SERVER_ERROR",
                "An unexpected internal error occurred. Please contact support with correlation ID: " + correlationId,
                correlationId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
