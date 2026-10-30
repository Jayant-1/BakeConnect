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

---

## 7. Public API Contracts & Frontend Integration Specifications

### 7.1 Initiate Payment Session
* **Endpoint**: `POST /api/v1/payments/initiate`
* **Security**: Bearer JWT (`DIRECT_CUSTOMER` or `RETAILER`)
* **Request Body**:
```json
{
  "orderId": "d9111111-dddd-dddd-dddd-dddddddddddd",
  "invoiceId": null,
  "provider": "YOUPI_PG",
  "idempotencyKey": "idem_7f82b71e901a"
}
```
* **Success Response (`201 Created` / `200 OK`)**:
```json
{
  "success": true,
  "data": {
    "paymentAttemptId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "idempotencyKey": "idem_7f82b71e901a",
    "provider": "YOUPI_PG",
    "providerReference": "YOUPI-TXN-889900",
    "checkoutUrl": "https://pay.perfectbakerypune.com/checkout/3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "amount": 525.00,
    "currency": "INR",
    "queuePosition": 0,
    "status": "AWAITING_PAYMENT",
    "expiresAt": "2026-10-30T16:30:00Z",
    "receivingAccount": "HDFC_XX1234",
    "metadata": {
      "orderNumber": "BC-20261030-9988",
      "amountPaise": "52500"
    }
  },
  "message": "Payment session initiated successfully"
}
```

### 7.2 Poll Payment Status (Frontend Checkout Modal)
* **Endpoint**: `GET /api/v1/payments/{paymentAttemptId}`
* **Security**: Bearer JWT (Ownership verified)
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "orderId": "d9111111-dddd-dddd-dddd-dddddddddddd",
    "orderNumber": "BC-20261030-9988",
    "provider": "YOUPI_PG",
    "providerReference": "YOUPI-TXN-889900",
    "idempotencyKey": "idem_7f82b71e901a",
    "amount": 525.00,
    "currency": "INR",
    "status": "OBSERVED_SUCCESS",
    "settlementStatus": "NOT_RECONCILED",
    "queuePosition": 0,
    "checkoutUrl": "https://pay.perfectbakerypune.com/checkout/3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "receivingAccount": "HDFC_XX1234",
    "utr": "123456789012",
    "verificationLevel": 1,
    "createdAt": "2026-10-30T16:15:00Z"
  }
}
```

### 7.3 Gateway Webhook Ingestion
* **Endpoint**: `POST /api/v1/payments/webhook/YOUPI_PG`
* **Security**: Header `X-Gateway-Signature-V2` (`HMAC-SHA256(secret, "<timestamp>.<rawBodyBytes>")`)
* **Headers**:
  - `X-Gateway-Delivery-Id`: `DEL-554433`
  - `X-Gateway-Timestamp`: `1793358000000`
  - `X-Gateway-Signature-V2`: `sha256=abcdef123456...`
* **Request Payload**:
```json
{
  "event": "OBSERVED_SUCCESS",
  "deliveryId": "DEL-554433",
  "timestamp": 1793358000000,
  "paymentId": "YOUPI-TXN-889900",
  "orderId": "BC-20261030-9988",
  "attemptId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": "525.00",
  "amountPaise": 52500,
  "currency": "INR",
  "method": "UPI",
  "utr": "123456789012",
  "verificationTag": "SMS_OBSERVED_HDFC",
  "verificationLevel": 1,
  "completedAt": "2026-10-30T16:16:12Z",
  "settlementState": "NOT_RECONCILED"
}
```
* **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

For operational procedures, Android APK pairing, and bank reconciliation guidelines, consult [YOUPI_PG_ANDROID_SMS_RUNBOOK.md](file:///mnt/Jayant/Code/Work%20Station/Capstone%20Project/BakeConnect/docs/backend/YOUPI_PG_ANDROID_SMS_RUNBOOK.md).

