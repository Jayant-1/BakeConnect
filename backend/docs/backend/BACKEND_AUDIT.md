# BakeConnect Backend Audit

- **Date:** 2026-10-28
- **Project:** BakeConnect — Smart Bakery Distribution and Direct Ordering Management System
- **Auditor:** Senior Java / Spring Boot Architect & Performance Lead

---

## 1. Executive Summary

An initial technical audit of the BakeConnect repository was conducted to inspect existing source code, configuration, dependency models, architectural diagrams, and runtime environment capabilities before implementing the backend system.

The audit revealed that **no backend source code or configuration previously existed** in the repository. The workspace comprised solely design posters in `Docs/` and multimedia assets in `Frontend/`.

Crucially, an architectural conflict was identified in `Docs/BakeConnect UML Architecture Overview.png` (Panel 5), which depicted a `Repository Layer (Prisma)` within a `Backend (Spring Boot)` component. Because Prisma Client is a TypeScript/Node.js ORM incompatible with direct, high-performance Spring Boot execution, this conflict has been formally resolved in **ADR 0001** (`docs/adr/0001-persistence-stack.md`) in favor of **Spring Data JPA + Hibernate + Flyway + PostgreSQL 18+**, retaining **Redis** strictly for non-authoritative caching.

---

## 2. Environment and Tooling Audit

A comprehensive inspection of the host environment yielded the following specifications:

| Component | Host Status / Version | Architectural Decision / Strategy |
| :--- | :--- | :--- |
| **Java Runtime (JDK)** | OpenJDK `26.0.2` (64-Bit Server VM, Ubuntu 26.04) | Support Java 21+ LTS bytecode target (`--release 21`), ensuring 100% compatibility with Spring Boot 3.4+ and enabling Virtual Threads (`spring.threads.virtual.enabled=true`). |
| **Build Tool** | Apache Maven `3.9.9` installed in `~/.local/bin/mvn` | Standardized Maven build with Maven Wrapper (`mvnw`) committed to version control for deterministic builds. |
| **Database (PostgreSQL)** | PostgreSQL `18.6` installed on host | System of record. Dedicated BakeConnect database instance and test suites orchestrated via Testcontainers / local instances with Flyway migrations. |
| **Cache (Redis)** | Redis Server running (`PONG` verified on `localhost:6379`) | Cache-aside for public catalog, categories, and pre-aggregated report summaries. Strict zero-dependency on Redis for sessions, outbox, or idempotency. |
| **Load Testing (k6)** | k6 `v2.3.0` installed in `~/.local/bin/k6` | Protocol-level HTTP test suite in `performance/k6/` designed to validate 1,000 concurrent Virtual Users (VUs) under defined workloads. |
| **Container Engine** | Docker `29.9.2` / Docker Compose `v5.4.0` | Container orchestration manifests provided for local multi-container development and CI verification. |

---

## 3. Analysis of Existing UML Diagrams and User Flows

Four primary design posters were inspected in `Docs/`:

### 3.1. Complete User Flows (`Docs/BakeConnect Complete User Flows.png`)
- **B2C Customer Journey:** Open Application $\rightarrow$ Search $\rightarrow$ Browse $\rightarrow$ View Product $\rightarrow$ Add to Cart $\rightarrow$ View Cart $\rightarrow$ Checkout $\rightarrow$ Auth Gate (Login/Register) $\rightarrow$ Address & Order Type Selection (Personal vs. Business GST) $\rightarrow$ Payment Choice (YouPI-PG / Mock / COD) $\rightarrow$ Order Confirmation $\rightarrow$ Track Order $\rightarrow$ Receive $\rightarrow$ Review.
- **B2B Retailer Journey:** Login/Register $\rightarrow$ Browse Catalog $\rightarrow$ Wholesale Pricing & Bulk Discounts $\rightarrow$ Specify Bulk Quantity $\rightarrow$ Review Bulk Order $\rightarrow$ Select Payment Terms (`Immediate`, `Net 3 Days`, `Net 15 Days`, or Custom Owner Policy) $\rightarrow$ Submit Order (Initial State: `PENDING_REVIEW`) $\rightarrow$ Track Fulfillment $\rightarrow$ Receive Delivery & Verify Quantities/Condition $\rightarrow$ View Invoice $\rightarrow$ Record / Settle Payment $\rightarrow$ Deterministic Reorder Suggestions.
- **Bakery Admin / Owner Operations:** Manage Catalog & Pricing; Manage Orders (Accept with estimated timeline, Delay with reason code/message, Decline with reason code/message); View Receivables & Payment Cycles; Reports & Insights (Sales Volume, AOV, Growth, Product Margins where cost data exists).

### 3.2. UML Architecture Overview (`Docs/BakeConnect UML Architecture Overview.png`)
- **Domain Entities:** User (Admin, Retailer, Customer, DeliveryPerson), Address, Category, Product, Inventory, Order, OrderItem, Payment, Delivery, Discount.
- **Identified Stack Conflict:** Panel 5 labeled repository layer as "Prisma". Resolved in ADR 0001: Spring Boot will own persistence directly via Spring Data JPA and Flyway.
- **External Integrations:** YouPI-PG payment gateway adapter, Transactional Email Provider (SMTP / API), Redis Cache, PostgreSQL Database.

