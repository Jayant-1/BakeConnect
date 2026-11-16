# BakeConnect — Smart Bakery Distribution & Direct Ordering Monolith

[![Java 21](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot 3.4.1](https://img.shields.io/badge/Spring_Boot-3.4.1-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Vercel Production](https://img.shields.io/badge/Vercel-Live_Production-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://bakeconnect.vercel.app)

> **An enterprise-grade, high-concurrency bakery distribution management system and direct customer ordering platform.** Built as a clean modular monolith on **Spring Boot 3 (Java 21 Virtual Threads)**, **PostgreSQL 18**, **strict cache-only Redis**, a modern **Next.js 15 (React 19)** storefront with tactile neo-brutalist styling, and a self-hosted **YouPi PG** zero-commission UPI payment reconciliation engine.

🌐 **Live Production Storefront:** [https://bakeconnect.vercel.app](https://bakeconnect.vercel.app)  
📚 **Documentation Index:** [`docs/README.md`](docs/README.md)

---

## 1. System Architecture Overview

BakeConnect serves both **direct retail consumers (B2C)** and **wholesale commercial shopkeepers (B2B)** across Pune and western Maharashtra. The architecture separates concerns cleanly across frontend presentation, domain business rules, relational persistence, and peer-to-peer payment automation:

```mermaid
flowchart TD
    subgraph Clients["Presentation & Edge Layer"]
        Browser["Customer / Shopkeeper Browser"]
        VercelEdge["Vercel Edge Network<br/>bakeconnect.vercel.app"]
        NextFrontend["Next.js 15 App Router<br/>(React 19, Tailwind CSS)"]
        Browser --> VercelEdge --> NextFrontend
    end

    subgraph Tunnel["Edge Bridge & Ingress"]
        Cloudflare["Cloudflare Quick Tunnel<br/>*.trycloudflare.com"]
        TunnelRouter["Unified Tunnel Router<br/>(Node.js Reverse Proxy :8000)"]
        NextFrontend -->|"/api/v1/*", "/checkout/*"| Cloudflare
        Cloudflare --> TunnelRouter
    end

    subgraph Backend["Spring Boot 3.4.1 Modular Monolith (:8080)"]
        direction TB
        Security["JWT & Role Authorization Filter"]
        Identity["Identity & Auth Module"]
        Catalog["Product Catalog & Dual Pricing"]
        Cart["Cart Quote Calculation Engine"]
        Ordering["Order State Machine & Row Locking"]
        Retailer["B2B Retailer & GSTIN Validation"]
        Billing["Billing & Append-Only Ledger"]
        PaymentSPI["Payment Gateway SPI<br/>(MOCK / YOUPI_PG)"]
        Outbox["Transactional Notification Outbox"]
        Reporting["Financial & Margin Reports"]
        
        Security --> Identity
        Catalog --> Cart --> Ordering --> PaymentSPI
        Ordering --> Billing
        Ordering --> Outbox
        Retailer --> Billing
    end

    subgraph DataLayer["Persistence & Cache"]
        Postgres[("PostgreSQL 18<br/>Authoritative System of Record<br/>Port 5433")]
        RedisCache[("Redis 7<br/>Strict Read-Through Cache<br/>Port 6379")]
    end

    subgraph PaymentEngine["YouPi PG Engine (:7000 / :6100)"]
        CheckoutPortal["YouPi Checkout Portal (:7000)<br/>Dynamic UPI QR & Status"]
        PaymentAPI["Payment Processing API (:6100)"]
        SmsObserver["Banking SMS Observer Daemon<br/>(Headless Chrome & Webhooks)"]
        YouPiDB[("YouPi SQLite DB<br/>Transactions & Keys")]
        
        CheckoutPortal --> PaymentAPI --> YouPiDB
        SmsObserver -->|Real-time Bank SMS| PaymentAPI
    end

    TunnelRouter -->|"/api/v1/*", "/actuator/*"| Security
    TunnelRouter -->|"/checkout/*", "/payment-api/*"| CheckoutPortal
    
    Backend -->|Flyway Migrations & JPA| Postgres
    Backend -->|Read-through TTL Cache| RedisCache
    PaymentSPI -->|HMAC-SHA256 Webhook| PaymentAPI
    PaymentAPI -->|Tolerant Webhook Delivery| PaymentSPI
```

---

## 2. Monorepo Structure

```text
BakeConnect/
├── backend/                       # Spring Boot 3.4.1 Java 21 REST API Monolith
│   ├── src/main/java/com/bakeconnect/
│   │   ├── identity/              # BCrypt auth, dual-claim JWTs, addresses, IDOR guards
│   │   ├── catalog/               # Category taxonomy, dual-tier pricing (B2C vs B2B)
│   │   ├── cart/                  # Server-side quote calculator, GST, volume tiers
│   │   ├── ordering/              # Deterministic ascending UUID row locking, state machine
│   │   ├── retailer/              # 15-char GSTIN validation, commercial credit terms
│   │   ├── billing/               # B2B invoice generation, append-only receivables ledger
│   │   ├── payment/               # SPI adapters (MOCK, YOUPI_PG), HMAC verification
│   │   ├── notification/          # PostgreSQL transactional outbox poller
│   │   ├── review/                # Verified delivery review constraints
│   │   └── reporting/             # Financial summaries, COGS, 30-day churn analysis
│   ├── src/main/resources/
│   │   ├── db/migration/          # Flyway schema migrations (V1, V2, V3 seeds)
│   │   └── application.yml        # Spring Boot configuration with Virtual Threads
│   └── pom.xml                    # Maven build file
│
├── frontend/                      # Next.js 15 (React 19, Tailwind CSS) Web Application
│   ├── app/
│   │   ├── (auth)/login/          # Customer & wholesale authentication
│   │   ├── [staffPrefix]/         # Obfuscated bakery staff & manager operations
│   │   ├── shop/                  # Direct customer bakery counter & catalog
│   │   ├── products/[slug]/       # Tactile product detail dossier
│   │   ├── cart/ & checkout/      # Multi-item checkout & YouPi PG redirection
│   │   ├── order/[id]/            # Real-time order tracking & hearth batch schedule
│   │   └── retailer/              # B2B wholesale portal, credit status, invoice ledger
│   ├── components/                # Modular React components (storefront, ui, common)
│   ├── lib/api/                   # Typed backend client with resilient error handling
│   ├── next.config.mjs            # Production rewrite proxy rules
│   └── package.json               # Frontend dependencies & scripts
│
├── integrations/
│   └── youpi-pg/                  # YouPi PG Self-Hosted UPI Payment Gateway
│       ├── apps/
│       │   ├── checkout-portal/   # Customer dynamic UPI QR display (Port 7000)
│       │   ├── payment-api/       # Core payment engine & HMAC webhook dispatch (Port 6100)
│       │   ├── sms-observer/      # Real-time bank SMS observer poller & webhooks
│       │   ├── merchant-admin/    # Merchant management console (Port 6001)
│       │   └── android-observer/  # Native Android SMS forwarding listener
│       └── packages/              # Shared DB, crypto, schemas, and MCP tools
│
├── scripts/
│   ├── tunnel-router.js           # Port 8000 Unified Reverse Proxy for Cloudflare Tunnel
│   └── process_product_cutout.py  # Bakery product image background cutout utility
│
├── docs/                          # System Architecture, ERD, Security, and Runbooks
│   ├── README.md                  # Central documentation portal
│   ├── architecture/              # Reverse proxy & tunnel specs
│   ├── backend/                   # Security model, caching policy, ERD, audit
│   ├── frontend/                  # Design system, hero concept, reference boards
│   └── adr/                       # Architectural Decision Records (ADR-0001)
│
├── performance/
│   └── k6/                        # k6 Concurrency load tests (1,000 Virtual Users)
│
├── deploy/                        # Deployment manifests & Docker configurations
├── docker-compose.yml             # Full-stack container orchestration
├── .gitignore                     # Rigorous ignore rules (builds, DBs, secrets, logs)
└── README.md                      # Executive monorepo readme
```

---

## 3. Core Technical Invariants & Differentiators

### 3.1 Dual-Tier Commerce Engine
- **Direct Retail (B2C)**: Streamlined consumer ordering with hearth batch scheduling (e.g. *Morning Batch 6:00 AM*, *Mid-Morning Batch 11:30 AM*).
- **Wholesale Distribution (B2B)**: Strict onboarding requiring a statutory 15-character Indian GSTIN regex validation (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`), customized commercial credit terms (Immediate, Net 15, Net 30), and automatic 90-day purchase cadence reorder suggestions.

### 3.2 Concurrency & Inventory Integrity
- **Ascending UUID Row Locking**: All order placement workflows sort product IDs alphabetically and acquire `ORDER BY id ASC FOR UPDATE` locks in PostgreSQL. This eliminates concurrency deadlocks under severe checkout contention.
- **Stock Replenishment Guarantee**: Order cancellations automatically restock inventory via transactional database triggers.

### 3.3 Strict Cache-Only Redis
- Pure read-through cache for catalog hierarchies and active price books.
- Enforced with `--save "" --appendonly no --maxmemory 256mb --maxmemory-policy allkeys-lru`.
- **Zero state or inventory truth is ever stored in Redis**; PostgreSQL remains the single source of truth (**[ADR-0001](docs/adr/0001-persistence-stack.md)**).

### 3.4 Proprietary YouPi PG Payment Reconciliation
- **Zero-Fee Peer-to-Peer UPI**: Replaces expensive third-party payment gateways with direct UPI settlements.
- **Dynamic Verification Key (Paise-level)**: Every payment attempt appends a dynamic 1–99 paise token (e.g., base ₹100.00 becomes ₹100.47).
- **Automated Bank Reconciliation**: An automated SMS listener ingests bank credit SMS alerts in real-time, matches the unique amount, attributes the transaction, and delivers an HMAC-SHA256 signed webhook to Spring Boot.
- **Constant-Time Cryptography**: Webhook signatures are validated using `MessageDigest.isEqual(...)` to prevent timing attacks.

---

## 4. Port Map & Service Registry

When running in native development mode:

| Port | Service | Tech Stack | Health Endpoint / Path |
| :--- | :--- | :--- | :--- |
| **`3000`** | BakeConnect Frontend | Next.js 15, React 19 | [`http://localhost:3000`](http://localhost:3000) |
| **`8080`** | Spring Boot REST API | Java 21, Spring Boot 3.4 | [`http://localhost:8080/actuator/health`](http://localhost:8080/actuator/health) |
| **`7000`** | YouPi PG Checkout Portal | Node.js, Express, EJS | [`http://localhost:7000/checkout/:id`](http://localhost:7000) |
| **`6100`** | YouPi Payment API | Node.js, SQLite | [`http://localhost:6100/health`](http://localhost:6100/health) |
| **`6001`** | YouPi Admin Hub | Node.js | [`http://localhost:6001/admin`](http://localhost:6001) |
| **`8000`** | Unified Tunnel Router | Node.js HTTP Proxy | [`http://localhost:8000/health`](http://localhost:8000/health) |
| **`5433`** | PostgreSQL Database | PostgreSQL 18 | `jdbc:postgresql://localhost:5433/bakeconnect_db` |
| **`6379`** | Cache Layer | Redis 7+ | `redis://localhost:6379` |

---

## 5. Quickstart & Local Setup

### 5.1 Prerequisites
- **Java**: OpenJDK 21 or later (`java --version`)
- **Node.js**: Node 20.x or 22.x with npm / pnpm
- **PostgreSQL**: Version 16+ (configured on port `5433` or standard `5432`)
- **Redis**: Version 7+ (`redis-server`)
- **Cloudflare CLI** *(optional for public tunnels)*: `cloudflared`

---

### 5.2 Option A: Native Development (Step-by-Step)

#### Step 1: Clone & Configure Environment
```bash
git clone https://github.com/Jayant-1/BakeConnect.git
cd BakeConnect
cp .env.example .env
```

#### Step 2: Start PostgreSQL & Redis
Ensure PostgreSQL is running with database `bakeconnect_db` owned by `bakeconnect` (password: `bakeconnect_dev`).
```bash
# Verify PostgreSQL connectivity
psql -h localhost -p 5433 -U bakeconnect -d bakeconnect_db -c "SELECT 1;"

# Start Redis
redis-server --save "" --appendonly no --port 6379 &
```

#### Step 3: Run Spring Boot Backend
Flyway will automatically execute database migrations (`V1`, `V2`, `V3`) on startup.
```bash
cd backend
mvn clean spring-boot:run
```
*Backend will be accessible at `http://localhost:8080`.*

#### Step 4: Run Next.js Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend will be accessible at `http://localhost:3000`.*

#### Step 5: Run YouPi PG Payment Gateway
```bash
cd ../integrations/youpi-pg
npm install
YOUPI_ALLOW_LOCALHOST_MODE=true YOUPI_MODE=localhost node scripts/start.js
```
*Checkout portal will be accessible at `http://localhost:7000`.*

#### Step 6: (Optional) Run Unified Tunnel Router
When connecting your local backend to the live Vercel cloud frontend:
```bash
node scripts/tunnel-router.js
cloudflared tunnel --url http://127.0.0.1:8000
```

---

### 5.3 Option B: Docker Compose (Full Stack)
```bash
# 1. Create environment file
cp .env.example .env

# 2. Launch PostgreSQL, Redis, MailDev, and Backend in containers
docker compose up -d

# 3. Verify health
curl -s http://localhost:8080/actuator/health
```

---

## 6. Pre-Seeded Test Personas & Credentials

The database migration `V3__seed_data.sql` pre-configures standard test accounts.  
**Default Password for all accounts:** `Password@123`

| Email | Role | Portal Route | Account Description |
| :--- | :--- | :--- | :--- |
| `admin@bakeconnect.com` | `BAKERY_ADMIN` | `/[staffPrefix]/admin` | Master Baker & Store Owner. Unrestricted access to reports, inventory, and ledger. |
| `manager@bakeconnect.com` | `BAKERY_MANAGER` | `/[staffPrefix]/bakery-manager` | Floor Manager. Batch scheduling, dispatch status, and product catalog editor. |
| `retailer1@bakeconnect.com` | `RETAILER` | `/retailer` | Sharma Gourmet Mart (GST: `27AAPFU0939F1ZV`), Net-15 terms, ₹100k credit limit. |
| `retailer2@bakeconnect.com` | `RETAILER` | `/retailer` | Patel Organic Supermarket (GST: `24AAACP1234A1Z5`), Immediate payment terms. |
| `customer1@bakeconnect.com` | `DIRECT_CUSTOMER` | `/login` → `/shop` | Aarav Mehta, Juhu Tara Road delivery address. |
| `customer2@bakeconnect.com` | `DIRECT_CUSTOMER` | `/login` → `/shop` | Ananya Iyer, Koregaon Park delivery address. |

---

## 7. API Documentation & OpenAPI Specification

When the Spring Boot backend is running:
- **Interactive Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI 3.0 JSON Spec**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
- **Actuator Health Probe**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **Actuator Metrics**: [http://localhost:8080/actuator/metrics](http://localhost:8080/actuator/metrics)

---

## 8. High-Concurrency Performance & k6 Benchmarks

The suite in [`performance/k6/`](performance/k6/) validates the system against high-concurrency peak demand:

```bash
# 1. API Sanity Smoke Test (5 Virtual Users)
k6 run performance/k6/smoke-test.js

# 2. Concurrency & Inventory Contention Test (50 VUs contending on same item)
k6 run performance/k6/concurrency-integrity-test.js

# 3. Full-Scale 1,000 Concurrent Virtual Users Stress Test
k6 run performance/k6/high-concurrency-stress-test.js
```

### Verified Performance SLAs
- **P95 Latency**: `< 500ms` across read-through catalog queries.
- **Inventory Invariant**: Zero negative stock occurrences under 1,000 concurrent checkout attempts.
- **Deadlock Frequency**: `0` deadlocks due to ascending UUID row lock ordering.

---

## 9. Production Deployment Status

- **Frontend Hosting**: Deployed globally on **Vercel** (`https://bakeconnect.vercel.app`).
- **Edge Rewrites**: Dynamic rewrites map `/api/v1/:path*` and `/checkout/:path*` directly to the backend tunnel without CORS friction.
- **SSR Hydration Guard**: Client-side timezone reconciliation prevents React #418 hydration mismatches between UTC Vercel servers and IST user browsers.
- **Automated Fallback**: Resilient JSON parsing in `backend-client.ts` cleanly intercepts network drops and reports informative status messages.

---

## 10. Contributing & Quality Standards

- Maintain atomic, clean Git commits following [Conventional Commits](https://www.conventionalcommits.org/).
- Ensure unit and integration tests pass:
  - Backend: `mvn test`
  - Frontend: `npm test`
- Never commit `.env`, `.staff-credentials.local.json`, `*.sqlite`, `*.jar`, or `node_modules`.

---

## 11. License

This project is licensed under the MIT License &mdash; see the `LICENSE` file for details.
