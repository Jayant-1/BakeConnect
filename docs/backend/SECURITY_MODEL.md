# BakeConnect Security Architecture & Threat Model

## 1. Authentication & Session Management

- **Stateless JWT**: BakeConnect issues HMAC-SHA256 signed JSON Web Tokens (`Bearer <token>`). Tokens contain user UUID and granted `role`.
- **Stateless Validation**: Each request is authenticated via `JwtAuthenticationFilter` before reaching controllers.
- **Password Hashing**: Strong BCrypt algorithm with configurable salt rounds (default 12 rounds in production, 10 in dev).

---

## 2. Role-Based Access Control (RBAC)

Four strictly segregated roles are enforced via Spring Security `@PreAuthorize` and route matchers:

1. **`BAKERY_ADMIN`**: Full administrative access to inventory, pricing, order accept/delay/decline, billing reconciliation, and financial reports.
2. **`RETAILER`**: B2B commercial access. View wholesale pricing, submit business profile & GSTIN, access credit terms, invoices, and receivables ledger.
3. **`DIRECT_CUSTOMER`**: B2C retail consumer access. Retail catalogue prices, personal address book, and verified purchase reviews.
4. **`DELIVERY_PERSON`**: Operational role for dispatch updates.

---

## 3. Insecure Direct Object Reference (IDOR) Protections

IDOR vulnerabilities are strictly mitigated across all entity boundaries:
- **Addresses**: Address ownership is verified (`address.getUser().getId().equals(currentUserId)`). Non-admin users cannot read or mutate other users' addresses.
- **Orders**: A user can only inspect their own orders. Admin users can access all orders.
- **Invoices & Ledger**: Retailers can only view invoices and ledger lines tied to their own `retailer_id`.
- **Profiles**: Retailer profile reads and updates are restricted to the owning account or `BAKERY_ADMIN`.
- **Payment Attempts**: Payment initiation and status checks verify ownership of the linked order.

---

## 4. Webhook Integrity & Replay Protections

- **Constant-Time Verification**: Uses `MessageDigest.isEqual(...)` directly on raw bytes to defend against timing attacks.
- **Deduplication**: `delivery_id` is unique in `webhook_event_inbox`. Duplicate delivery IDs are dropped gracefully.
- **Financial Validation**: Amount and currency are checked against database records before any order state is updated.

---

## 5. Input Validation & Data Hygiene

- **GSTIN Validation**: 15-character Indian Goods and Services Tax Identification Number validated via RFC-compliant regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`.
- **Price Precision**: All monetary values use `BigDecimal` with scale 2 and `RoundingMode.HALF_UP`.
- **SQL Injection Prevention**: Spring Data JPA parameterized queries and Criteria API.
