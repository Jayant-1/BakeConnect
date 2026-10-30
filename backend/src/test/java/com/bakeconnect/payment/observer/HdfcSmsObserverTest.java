package com.bakeconnect.payment.observer;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class HdfcSmsObserverTest {

    // Mirroring Android on-device regex filter specifications:
    private static final Pattern INSTITUTIONAL_SENDER_PATTERN = Pattern.compile(
            "^(?:[A-Za-z]{2}-)?([A-Za-z0-9]{3,9})$"
    );

    private static final Pattern NUMERIC_PHONE_PATTERN = Pattern.compile(
            "^\\+?[0-9]{7,15}$"
    );

    private static final Pattern CREDIT_KEYWORD_PATTERN = Pattern.compile(
            "(?:credited|received|deposit(?:ed)?|payment\\s+received|transferred\\s+to\\s+your|has\\s+transferred|deposited\\s+in|cr\\b|upi\\s+credit)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EXPLICIT_DEBIT_PATTERN = Pattern.compile(
            "(?:debited\\b|spent\\s+on|paid\\s+to|withdrawn\\s+from|dr\\b|payment\\s+sent|sent\\s+rs|sent\\b)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?:Rs\\.?|INR|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern UTR_PATTERN = Pattern.compile(
            "(?:UPI\\s*(?:ref|reference|txn|id)?|Ref(?:erence)?\\s*(?:no|number)?|UTR|IMPS\\s*Ref)\\s*[:#-]?\\s*([0-9]{12})",
            Pattern.CASE_INSENSITIVE
    );

    record FilterResult(boolean isAllowed, String reason, Double amount, Long amountPaise, String utr) {}

    FilterResult evaluateSms(String sender, String body) {
        if (sender == null || sender.trim().isEmpty()) {
            return new FilterResult(false, "EMPTY_SENDER", null, null, null);
        }
        if (body == null || body.trim().isEmpty()) {
            return new FilterResult(false, "EMPTY_BODY", null, null, null);
        }

        String cleanSender = sender.trim().replaceAll("\\s+", "");

        // 1. Drop personal numeric mobile phone senders
        if (NUMERIC_PHONE_PATTERN.matcher(cleanSender).matches()) {
            return new FilterResult(false, "PERSONAL_PHONE_NUMBER_REJECTED", null, null, null);
        }

        // 2. Validate institutional sender format (TRAI standard)
        if (!INSTITUTIONAL_SENDER_PATTERN.matcher(cleanSender).matches()) {
            return new FilterResult(false, "NON_INSTITUTIONAL_SENDER", null, null, null);
        }

        // 3. Drop explicit debit alerts immediately
        if (EXPLICIT_DEBIT_PATTERN.matcher(body).find() && !body.toLowerCase().contains("reversed")) {
            return new FilterResult(false, "DEBIT_ALERT_REJECTED", null, null, null);
        }

        // 4. Must contain inbound credit intent
        if (!CREDIT_KEYWORD_PATTERN.matcher(body).find()) {
            return new FilterResult(false, "NO_CREDIT_KEYWORD", null, null, null);
        }

        // 5. Extract amount
        Matcher amountMatcher = AMOUNT_PATTERN.matcher(body);
        if (!amountMatcher.find()) {
            return new FilterResult(false, "NO_AMOUNT_FOUND", null, null, null);
        }

        double amount = Double.parseDouble(amountMatcher.group(1).replace(",", ""));
        if (amount <= 0.0) {
            return new FilterResult(false, "ZERO_AMOUNT", null, null, null);
        }

        long amountPaise = Math.round(amount * 100);

        // 6. Extract 12-digit UTR
        String utr = null;
        Matcher utrMatcher = UTR_PATTERN.matcher(body);
        if (utrMatcher.find()) {
            utr = utrMatcher.group(1);
        }

        return new FilterResult(true, "ACCEPTED_BANK_CREDIT_ALERT", amount, amountPaise, utr);
    }

    @Test
    @DisplayName("Synthetic HDFC Credit Alert matches format, parses Rs 100.00 and UTR 123456789012")
    void syntheticHdfcCreditAlert_IsAcceptedWithExactAmountAndUtr() {
        String sender = "VK-HDFCBK";
        String body = """
                Credit Alert!
                Rs.100.00 credited to HDFC Bank A/c XX1234 on 30-10-26 from VPA *sample@axl (UPI 123456789012)
                """;

        FilterResult result = evaluateSms(sender, body);

        assertThat(result.isAllowed()).isTrue();
        assertThat(result.reason()).isEqualTo("ACCEPTED_BANK_CREDIT_ALERT");
        assertThat(result.amount()).isEqualTo(100.00);
        assertThat(result.amountPaise()).isEqualTo(10000L);
        assertThat(result.utr()).isEqualTo("123456789012");
    }

    @Test
    @DisplayName("Synthetic HDFC Debit Alert beginning with 'Sent Rs.100.00' is dropped and never confirms payment")
    void syntheticHdfcDebitAlert_BeginningWithSentRs_IsRejected() {
        String sender = "VK-HDFCBK";
        String body = "Sent Rs.100.00 from HDFC Bank A/c XX1234 on 30-10-26 to sample@axl (UPI 123456789012)";

        FilterResult result = evaluateSms(sender, body);

        assertThat(result.isAllowed()).isFalse();
        assertThat(result.reason()).isEqualTo("DEBIT_ALERT_REJECTED");
        assertThat(result.amount()).isNull();
        assertThat(result.utr()).isNull();
    }

    @Test
    @DisplayName("Rejects personal phone number senders to prevent SMS spoofing attacks")
    void personalMobileSender_IsRejected() {
        String body = "Credit Alert! Rs.100.00 credited to HDFC Bank A/c XX1234 on 30-10-26 (UPI 123456789012)";

        assertThat(evaluateSms("+919876543210", body).reason()).isEqualTo("PERSONAL_PHONE_NUMBER_REJECTED");
        assertThat(evaluateSms("9876543210", body).reason()).isEqualTo("PERSONAL_PHONE_NUMBER_REJECTED");
    }

    @Test
    @DisplayName("Rejects non-institutional shortcodes not matching TRAI pattern")
    void nonInstitutionalSender_IsRejected() {
        String body = "Credit Alert! Rs.100.00 credited to HDFC Bank A/c XX1234 on 30-10-26 (UPI 123456789012)";

        assertThat(evaluateSms("FRIEND_SMS", body).reason()).isEqualTo("NON_INSTITUTIONAL_SENDER");
    }

    @Test
    @DisplayName("Accepts various Indian banking institutional DLT header prefixes")
    void validInstitutionalHeaders_AreAccepted() {
        String body = "INR 100.00 credited to A/c XX1234 on 30-10-26 via UPI 123456789012";

        assertThat(evaluateSms("VK-HDFCBK", body).isAllowed()).isTrue();
        assertThat(evaluateSms("AD-HDFCBK", body).isAllowed()).isTrue();
        assertThat(evaluateSms("VM-HDFCBK", body).isAllowed()).isTrue();
        assertThat(evaluateSms("BZ-HDFCBK", body).isAllowed()).isTrue();
        assertThat(evaluateSms("HDFCBK", body).isAllowed()).isTrue();
    }

    @Test
    @DisplayName("Rejects promotional or OTP messages lacking credit intent")
    void otpOrPromotionalSms_IsRejected() {
        String sender = "VK-HDFCBK";
        String otpBody = "Your OTP for HDFC Bank NetBanking transaction is 482910. Do not share with anyone.";

        FilterResult result = evaluateSms(sender, otpBody);

        assertThat(result.isAllowed()).isFalse();
        assertThat(result.reason()).isEqualTo("NO_CREDIT_KEYWORD");
    }
}
