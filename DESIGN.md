# BakeConnect — Design System & Visual Specification

**Document Version:** 2.0.0  
**Status:** Approved & Canonical Visual Single Source of Truth  
**Project:** BakeConnect — Smart Bakery Distribution and Direct Ordering Management System  
**Selected Direction:** Authentic Indian Neighbourhood Bakery ("Your neighbourhood bakery, from morning chai to celebrations")  

---

## 1. Product & Design Objectives

BakeConnect serves **one neighbourhood bakery selling directly to customers and supplying wholesale stock to local retailers (cafes, chai points, and grocers)**. It has a deliberately bounded operational scope: **retail (B2C) and distribution (B2B) sales operations**.

### Core User Promises
1. **Neighbourhood Freshness & Chai-Time Comfort (Customer):** Evoke the tactile warmth, aroma, and everyday comfort of an Indian neighbourhood bakery. Soft morning ladi pav pulled warm at dawn, crisp pure butter khari, cardamom-scented Irani mawa cakes, savoury veg puffs, and celebration cakes take center stage.
2. **Operational Speed & Credit Clarity (Shopkeeper / B2B):** Local cafe owners and chai stall operators can rapidly reorder bulk crates in pack multiples, verify pre-dawn 5:30 AM dispatch cutoffs, track invoice due dates (`Net 3` / `Net 15`), and inspect outstanding balances in under 60 seconds without consumer clutter.
3. **Calm Operational Command (Bakery Admin Desk):** Bakery staff and dispatchers get an uncluttered, high-density command center to review incoming retail and wholesale orders, manage oven batches, verify shopkeeper GSTIN applications, set revolving credit limits, and monitor receivables.
4. **Anti-Slop Guarantee:** Zero generic European boulangerie tropes, zero fake countdown timers, zero client-side role toggles, zero unverified dietary claims, and zero simulated payment confirmations.

---

## 2. Decoupled Audience Layout Architecture

To eliminate cognitive confusion and prevent interface leakage, BakeConnect strictly decouples layout shells by audience:

| Surface | Routes | Layout Shell | Key Elements & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Public Storefront** | `/`, `/shop`, `/products/[slug]`, `/wholesale`, `/cart`, `/checkout`, `/order/[id]` | `StorefrontLayout` | Top `AnnouncementBar` (batch alert & wholesale link), `StorefrontHeader` (`[Logo] [Our bakes] [Our story] [For shops] [Visit us] [Cart] [Login]`), slide-out `CartDrawer`, and authentic bakery counter footer. |
| **Wholesale Partner Portal** | `/retailer`, `/retailer/onboarding`, `/retailer/invoices` | `RetailerLayout` | High-density B2B header with shop verification pill (`Sharma Gourmet Mart`, `GSTIN: 27AABCU...`), settlement terms (`NET_15_DAYS`), outstanding ledger balance pill (`₹0.00`), direct dispatch hotline (`+91 98765 43210`), and rapid SKU order matrix. |
| **Bakery Operations Desk** | `/admin`, `/admin/orders`, `/admin/products`, `/admin/retailers`, `/admin/reports` | `AdminLayout` | Command header displaying live oven deck status (`● Bakery Deck Active • Batch #3: Morning Pav & Khari Tray In-Oven`), and operations navigation: Live Operations, Orders & Dispatch, Retailer Approvals, Product Inventory, Financial Reports. |
| **Authentication Shell** | `/login`, `/signup`, `/forgot-password`, `/verify-email` | Dedicated Shell | Minimalist, focused cards on warm ivory background without storefront navigation or operational menus. |

---

## 3. Brand Personality & Art Direction

- **Tone of Voice:** Warm, dependable, honest, and unpretentious. An authentic Indian neighbourhood bakery that knows its morning regulars by name.
- **Sensory Touchstones:** Warm pav trays sliding out of deck ovens at 4:30 AM, fragrant cardamom and mawa, flaky butter khari crumbling into hot cutting chai, brown paper bakery parcels, and crisp cellophane biscuit packs.
- **Dietary Integrity:** Strict adherence to Indian food safety labeling. Standard green-dot square indicator for **100% Eggless / Pure Vegetarian** items; brown-dot square indicator for bakery items containing egg.

---

## 4. Color Tokens & Semantic Contrast Pairs

All color tokens are calibrated to exceed **WCAG 2.2 AA** contrast requirements (minimum 4.5:1 for body copy, 3.0:1 for large display text and interactive UI elements).

