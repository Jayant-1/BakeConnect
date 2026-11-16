# BakeConnect Documentation Index

Welcome to the **BakeConnect System Documentation**. This directory serves as the technical knowledge base for all architecture decisions, data models, integration specifications, and deployment runbooks.

📖 [**Complete System Specification & Capstone Report**](SYSTEM_SPECIFICATION_REPORT.md) &mdash; Comprehensive report featuring Database Design (ERD, Table Structure, Data Dictionary), Chapter 5 (Implementation, Algorithms, Flowcharts, Screenshots), Chapter 6 (Testing, Test Plan, Test Cases, UAT), Chapter 7 (Conclusion), and Chapter 8 (References).

---

## 1. Visual Architecture & UML Diagrams

High-resolution visual models illustrating the entire platform:
- 🖼️ [**Complete User Flows**](BakeConnect%20Complete%20User%20Flows.png) &mdash; End-to-end customer, shopkeeper, and admin journey maps.
- 📐 [**UML Architecture Overview**](BakeConnect%20UML%20Architecture%20Overview.png) &mdash; Service boundaries, database stores, and network topologies.
- 🔄 [**UML Sequence Diagrams**](BakeConnect%20UML%20Sequence%20Diagrams.png) &mdash; Auth flows, inventory reservation, and payment reconciliation.
- 📋 [**UML Activity Diagram Poster**](BakeConnect%20UML%20Activity%20Diagram%20Poster.png) &mdash; Bakery batch scheduling, invoice calculation, and order fulfillment states.

---

## 2. System Architecture & Invariants

- 🌐 [**Unified Tunnel Router**](architecture/TUNNEL_ROUTER.md) &mdash; Port 8000 reverse proxy architecture bridging local Spring Boot, YouPi PG, and Admin Hub over a single Cloudflare tunnel to Vercel production edge.
- 🔒 [**Backend Security Model**](backend/SECURITY_MODEL.md) &mdash; BCrypt hashing, dual-claim JWTs, IDOR guards, and stateless token enforcement.
- ⚡ [**Caching Policy**](backend/CACHING_POLICY.md) &mdash; Redis read-through caching rules (`--save "" --appendonly no`), cache invalidation, and zero inventory state in cache.
- 📊 [**ERD & Relational Data Model**](backend/ERD_AND_DATA_MODEL.md) &mdash; PostgreSQL 18 entity schemas, constraints, foreign keys, and audit timestamps.
- 📑 [**Reporting & Financial Definitions**](backend/REPORTING_DEFINITIONS.md) &mdash; Authoritative formulas for Gross Revenue, Net Revenue, COGS, AOV, and 30-day retailer churn.

---

## 3. Payments & Integration

- 💳 [**Payments & Webhooks Specification**](backend/PAYMENTS_AND_WEBHOOKS.md) &mdash; Payment provider SPI (`MOCK` vs `YOUPI_PG`), dynamic verification paise mechanism, and HMAC-SHA256 constant-time signature validation.
- 📱 [**YouPi PG Android SMS Runbook**](backend/YOUPI_PG_ANDROID_SMS_RUNBOOK.md) &mdash; Google Messages Web observer setup, Android SMS forwarding app, and automated bank reconciliation.
- 🔌 [**YouPi PG Monorepo Architecture**](../integrations/youpi-pg/ARCHITECTURE.md) &mdash; Internal design of the self-hosted peer-to-peer UPI payment gateway.

---

## 4. Frontend & Design

- 🎨 [**Frontend Audit**](frontend/FRONTEND_AUDIT.md) &mdash; Next.js 15 App Router audit, React 19 hydration optimizations, and component inventory.
- 📦 [**Frontend Handoff**](frontend/HANDOFF.md) &mdash; Production checklist, design tokens, responsive breakpoints, and client-side state handling.
- 🍞 [**Bakery Hero Concept**](frontend/HERO_CONCEPT.md) &mdash; Tactile neo-brutalist styling, Pune heritage storytelling, and typography pairings.
- 📜 [**Reference Board**](frontend/REFERENCE_BOARD.md) & [**Research Ledger**](frontend/REFERENCE_RESEARCH.md) &mdash; Curated design references from artisanal bakeries and Indian hospitality brands.

---

## 5. Architectural Decision Records (ADRs)

- ⚖️ [**ADR-0001: Relational Persistence Stack**](adr/0001-persistence-stack.md) &mdash; Decision to maintain Spring Data JPA / Hibernate as the single relational persistence authority on PostgreSQL without dual-ORM drift.

---

## 6. Performance Benchmarks

- 🚀 [**Performance Plan & SLAs**](backend/PERFORMANCE_PLAN.md) &mdash; Target metrics for 1,000 concurrent Virtual Users (VUs) with sub-500ms p95 latencies.
- 🧪 [**k6 Test Suites**](../performance/k6/README.md) &mdash; Multi-scenario load scripts for inventory contention, catalog browsing, and cart quote stress tests.
