# BakeConnect — Hero Concept Brief

**Document Version:** 1.0.0  
**Phase:** Phase D — Hero Concept & Visual Strategy  
**Author:** Senior Product Designer & Next.js Frontend Architect  
**Direction:** Direction 1 — Artisanal Boulangerie & Kinetic Craft  

---

## 1. Intended First Impression & Target Audience

When a visitor lands on BakeConnect, the experience must immediately dispel the feeling of a cold SaaS template or a generic e-commerce dropshipping store. Within the first **3 to 5 seconds**, the visitor should sense:
1. **The Aroma and Tactile Warmth of Fresh Artisan Baking:** Handcrafted sourdough loaves, golden blistered crusts, buttery flaky croissants, and flour-dusted boards.
2. **Dual-Channel Operational Clarity:** Whether the visitor is an everyday food lover buying morning sourdough (B2C) or a local cafe/grocer shopkeeper placing recurring bulk orders (B2B), their path is immediately clear, welcoming, and frictionless.
3. **Purity of Craft:** Authentic ingredients (stoneground unbleached flour, natural wild fermentation, churned French butter) coupled with modern distribution efficiency ("Baked at 4:00 AM • At your door or cafe by 7:00 AM").

---

## 2. What the Hero Communicates in the First 3–5 Seconds

1. **Brand Identity:** **BakeConnect** — "Artisan Bakery Distribution & Direct Ordering".
2. **Freshness Value Proposition:** "Warm, crispy, fragrant foundations for your day and your store."
3. **Fulfillment Flexibility:** "Order for Same-Day Local Pickup or Daily B2B Distribution".
4. **Immediate Action:** Two clear, non-conflicting CTAs:
   - Primary: **"Explore Fresh Bakes"** (smooth scroll to catalog or `/shop`).
   - Secondary / Dual-Portal: **"Retailer Wholesale Portal"** (leads directly to `/wholesale` with contract pricing information).

---

## 3. Chosen Composition & Asymmetric Visual Layout

Inspired by the user's provided motion references (`Frontend/1111_1440p.mp4` and `Frontend/анимация_11_1440p.mp4`) and the editorial structure of `Plumy Bakery` and `Tartine`:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BANNER: 🥖 Daily Bake: Sourdough Loaves out of oven at 06:30 AM • Free delivery over ₹500 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NAV: [BakeConnect Logo]   Shop Catalog   Our Bakery   Wholesale B2B   [Cart (0)] [Sign In]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ HERO SECTION:                                                                          │
│ ┌──────────────────────────────────────────────┐ ┌───────────────────────────────────┐ │
│ │ KICKER: Natural Fermentation & Daily Bakes   │ │ KINETIC FOOD SHOWCASE             │ │
│ │                                              │ │ ┌───────────────────────────────┐ │ │
│ │ DISPLAY HEADLINE:                            │ │ │ Floating Ceramic Plate        │ │ │
│ │ Handcrafted Sourdough,                       │ │ │ with Golden Artisan Croissant │ │ │
│ │ Fresh Pastries & Wholesale                   │ │ │ Rotating Circular Badge:      │ │ │
│ │ Distribution.                                │ │ │ "Baked Daily • 100% Sourdough"│ │ │
│ │                                              │ │ └───────────────────────────────┘ │ │
│ │ SUBHEAD:                                     │ │                                   │ │
│ │ Small-batch bakery goods crafted with wild   │ │ FRESHNESS TICKER PILL:            │ │
│ │ starters, delivered warm to neighborhood     │ │ 🕒 Next Delivery Cutoff: 2h 15m   │ │
│ │ homes and premier retail partners.           │ │                                   │ │
│ │                                              │ │ MINI HIGHLIGHT CARD:              │ │
│ │ [ Shop Retail Catalog → ]  [ Wholesale B2B ] │ │ "Pain au Chocolat" • ₹180        │ │
│ │                                              │ │ ★ 4.9 (240+ reviews)              │ │
│ └──────────────────────────────────────────────┘ └───────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ CATEGORY PILLS BAR (Sticky filter bar with item counts inspired by ROLLIN.):            │
│ [ All (48) ] [ Sourdough Bread (12) ] [ Croissants (8) ] [ Bagels (6) ] [ Bretzels (6) ] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Typography Hierarchy & Color Tokens

- **Top Kicker / Eyebrow:** `Plus Jakarta Sans`, 12px, Uppercase, tracking-widest, Berry Jam crimson (`#97272D`).
- **Primary Display Headline:** `Fraunces` / `Cormorant Garamond`, 56px–72px (desktop), 36px–42px (mobile), leading-[1.08], Dark Crust (`#2C1A14`), with subtle italicized editorial emphasis on select words like *Handcrafted* and *Wholesale*.
- **Body Subhead:** `Plus Jakarta Sans`, 17px–19px, line-height 1.6, Muted Espresso (`#5C453C`).
- **Primary Button:** Solid Berry Jam crimson (`#97272D`) with Pastry Cream text (`#FBF7F2`), rounded-full, px-7 py-3.5, font-medium, subtle hover elevation.
- **Secondary Button:** Warm border with subtle hover fill, Dark Crust text, rounded-full.
- **Surface Background:** Warm Pastry Cream (`#FBF7F2`), subtle organic wheat grain texture or hairline accent frame.

---

## 5. Key Movement, Kinetic Showcase & Accessibility Guardrails

- **The Kinetic Plate Carousel:** 
  - An interactive, continuous yet calm rotating visual carousel displaying freshly photographed bakery items (Artisan Country Sourdough, Chocolate Almond Croissant, Braided Sesame Bretzel, Brioche Loaf).
  - A circular badge gently rotates (`spin-slow`, 20s linear) with text: `• CRAFTED WITH WILD STARTER • BAKED FRESH DAILY •`.
  - **Motion Accessibility Guardrail:** Wrapped in `motion-safe:` / `@media (prefers-reduced-motion: reduce)`. If reduced motion is requested by the user's OS, the carousel remains completely static without auto-rotation, and the circular badge stops spinning.
- **Performance Budget:** 
  - The hero product image is preloaded with `priority={true}` in `next/image` with explicit `sizes="(max-width: 768px) 100vw, 50vw"`.
  - Zero heavy video backgrounds on initial view; video snippets are lazy-loaded only when triggered by user interaction or modal exploration.

---

## 6. Mobile Adaptation

- On mobile viewports (`< 768px`), the layout stacks gracefully:
  1. Announcement banner remains sticky at top.
  2. Headline scale adjusts to 36px with comfortable line height (no awkward word-wrapping).
  3. Interactive product showcase scales down to a compact 280px rounded visual card below the CTAs, ensuring the user sees the primary action without scrolling past a massive image.
  4. Category filter pills support horizontal touch scrolling with `snap-x` and hidden scrollbars.
  5. Sticky mobile bar emerges once scrolled past the hero, giving 1-tap access to the cart and search.

---

## 7. Direct References Mapping

- **Plumy Case Study (`Frontend/Screen Shot 2026-09-23...` & Videos):** Inspired the Berry Jam + Pastry Cream color palette, delicate sparkle icons, and rotating circular typography badge.
- **ROLLIN. (`Frontend/original-0867f5...`):** Inspired the category filter pills with live item count badges and the tactile rounded product showcase cards.
- **Tartine Bakery:** Inspired the macro crumb texture photography and authentic ingredient storytelling.
- **Choco & Foodline:** Inspired the immediate delivery cutoff countdown badge and persistent B2B entry point.
