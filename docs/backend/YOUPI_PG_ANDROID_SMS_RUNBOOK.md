# BakeConnect: YouPI-PG & Android HDFC SMS Observer Runbook

## 1. Executive Summary & Operational Context
- **Bakery**: Perfect Bakery, Pune, Maharashtra, India.
- **Operating Currency**: INR (₹) exclusively.
- **Supported Customers**:
  - `DIRECT_CUSTOMER`: Retail retail consumer orders with instant UPI checkout or counter cash/pickup.
  - `RETAILER`: B2B wholesale orders with stock reservations, automatic invoice generation upon payment, and offline payment recording.
- **Checkout Payment Rules**:
  - UPI is initiated at checkout for both Direct Customers and Retailers. Wholesale credit is decoupled from online checkout.
  - Cash on Delivery (COD) remains unpaid until delivery/collection is recorded by staff.
- **Traffic Profile**:
  - Baseline: 10–20 completed payments daily.
  - Peak concurrency: Up to 10 simultaneous checkout attempts.
- **Receiving Account Topology**:
  - Single personal HDFC-linked receiving account, provided by a consenting friend.
  - Serial payment slot constraint: strictly **1 active UPI payment attempt** per receiving account window (900s timeout). Excess checkout attempts are placed into an ordered queue (`queuePosition >= 1`) by YouPI-PG and BakeConnect.

---

## 2. Regulatory & Banking Compliance Disclosure
> [!IMPORTANT]
> **Operational Compliance Statement**
> - **Account-Holder Consent**: Explicit consent and physical cooperation has been granted by the individual account holder to bind their Android device for SMS observation.
> - **Bank Commercial Approval**: Bank commercial approval from HDFC Bank for routing commercial bakery turnover through a personal savings account has **NOT** been established. The system is architected with strict financial audit trails (separate `OBSERVED_SUCCESS` from `RECONCILED`, duplicate UTR tracking, and immutable inbox logging) to facilitate subsequent migration to an authorized current account or payment aggregator without code rework.

---

## 3. YouPI-PG Architecture & Deployment
The self-hosted payment gateway is pinned to commit `532b8477b091682c703c4d43a91efb3e8ca28bd1` in `integrations/youpi-pg`.

### 3.1 Network Topology & Environment Variables
```
+--------------------+        HTTPS REST        +------------------+
| BakeConnect Backend| -----------------------> | YouPI-PG Gateway |
|   (Spring Boot)    | <----------------------- | (Node.js/Express)|
+--------------------+   Webhook HMAC-SHA256    +------------------+
                                                         ^
                                                         | HTTPS
                                                         | (Signed JSON)
                                                +------------------+
                                                |  Android Phone   |
                                                |  (HDFC Observer) |
                                                +------------------+
```

### 3.2 Gateway Environment Setup (`integrations/youpi-pg/.env`)
```bash
PORT=7000
NODE_ENV=production
DATABASE_URL=postgres://youpi_user:secure_pwd@localhost:5433/youpi_pg_db
MERCHANT_ID=00000000-0000-0000-0000-000000000001
MERCHANT_API_KEY=prod_youpi_api_key_secure_64_chars
WEBHOOK_SECRET=prod_webhook_secret_32_bytes_min_length!
ALLOWED_RECEIVING_ACCOUNTS=HDFC_XX1234
MAX_CONCURRENT_ACTIVE_SLOTS=1
SESSION_EXPIRY_SECONDS=900
```

### 3.3 BakeConnect Backend Configuration (`application.yml` / `.env`)
```yaml
bakeconnect:
  payment:
    mode: live  # 'live' enforces HTTPS, real keys, and forbids MockProvider
    provider: YOUPI_PG
    youpi-pg:
      base-url: https://pay.perfectbakerypune.com
      merchant-id: 00000000-0000-0000-0000-000000000001
      api-key: ${YOUPI_PG_API_KEY}
      webhook-secret: ${YOUPI_PG_WEBHOOK_SECRET}
      connect-timeout-ms: 5000
      read-timeout-ms: 5000
```

---

## 4. Android HDFC SMS Observer Setup & Pairing

### 4.1 Required Android Permissions
The observer runs on the account holder's Android phone (Android 10+):
- `android.permission.RECEIVE_SMS`: Native broadcast receiver for incoming institutional SMS.
- `android.permission.READ_SMS`: Fallback scanner.
- `android.permission.FOREGROUND_SERVICE`: Prevents process termination while backgrounded.
- `android.permission.FOREGROUND_SERVICE_DATA_SYNC`: Required on Android 14+ for background HTTP upload.
- `android.permission.POST_NOTIFICATIONS`: Foreground notification indicator.
- **Battery Optimization Exemption**: The app must be granted "Unrestricted" background battery usage in Android Settings (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).

### 4.2 Allowed Sender Header Pattern
HDFC alerts arrive via Indian institutional DLT headers. The on-device parser matches institutional sender masks:
```
^([A-Z]{2}-)?(HDFCBK|HDFCBN|HDFCAL|HDFCUP|HDFCSM)$
```
Examples: `VK-HDFCBK`, `AD-HDFCBK`, `VM-HDFCBK`, `BZ-HDFCBK`.
Personal 10-digit mobile phone senders are rejected on-device to prevent spoofing.

