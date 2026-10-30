# BakeConnect — Frontend Audit & Repository Assessment

**Document Version:** 1.0.0  
**Date:** October 28, 2026  
**Auditor:** Senior Product Designer & Next.js Frontend Architect  
**Project:** BakeConnect — Smart Bakery Distribution and Direct Ordering Management System  

---

## 1. Executive Summary & Current Repository State

A comprehensive inspection of the workspace `/mnt/Jayant/Code/Work Station/Capstone Project/BakeFlow` was conducted. 

### Findings:
1. **Existing Architectural Assets (`Docs/`):**
   - `BakeConnect Complete User Flows.png` — Detailed state diagrams for B2C Customer Flow (Steps 1–15) and B2B Retailer Flow (Steps 1–15), including decision points, approval gates, payment cycles, and admin operational controls.
   - `BakeConnect UML Architecture Overview.png` — Comprehensive domain model (User, Customer, Retailer, Admin, Product, Category, Inventory, Order, OrderItem, Address, Payment, Delivery, Discount), component diagram, and deployment architecture (Next.js Frontend, Spring Boot REST API, PostgreSQL, Redis cache, YouPI-PG payment gateway, SMTP email service).
   - `BakeConnect UML Activity Diagram Poster.png` — High-fidelity activity diagrams for:
     1. B2C Place Order & Pay (YouPI-PG),
     2. B2C Track Order & Review,
     3. B2C Order Cancellation (pre-dispatch),
     4. B2B Place Bulk Order with Credit Cycle (Immediate / 3-day / 15-day),
     5. B2B Receive Delivery & Verify (shortage/damage reporting),
     6. B2B View Invoice & Make Payment,
     7. Bakery Admin Manage Orders & Reports (Approve / Delay / Deny with presets).
   - `BakeConnect UML Sequence Diagrams.png` — Complete sequence interactions across actors (Customer, Retailer, Admin, Delivery Person), Next.js Frontend, Spring Boot Backend, PostgreSQL, Redis, YouPI-PG Gateway, and Email Service.

2. **Existing Visual References (`Frontend/`):**
   - `original-0867f512a6f94ab75db2043d56035ae4.jpg.webp` — "ROLLIN." bakery landing page by Rylic Studio (warm beige background, rich chocolate typography, bold butter-yellow CTAs, rounded pill product frames, sensory bento cards).
   - `Screen Shot 2026-09-23 at 15.56.08.png` — "Plumy Bakery & Coffee Bar" case study by Polina Grishenina (French slow-living editorial aesthetic, Berry Jam red `#97272D`, Pastry Cream `#F7E4D4`, Sea Tide blue `#7EB6DB`, Baligo serif + Cygre sans, artisan bread packaging, clean mobile prototype).
   - `1111_1440p.mp4` — Cinematic hero animation: plate rotation ("Fresh", "Warm", "Yours"), butter-stamped toast logo badge.
   - `анимация_11_1440p.mp4` — High-impact kinetic typography hero: appetizing product carousel transition (chocolate croissant, pretzel, latte, tart, cinnamon roll) over vivid background.

3. **Software & Runtime Environment:**
   - Linux OS (Kernel 6.8 / Ubuntu/Debian environment)
   - Node.js `v24.20.0`
   - npm `12.0.2`
   - pnpm `11.25.0`
   - No Git repository initialized in this folder yet (uninitialized clean workspace).

4. **Missing Elements:**
   - No frontend application code (no `package.json`, `tsconfig.json`, Next.js app structure, or Tailwind configuration exists yet).
   - No live Spring Boot backend code in this directory (the backend is external or being developed in parallel; API contracts are derived authoritatively from the UML diagrams and domain model).

---

## 2. Technology Boundaries & Compliance Matrix

| Constraint | Requirement | Compliance Strategy |
| :--- | :--- | :--- |
| **Framework** | Next.js App Router, React, TypeScript | Next.js 15+ App Router (`app/`), strict TypeScript (`strict: true`), Server Components for public catalog/content, Client Components isolated to interactive islands. |
| **Styling** | Tailwind CSS + Accessible Components | Tailwind CSS with semantic tokens defined in `DESIGN.md`; Radix UI / Headless UI primitives for accessible popovers, dialogs, and tabs. No generic AI templates. |
| **Motion** | Purposeful CSS / Motion transitions | Respect `prefers-reduced-motion: reduce`. Subtle micro-interactions, hardware-accelerated transforms; avoid scroll hijacking or heavy canvas loops. |
| **Backend Integration** | Spring Boot REST API | Single centralized, typed API client (`lib/api/client.ts`). Unified error handling, timeout recovery, request interceptors. |
| **Database & Cache** | PostgreSQL & Redis owned by Backend | **Zero direct DB / Prisma access in Next.js.** No `@prisma/client`, no direct PostgreSQL drivers. Frontend treats backend REST endpoints as single source of truth. |
| **Payment Gateway** | YouPI-PG | Frontend initiates payment via backend, receives checkout session. **Never marks orders as paid from browser callbacks alone.** Authoritative webhook/polling status check. |
| **Communication** | Transactional Email Only | **Zero SMS, SMS OTP, or phone verification UI.** All account confirmations, order updates, invoices, and delay notifications use email channels. |
| **Role Partitioning** | B2C, B2B Retailer, Bakery Admin | Multi-zone routing: `app/(storefront)` for B2C, `app/(retailer)` for B2B wholesale portal, `app/(admin)` for bakery operations. Strict backend auth tokens/cookies. |

