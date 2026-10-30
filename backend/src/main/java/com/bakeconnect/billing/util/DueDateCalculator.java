package com.bakeconnect.billing.util;

import com.bakeconnect.retailer.entity.PaymentTerms;
import java.time.LocalDate;

public final class DueDateCalculator {

    private DueDateCalculator() {}

    public static LocalDate calculateDueDate(LocalDate issueDate, PaymentTerms paymentTerms, Integer customTermDays) {
        if (issueDate == null) {
            issueDate = LocalDate.now();
        }
        if (paymentTerms == null) {
            return issueDate;
        }

        return switch (paymentTerms) {
            case IMMEDIATE -> issueDate;
            case NET_3_DAYS -> issueDate.plusDays(3);
            case NET_15_DAYS -> issueDate.plusDays(15);
            case CUSTOM -> {
                int days = (customTermDays != null && customTermDays > 0) ? customTermDays : 30;
                yield issueDate.plusDays(days);
            }
        };
    }
}