```css
:root {
  /* Surfaces & Backgrounds */
  --color-warm-ivory: #FFF8EF;      /* Primary page background (warm unbleached parchment) */
  --color-surface-pure: #FFFFFF;    /* Elevated card surface & modal backgrounds */
  --color-surface-muted: #F8F3EA;   /* Secondary surface, table striping, inactive pills */
  --color-border-subtle: #E8DCCF;   /* Subtle dividers, card borders, input strokes */

  /* Brand Typography & Core Tones */
  --color-cocoa-dark: #2D211B;      /* High-contrast primary text, deep oven-crust cocoa (14.5:1 on ivory) */
  --color-cocoa-muted: #6B554B;     /* Secondary text, metadata, captions (5.4:1 on ivory) */
  --color-cocoa-faint: #9E887E;     /* Placeholder text, disabled labels (meets 3:1 on light) */

  /* Indian Bakery Brand Accents */
  --color-terracotta: #9C3D2B;      /* Primary CTA, brand emblem, active badges (6.9:1 on ivory) */
  --color-terracotta-hover: #7E2F20;/* Button hover state */
  --color-terracotta-subtle: #FDF2F0; /* Terracotta-tinted highlights */
  
  --color-chai-amber: #D97706;      /* Secondary highlight, warm morning batch callouts */
  --color-chai-surface: #FEF3C7;    /* Warm highlight banner background */

  /* Indian Dietary Tokens */
  --color-veg-green: #15803D;       /* Official Indian Vegetarian / Eggless green dot */
  --color-veg-bg: #DCFCE7;          /* Vegetarian badge container */
  --color-egg-brown: #92400E;       /* Official Indian Egg-containing brown dot */
  --color-egg-bg: #FEF3C7;          /* Egg badge container */

  /* Operational & Status Colors */
  --color-status-success: #15803D;   /* Order Confirmed, Approved, Paid */
  --color-status-success-bg: #DCFCE7;
  --color-status-warning: #B45309;   /* Delayed, Low Stock, Cutoff Approaching */
  --color-status-warning-bg: #FEF3C7;
  --color-status-error: #B91C1C;     /* Declined, Payment Failed, Out of Stock */
  --color-status-error-bg: #FEE2E2;
  --color-status-info: #1D4ED8;      /* Out for Delivery, Net-15 Terms */
  --color-status-info-bg: #DBEAFE;
}
```

---

## 5. Typography System

### Font Pairing
- **Display Serif:** `Fraunces` (optical sizing `opsz: 9..144`, weights `400..700`, italic). Used for storefront headlines, section titles, and story callouts.
- **Functional Sans:** `Plus Jakarta Sans` (weights `400..700`). Used for navigation, product names, price tags, quantity steppers, data tables, checkout inputs, and button copy.
- **Monospaced Data:** `JetBrains Mono` / tabular lining numbers for order numbers (`#BC-20261028-1D0CAD`), GSTIN codes, and invoice ledgers.

### Scale & Hierarchy
| Role | Font Family | Size (Desktop) | Size (Mobile) | Line Height | Weight |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | Fraunces | `64px` (`4rem`) | `36px` (`2.25rem`) | `1.08` | 700 Bold |
| **Section Title (H2)** | Fraunces | `36px` (`2.25rem`) | `26px` (`1.625rem`) | `1.15` | 600 SemiBold |
| **Component Header (H3)**| Plus Jakarta Sans | `22px` (`1.375rem`)| `18px` (`1.125rem`) | `1.3` | 600 SemiBold |
| **Card Title (H4)** | Plus Jakarta Sans | `17px` (`1.0625rem`)| `16px` (`1rem`) | `1.4` | 600 SemiBold |
| **Body (Lead)** | Plus Jakarta Sans | `18px` (`1.125rem`)| `16px` (`1rem`) | `1.6` | 400 Regular |
| **Body (Standard)** | Plus Jakarta Sans | `15px` (`0.9375rem`)| `14px` (`0.875rem`)| `1.55` | 400 Regular |
| **Caption & Tags** | Plus Jakarta Sans | `12px` (`0.75rem`) | `11px` (`0.6875rem`)| `1.4` | 600 SemiBold |
| **Monospaced Code** | JetBrains Mono | `13px` (`0.8125rem`)| `12px` (`0.75rem`) | `1.4` | 500 Medium |

---

## 6. Indian Bakery Component Standards

### A. Fresh Bakery Counter (`ProductCard`)
- **Official Food Safety Dot:** Standard Indian green dot in a square for vegetarian/eggless items; brown dot for non-vegetarian/egg items.
- **Pack & Selling Details:** Clear specification (*e.g., "Pack of 6", "250g Box", "Per cake"*).
- **Single-Unit Retail Flexibility:** Direct retail customers can purchase single units (`qty >= 1`).
- **Tactile "+ Add" Action:** Instant add to cart with optimistic drawer feedback.

### B. Digital Order Guide (Wholesale Matrix)
- **High-Density Data Table:** Designed for fast entry by busy shopkeepers.
- **Columns:** Product / SKU, Unit Specification, Retail MSRP, Net Wholesale Rate, MOQ (Case Multiples), Quantity Stepper, Line Total, Add Action.
- **Cutoff Banner:** Persistent reminder of next-day pre-dawn 5:30 AM dispatch cutoffs.

### C. Admin Dispatch & Approval Workspace
- **Action Buttons:** Clear 3-state operational actions: `Approve & Queue for Bake`, `Inject Operational Delay` (with preset rationale: *Oven Maintenance, Weather Delay, Flour Hold*), and `Decline`.
- **Retailer Verification:** In-depth review of applicant business name, owner contact, GSTIN format compliance, and revolving credit limit assignment (`IMMEDIATE`, `NET_3_DAYS`, `NET_15_DAYS`).

---

## 7. Accessibility Contract (WCAG 2.2 AA)

1. **Touch Targets:** Minimum `44px × 44px` for all interactive mobile elements.
2. **Focus Management:** Visible `outline: 2px solid var(--color-terracotta)` on `:focus-visible`.
3. **Screen Reader Live Regions:** Cart subtotals, dietary filter announcements, and order timeline updates announce via `aria-live="polite"`.
4. **Reduced Motion:** All transitions and keyframe animations obey `@media (prefers-reduced-motion: reduce)`.
