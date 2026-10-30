# BakeConnect — Frontend Architecture, Design System & Implementation Handoff

**Project:** BakeConnect — Smart Bakery Distribution and Direct Ordering Management System  
**Document Version:** 1.0.0  
**Date:** October 28, 2026  
**Status:** Completed & Verified  

---

## 1. Executive Summary & Design System Source of Truth

The BakeConnect frontend has been engineered from the ground up as a dual-density, high-craft platform. It balances sensory, tactile, editorial storytelling for direct retail consumers (B2C) with dense, ultra-fast, monospaced operational matrix tools for wholesale café partners (B2B) and bakery dispatch managers (Admin).

### Canonical Source of Truth
- **Design Tokens & Visual Language:** [`DESIGN.md`](../../DESIGN.md) (at root) serves as the immutable single source of truth for all color tokens, typography scales, spacing units, elevation, animation easing, and component constraints.
- **Hero Concept Brief:** [`docs/frontend/HERO_CONCEPT.md`](HERO_CONCEPT.md) details the sensory kinetic art direction, rotating ceramic plate spotlight, and AIDA structural hierarchy.
- **Research Log & Citations:** [`docs/frontend/REFERENCE_RESEARCH.md`](REFERENCE_RESEARCH.md) and [`docs/frontend/REFERENCE_BOARD.md`](REFERENCE_BOARD.md) document 16 analyzed benchmark references (including ROLLIN., Plumy Bakery, Tartine, Poilâne, and B2B wholesale order systems).
- **Initial Audit:** [`docs/frontend/FRONTEND_AUDIT.md`](FRONTEND_AUDIT.md) logs initial workspace analysis, risks, and implementation status.

---

## 2. Final Route Map

| Route | Role / Scope | Rendering Mode | Purpose & Core Capabilities |
| :--- | :--- | :--- | :--- |
| `/` | Public / B2C | Static (`○`) | Editorial artisanal landing page with rotating circular badge, ROLLIN.-inspired category pills, sensory bento cards, and dual B2C/B2B journey routes. |
| `/shop` | Public / B2C | Static w/ Suspense (`○`) | Full catalog discovery with live keyword search, category filter pills, dietary filters (Vegan, Sourdough, Eggless, Organic), and sorting. |
| `/products/[slug]` | Public / B2C | Dynamic (`ƒ`) | Product detail view with 36h levain fermentation badge, crumb hydration info, slicing preference selector, quantity steppers, and verified reviews. |
| `/cart` | Public / B2C | Static (`○`) | Cart review with quantity steppers, item removal, discount promo code validation (`BULK25`, `MORNING10`), free delivery progress bar, and 5% GST computation. |
| `/checkout` | B2C & B2B | Static (`○`) | Streamlined checkout with Personal vs. Business order toggle, progressive Indian GSTIN validation (`validateGST`), address forms, and YouPI-PG / Net-15 credit selection. |
| `/order/[id]` | Customer / Retailer | Dynamic (`ƒ`) | Authoritative order tracking timeline with real-time status history (`PENDING` → `CONFIRMED` → `PROCESSING` → `DELAYED` → `DELIVERED`), delay reason notes, and printable invoice. |
| `/wholesale` | B2B Wholesale | Static (`○`) | Commercial wholesale partner onboarding, Net-15 credit cycle details, pre-dawn dispatch promise, and partner application form. |
| `/retailer` | B2B Retailer | Static (`○`) | High-density Digital Order Guide table matrix, rapid bulk quantity steppers, MOQ threshold validation, and 1-click routine reorder suggestions. |
| `/retailer/invoices` | B2B Retailer | Static (`○`) | Commercial invoice ledger, credit limit vs available credit gauge, due dates, and YouPI-PG invoice settlement simulation. |
| `/admin` | Bakery Admin | Static (`○`) | Bakery command center dashboard with 4 KPI cards (incoming review queue, active batch orders, total revenue, B2B receivables) and live order pipeline. |
| `/admin/orders` | Bakery Admin | Static (`○`) | Order review center with status filtering and interactive review modal featuring 3 operational actions (`Approve`, `Delay + Preset Reason`, `Decline`). |
| `/admin/products` | Bakery Admin | Static (`○`) | Product inventory and pricing management table with dual retail/wholesale prices, unit production costs, real-time margin % computation, quick stock increment/decrement, and SKU creation modal. |
| `/admin/reports` | Bakery Admin | Static (`○`) | Financial & operations analytics with gross revenue, COGS, gross margins, B2C vs B2B channel breakdown, category sales volume, best-sellers leaderboard, and CSV/print export. |

---

## 3. Component Inventory

```
frontend/
├── components/
│   ├── ui/
│   │   ├── badge.tsx                # Status & semantic pill variants (default, berry, butter, sea, success, warning, error, info)
│   │   └── button.tsx               # CVA-driven button primitives (primary, secondary, butter, outline, ghost, danger)
│   └── storefront/
│       ├── announcement-bar.tsx     # Live hearth batch dispatch updates & B2B portal toggle
│       ├── navbar.tsx               # Dual-audience navigation (Retail vs Wholesale mode, cart trigger with live badge)
│       ├── footer.tsx               # Semantic 4-column footer with email-only policy notice
│       ├── cart-drawer.tsx          # Accessible slide-over basket with free delivery progress & B2B MOQ tracker
│       └── product-card.tsx         # Artisanal product card with dietary tags, price, and add-to-cart action
├── lib/
│   ├── utils.ts                     # cn, formatCurrency (INR), formatDate, validateGST (15-char regex)
│   ├── store/
│   │   └── cart-context.tsx         # Global state provider with localStorage persistence & server validation
│   └── api/
│       ├── types.ts                 # Authoritative TypeScript domain models matching backend Flyway schema
│       ├── mock-data.ts             # Realistic sourdough loaves, viennoiserie, pretzels, users, orders, and invoices
│       └── client.ts                # Unified typed API client with dual-mode (simulated demo state + Spring Boot REST forwarding)
```

