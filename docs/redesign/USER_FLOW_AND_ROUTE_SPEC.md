# BakeConnect — Product Specification, User Flow & Route-Permission Architecture

**Document Version:** 2.0.0  
**Effective Date:** 29 October 2026  
**Scope:** Single-Bakery Direct Ordering & B2B Wholesale Distribution System  

---

## 1. Product Definition & Roles

BakeConnect serves **one neighbourhood bakery selling directly to customers and supplying wholesale stock to retailers (cafes, chai points, and grocers)**.

### Account Roles & Destinations
| Person | Backend Role Enum | Public Signup? | Destination After Login | Responsibilities & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Retail Customer** | `DIRECT_CUSTOMER` | Yes (Public) | `/shop` or saved checkout | Browsing bakes, adding to cart (`qty >= 1`), doorstep delivery or bakery pickup, card/UPI checkout, order tracking. |
| **Wholesale Shopkeeper** | `RETAILER` | Yes (Public) | `/retailer` (or `/retailer/onboarding` if pending) | Bulk crate ordering, digital order guide, MOQ multiples, Net-3/Net-15 terms, invoice ledger, dues tracking. |
| **Bakery Administrator** | `BAKERY_ADMIN` | **No** (Controlled Provisioning Only) | `/admin` | Dispatch desk, oven batch monitoring, approving retailer profiles & credit terms, inventory adjustments, reports. |

> **Security Rule:** Public registration via `/api/v1/auth/register` strictly allowlists `DIRECT_CUSTOMER` and `RETAILER`. Any payload attempting to supply `BAKERY_ADMIN` is rejected with `400 Bad Request`.

---

## 2. Route & Permission Map

| Route URL | Audience / Surface | Layout Shell | Auth Required? | Role Allowed | Behavior & Responsibilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Public Marketing | `StorefrontLayout` | No | Anyone | Indian neighbourhood bakery hero, categories, honest ingredients bento, wholesale supply callout, bakery locator. |
| `/shop` | Customer Commerce | `StorefrontLayout` | No (Browse) | Anyone | Full bakery counter catalog, category pills, eggless/veg filter, search, price sorting. |
| `/products/[slug]`| Customer Commerce | `StorefrontLayout` | No (Browse) | Anyone | Product detail, Indian food safety dot, packaging specs, shelf-life, verified reviews, "+ Add to Basket". |
| `/wholesale` | Public B2B Info | `StorefrontLayout` | No | Anyone | Value proposition for cafes/grocers, pre-dawn 5:30 AM delivery terms, revolving credit explanation, CTA to register. |
| `/cart` | Customer Commerce | `StorefrontLayout` | No | Anyone | Authoritative quotation, decoupled retail MOQ (`qty >= 1`), delivery calculation, promotion codes. |
| `/checkout` | Customer Commerce | `StorefrontLayout` | **Yes** | `DIRECT_CUSTOMER`, `RETAILER` | Address prefill, Indian 6-digit PIN code check, pickup vs delivery, payment gateway trigger. |
| `/order/[id]` | Customer Commerce | `StorefrontLayout` | **Yes** | Order Owner, `BAKERY_ADMIN` | 5-phase status tracker, dispatch hotline, printable tax invoice. |
| `/login` | Authentication | Dedicated Shell | No | Unauthenticated | Single unified sign-in form; server-side role check routes to appropriate desk. |
| `/signup` | Authentication | Dedicated Shell | No | Unauthenticated | Two choices: Customer vs Shopkeeper. No admin choice. Collects shop details for retailers. |
| `/forgot-password`| Authentication | Dedicated Shell | No | Unauthenticated | Password reset token request via verified email outbox. |
| `/verify-email` | Authentication | Dedicated Shell | No | Unauthenticated | Email token confirmation screen with cooldown. |
| `/retailer` | Wholesale Desk | `RetailerLayout` | **Yes** | `RETAILER` (Approved) | Digital Order Guide SKU matrix, live order quantity steppers, case MOQ multiples, line totals, batch cutoff banner. |
| `/retailer/onboarding`| Wholesale Desk | `RetailerLayout` | **Yes** | `RETAILER` (Pending) | Shop onboarding: GSTIN input, business name, morning delivery address, approval status indicator. |
| `/retailer/invoices`| Wholesale Desk | `RetailerLayout` | **Yes** | `RETAILER` (Approved) | Invoicing ledger, outstanding dues summary, Net-15 due dates, payment initiation. |
| `/admin` | Operations Desk | `AdminLayout` | **Yes** | `BAKERY_ADMIN` | Live command center: revenue, pending orders, in-oven batches, dispatch rate, live order stream. |
| `/admin/orders` | Operations Desk | `AdminLayout` | **Yes** | `BAKERY_ADMIN` | Order review queue: Approve & Queue, Inject Operational Delay (with preset reasons), Decline. |
| `/admin/products` | Operations Desk | `AdminLayout` | **Yes** | `BAKERY_ADMIN` | Product catalog manager, retail vs wholesale prices, dietary attributes, stock steppers. |
| `/admin/retailers`| Operations Desk | `AdminLayout` | **Yes** | `BAKERY_ADMIN` | Retailer application review: GSTIN inspection, credit limit assignment (`IMMEDIATE`, `NET_3_DAYS`, `NET_15_DAYS`). |
| `/admin/reports` | Operations Desk | `AdminLayout` | **Yes** | `BAKERY_ADMIN` | Financial summaries, gross margin tracking, retail vs B2B breakdown, CSV export. |

