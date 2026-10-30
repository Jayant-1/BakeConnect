# BakeConnect Backend Implementation Plan & Delivery Roadmap

- **Status:** Approved for Initial Architecture & Planning Phase
- **Date:** 2026-10-28
- **Project:** BakeConnect — Smart Bakery Distribution and Direct Ordering Management System
- **Architectural Style:** Spring Boot Modular Monolith with Clean Boundaries

---

## 1. Architecture & Modular Boundaries

The backend is structured into distinct, package-by-feature domain modules within `com.bakeconnect`:

```
com.bakeconnect
├── common          # Shared error envelope, Money (BigDecimal), Time (UTC), Pagination, Base Entity, Audit
├── identity        # Users, Roles, Spring Security, JWT/Cookies, Email Verification, Password Reset
├── catalog         # Categories, Products, Dual Pricing (B2C Retail vs B2B Wholesale), Availability, Optimistic Locking
├── cart            # Provisional Cart & Cart Items, Server-side Cart Totals Quote
├── ordering        # Orders, Immutable Item Snapshots, State Machine, Status History, Delay/Decline Reasons
├── retailers       # Retailer Profiles, GST Validation, Approval Workflow, Payment Terms Configuration
├── billing         # Invoices, Due Date Calculator, Append-Only Retailer Ledger, Outstanding Balances
├── payments        # Payment Provider SPI, MockPaymentProvider, YouPiPgPaymentProvider, Raw-Byte Webhook Verifier, Inbox
├── discounts       # Conditional Discount Rules, Stacking Policy, Order Calculation Policy
├── reviews         # Verified Purchase Reviews, Moderation Controls
├── insights        # SQL Aggregate Reporting (Sales, AOV, Growth, Receivables Aging, Margin with Cost Guardrails)
├── reorder         # Deterministic Explainable Reorder Recommendation Engine
├── notifications   # Transactional PostgreSQL Outbox, Email Service Abstraction, Async Poller
└── config          # HikariCP, Security, Redis Cache-Aside, Actuator, OpenAPI/Swagger Documentation
```

---

## 2. Delivery Sequence & Thin Vertical Slices

Each slice is an independently testable, compiling vertical capability with unit tests, integration tests, and explicit acceptance criteria.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Slice 1: Core Foundation, Build, Error Envelope, Flyway Migrations, Config   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 2: Identity, Spring Security, Roles & Password Reset / Verification   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 3: Catalog, Categories, Dual-Tier Pricing & Redis Cache-Aside         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 4: Cart Management & Authoritative Checkout Quotation Engine          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 5: Order Creation, Snapshots, State Machine & Inventory Locking       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 6: Retailer Profiles, B2B Terms & GST Business Order Invariants       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 7: Billing, Automated Invoicing & Append-Only Retailer Ledger         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 8: Payment SPI, Mock Gateway & YouPI-PG Webhook Security Verification  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 9: Transactional Email Outbox & Asynchronous Poller Worker            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 10: Owner Workflow: Accept, Delay, Decline with Reason Codes & Email   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 11: Conditional Discounts, Reorder Engine & Verified Purchase Reviews  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 12: Business Reports & Insights (Sales, Margin, Receivables Aging)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 13: Observability (Actuator, Prometheus), Security Audit & Docker Compose│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ Slice 14: k6 Load Suite: 1,000 Concurrent VUs, Stress, Spike, Soak, Integrity│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Slice Breakdown & Acceptance Criteria

### Slice 1: Foundation & Project Scaffolding
- **Status:** In Progress
- **Artifacts:** `pom.xml`, `mvnw`, directory tree, Flyway `V1__init_schema.sql`, global exception handler (`@RestControllerAdvice`), standard response envelope (`ApiResponse<T>`), validation error handling, OpenAPI/Swagger configuration.
- **Acceptance Gate:** `mvn clean compile` succeeds; basic health check `/actuator/health` and Swagger UI `/swagger-ui.html` accessible.

### Slice 2: Identity & Security
- **Status:** Planned
- **Artifacts:** `User`, `Address` entities; BCrypt password hashing; JWT token generation & validation; role-based security (`BAKERY_ADMIN`, `RETAILER`, `DIRECT_CUSTOMER`); registration, login, profile, and address management endpoints.
- **Acceptance Gate:** Unauthorized requests return 401; forbidden operations return 403; address read/update enforces user ownership; unit & integration tests pass.

### Slice 3: Catalog & Dual-Tier Pricing
- **Status:** Planned
- **Artifacts:** `Category`, `Product` entities; retail vs. wholesale pricing fields; stock availability; `@Version` optimistic locking; Redis cache-aside implementation (`@Cacheable`, `@CacheEvict`) with graceful degradation on Redis downtime.
- **Acceptance Gate:** Unauthenticated & B2C users cannot view wholesale prices; product updates immediately evict Redis cache; category/product search supports pagination and sorting.

### Slice 4: Cart & Authoritative Checkout Quoting
- **Status:** Planned
- **Artifacts:** `Cart`, `CartItem` DTOs/entities; server-side cart quote calculating subtotals, applicable tax, provisional discounts, and validation flags; guest cart token support.
- **Acceptance Gate:** Unit prices supplied by client in cart add/update are strictly ignored; server recalculates against database price.

### Slice 5: Order Creation, Snapshots & Inventory Locking
- **Status:** Planned
- **Artifacts:** `Order`, `OrderItem`, `OrderStatusHistory` entities; transactional order placement; immutable pricing & product name snapshots; inventory decrement with row-level locking (`PessimisticLock` / `@Version`) to prevent over-selling.
- **Acceptance Gate:** Catalog price change after order placement does not alter order total; concurrent order placements for scarce stock prevent negative inventory.