---

## 4. API Integration & Environment Variables

### Environment Configuration
The frontend expects a single environment variable pointing to the Spring Boot REST API:

```env
# In frontend/.env.local (or production deployment)
NEXT_PUBLIC_API_URL=http://localhost:8080
```
- **Demo Mode Default:** If `NEXT_PUBLIC_API_URL` is omitted or empty, `frontend/lib/api/client.ts` automatically switches to stateful in-memory demo mode. This allows local visual verification, order creation, delay simulation, and invoice payment without needing the Spring Boot backend or PostgreSQL running.
- **Zero Database Exposure:** The frontend has **zero direct connection to PostgreSQL or Redis**. No `@prisma/client` or database drivers exist in the frontend package.
- **Strict Email-Only Policy:** In accordance with the prompt's instructions, **zero SMS, SMS OTP, or phone verification UI** exists. All communications, delays, and confirmations are email-based.

---

## 5. Commands to Install, Lint, Type-Check, Test, and Build

All commands are executed within `frontend/` using `pnpm`:

```bash
# 1. Install dependencies
cd frontend
pnpm install

# 2. Type Check (Strict TypeScript)
pnpm type-check

# 3. Unit and Integration Tests (Vitest)
pnpm test

# 4. Production Build
pnpm build

# 5. Start Production Server
pnpm start
```

---

## 6. Verification Results

### A. TypeScript Type Check (`pnpm type-check`)
- Command: `tsc --noEmit`
- Result: **0 errors**, exited with code 0. Strict TypeScript checks passed across all routes, components, and API client types.

### B. Unit & Integration Test Suite (`pnpm test`)
- Command: `vitest run`
- Results: **3 test files, 15 tests, 100% passed** in ~800ms:
  - `__tests__/gst-validation.test.ts` (5 tests): Validates standard 15-character Indian GSTINs, rejects invalid formats, formats INR currency, formats timestamps.
  - `__tests__/cart-authoritative.test.ts` (5 tests): Tests B2C retail pricing, ₹500 free delivery threshold, B2B wholesale pricing, ₹5,000 B2B MOQ threshold enforcement, automated `BULK25` volume discount, and 5% bakery GST computation.
  - `__tests__/order-workflow.test.ts` (5 tests): Tests personal B2C order creation, wholesale B2B order creation with `PENDING` review status, admin delay review action with preset reasons, invoice settlement, and product stock updates.

### C. Production Build (`pnpm build`)
- Command: `next build`
- Result: **Compiled successfully in Next.js 15.1.7**, exited with code 0.
- All 14 routes statically prerendered or server-rendered with zero errors. First Load JS shared by all routes is only **105 kB**.

---

## 7. Before & After: Key Visual & UX Decisions

1. **Anti-Slop Editorial Design over Generic AI Ecommerce:**
   - *Before:* Generic white SaaS cards, purple gradient hero, centered heading, cookie-cutter product squares.
   - *After:* Warm sourdough parchment palette (`#FBF7F2`, `#3E2723`, `#97272D`, `#F5C542`), tactile `Fraunces` serif typography, rotating hearth-baked ceramic plate badge inspired by Rollin. and Plumy Bakery, and sensory fermentation callouts (36h cold fermented).
2. **Dual-Density Architecture:**
   - Storefront (`/`, `/shop`, `/products/[slug]`) uses generous whitespace, rich imagery, and slow-living food photography art direction.
   - Retailer Portal (`/retailer`) and Admin Hub (`/admin`, `/admin/orders`, `/admin/products`, `/admin/reports`) switch instantly to a high-density, monospaced operational matrix with rapid keyboard-friendly quantity steppers and quick SKU action panels.
3. **Progressive Indian B2B Compliance:**
   - Checkout features an explicit "Personal" vs. "Business" order toggle.
   - For business orders, the GSTIN input validates the standard 15-character Indian format in real-time, enabling B2B tax input credit.
4. **Authoritative Dispatch & Delay Management:**
   - Bakery admins can delay orders with preset operational reasons (`STAFF_SHORTAGE`, `PEAK_WORKLOAD`, `MATERIAL_SHORTAGE`, `WEATHER`), and the order tracking page instantly updates with human-readable explanations.

---

## 8. Real Remaining Gaps & Next Steps

1. **Spring Boot Backend Connection:**
   - When the Spring Boot REST API is booted on port 8080, set `NEXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local` to switch from in-memory demo mode to live network endpoints.
2. **YouPI-PG Production Credentials:**
   - Payment initiation and webhook verification endpoints should be configured on the Spring Boot backend with YouPI-PG production merchant keys.
3. **Optional Delivery Role:**
   - As specified in the prompt instructions, delivery person interfaces were kept optional to prevent scope creep. The order lifecycle state transitions (`OUT_FOR_DELIVERY` and `DELIVERED`) are fully supported via the Admin Order Review interface.
