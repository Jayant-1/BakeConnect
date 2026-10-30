# BakeConnect — Visual Reference Board

**Document Version:** 1.0.0  
**Phase:** Phase B — Visual & Product Research  
**Author:** Senior Product Designer & Next.js Frontend Architect  
**Companion File:** `docs/frontend/REFERENCE_RESEARCH.md`

---

## 1. Benchmark Reference Board

This compact visual board consolidates the top 10 benchmark references into actionable design lessons for every key area of BakeConnect.

| # | Reference & Link | Category | Inspected Artifact | Primary Design Lesson | BakeConnect Component Target |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **01** | **[Plumy Bakery & Coffee](file:///mnt/Jayant/Code/Work%20Station/Capstone%20Project/BakeFlow/Frontend/Screen%20Shot%202026-09-23%20at%2015.56.08.png)**<br>`Frontend/Screen Shot 2026-09-23...`<br>`1111_1440p.mp4`, `анимация_11_...` | Behance / Kinetic Motion | Case study, posters, 1440p motion reels | **Warm French slow-living aesthetic:** Berry Jam (`#97272D`), Pastry Cream (`#F7E4D4`), subtle Sea Tide sky blue (`#7EB6DB`). Kinetic rotating plate food transitions; delicate sparkle motifs. | Homepage Hero, B2C visual identity, public branding, story cards. |
| **02** | **[ROLLIN. Bakery](file:///mnt/Jayant/Code/Work%20Station/Capstone%20Project/BakeFlow/Frontend/original-0867f512a6f94ab75db2043d56035ae4.jpg.webp)**<br>`Frontend/original-0867f512...` | Dribbble / Storefront | Full homepage desktop layout | **Playful category chips with item counts:** `Cookies (12)`, `Bretzel (8)`, `Croissant (21)`. Rounded pill frames for isolated pastry cutouts; bold butter-yellow CTAs. | Product category pill filter bar, featured bento showcase, cart drawer. |
| **03** | **[Tartine Bakery](https://tartinebakery.com)**<br>`tartinebakery.com` | Live Artisan Bakery (SF/LA) | Multi-location menu, sourdough showcase | **Artisanal crust macrophotography:** High-contrast close-ups of open blistered crumb; clean separation between local cafe pickup and wholesale/catering orders. | Hero imagery, product photography guidelines, wholesale entry banner. |
| **04** | **[Choco](https://choco.com)**<br>`choco.com` | B2B Wholesale Platform | Restaurant & distributor web app | **The Digital Order Guide:** Rapid-entry ordering matrix for shopkeepers; 3-action distributor review cards (`Accept`, `Delay + Reason`, `Deny + Reason`). | B2B Wholesale Portal (`/retailer`), B2B Order Guide, Admin Order Review Modal. |
| **05** | **[UND NY](https://undny.com)**<br>`undny.com` | Awwwards SOTD (July 2024) | Next.js / Contentful live site | **Hyper-clean Japanese-French minimalism:** Generous cream/linen whitespace; seamless page transitions; zero visual clutter; refined typographic pacing. | Product Detail Page (PDP), collection layout, mobile drawer. |
| **06** | **[Djust & Foodline](https://foodlineai.com)**<br>`djust.io` & `foodlineai.com` | B2B Procurement Systems | Wholesale food order guides | **Wholesale guardrails & transparency:** MOQ progress bar, contract price vs. list price strikethrough, delivery cutoff countdown timers (`Order in 2h for 6am delivery`). | B2B Cart MOQ tracker, tier pricing breakdown, retailer invoice ledger. |
| **07** | **[Poilâne Paris](https://poilane.com)**<br>`poilane.com` | Historic Bakery (Paris) | Heritage product catalog | **Timeless literary typography:** High-contrast serif headlines paired with generous tracking; loaf size/slicing selectors (whole loaf vs. sliced). | Editorial story blocks, bread options dropdown, trust & heritage badges. |
| **08** | **[Bernice Bakery](https://bernicebakery.com)**<br>`bernicebakery.com` | Awwwards Honorable Mention | Custom Shopify store | **Daily Freshness Schedule:** "Baking Schedule" widget displaying what just came out of the oven; clear top-level "Pickup vs. Delivery" switcher. | Freshness/oven status badges, fulfillment switcher in top navigation. |
| **09** | **[Daily Provisions NYC](https://dailyprovisionsnyc.com)**<br>`dailyprovisionsnyc.com` | Live Neighborhood Bakery | Online ordering & drops | **Sticky mobile ordering bar:** Compact persistent footer on mobile with item count, subtotal, and 1-tap checkout; time-slot selection for pickup windows. | Sticky mobile cart bar, delivery/pickup time-window selector. |
| **10** | **[GAIL’s Bakery](https://gailsbread.co.uk)**<br>`gailsbread.co.uk` | Live Commercial Bakery (UK) | "For the Office" portal & allergen matrix | **Corporate bundles & dietary clarity:** Pre-packaged wholesale boxes; clear lead times (`48h advance notice`); WCAG-accessible allergen badges (Vegan, Nut-Free). | Dietary tag filters, B2B catering bundles, lead-time warning banners. |

---

## 2. Key Visual & Architectural Takeaways

### Visual Synthesis: The "Artisan Bread & Modern Utility" Formula

```
┌────────────────────────────────────────────────────────────────────────┐
│  COLOR PALETTE: Raw Natural Ingredients                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────┐ │
│  │ #2C1A14       │ │ #97272D       │ │ #F7E4D4       │ │ #7EB6DB     │ │
│  │ Dark Crust    │ │ Berry Jam     │ │ Pastry Cream  │ │ Sea Tide    │ │
│  │ Primary Text  │ │ Brand Accent  │ │ Warm Surface  │ │ Subtle Cool │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────┘ │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  TYPOGRAPHIC PAIRING: Editorial Soul + Operational Clarity             │
│  Display Serif: Cormorant Garamond / Fraunces / Playfair               │
│  → Used for: Big memorable hero headlines, category titles, story      │
│                                                                        │
│  Functional Sans: Plus Jakarta Sans / Inter                            │
│  → Used for: Product names, prices, bulk quantity steppers, data tables│
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  THE DUAL-DENSITY PRINCIPLE                                            │
│  Storefront (B2C):                                                     │
│  Airy editorial spacing, warm cream backgrounds, appetizing cutouts,   │
│  emotional sensory tags ("Warm, Fragrant, Sourdough").                 │
│                                                                        │
│  Retailer Portal (B2B) & Admin:                                        │
│  High-density matrix table view, bulk quantity steppers, MOQ progress, │
│  order cutoff timers, net contract pricing, 1-click reordering.        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Anti-Slop Guardrails for BakeConnect

1. **NO AI SaaS Defaults:** No generic purple/indigo gradients, no floating glassmorphic blobs, no generic rounded cards repeated with zero hierarchy.
2. **NO Synthetic Stock Art:** Use authentic artisan bakery imagery, rustic wooden boards, linen cloths, flour dust, and rich crumb macro textures.
3. **NO Fake Testimonials / Fake Badges:** Use authentic operational promises: "Baked Daily at 4:00 AM", "Cold Fermented 36 Hours", "100% Sourdough Culture", "Delivered by 7:00 AM for B2B Retailers".
4. **NO Scroll Hijacking or Gimmicky Cursors:** Keep navigation buttery smooth, native, accessible, and responsive across phone, tablet, and desktop viewports.
5. **TRUTHFUL Payment & Order States:** An order is never marked paid from a browser callback alone. Always reflect server-authoritative status (`PENDING`, `CONFIRMED`, `DELAYED`, `FAILED`).
