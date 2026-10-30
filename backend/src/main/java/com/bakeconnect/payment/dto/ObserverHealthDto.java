package com.bakeconnect.payment.dto;

public record ObserverHealthDto(
        String provider,
        boolean isHealthy,
        String statusMessage
) {}
