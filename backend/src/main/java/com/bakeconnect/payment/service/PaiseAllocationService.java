package com.bakeconnect.payment.service;

import com.bakeconnect.common.exception.BusinessRuleException;
import com.bakeconnect.common.exception.ConflictException;
import com.bakeconnect.payment.entity.PaymentAttemptStatus;
import com.bakeconnect.payment.repository.PaymentAttemptRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

/**
 * Enterprise Hardened Dynamic Paise Allocation Engine.
 *
 * Provides cryptographic random fractional matching (paise offsets 0.01 - 0.99)
 * to distinguish concurrent checkouts for identical base amounts, eliminates 1-at-a-time queues,
 * separates personal bank transactions from bakery orders, enforces anti-DoS limits,
 * and automatically sweeps stale reservation slots.
 */
@Service
public class PaiseAllocationService {

    private static final Logger log = LoggerFactory.getLogger(PaiseAllocationService.class);

    private static final List<PaymentAttemptStatus> ACTIVE_STATUSES = List.of(
            PaymentAttemptStatus.INITIATED,
            PaymentAttemptStatus.AWAITING_PAYMENT,
            PaymentAttemptStatus.PROCESSING
    );

    private static final int MAX_ACTIVE_ATTEMPTS_PER_USER = 2;

    private final PaymentAttemptRepository paymentAttemptRepository;
    private final String defaultReceivingAccount;
    private final SecureRandom secureRandom = new SecureRandom();

    public PaiseAllocationService(
            PaymentAttemptRepository paymentAttemptRepository,
            @Value("${bakeconnect.payment.default-receiving-account:HDFC_XX1234}") String defaultReceivingAccount) {
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.defaultReceivingAccount = defaultReceivingAccount;
    }

    public record AllocatedPaise(
            BigDecimal baseAmount,
            BigDecimal platformFee,
            BigDecimal totalAmount,
            String receivingAccount
    ) {}

    /**
     * Allocates a cryptographically random, collision-free paise offset for the given base amount.
     * Enforces per-user concurrency throttle and Tier-2 overflow expansion.
     */
    @Transactional
    public AllocatedPaise allocatePaise(UUID userId, String receivingAccount, BigDecimal baseAmount) {
        if (baseAmount == null || baseAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Invalid base amount for payment initiation");
        }

        String targetAccount = (receivingAccount != null && !receivingAccount.isBlank())
                ? receivingAccount
                : defaultReceivingAccount;

        // 1. Anti-DoS / User rate limit: Max active initiated attempts per user
        if (userId != null) {
            long activeCount = paymentAttemptRepository.countActiveAttemptsByUser(userId, ACTIVE_STATUSES);
            if (activeCount >= MAX_ACTIVE_ATTEMPTS_PER_USER) {
                log.warn("Anti-DoS throttle: User {} exceeded active payment attempts limit ({})", userId, activeCount);
                throw new BusinessRuleException("You already have an active checkout payment in progress. Please complete or cancel your pending payment first.");
            }
        }

        // 2. Active sweeper: clean expired slots prior to allocation
        paymentAttemptRepository.sweepExpiredAttempts(ACTIVE_STATUSES, Instant.now());

        BigDecimal cleanBase = baseAmount.setScale(2, RoundingMode.HALF_UP);

        // 3. Query existing active amounts in Tier 1 range [base + 0.01, base + 0.99]
        BigDecimal minTier1 = cleanBase.add(BigDecimal.valueOf(0.01));
        BigDecimal maxTier1 = cleanBase.add(BigDecimal.valueOf(0.99));
        List<BigDecimal> activeAmountsTier1 = paymentAttemptRepository.findActiveAmounts(
                targetAccount, ACTIVE_STATUSES, minTier1, maxTier1);

        Set<Integer> occupiedTier1 = new HashSet<>();
        for (BigDecimal act : activeAmountsTier1) {
            int offset = act.subtract(cleanBase).multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValue();
            occupiedTier1.add(offset);
        }

        List<Integer> availableTier1 = new ArrayList<>(99);
        for (int i = 1; i <= 99; i++) {
            if (!occupiedTier1.contains(i)) {
                availableTier1.add(i);
            }
        }

        // 4. Cryptographic random selection from available Tier 1 pool
        if (!availableTier1.isEmpty()) {
            int chosenPaise = availableTier1.get(secureRandom.nextInt(availableTier1.size()));
            BigDecimal fee = BigDecimal.valueOf(chosenPaise).divide(BigDecimal.valueOf(100), 2, RoundingMode.UNNECESSARY);
            BigDecimal total = cleanBase.add(fee);
            log.info("PaiseAllocation: Assigned Tier-1 offset +₹{} to base ₹{} -> Total: ₹{} (Account: {})",
                    fee, cleanBase, total, targetAccount);
            return new AllocatedPaise(cleanBase, fee, total, targetAccount);
        }

        // 5. Tier-2 Overflow Expansion [base + 1.01, base + 1.99] if all 99 paise slots are active
        log.warn("Tier-1 paise slots exhausted for base ₹{} on account {}. Attempting Tier-2 expansion.",
                cleanBase, targetAccount);

        BigDecimal minTier2 = cleanBase.add(BigDecimal.valueOf(1.01));
        BigDecimal maxTier2 = cleanBase.add(BigDecimal.valueOf(1.99));
        List<BigDecimal> activeAmountsTier2 = paymentAttemptRepository.findActiveAmounts(
                targetAccount, ACTIVE_STATUSES, minTier2, maxTier2);

        Set<Integer> occupiedTier2 = new HashSet<>();
        for (BigDecimal act : activeAmountsTier2) {
            int offset = act.subtract(cleanBase).multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValue();
            occupiedTier2.add(offset);
        }

        List<Integer> availableTier2 = new ArrayList<>(99);
        for (int i = 101; i <= 199; i++) {
            if (!occupiedTier2.contains(i)) {
                availableTier2.add(i);
            }
        }

        if (!availableTier2.isEmpty()) {
            int chosenPaise = availableTier2.get(secureRandom.nextInt(availableTier2.size()));
            BigDecimal fee = BigDecimal.valueOf(chosenPaise).divide(BigDecimal.valueOf(100), 2, RoundingMode.UNNECESSARY);
            BigDecimal total = cleanBase.add(fee);
            log.info("PaiseAllocation: Assigned Tier-2 offset +₹{} to base ₹{} -> Total: ₹{} (Account: {})",
                    fee, cleanBase, total, targetAccount);
            return new AllocatedPaise(cleanBase, fee, total, targetAccount);
        }

        // If both Tier 1 and Tier 2 (198 simultaneous checkouts for the exact same base amount) are exhausted
        log.error("Exhausted all 198 allocation slots for base amount ₹{} on account {}", cleanBase, targetAccount);
        throw new ConflictException("Payment checkout queue is temporarily saturated for this exact amount. Please retry in 1 minute.");
    }

    /**
     * Periodic background sweeper running every 30 seconds to reclaim expired reservation slots.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void sweepExpiredSlotsPeriodically() {
        int swept = paymentAttemptRepository.sweepExpiredAttempts(ACTIVE_STATUSES, Instant.now());
        if (swept > 0) {
            log.info("Background slot sweeper: Reclaimed {} expired payment slots", swept);
        }
    }
}
