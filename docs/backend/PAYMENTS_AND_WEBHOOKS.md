# Payments, Webhooks, and Provider SPI Architecture

## 1. Architectural Philosophy

BakeConnect implements an authoritative payment subsystem with a pluggable Service Provider Interface (SPI). The payment architecture is designed around four non-negotiable security and reliability tenets:

1. **Client Isolation**: Client frontends never dictate pricing, currency, or completion status.
2. **Raw-Byte Cryptographic Verification**: Webhook signatures are verified directly against raw HTTP body bytes *before* JSON parsing to defend against parser manipulation and deserialization vulnerabilities.
3. **Delivery Deduplication**: The webhook inbox guarantees that duplicate delivery IDs from webhook retry storms are acknowledged idempotently without double-settling orders or ledgers.
4. **Predictable Load Testing**: A zero-overhead `MockPaymentProvider` allows k6 suites to validate high concurrency without dependency on external third-party sandbox latencies or rate limits.

---

## 2. Pluggable Payment Provider SPI

### 2.1 Interface Definition (`PaymentProvider`)
```java
public interface PaymentProvider {
    String getProviderName();
    PaymentSessionResult initiatePaymentSession(PaymentSessionRequest request);
    PaymentVerificationResult verifyPayment(String providerReference);
    boolean verifyWebhookSignature(byte[] rawPayload, String signatureHeader);
}
```

### 2.2 Implemented Providers
- **`MockPaymentProvider`**: Generates deterministic transaction identifiers and simulates instant or scheduled callbacks. Essential for predictable k6 tests up to 1,000 VUs.
- **`YouPiPgPaymentProvider`**: Full production adapter for YouPI-PG gateway with configured timeouts, API key authentication, and HMAC verification.

---

## 3. Webhook Security & Tamper Defenses

### 3.1 Raw-Byte HMAC-SHA256 Verification
The raw HTTP request body bytes `byte[]` are intercepted before Spring MVC or Jackson constructs Java objects.

```java
public boolean verifySignature(byte[] payload, String signatureHeader, String secret) {
    String calculated = calculateSignature(payload, secret);
    return MessageDigest.isEqual(
        calculated.getBytes(StandardCharsets.UTF_8),
        signatureHeader.trim().getBytes(StandardCharsets.UTF_8)
    );
}
```

- **Constant-Time Comparison**: `MessageDigest.isEqual(...)` eliminates side-channel timing attacks.
- **Byte Integrity**: If an attacker or proxy modifies formatting, whitespace, or floating point formatting in the payload, signature verification fails instantly.
- **Audit Logging**: Any failed signature attempt is persisted to `webhook_event_inbox` with status `FAILED` and raises an `UnauthorizedException`.

### 3.2 Tolerant Webhook Inbox Pattern
Every webhook callback is logged to the `webhook_event_inbox` table:
```sql
CREATE TABLE webhook_event_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    delivery_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    raw_payload TEXT NOT NULL,
    signature_header TEXT,
    verification_status VARCHAR(50) NOT NULL,
    processing_status VARCHAR(50) NOT NULL,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Lifecycle State Transitions:
1. `RECEIVED`: Recorded and verified.
2. `PROCESSED`: Successfully matched, verified, and settled.
3. `IGNORED`: Duplicate delivery ID or unmatched non-critical event.
4. `FAILED`: Amount mismatch, currency mismatch, or malformed JSON.
5. `DEAD_LETTER`: Exhausted replay limits.

---

## 4. Strict Financial Matching

When a webhook arrives with status `SUCCESS` or `RECONCILED`:
1. **Amount Match**: The incoming webhook `amount` must match `payment_attempts.amount` down to the exact decimal cent/paisa (`BigDecimal.compareTo == 0`). A mismatch triggers an immediate fraud alert.
2. **Currency Match**: Must match `INR`.
3. **Idempotency Guarantee**: If the linked order is already `PAID`, the event is logged as redundant and acknowledged with `200 OK`.

---

## 5. Two-Phase Financial Settlement Model

BakeConnect differentiates between SMS observation and official bank statement reconciliation:
1. **`OBSERVED_SUCCESS`**: Triggered when the Android observer ingests an authentic HDFC credit SMS.
   - `payment_attempts.status` -> `OBSERVED_SUCCESS`
   - `payment_attempts.settlement_status` -> `NOT_RECONCILED`
   - `orders.payment_status` -> `AUTHORIZED` (funds seen, but not yet settled in bank statement)
   - B2B Wholesale: Automatically creates wholesale invoice if missing.
2. **`RECONCILED`**: Triggered when a bakery manager manually reconciles against bank statements (`POST /api/v1/manager/payments/reconcile`) or when statement import confirms the credit.
   - `payment_attempts.status` -> `RECONCILED`
   - `payment_attempts.settlement_status` -> `RECONCILED`
   - `orders.payment_status` -> `PAID`
   - `orders.status` -> `CONFIRMED`
   - B2B Wholesale: Settles wholesale invoice and records ledger credit.

---

## 6. Single Receiving Account Concurrency & Queueing

To operate on a single personal HDFC receiving account:
- Strictly **1 active UPI payment attempt** per receiving account slot.
- Peak concurrent checkouts (up to 10) are handled by:
  - JVM-level synchronized slot reservation (`order-payment-slot:<orderId>`).
  - Database-level partial unique index `idx_payment_attempts_active_order` on `order_id` where status is active (`INITIATED`, `QUEUED`, `AWAITING_PAYMENT`, `PROCESSING`).
  - YouPI-PG FIFO checkout queueing returning `queuePosition >= 1` so customers can wait in line without overwhelming the bank SMS correlation window.

For comprehensive operational runbooks and Android pairing instructions, consult [YOUPI_PG_ANDROID_SMS_RUNBOOK.md](file:///mnt/Jayant/Code/Work%20Station/Capstone%20Project/BakeConnect/docs/backend/YOUPI_PG_ANDROID_SMS_RUNBOOK.md).