---

## 3. Expected Backend REST API Contract (Synthesized from UML Models)

Because the Spring Boot backend is referenced via the UML Architecture and Sequence diagrams, we define the authoritative typed API adapter interface:

```typescript
// Core Domain Entities
export type UserRole = 'CUSTOMER' | 'RETAILER' | 'ADMIN' | 'DELIVERY';
export type OrderType = 'PERSONAL' | 'BUSINESS';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DELAYED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'YOUPI_PG' | 'CREDIT_CYCLE' | 'COD';
export type PaymentCycle = 'IMMEDIATE' | 'NET_3' | 'NET_15';
```

### Essential Endpoints Map:
1. **Authentication (`/api/auth`)**:
   - `POST /api/auth/login` — credentials (email/password) → returns session/JWT & user role profile.
   - `POST /api/auth/register` — registration for customer or retailer (with businessName & GST number).
   - `GET /api/auth/me` — returns current authenticated profile with role & payment cycle.
   - `POST /api/auth/logout` — invalidates session.
   - `POST /api/auth/forgot-password` & `POST /api/auth/reset-password` — email-based reset.

2. **Catalog & Discovery (`/api/products`)**:
   - `GET /api/products` — public B2C catalog with query filters (`category`, `search`, `page`, `limit`).
   - `GET /api/products/{id}` or `/{slug}` — detailed product info, nutrition, allergens, stock availability.
   - `GET /api/categories` — list of bakery categories (Sourdough, Croissants, Bagels, Pastries, Cookies, Bretzels).
   - `GET /api/retailer/products` — wholesale catalog with retailer net pricing, MOQ, bulk tiers, and stock status.

3. **Cart & Pricing Revalidation (`/api/cart`)**:
   - `POST /api/cart/validate` — calculates authoritative subtotal, applied conditional discounts, GST/taxes, and delivery fees based on order type (Personal vs. Business).

4. **Order Management (`/api/orders`)**:
   - `POST /api/orders` — places B2C order (creates order in `PENDING` state).
   - `POST /api/retailer/orders` — places B2B bulk order with selected payment cycle (`IMMEDIATE` vs. `NET_3` / `NET_15`).
   - `GET /api/orders` — order history for logged-in user.
   - `GET /api/orders/{id}` or `/{orderNumber}` — order tracking, timeline, line items, and delivery status.
   - `POST /api/orders/{id}/cancel` — cancel order prior to dispatch.

5. **Payment (`/api/payments`)**:
   - `POST /api/payments/initiate` — initiates YouPI-PG session; returns gateway checkout parameters (`orderId`, `amount`, `paymentUrl` / `token`).
   - `GET /api/payments/status/{transactionId}` — authoritative backend status query.

6. **Retailer Specific (`/api/retailer`)**:
   - `GET /api/retailer/invoices` — list of invoices with due dates, payment cycles, paid/overdue status.
   - `GET /api/retailer/reorder-suggestions` — AI/rule-based reorder suggestions from past purchase history.
   - `POST /api/retailer/orders/{id}/acknowledge` — confirms delivery received and logs shortage/damage if any.

7. **Bakery Admin (`/api/admin`)**:
   - `GET /api/admin/dashboard` — operational KPI summary (pending review, due today, delayed, cashflow dues).
   - `GET /api/admin/orders` — master order list with filter by status, date, type.
   - `POST /api/admin/orders/{id}/review` — approve (`CONFIRMED`), delay (`DELAYED` + reason preset + new date), or deny (`CANCELLED` + reason preset).
   - `POST /api/admin/products` / `PUT /api/admin/products/{id}` — product CRUD, pricing, MOQ, inventory.
   - `GET /api/admin/reports` — monthly/quarterly sales volume, best sellers, gross margin, cashflow collection.
   - `GET /api/admin/discounts` / `POST /api/admin/discounts` — conditional discount policies.

---

## 4. Architectural Risks & Mitigation Strategies

| Risk | Consequence | Mitigation |
| :--- | :--- | :--- |
| **Client-Side Pricing Tampering** | Users editing localStorage or DOM cart values to purchase at illegal prices. | The client cart is treated strictly as a visual draft. Every checkout step submits item IDs and quantities to `/api/cart/validate` and `/api/orders`; the Spring Boot backend computes final totals. |
| **Payment Verification False Positives** | Browser redirects or popups falsely marking orders as paid. | No order is displayed as "PAID" on client redirect alone. The frontend polls or queries `/api/payments/status/{id}` and shows a polite verification spinner until confirmed by the server. |
| **B2B Term / Price Leaks** | Retailer negotiated rates exposed to unauthorized viewers or other retailers. | B2B catalog and invoice endpoints require authenticated retailer session. No retailer data is rendered statically or stored in public caches. |
| **SMS Feature Creep** | Implementing SMS OTP or SMS tracking against design instructions. | Strictly email-based communications. All status modals, checkout forms, and account settings explicitly say "Sent to your email address". |
| **Heavy AI Template Aesthetics ("UI Slop")** | Repetitive rounded cards, purple gradients, generic stock photos, uninspired corporate feel. | Strict execution of Phase B visual research, grounding the design system in artisanal bakery craft (warm paper textures, tactile typography, bento composition, bold art direction). |

