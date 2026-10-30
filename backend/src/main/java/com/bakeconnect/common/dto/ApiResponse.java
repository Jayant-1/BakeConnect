package com.bakeconnect.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String code,
        String message,
        T data,
        List<FieldErrorItem> fieldErrors,
        Instant timestamp,
        String correlationId
) {
    public static <T> ApiResponse<T> success(T data, String message, String correlationId) {
        return new ApiResponse<>(true, "SUCCESS", message, data, null, Instant.now(), correlationId);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return success(data, message, null);
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Operation completed successfully", null);
    }

    public static <T> ApiResponse<T> error(String code, String message, List<FieldErrorItem> fieldErrors, String correlationId) {
        return new ApiResponse<>(false, code, message, null, fieldErrors, Instant.now(), correlationId);
    }

    public static <T> ApiResponse<T> error(String code, String message, String correlationId) {
        return error(code, message, null, correlationId);
    }
}