### 4.3 On-Device Debit Filter
To prevent fraudulent debit SMS from ever reaching the gateway pipeline:
```java
// apps/android-observer-app/app/src/main/java/com/youpi/observer/BankSmsFilter.java
private static final Pattern EXPLICIT_DEBIT_PATTERN = Pattern.compile(
    "(?:debited|spent|withdrawn|paid\\s+to|sent\\s+rs|sent\\b)",
    Pattern.CASE_INSENSITIVE
);
```

### 4.4 Supported Bank SMS Templates & Regex
The parser (`apps/sms-observer/src/sms-parser.js`) handles Pune HDFC UPI templates:
```
Template A:
"Rs 525.00 credited to a/c XX1234 on 28-10-26 by UPI: payer@okaxis (UPI 123456789012). Check balance:..."

Template B:
"Dear Customer, INR 525.00 is deposited in your A/c XX1234 on 28-OCT-26 via UPI Ref 123456789012."
```
Extracted entities:
- Amount: `525.00`
- Account mask: `XX1234`
- UTR: `123456789012`

---

## 5. Webhook Cryptography & Delivery Pipeline

### 5.1 Headers Emitted by YouPI-PG
- `X-Gateway-Event`: `OBSERVED_SUCCESS`, `RECONCILED`, `FAILED`, `EXPIRED`, `CANCELLED`
- `X-Gateway-Delivery-Id`: Unique per-delivery UUID
- `X-Gateway-Timestamp`: Unix epoch string (seconds)
- `X-Gateway-Signature`: Bare hex or `sha256=<hex>` over raw payload bytes
- `X-Gateway-Signature-V2`: HMAC-SHA256 over `<timestamp>.<rawPayloadBytes>`

### 5.2 Verification Guarantee in BakeConnect
1. **Raw-byte execution**: `PaymentController` receives `byte[] rawPayload` directly.
2. **Constant-time comparison**: `MessageDigest.isEqual` prevents timing leaks.
3. **Dual verification**: V2 timestamped verification is evaluated first; falls back to V1 if timestamp is absent.
4. **Payload Hash Deduplication**: The SHA-256 hash of `rawPayload` is recorded in `webhook_event_inbox`. If an existing delivery ID arrives with a differing payload hash, a `409 Conflict` fraud alert is recorded.

---

## 6. Two-Phase Financial Reconciliation Model

```
[ Customer Checkouts ]
          |
          v (Single active slot)
[ PaymentAttempt: INITIATED ]
          |
          v (SMS Observed by Android App)
[ Webhook: OBSERVED_SUCCESS ]
          |
          +---> Order PaymentStatus: AUTHORIZED
          +---> PaymentAttempt: OBSERVED_SUCCESS (settlementStatus = NOT_RECONCILED)
          +---> Wholesale B2B: Auto-creates wholesale Invoice
          |
          v (Manager confirms via HDFC Netbanking Statement)
[ Manager: POST /api/v1/manager/payments/reconcile ]
          |
          +---> Order PaymentStatus: PAID
          +---> Order Status: CONFIRMED
          +---> PaymentAttempt: RECONCILED (settlementStatus = RECONCILED)
          +---> Wholesale B2B: Settles Invoice in billing ledger
          +---> Outbox: Confirmatory customer notification
```

---

## 7. Operational Procedures for Bakery Staff & Managers

### 7.1 Checking Observer Daemon Health
- Endpoint: `GET /api/v1/manager/payments/observer/health`
- Requires role `BAKERY_ADMIN` or `BAKERY_MANAGER`.
- If health returns `false`:
  1. Verify the observer Android phone has active WiFi or 4G data.
  2. Verify the phone is plugged into power and the persistent foreground notification "YouPI Observer Active" is visible.
  3. Verify Google Messages or Samsung Messages is not blocked by Battery Optimization.

### 7.2 Viewing Financial Metrics
- Endpoint: `GET /api/v1/manager/payments/metrics`
- Returns:
  - `reconciledAmount`: ₹ total confirmed against bank statements.
  - `observedUnreconciledAmount`: ₹ total observed via SMS awaiting bank statement verification.
  - Status counts (`observedSuccessCount`, `reconciledCount`, `manualReviewCount`, `failedCount`).

### 7.3 Performing Bank Statement Reconciliation
- Endpoint: `POST /api/v1/manager/payments/reconcile`
- Payload:
```json
{
  "paymentAttemptId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "bankReferenceNumber": "HDFC001234567890",
  "receivingAccount": "HDFC_XX1234",
  "amount": 525.00,
  "statementDate": "2026-10-30",
  "notes": "Verified in HDFC Corporate Netbanking statement ending in 1234"
}
```

### 7.4 Handling Refunds
- Endpoint: `POST /api/v1/manager/payments/refund`
- Payload:
```json
{
  "paymentAttemptId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": 525.00,
  "reason": "Customer cancelled party order before baking cutoff",
  "referenceNumber": "HDFC-REV-987654"
}
```

### 7.5 Inspecting Webhook Ingestion Alerts
- Endpoint: `GET /api/v1/manager/payments/webhooks/inbox?status=CONFLICT` or `FAILED`
- Provides full audit trail of any rejected, tampered, or duplicate delivery attempts.
