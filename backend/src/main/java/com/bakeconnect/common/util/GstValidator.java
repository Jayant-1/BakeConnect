package com.bakeconnect.common.util;

import java.util.regex.Pattern;

public final class GstValidator {

    private static final Pattern GST_PATTERN =
            Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");

    private GstValidator() {}

    public static boolean isValid(String gstNumber) {
        if (gstNumber == null || gstNumber.isBlank()) {
            return false;
        }
        return GST_PATTERN.matcher(gstNumber.trim().toUpperCase()).matches();
    }
}
