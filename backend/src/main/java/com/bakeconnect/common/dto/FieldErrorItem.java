package com.bakeconnect.common.dto;

public record FieldErrorItem(
        String field,
        String message,
        Object rejectedValue
) {}