---

## 3. Order & Wholesale Approval State Machines

### A. Retailer Approval Lifecycle
```
[Shopkeeper Signup] ──> Status: PENDING_REVIEW (Wholesale ordering locked, retail prices only)
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
       [Admin: Set Terms & Limit]    [Admin: Reject Application]
                   │                           │
                   ▼                           ▼
        Status: APPROVED               Status: REJECTED
  (Unlocks Wholesale Net Rates,    (Wholesale locked; actionable
   MOQ Case Matrix & Credit)        resubmission reason provided)
```

### B. Order Fulfillment Lifecycle
```
[Order Submitted] ──> PENDING_REVIEW (Inventory & Credit Reserved)
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
     [Admin: Approve]  [Admin: Delay]   [Admin: Decline]
             │                │                │
             ▼                ▼                ▼
         CONFIRMED        PROCESSING     DECLINED / CANCELLED
             │                │        (Inventory & Credit Released)
             ▼                ▼
    READY_FOR_PICKUP / OUT_FOR_DELIVERY
             │
             ▼
         DELIVERED
```

---

## 4. Real Backend API Integration (`/api/v1/**`)

| Domain | Endpoint | Method | Request Payload / Params | Response Envelope |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/auth/register` | POST | `RegisterRequestDto` (Role allowlisted) | `ApiResponse<AuthResponseDto>` |
| **Auth** | `/auth/login` | POST | `LoginRequestDto` (email, password) | `ApiResponse<AuthResponseDto>` |
| **Catalog** | `/catalog/categories`| GET | None | `ApiResponse<List<CategoryDto>>` |
| **Catalog** | `/catalog/products` | GET | `categoryId`, `query`, `page`, `size` | `ApiResponse<PageResponse<ProductDto>>` |
| **Quote** | `/cart/quote` | POST | `CartQuoteRequestDto` (items, orderType) | `ApiResponse<CartQuoteResponseDto>` |
| **Orders** | `/orders` | POST | `CreateOrderRequestDto` (idempotencyKey) | `ApiResponse<OrderDto>` |
| **Orders** | `/orders/me` | GET | None | `ApiResponse<List<OrderDto>>` |
| **Retailer**| `/retailers/me` | GET | None (Authenticated bearer) | `ApiResponse<RetailerProfileDto>` |
| **Billing** | `/billing/summary` | GET | None | `ApiResponse<BillingSummaryDto>` |
| **Billing** | `/billing/invoices`| GET | `page`, `size` | `ApiResponse<PageResponse<InvoiceDto>>` |

---

## 5. Asset Provenance & Content Dependencies

1. **Photography Assets**:
   - High-definition still and reel assets located under `frontend/public/media/` and `frontend/public/products/`.
   - Authentic products photographed: Ladi Pav, Pure Butter Khari, Irani Mawa Cake, Veg Puff, Nankhatai, Sourdough Loaf, Brioche Buns, Belgian Chocolate Cake.
2. **Business Content Dependencies Remaining**:
   - Bakery GSTIN: Currently set to demo standard `29AABCU9603R1ZM` (Karnataka code 29). Production deployment will require the bakery's official statutory GSTIN.
   - Physical Counter Address: Currently configured for Indiranagar 100ft Road, Bengaluru 560038.
   - Bank Account / Live Gateway Credentials: Local sandbox mock gateway (`YouPI-PG`) active. Live Razorpay/Cashfree credentials required prior to commercial launch.

---

## 6. Concurrent Capacity Validation Status

- **Status:** **Target Defined; Local Staging Unvalidated.**
- **Architecture Safeguards Implemented:**
  - PostgreSQL row-level pessimistic locks (`SELECT ... FOR UPDATE`) on product stock during order placement and quotation.
  - Credit limit transactional checks preventing simultaneous over-allocation.
  - Caller-scoped unique idempotency keys on `/api/v1/orders`.
  - Stateless Spring Boot instances with HikariCP connection pooling.
- **Capacity Acceptance Criteria:** A sustained 1,000-VU k6 load test script is present in `backend/k6/load-test.js`. Full validation requires execution in an isolated production-like staging cluster with monitored RDS/PostgreSQL instances.