### 3.3. UML Activity Diagrams (`Docs/BakeConnect UML Activity Diagram Poster.png`)
- Highlights critical branching:
  - B2C order stock validation before payment initiation.
  - B2B order approval lifecycle: Owner accepts (status $\rightarrow$ `CONFIRMED`), delays (status $\rightarrow$ `DELAYED` + reason + email), or declines (status $\rightarrow$ `DECLINED` + reason + email).
  - Credit-cycle order placement creates an unconfirmed or pending invoice atomically without requiring upfront gateway payment.

### 3.4. UML Sequence Diagrams (`Docs/BakeConnect UML Sequence Diagrams.png`)
- Verifies asynchronous notification dispatch via Email Service upon state changes.
- Outlines cache hit/miss semantics for catalog and deterministic reorder suggestions.

---

## 4. Architectural Risk Analysis & Mitigations

| Risk Area | Threat / Vulnerability | Architectural Mitigation |
| :--- | :--- | :--- |
| **Over-selling & Inventory Races** | Concurrent checkouts exceeding available stock under 1,000 VU load. | Explicit inventory validation with pessimistic write locks (`SELECT ... FOR UPDATE`) or optimistic versioning (`@Version`) on stock adjustments during checkout finalization. |
| **Client Total Tampering** | Malicious client injecting modified unit prices or falsified discounts in API requests. | Database is the sole source of truth. All unit prices, tiers, discounts, taxes, and totals are computed strictly server-side. |
| **Webhook Spoofing & Replay** | Forged payment confirmation callbacks from external parties. | Raw request byte capture before JSON deserialization; constant-time HMAC-SHA256 signature verification; idempotency inbox table keyed on provider delivery ID; exact amount matching. |
| **Cross-Tenant IDOR** | Retailer A inspecting Retailer B's invoices, orders, ledgers, or wholesale terms. | Strict object-level authorization (`@PreAuthorize("@securityService.isOwner(...)")`) enforced at the service layer on every read and write. |
| **Slow Dependency Cascades** | Email server or Payment Gateway timeouts locking database connections. | Decoupled PostgreSQL Notification Outbox with background poller; strict HTTP client timeouts (3–5s) with circuit breakers for external gateway calls; DB transactions closed prior to network I/O. |
| **Ledger Drift & Inconsistency** | Out-of-sync outstanding balances for B2B retailers. | Single append-only `RetailerLedgerEntry` model; outstanding balance calculated dynamically or verified continuously against transaction rows. |
| **Connection Pool Exhaustion** | Unbounded HikariCP pool or N+1 queries during 1,000 VU k6 load test. | HikariCP pool sized to 50–80 connections; all unbounded lists paginated with hard limits; `@EntityGraph` and DTO projections for read paths; Virtual Threads to decouple thread-per-request blocking. |

---

## 5. Scope Boundaries

### In-Scope Deliverables
1. **Identity & Security:** Role-based access control (`BAKERY_ADMIN`, `RETAILER`, `DIRECT_CUSTOMER`, optional `DELIVERY_PERSON`), secure JWT/cookie session handling, email verification, password reset, rate-limiting on sensitive endpoints.
2. **Product Catalog & Pricing:** Dynamic B2C vs B2B pricing hiding wholesale rates from unauthenticated/direct customers; categories, stock availability, and image URL references.
3. **Cart & Checkout Engine:** Provisional cart totals, server-side authoritative checkout quotation, address validation, personal vs. business (mandatory GST) validation.
4. **Order Management System (OMS):** Immutable historical order item snapshots, explicit state machine (`PENDING_REVIEW`, `CONFIRMED`, `DELAYED`, `DECLINED`, `PROCESSING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`), status history with actor auditing.
5. **B2B Billing & Receivables:** Payment cycles (`IMMEDIATE`, `NET_3_DAYS`, `NET_15_DAYS`, custom), automated invoice generation, append-only retailer ledger, payment tracking, overdue monitoring.
6. **Payment System:** `PaymentProvider` abstraction, `MockPaymentProvider` for reproducible testing, `YouPiPgPaymentProvider` sandbox adapter, raw byte HMAC webhook verification, durable idempotency inbox.
7. **Discount Engine:** Server-side conditional discount rules (e.g., 2.5% on orders $\ge$ ₹10,000), channel eligibility, non-stackable/stackable rules.
8. **Deterministic Reorder Suggestions:** Purchase frequency, recent order quantities, MOQ thresholds, and catalog availability with transparent explainable reasoning.
9. **Reporting & Insights:** Aggregated sales volume, AOV (B2B vs B2C), period-over-period comparisons, receivables aging, profit margins (only when historized product unit cost exists, returning `NOT_AVAILABLE` otherwise).
10. **Transactional Outbox & Notifications:** PostgreSQL-backed outbox pattern with scheduled poller for durable email delivery.
11. **Performance & k6 Suite:** Full k6 test suite validating smoke, ramp (up to 1,000 VUs), stress, spike, soak, and concurrent stock integrity scenarios.

### Explicitly Out-of-Scope (Excluded)
- Bakery manufacturing recipes, ingredient inventory, oven scheduling, raw material procurement.
- SMS / WhatsApp messaging (strictly email only).
- Machine learning infrastructure or black-box predictive models.
- Microservice decomposition or distributed RPC networks.
- Live GPS tracking.
- Public/private leaderboard (deferred behind feature flag).