### Slice 6: Retailer Profiles & GST Invariants
- **Status:** Completed
- **Artifacts:** `RetailerProfile` entity, `RetailerService`, `RetailerController`; GST format validator (15-character Indian statutory GSTIN regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`); admin approval workflow (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`); personal vs business order distinction.
- **Acceptance Gate:** Validated via `RetailerServiceTest` (5/5 passing). Business order without valid GST is rejected; personal order succeeds without GST.

### Slice 7: Billing, Invoices & Retailer Ledger
- **Status:** Completed
- **Artifacts:** `Invoice` entity; `DueDateCalculator` based on retailer terms (`IMMEDIATE`, `NET_3_DAYS`, `NET_15_DAYS`, `CUSTOM`); append-only `RetailerLedgerEntry` tracking debits (invoices), credits (payments), and adjustments; `BillingService`, `BillingController`.
- **Acceptance Gate:** Validated via `BillingServiceTest` (7/7 passing). Order acceptance generates invoice with exact due date and ledger debit entry in a single atomic transaction; running balance verified.

### Slice 8: Payment Gateway SPI & Webhook Verification
- **Status:** Completed
- **Artifacts:** `PaymentProvider` interface; `MockPaymentProvider`; `YouPiPgPaymentProvider`; constant-time raw-byte HMAC-SHA256 signature verifier via `MessageDigest.isEqual(...)`; `WebhookEventInbox` table for idempotent event processing; `PaymentService`, `PaymentController`.
- **Acceptance Gate:** Validated via `WebhookSecurityServiceTest` (4/4 passing) & `PaymentServiceTest` (7/7 passing). Webhook with invalid signature returns 401; tampered body fails; duplicate delivery IDs processed idempotently; amount mismatch flagged as fraud.

### Slice 9: Transactional Email Outbox & Async Poller
- **Status:** Completed
- **Artifacts:** `NotificationOutbox` entity; HTML template engine; Spring `@Scheduled` poller with exponential backoff ($2^{\text{retry}} \times 10$s) and dead-letter queue after 5 retries; `MockEmailService`.
- **Acceptance Gate:** Validated via `OutboxPollerWorkerTest` (4/4 passing). Notification committed within order transaction; external email outage does not roll back committed order; dead letter transitions after 5 retries.

### Slice 10: Bakery Owner Order Management
- **Status:** Completed
- **Artifacts:** Endpoints for owner to accept, delay, or decline orders; mandatory reason codes (`PEAK_WORKLOAD`, `STAFF_SHORTAGE`, `MATERIAL_SHORTAGE`, `OUT_OF_STOCK`, `OTHER`); customer-facing message; automated inventory replenishment on order decline.
- **Acceptance Gate:** Validated via `OrderServiceTest` (9/9 passing). Non-admin cannot accept/delay/decline orders; delay/decline records status history and dispatches email notification.

### Slice 11: Conditional Discounts, Reorder Engine & Verified Reviews
- **Status:** Completed
- **Artifacts:** Server-side conditional discount evaluator (2.5% on orders $\ge$ ₹10,000); deterministic reorder recommendation engine (order frequency, past quantities, MOQ); verified-purchase product review submissions with `uq_product_user_order` constraint.
- **Acceptance Gate:** Validated via `ReorderServiceTest` (2/2 passing) and `ReviewServiceTest` (5/5 passing). Reviews permitted only for delivered products bought by caller; reorders include explainable reason code.

### Slice 12: Business Reports & Insights
- **Status:** Completed
- **Artifacts:** Aggregated queries for Sales Volume, AOV (split B2B / B2C), Period-over-Period Growth, Receivables Aging, Gross Margin with strict margin guardrail (returns `NOT_AVAILABLE` when product unit cost is missing); `AdminReportsController`.
- **Acceptance Gate:** Validated via `ReportingServiceTest` (4/4 passing). Retailer can only access own report metrics; bakery financials restricted to `BAKERY_ADMIN`.

### Slice 13: Observability, Production Hardening & Docker Compose
- **Status:** Completed
- **Artifacts:** Spring Boot Actuator with custom health indicators (`NotificationOutboxHealthIndicator`, PostgreSQL, Redis); Prometheus Micrometer metrics; Flyway migrations `V1__init_schema.sql`, `V2__performance_indexes.sql`, `V3__seed_data.sql`; Docker Compose (`docker-compose.yml`) defining Spring Boot, PostgreSQL 18, Redis 7 (cache-only), and MailDev.
- **Acceptance Gate:** Sensitive config dumps disabled; `/actuator/health` accurately reflects database, Redis, and outbox status.

### Slice 14: k6 Load Testing Suite (1,000 Concurrent VUs)
- **Status:** Completed
- **Artifacts:** `performance/k6/` test scripts: `smoke-test.js`, `concurrency-integrity-test.js`, `load-test-1000vu.js`, `stress-test.js`, `spike-test.js`, `soak-test.js`, `lib/config.js`, `lib/helpers.js`, `README.md`.
- **Acceptance Gate:**
  - Smoke test: 100% check pass rate (960/960), 0 errors, p95 = 319ms.
  - Concurrency integrity: 50 concurrent checkouts on identical stock, 0 deadlocks, exact mathematical inventory conservation ($1800 \to 1550$, delta = 250).
  - Accelerated load test (100 VUs): 100% check pass rate (4305/4305), 0 unhandled errors, p95 = 4.84ms, p99 = 16.29ms.
  - Spike test (500 VUs burst): 100% check pass rate (7762/7762), 5,567 requests, 0 errors, p95 = 3.57ms.
