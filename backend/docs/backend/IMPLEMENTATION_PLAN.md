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
- **Status:** Planned
- **Artifacts:** `RetailerProfile` entity; GST format validator (15-character Indian GSTIN regex); admin approval workflow (`PENDING`, `APPROVED`, `REJECTED`); personal vs business order distinction.
- **Acceptance Gate:** Business order without valid GST is rejected; personal order succeeds without GST; unapproved retailer cannot place bulk orders on credit terms.

### Slice 7: Billing, Invoices & Retailer Ledger
- **Status:** Planned
- **Artifacts:** `Invoice` entity; due date calculator based on retailer terms (`IMMEDIATE`, `NET_3_DAYS`, `NET_15_DAYS`); append-only `RetailerLedgerEntry` tracking debits (invoices), credits (payments), and adjustments.
- **Acceptance Gate:** Credit order automatically generates invoice with correct due date and ledger debit entry in a single transaction; running balance is mathematically verified.

### Slice 8: Payment Gateway SPI & Webhook Verification
- **Status:** Planned
- **Artifacts:** `PaymentProvider` interface; `MockPaymentProvider`; `YouPiPgPaymentProvider`; raw-byte HMAC-SHA256 signature verifier; `WebhookEventInbox` table for idempotent event processing.
- **Acceptance Gate:** Webhook with invalid signature returns 401; tampered body fails signature; duplicate delivery IDs processed idempotently without double-crediting ledger; amount mismatch rejected.

### Slice 9: Transactional Email Outbox & Async Poller
- **Status:** Planned
- **Artifacts:** `NotificationOutbox` entity; HTML template engine with HTML sanitization; Spring `@Scheduled` poller with exponential backoff and dead-letter queue; mock email sender.
- **Acceptance Gate:** Notification committed within order transaction; external email outage does not roll back committed order; failed emails retried up to max retries.

### Slice 10: Bakery Owner Order Management
- **Status:** Planned
- **Artifacts:** Endpoints for owner to accept, delay, or decline orders; mandatory reason codes (`PEAK_WORKLOAD`, `STAFF_SHORTAGE`, `MATERIAL_SHORTAGE`, `OUT_OF_STOCK`, `OTHER`); customer-facing message; automated outbox email triggering.
- **Acceptance Gate:** Non-admin cannot accept/delay/decline orders; delay/decline records status history and triggers notification outbox record.

### Slice 11: Conditional Discounts, Reorder Engine & Verified Reviews
- **Status:** Planned
- **Artifacts:** Server-side conditional discount evaluator (e.g. 2.5% on orders $\ge$ ₹10,000); deterministic reorder recommendation engine (order frequency, past quantities, MOQ); verified-purchase product review submissions.
- **Acceptance Gate:** Discounts applied only when qualifying thresholds met; reorder suggestions include transparent reasoning; reviews permitted only for delivered products bought by caller.

### Slice 12: Business Reports & Insights
- **Status:** Planned
- **Artifacts:** Aggregated queries for Sales Volume, AOV (split B2B / B2C), Period-over-Period Growth, Receivables Aging, Gross Margin (calculated strictly if unit cost exists, returning `NOT_AVAILABLE` when missing).
- **Acceptance Gate:** Retailer can only access own report metrics; bakery financials restricted to `BAKERY_ADMIN`; margin query does not fabricate missing cost data.

### Slice 13: Observability, Production Hardening & Docker Compose
- **Status:** Planned
- **Artifacts:** Spring Boot Actuator with custom health indicators (PostgreSQL, Redis, Outbox backlog); Prometheus Micrometer metrics; Docker Compose (`docker-compose.yml`) defining Spring Boot, PostgreSQL, Redis, and maildev.
- **Acceptance Gate:** Sensitive config dumps disabled; `/actuator/health` accurately reflects database and cache status; Docker Compose boots full stack cleanly.

### Slice 14: k6 Load Testing Suite (1,000 Concurrent VUs)
- **Status:** Planned
- **Artifacts:** `performance/k6/` test scripts: `smoke-test.js`, `load-test.js` (ramping to 1,000 VUs and holding 10 min), `stress-test.js`, `spike-test.js`, `soak-test.js`, `concurrency-integrity-test.js`.
- **Acceptance Gate:** All k6 tests execute with documented commands; p95 latency targets evaluated; zero double-charges, zero negative stock, zero duplicate ledger postings under high concurrency.
