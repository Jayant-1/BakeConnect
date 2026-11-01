package com.bakeconnect.payment.service;

import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.repository.PaymentAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaiseAllocationServiceTest {

    @Mock
    private PaymentAttemptRepository paymentAttemptRepository;

    private PaiseAllocationService paiseAllocationService;

    @BeforeEach
    void setUp() {
        paiseAllocationService = new PaiseAllocationService(paymentAttemptRepository, "HDFC_XX1234");
    }

    @Test
    @DisplayName("Allocates valid Tier-1 paise offset [0.01 - 0.99] and computes exact total")
    void allocatePaise_tier1_assignsValidOffset() {
        UUID userId = UUID.randomUUID();
        BigDecimal base = new BigDecimal("525.00");

        when(paymentAttemptRepository.countActiveAttemptsByUser(eq(userId), anyCollection())).thenReturn(0L);
        when(paymentAttemptRepository.findActiveAmounts(eq("HDFC_XX1234"), anyCollection(), any(), any()))
                .thenReturn(Collections.emptyList());

        PaiseAllocationService.AllocatedPaise result = paiseAllocationService.allocatePaise(userId, null, base);

        assertThat(result).isNotNull();
        assertThat(result.baseAmount()).isEqualByComparingTo("525.00");
        assertThat(result.platformFee()).isGreaterThanOrEqualTo(new BigDecimal("0.01"));
        assertThat(result.platformFee()).isLessThanOrEqualTo(new BigDecimal("0.99"));
        assertThat(result.totalAmount()).isEqualTo(result.baseAmount().add(result.platformFee()));
        assertThat(result.receivingAccount()).isEqualTo("HDFC_XX1234");

        verify(paymentAttemptRepository).sweepExpiredAttempts(anyCollection(), any(Instant.class));
    }

    @Test
    @DisplayName("Anti-DoS throttle: Blocks user with >= 2 active payment checkouts")
    void allocatePaise_antiDos_blocksExcessiveActiveAttempts() {
        UUID userId = UUID.randomUUID();
        BigDecimal base = new BigDecimal("525.00");

        when(paymentAttemptRepository.countActiveAttemptsByUser(eq(userId), anyCollection())).thenReturn(2L);

        assertThatThrownBy(() -> paiseAllocationService.allocatePaise(userId, null, base))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("active checkout payment in progress");

        verify(paymentAttemptRepository, never()).findActiveAmounts(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Tier-2 Expansion: Automatically rolls over to [1.01 - 1.99] when Tier-1 (99 slots) is fully occupied")
    void allocatePaise_tier1Full_rollsOverToTier2() {
        UUID userId = UUID.randomUUID();
        BigDecimal base = new BigDecimal("525.00");

        when(paymentAttemptRepository.countActiveAttemptsByUser(eq(userId), anyCollection())).thenReturn(0L);

        // Occupy all 99 slots in Tier 1: 525.01 to 525.99
        List<BigDecimal> allTier1Occupied = new ArrayList<>();
        for (int i = 1; i <= 99; i++) {
            allTier1Occupied.add(base.add(BigDecimal.valueOf(i).divide(BigDecimal.valueOf(100))));
        }

        when(paymentAttemptRepository.findActiveAmounts(eq("HDFC_XX1234"), anyCollection(), eq(new BigDecimal("525.01")), eq(new BigDecimal("525.99"))))
                .thenReturn(allTier1Occupied);
        when(paymentAttemptRepository.findActiveAmounts(eq("HDFC_XX1234"), anyCollection(), eq(new BigDecimal("526.01")), eq(new BigDecimal("526.99"))))
                .thenReturn(Collections.emptyList()); // Tier 2 is free

        PaiseAllocationService.AllocatedPaise result = paiseAllocationService.allocatePaise(userId, null, base);

        assertThat(result).isNotNull();
        assertThat(result.baseAmount()).isEqualByComparingTo("525.00");
        assertThat(result.platformFee()).isGreaterThanOrEqualTo(new BigDecimal("1.01"));
        assertThat(result.platformFee()).isLessThanOrEqualTo(new BigDecimal("1.99"));
        assertThat(result.totalAmount()).isEqualTo(result.baseAmount().add(result.platformFee()));
    }

    @Test
    @DisplayName("Periodic sweeper sweeps expired active slots")
    void sweepExpiredSlotsPeriodically_sweeps() {
        when(paymentAttemptRepository.sweepExpiredAttempts(anyCollection(), any(Instant.class))).thenReturn(3);

        paiseAllocationService.sweepExpiredSlotsPeriodically();

        verify(paymentAttemptRepository).sweepExpiredAttempts(anyCollection(), any(Instant.class));
    }
}