---

## 5. Next Implementation Roadmap

1. **Phase B (Research & Analysis):**
   - Synthesized research across 16 credible references (Awwwards, SiteInspire, Behance, Dribbble, real boutique boulangeries).
   - Created `docs/frontend/REFERENCE_RESEARCH.md` and `docs/frontend/REFERENCE_BOARD.md`.
2. **Phase C (Design Directions & Gate):**
   - Presented 3 distinct design directions; approved Direction 1 (*Artisanal Boulangerie & Kinetic Craft*).
3. **Phase D (Design System & `DESIGN.md`):**
   - Authored root `DESIGN.md` with complete token system, typography, components, and layout rules.
   - Authored `docs/frontend/HERO_CONCEPT.md` for the hero section.
4. **Phase E (Next.js Application Implementation):**
   - Scaffolded clean Next.js 15 App Router project with TypeScript and Tailwind CSS.
   - Built typed API client with mock/live mode toggle matching Spring Boot REST contracts.
   - Implemented vertical slices for Storefront, B2B Retailer Portal, and Bakery Admin Operations Hub.

---

## 6. Implementation Status & Verification Log

**Completed Deliverables (October 2026):**

1. **Foundations & Architecture:**
   - Next.js 15 App Router, React 19, TypeScript strict mode (`tsconfig.json`), Tailwind CSS (`tailwind.config.ts`), PostCSS.
   - Google Fonts (`Fraunces` editorial serif, `Plus Jakarta Sans` clean body, `JetBrains Mono` tabular SKUs/financial numbers).
   - Server-Authoritative API Client (`frontend/lib/api/client.ts`) with dual-mode (realistic simulated state for prototype testing + direct Spring Boot REST forwarding).
   - Authoritative Cart Context & Provider (`frontend/lib/store/cart-context.tsx`) with draft `localStorage` persistence and server-side pricing revalidation.

2. **Core Storefront (B2C Flow):**
   - `/` — Homepage featuring kinetic rotating ceramic plate badge, ROLLIN.-inspired category pills, sensory bento craft cards, and dual-audience paths.
   - `/shop` — Product catalog with real-time keyword search, category filters, dietary tags (Vegan, Sourdough, Eggless, Organic), price/rating sorting, and Suspense boundary.
   - `/products/[slug]` — Product detail page with 36h fermentation badge, crumb hydration details, bread slicing preference selector, quantity steppers, and customer reviews.
   - `/cart` — Full cart drawer and dedicated cart page with promo code validator (`BULK25`, `MORNING10`), free delivery progress tracker (₹500 threshold), and GST calculation.
   - `/checkout` — Unified checkout with Personal vs. Business toggle, progressive Indian GSTIN format validation (`validateGST`), address forms, and YouPI-PG / Net-15 payment options.
   - `/order/[id]` — Authoritative order confirmation and real-time tracking timeline with status events (`PENDING`, `CONFIRMED`, `PROCESSING`, `DELAYED`, `DELIVERED`), delay reason notes, and printable tax invoice.

3. **B2B Wholesale Portal:**
   - `/wholesale` — Commercial partner onboarding page with wholesale benefits, Net-15 terms breakdown, pre-dawn dispatch promise, and application form.
   - `/retailer` — High-density Digital Order Guide table matrix, rapid bulk quantity steppers, MOQ threshold validation, and 1-click routine reorder suggestions.
   - `/retailer/invoices` — Commercial invoice ledger, credit limit vs available credit gauge, and YouPI-PG invoice settlement simulation.

4. **Bakery Admin Operations Hub:**
   - `/admin` — Operations summary dashboard with 4 KPI cards (incoming review queue, active hearth batch orders, total sales, B2B receivables) and live order pipeline.
   - `/admin/orders` — Order review center with status filtering and interactive review modal featuring 3 operational actions (`Approve`, `Delay + Preset Reason`, `Decline`).
   - `/admin/products` — Product inventory and pricing management table with dual retail/wholesale prices, unit production costs, real-time margin % computation, quick stock increment/decrement, and SKU creation modal.
   - `/admin/reports` — Executive financial analytics with gross revenue, COGS, gross margins, B2C vs B2B channel breakdown, category sales volume, best-sellers leaderboard, and CSV/print export.

5. **Quality Gates & Tests:**
   - `vitest` unit/integration test suite: 15/15 tests passing across `cart-authoritative.test.ts`, `order-workflow.test.ts`, and `gst-validation.test.ts`.
   - TypeScript strict check: `pnpm type-check` (`tsc --noEmit`) passes with 0 errors.
   - Production Build: `pnpm build` (`next build`) compiles all 14 routes statically/dynamically with 0 errors.

