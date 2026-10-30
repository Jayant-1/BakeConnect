# BakeConnect — master prompt for the complete user-flow and interface redesign

**How to use:** Copy this entire document into the implementation chat that has access to the BakeConnect repository. It is a self-contained brief. Read `docs/redesign/PROJECT_ANALYSIS.md` for the supporting assessment and `docs/redesign/evidence/` for current-screen captures. The assessment is dated 29 October 2026; recheck source before changing it.

---

Act as a senior product designer, UX architect, frontend engineer, and backend engineer. Redesign BakeConnect around the real needs of Indian bakery customers and wholesale shopkeepers. First resolve the complete user journey, then design the interface around that journey, then implement and verify it in coherent phases.

Your job is to make this website welcoming, easy to understand, and dependable. A customer should feel comfortable buying a few bakery items. A busy shopkeeper should be able to restock and understand their dues without learning complicated software. The public landing page should be creative and memorable; the operational screens should be calm and efficient.

Make routine decisions using this brief and the repository. Ask only when a missing business fact materially changes scope or correctness. Do not ask me to choose every colour, component, or implementation detail. Do not invent business facts, production integrations, regulatory conclusions, or test results.

## 1. Confirmed product definition

BakeConnect serves **one bakery selling directly to customers and supplying wholesale stock to retailers**. A shopkeeper means a retailer purchasing stock from the bakery. The shopkeeper is not the bakery owner and must not receive bakery management permissions.

There are two public signup choices:

1. **Customer — “Buy for yourself or your family.”** Backend role: `DIRECT_CUSTOMER`.
2. **Shopkeeper — “Buy stock for your shop or café.”** Backend role: `RETAILER`.

Keep a separate private bakery-administration experience for `BAKERY_ADMIN`. Provision administrator accounts through a controlled internal process; never expose public administrator signup. Do not build a multi-bakery marketplace, seller storefront platform, or delivery-driver application as part of this redesign.

The platform handles finished bakery products, orders, delivery/pickup, wholesale accounts, invoices, and payments. Ingredient procurement, recipes, oven scheduling, live GPS, machine-learning infrastructure, SMS, and WhatsApp automation remain outside this release. Email is the current notification channel; it must actually work before the interface claims an email was sent.

## 2. Repository reality and implementation constraints

Preserve the existing architecture unless a concrete problem requires a targeted change:

- Frontend: Next.js App Router, React, TypeScript, Tailwind, existing Radix primitives and Lucide icons.
- Backend: Spring Boot modular monolith, Java 21 target, Spring Security, JPA, PostgreSQL, Flyway.
- Redis is an expendable read cache. PostgreSQL remains authoritative for accounts, inventory, prices, orders, credit, invoices, ledger entries, payment state, and notification work.
- Existing modules: identity, catalog, cart, ordering, retailer, billing, payment, notification, review, and reporting.
- Keep database changes additive and migration-based. Never delete historical orders, reset a real database, or replace production catalog data with demo content.
- Retain existing route compatibility through explicit redirects where URLs move. Do not let legacy URLs bypass authorization.
- Recheck dependency support/security against official sources before release. Do not migrate frameworks or introduce a UI library simply for a new visual appearance.

Known findings to address, not blindly trust as already fixed:

- The current frontend uses in-memory demo arrays and mock identities. Login/signup/account journeys are missing.
- Its API paths, response shapes, enum names, and authentication behavior differ from the backend. Changing an environment variable alone is insufficient.
- All pages share consumer navigation; B2C/B2B switches change pricing context in the browser.
- Retailer pages request all orders and filter locally. Real retailer data must come from owned endpoints.
- Public registration currently accepts the backend role enum without a safe-role allowlist.
- Wholesale price/order eligibility checks role but not consistently retailer approval or available credit.
- Retail customers inherit wholesale minimum quantities in backend quote/order validation.
- Checkout, invoice settlement, product reviews, credit indicators, cutoff countdowns, and portions of reporting contain simulated or hardcoded behavior.
- The payment adapter is a scaffold, email dispatch is mocked, and financial write paths need concurrency/reconciliation work.
- The README's reported sustained load test peaks at 100 VUs. A 1,000-VU script exists, but it does not establish production readiness for 1,000 concurrent users.

The old `DESIGN.md` describes a French artisan bakery. This new brief changes the visual and content direction to an Indian bakery. Preserve valid product rules and useful components; update design documentation to reflect the new result.

## 3. Product principles and success criteria

Design for these practical situations:

- A customer on a phone wants a snack, tea-time box, loaf, or cake without understanding wholesale terminology.
- A retailer is at a busy counter and wants to order familiar products in the correct pack sizes quickly.
- A retailer needs to know what is arriving and what is due, without a dashboard full of charts.
- Bakery staff must keep product availability, retailer approvals, and fulfillment information accurate.

Every screen must answer: **Where am I? What can I do here? What happens next?**

Use one clearly dominant action per task. Show details progressively. Use plain labels and real feedback. Keep forms short and preserve entered data after recoverable failures. Never make users repeat information the account already has.

Proposed usability targets, to be validated rather than claimed:

- A first-time visitor can explain what BakeConnect offers and find shopping/login within five seconds.
- A customer can locate an item, understand its quantity/price, and add it without assistance.
- A returning retailer can turn a recent order into a reviewed basket in approximately one minute, excluding payment and delivery decisions.
- At least four of five representative participants in each role complete their primary flow without assistance before calling the design usability-validated.
- Mobile shoppers and retailers can complete core tasks without horizontal page scrolling.

## 4. Complete journey and navigation architecture

Primary flow:

```text
Public landing page
  ├─ Explore products → public retail catalog → product → guest basket
  │                                           └─ checkout → login/signup → return to checkout
  ├─ Login → server checks identity and role
  │    ├─ Customer → shop or safe saved destination
  │    ├─ Retailer without profile → complete business profile
  │    ├─ Retailer awaiting approval → application status
  │    ├─ Approved retailer → retailer home or safe saved destination
  │    └─ Bakery admin → private operations workspace
  └─ Create account
       ├─ Customer → account → verify email → shop / resume basket
       └─ Shopkeeper → account → business details → verify email
                          → approval status → approved retailer workspace
```

Browsing and building a retail basket are public. Require authentication and verified email before the first order; retain the basket while verification happens. Retailer approval is an additional condition for wholesale prices and business orders. Explain it before signup, not after a rejected checkout.

Use separate route layouts:

| Surface | Routes / destinations | Navigation |
|---|---|---|
| Public marketing | `/`, `/wholesale`, helpful policy/contact content | Brand left, landing-section links centred, Login right |
| Authentication | `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` | Brand, back/close link, minimal distractions |
| Customer commerce | `/shop`, `/products/[slug]`, `/cart`, `/checkout`, `/order/[id]` | Shop, search, My orders/account, cart |
| Customer account | `/account`, `/account/orders`, `/account/addresses` | Simple account navigation; no analytics dashboard |
| Retailer onboarding | `/retailer/onboarding`, `/retailer/application` | Progress/status, edit details, help, sign out |
| Retailer workspace | `/retailer`, `/retailer/catalog`, `/retailer/orders`, `/retailer/orders/[id]`, `/retailer/invoices`, `/retailer/invoices/[id]`, `/retailer/account` | Home, Order stock, Orders, Payments; account/help secondary |
| Bakery administration | Existing `/admin/**` plus retailer approval/account management | Overview, Orders, Products & stock, Retailers, Payments, Reports |

An account statement can be a tab within Payments rather than another primary menu item. Reorder is an action within Home/Orders/Order stock rather than another dashboard.

Preserve `/order/[id]` links safely. Resolve a UUID using the ID endpoint and a display number using the by-number endpoint. Enforce ownership on both. Never use “get all orders” to find a customer's or retailer's order in the browser.

Customers and retailers must never see a role/pricing toggle that grants access. A logged-in retailer browsing the public brand site should have a clear “Back to your workspace” link; the public hero must not silently change into a wholesale sales tool because of stored cart state.

## 5. Landing page: memorable Indian bakery, simple entry

Implement the requested desktop navbar exactly in spirit:

```text
[BakeConnect logo]       [Our bakes] [Our story] [For shops] [Visit us]       [Login]
```

Use genuine centred alignment rather than letting the width of the logo push the links off centre. The section links scroll to real sections with correct sticky-header offsets. On phones, show logo, visible Login, and a labelled menu button; put section links in an accessible menu. Do not add operational menus, wholesale switches, or administrator shortcuts here.

Chosen creative direction: **“Your neighbourhood bakery, from morning chai to celebrations.”** Warm, appetising, locally familiar, and carefully composed. This is creative direction, not a claim about products the business has not confirmed.

Hero concept: **The morning bakery counter.** A distinctive still-life of an Indian bakery counter: a tray of familiar bakes, a paper bakery bag, tactile crumb detail, and subtle chai-time context. Choose only foods appropriate to the bakery's confirmed offering. A hand placing a pastry or packing a box can add humanity if authentic imagery is available. Use natural light and strong food detail; avoid a generic European café interior or a wall of decorative UI cards.

Suggested headline: **“A little joy, fresh from the bakery.”** Use a concise supporting sentence explaining that people can order for home and shops can purchase wholesale stock. Change the wording if the real business facts require it.

- Primary action: **Explore our bakes** → `/shop`.
- Secondary, quieter action: **Buying for your shop?** → `/#for-shops` or `/wholesale`.
- Keep headline, context, and primary action visible in the first viewport on a 1366×768 laptop and on common phones. On mobile, show a meaningful crop of the hero image without pushing the action far below the fold.
- One signature food composition and one subtle entrance interaction are enough. No rotating badges, fake live-oven counters, autoplay sound, scroll traps, or compulsory video.
- Use real text over/alongside images, never bake navigation or headings into a raster.
- If video is useful, make it optional with an optimised poster and accessible controls. The page works fully without playing it.

Section sequence:

1. Hero and entry into shopping.
2. Browse familiar categories, driven by actual products: examples include Cakes, Pastries, Bread & Pav, Puffs & Savouries, Biscuits & Rusk, and Tea-time Snacks. Do not create empty categories merely to match this list.
3. A small curated selection with image, name, selling unit, price, verified dietary information, and a clear product action. “Bestseller” requires actual sales evidence; otherwise call it “Explore our bakes.”
4. Bakery story/craft with genuine photography and verified facts. Do not invent founding years, staff portraits, awards, certifications, or customer counts.
5. A simple explanation of delivery/pickup based on actual service policies.
6. For shops: stock ordering, repeat purchases, clear invoices, and account-specific payment terms. State that wholesale accounts require approval. CTA: **Create a shopkeeper account**.
7. Visit/contact: real address, opening hours, service area, verified contact information, and FAQ. If a fact is unavailable, record the content dependency and omit false specifics.
8. Compact footer with customer help, policies, contact, and wholesale information. No public admin menu.

Customer reviews or testimonials must be real and permission-appropriate. Use an honest no-reviews state when necessary.

## 6. Login, account creation, verification, and sessions

Provide one shared login page. Users enter email and password; the authenticated server identity determines destination. Do not ask them to remember their role on each login.

Login includes labelled fields, show/hide password, password-manager support, Forgot password, and Create account. Show an actionable error without revealing whether a particular email has an account. Preserve safe same-site intended destinations. Validate redirects against an allowlist of permitted local paths.

Signup begins with two understandable choices, Customer and Shopkeeper. Use warm explanatory text rather than B2C/B2B jargon.

Customer signup:

- Name, email, password; collect phone when needed for delivery.
- No delivery address, GSTIN, business profile, or unnecessary preferences at initial signup.
- Verification screen explains next steps, offers resend with cooldown, and handles expired/already-used links.

Shopkeeper signup:

- Step 1: name, work email, password, contact phone.
- Step 2: shop/business name, contact person, optional GSTIN if registered, and essential business details supported by the model. Collect delivery address at first order unless required to assess serviceability.
- Explain that account creation is immediate, but wholesale ordering starts after bakery approval.
- Validate GSTIN format if supplied, while making clear that format validation is not official registration verification. Do not turn the current frontend's mandatory GST field into a universal legal requirement.
- Persist progress safely. If account creation succeeds but profile submission fails, resume profile completion rather than asking the user to register again.
- Provide distinct incomplete, pending, approved, and rejected experiences. Show a real reason and a correction/resubmission path for rejection; add persisted reason fields if necessary. Never invent an approval turnaround time.
- Pending/rejected retailers must not receive wholesale prices, credit entitlements, or ordering permission from API responses. Non-sensitive retail browsing can remain public.

Use a same-origin Next.js server boundary for session handling as the default design: Secure, HttpOnly, appropriately SameSite cookies; server-side forwarding of bearer credentials to Spring Boot; no tokens in localStorage or URLs. Implement origin/CSRF protection for cookie-authenticated mutations. Do not merely move a token into a cookie while leaving the browser-to-backend contract unchanged.

Define expiry, logout, password-reset invalidation, and reauthentication behavior. Add refresh/revocation support only with a complete server implementation. If using the existing finite JWT lifetime initially, handle expiry cleanly and revoke prior sessions when security-sensitive account state changes. Do not invent a refresh endpoint.

Apply rate limits to authentication/recovery/resend; keep verification/reset tokens expiring and single-use. Connect transactional email. Public registration must reject administrative/delivery roles server-side regardless of submitted JSON.

After logout, clear private account caches and sensitive forms. Keep guest cart intent separate from authenticated account carts; do not expose the previous account's addresses or financial information on shared devices.

## 7. Customer experience: familiar bakery ecommerce

The customer destination is a shop, not a business dashboard.

### Catalog

Place search, intuitive categories, and products near the top. Search examples should match actual Indian bakery inventory: pav, rusk, veg puff, cake, biscuits. Provide a compact filter drawer on mobile rather than a large form before every product.

Product cards show a consistent image, short name, selling unit/weight, retail price, availability, and one clear add/view action. Include eggless/vegetarian/allergen information only when the bakery has supplied it. A photograph cannot establish ingredients. Do not label unknown food as nut-free or allergy-safe.

Support server-side pagination, composable filters, sorting, search query URLs, and browser back restoration. Empty results should suggest clearing filters or trying another term. Unavailable products should have a clear state and useful alternatives without promising a return date that is not known.

### Product details

Show the actual product image, price per selling unit, included quantity, description, verified ingredients/dietary/allergen information, storage/shelf-life information if recorded, availability, quantity, and Add to cart. Explain whether the price is per piece, pack, tray, or weight. Separate minimum order quantity from units inside a pack.

Do not offer weight/flavour/custom message/slicing options until they exist in the data model, are saved with the order, and are priced/validated by the backend. Show truthful product-specific reviews from the existing review service; only eligible delivered-order buyers can submit a verified review.

### Cart

Allow quantity editing, remove with undo where practical, and continue shopping. Show merchandise amount, discount, tax treatment, delivery charge where applicable, and final payable total from the server quote.

Customer quantities normally start at one retail selling unit. Wholesale pack minimums must not apply to a customer buying one product unless that product itself is sold as a retail pack. Define these rules in the backend, not only in the quantity stepper.

Preserve product identifiers and requested quantities across navigation/refresh. Treat stored product prices and availability as stale display hints only. Revalidate after login, stock changes, address/fulfillment changes, and before order submission. Never place an order from a failed or stale quotation.

Show item-level stock/price changes without discarding the basket. Require acknowledgement of meaningful total changes. Do not silently reduce quantities or swap products.

### Checkout

Use a short sequence: **Delivery or pickup → Payment → Review/place order**, with saved contact details and a readable summary. A compact single page with progressive sections is acceptable if it is simpler on mobile.

- Logged-out users sign in and resume at the same basket.
- Delivery uses an owned saved address or a short address form. Use Indian address labels, six-digit PIN code format checks, and phone input that handles `+91` sensibly. Format validation does not imply actual delivery serviceability.
- Pickup shows the real bakery location and collection policy, hides delivery address fields, and uses the correct server-calculated total.
- Serviceability, delivery charges, and pickup policy come from persisted server configuration. Do not retain made-up ₹500 free-delivery or ₹5,000 wholesale-minimum rules from demo code unless the business explicitly adopts them.
- Do not show a delivery-slot picker until the server supports capacity, cutoffs, time zone, and concurrent slot reservations. Until then, present a truthful fulfillment estimate/policy without an invented exact time.
- Show UPI/cards only when the selected real provider supports them. Do not expose provider implementation names in customer labels. Do not add cash-on-delivery without a supported collection/reconciliation policy.
- Submit product IDs, quantities, owned address ID, delivery type, permitted notes, and an idempotency key. The server derives identity, price, discount, tax, entitlement, and total.
- Create/recover one order, then initiate/recover payment for that order. A double click, retry, browser reload, or payment return must not create another order.
- Do not clear a basket on a request timeout whose outcome is unknown. Recover order state through idempotency. Once creation is confirmed, transition basket intent to the recoverable order and let payment retries use that same order.

Payment states must distinguish pending verification, paid, failed, abandoned, and refunded where supported. Never mark an order paid from a redirect URL, frontend click, or delivery completion. When status is uncertain, say **“We’re checking your payment”**, offer a safe status refresh, and avoid encouraging a duplicate charge.

### After purchase

Provide order confirmation with order number, items, fulfillment details, verified payment status, and next steps. My orders shows only the account's orders. Order details provide a meaningful status timeline, delay reasons/revised estimates, and help.

Use different pickup and delivery progress labels. Display order status separately from payment status. A submitted order is not necessarily accepted; a paid order is not necessarily delivered.

Provide Buy again by creating a new editable basket and revalidating current stock/prices. Allow eligible unpaid orders to be cancelled through an ownership-checked, idempotent backend action with stock release. For paid cancellations, expose only the supported cancellation/refund request process; never promise an automatic refund until provider reconciliation exists.

Provide address management, account details, password recovery, and clear help/contact access. Do not add loyalty points, recommendations, wishlists, and subscriptions merely to fill space.

## 8. Shopkeeper experience: order stock, track it, manage dues

The retailer interface should feel like a helpful ordering desk. It must not contain bakery product-edit controls, other customers' orders, bakery revenue, or manufacturing controls.

Desktop: restrained sidebar and a compact contextual header. Mobile: four labelled primary destinations—**Home, Order stock, Orders, Payments**—with account/help in a small menu. An active basket can use a compact action bar without obscuring navigation, inputs, totals, or keyboard focus.

### Retailer Home

Lead with the shop name and **Order stock**. Show only the most useful information:

- Latest active order and its next meaningful step.
- Amount due and next due date, or an honest “Nothing due” state.
- Buy again from a recent order / suggestions based on purchase history.
- A relevant exception: approval problem, overdue amount, or delayed delivery.

Show approved payment terms in plain language such as “Payment due 15 days after invoice,” using actual account terms. Never hardcode Net-15 or invent credit. Do not fill Home with revenue charts, vanity statistics, or promotional widgets.

### Order stock

Use a compact desktop order list/table and stacked mobile rows. Keep name, pack contents, wholesale price, quantity, line total, availability, and Add action together. Mobile users should not scroll sideways to find quantities.

- Search and filter by actual categories.
- Express rules as “Box of 12; minimum 2 boxes; add 1 box at a time” when the model supports those units. Map pack counts to a single canonical inventory quantity consistently.
- Include direct numeric quantity entry and usable plus/minus controls. Validate on blur/submit without making typing impossible.
- Show the cheapest relevant unit explanation without confusing retail selling price with wholesale acquisition price.
- Do not show a percentage labelled “Profit” based only on retail versus wholesale prices. If later offering a potential gross spread calculation, label assumptions and exclude unsupported claims.
- Use a basket summary showing selected lines, total, and Review order. Adding one row should not repeatedly interrupt wholesale entry with a drawer.
- Order minima, pack increments, availability, tax, and discounts must be returned or enforced by the backend.
- Low stock, price changes, changed pack rules, and unavailable lines must be obvious and recoverable.

### Reorder

Use existing order history and 90-day suggestion logic. Label it honestly: “Based on your recent purchases.” It does not know the retailer's remaining shop stock or sell-through.

“Buy again” loads an editable basket; it never places an order or charges money automatically. Explain changed prices, unavailable items, and adjusted minimums before submission. Keep the user's final quantity choice in control. Saved named order lists can follow later if actual demand justifies persistence and UI.

### Wholesale checkout and approval

Prefill business identity and owned delivery details. Show optional GST details if supplied and validated. Permit pay-later only for an approved account with eligible terms and sufficient available credit. Check eligibility/exposure atomically on the server, including pending commitments, not only issued invoices.

Proposed order lifecycle:

1. Retailer submits a request → **Awaiting bakery confirmation** (`PENDING_REVIEW`), with a real inventory/credit reservation policy.
2. Bakery accepts and issues exactly one invoice.
3. Eligible credit order → **Confirmed**, invoice due date shown.
4. Immediate-payment order → **Awaiting payment**; verified payment → **Confirmed**.
5. Preparing → Ready for pickup or Out for delivery → Completed.
6. Delay/decline/cancellation are explicit exceptions with reason, permitted actions, and consistent release/reconciliation.

If the existing backend lifecycle is changed to support this, update the transition service, invoice creation, payment processing, tests, and frontend together. A successful payment callback must not silently bypass bakery acceptance for wholesale orders.

Define reservation expiry and extension policies for review/pending payment. Tell users when a reserved order expires. Release inventory/credit exactly once. Never promise unlimited stock holding while awaiting payment or review.

### Orders

Own orders only, with clear filters such as Active, Completed, and Cancelled/declined. Display order number, placed date, amount, fulfillment expectation, and status. Details show ordered quantities, accepted status, related invoice, timeline, and support. Reorder is easy to find.

A delayed order must explain the actual change. Avoid vague “processing” indefinitely or fake real-time GPS.

### Payments

Lead with amount due, overdue amount if any, next due date, and approved available credit. Show actual invoice states including partial payments. Provide invoice details, receipt/history, and statement tabs with server pagination and date filters.

Payment initiates through the backend and remains pending until verified. An invoice button must not instantly change its status to paid. Allow only amounts/actions supported by the billing model. Manual payment recording remains an administrator operation with an audit trail.

Provide a printable invoice view; a Download PDF action requires a real, authorised PDF response. If adding the download, extend invoice detail data to contain immutable seller/buyer identity, line items, tax breakdown, issue/due dates, and totals, instead of assembling a supposed tax invoice from mutable product data. An order summary must not be mislabelled as a statutory invoice.

Credit is an approved purchasing facility, not a wallet balance. If unavailable, show that state clearly. Handle overdue or insufficient-credit orders with an actionable explanation and supported pay-now path, not a disabled button with no explanation.

### Retailer account

Business/contact details, addresses, GST details if applicable, approval status, actual payment terms, and help. Terms/credit are read-only for retailers. Sensitive business identity changes may require review; ordinary contact corrections should not silently suspend the whole business without a clear policy and explanation.

## 9. Private bakery administration

Keep a separate, protected operational layout. Complete the workflows needed to make customer and retailer screens truthful:

- Order queue with customer/retailer distinction and permitted next actions derived from the state machine.
- Accept, delay with reason and revised estimate, decline with reason, and fulfill.
- Product/category management, imagery, retail/wholesale units/prices, dietary/ingredient information, availability, stock and controlled adjustments.
- Retailer applications, approval/rejection reasons, payment terms and credit limits.
- Invoice/receivables views and audited manual payments where supported.
- Reports from backend aggregate endpoints. Preserve “Not available” when historical cost is missing; never invent profit.

For conflicts between simultaneous staff actions, reload the current record and explain what changed rather than overwriting silently. Preserve historical order/invoice snapshots when a product, address, or business profile changes.

## 10. Visual system, Indian context, and accessibility

Use a coherent family of screens with differing density:

- Marketing: expressive typography, beautiful food imagery, deliberate composition, warm storytelling.
- Customer: familiar ecommerce patterns, readable product cards, comfortable spacing.
- Retailer/admin: compact readable rows, clear totals, stable navigation, restrained decoration.

Starting palette: warm ivory `#FFF8EF`, deep cocoa `#2D211B`, restrained brick red `#9C3D2B`, and soft toasted-gold accents. Treat these as starting tokens and verify contrast in actual combinations. Use distinct accessible semantic status colours. Do not use a decorative accent as a low-contrast text colour.

Use one expressive display face and one legible UI face. Existing Fraunces/Plus Jakarta Sans may be reused if they fit the new composition; avoid adding font families merely for novelty. Use tabular numerals for financial columns. Keep normal form text around 16px on phones; labels and important amounts must remain comfortably readable.

Use a consistent spacing scale, moderate radii, restrained borders/shadows, and clear focus treatment. Avoid excessive nested cards, pills for every element, glass effects, loud gradients, tiny all-caps paragraphs, floating decoration over controls, and charts without a user decision.

Indian localisation:

- Format money as INR with `en-IN` grouping; show units and tax-inclusive/exclusive treatment consistently with server policy.
- Use `Asia/Kolkata` for business dates, cutoffs, opening hours, and displayed fulfillment times. Store instants consistently and treat invoice date-only values carefully.
- Use familiar names and example addresses only in explicitly labelled development fixtures.
- Choose appropriate product photography: for example pav, khari, rusk, nankhatai, puffs, tea cakes, pastries, and celebration cakes, where they match real inventory. Do not replace accurate product content with stereotyped decoration.
- Use licensed/authentic product photos where available. Generated marketing concept imagery must not misrepresent the actual product, staff, premises, or certifications. Keep asset origins documented.
- Do not seed invented food claims or silently change actual inventory. Use an isolated demo catalog for presentation examples when needed.
- Keep English clear and simple. Make copy translation-ready; add regional languages later only with complete navigation, content, formatting, and search support.

Target WCAG 2.2 AA. Include semantic structure, associated labels, keyboard navigation, accessible errors, skip links, alt text, focus management for dialogs/drawers, and status announcements that do not become noisy. Verify focus is not hidden beneath sticky UI. Aim for 44×44 CSS-pixel touch targets for primary controls as a usability design target; do not confuse that with every WCAG AA minimum. Follow reduced-motion preferences and never rely on colour alone. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Test 320/360/390px mobile widths, tablet, 1366×768 laptop, and wider desktop. At 200% zoom and with long product/business names, controls must still work. Use locally scrollable data tables only when unavoidable; core mobile purchasing should not require one.

## 11. Real frontend/backend integration

Build one typed API boundary that handles response envelopes, paging, authentication, field errors, correlation IDs, cancellation, timeout, and safe retry policy. Generate types from OpenAPI if practical, or maintain tested explicit transport types and view-model adapters. Never cast arbitrary JSON directly to the existing mock types.

Existing routes use `/api/v1`:

| UI need | Backend source |
|---|---|
| Register/login/current identity | `/auth/register`, `/auth/login`, `/users/me` |
| Verification/reset | `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password` |
| Addresses | `/addresses` |
| Categories/products | `/catalog/categories`, `/catalog/products`, `/catalog/products/{idOrSlug}` |
| Quote | `/cart/quote` |
| Own orders | `/orders`, `/orders/{id}`, `/orders/by-number/{orderNumber}` |
| Retailer profile/status | `/retailers/profile`, `/retailers/me` |
| Reorder suggestions | `/retailers/reorder-suggestions` |
| Invoices/statement/summary | `/billing/invoices`, `/billing/ledger`, `/billing/summary` |
| Payment initiation/status | `/payments/initiate`, `/payments/{paymentAttemptId}` |
| Reviews | `/reviews`, `/reviews/products/{productId}`, `/reviews/products/{productId}/summary` |
| Bakery operations | Appropriate `/admin/**` routes |

Respect `ApiResponse.data`, paginated `data.content`, `categoryId`/`query` search parameters, `STORE_PICKUP`, UUID identifiers, and the backend status enums. The current frontend's `PENDING`, `PICKUP`, `timeline`, `shippingAddress`, and unwrapped arrays are not the backend contract. Do not collapse declined, cancelled, ready-for-pickup, awaiting-payment, or partially-paid states into generic labels.

Replace implicit “no API URL means demo” behavior with an explicit development-only demo switch. Production must fail clearly on missing configuration rather than falling back to fake identities, prices, balances, orders, or payment success.

Use server rendering where useful for public discovery; keep interaction state local where appropriate. Do not make every page a client component merely to fetch public data. Cache public content safely and ensure personalised wholesale data cannot leak through shared caches. Clear account-scoped caches on logout/identity changes.

## 12. Backend changes required for a trustworthy redesign

Prioritise these in the implementation plan:

1. Safe registration-role allowlist, correct session lifecycle, email verification/reset/resend delivery, role and object-level authorization.
2. Approved-retailer checks on wholesale catalog/quotes/orders; transactional credit eligibility/exposure including pending orders; private retailer-scoped reads.
3. One quotation/order calculation policy; separate retail/wholesale selling-unit rules; explicit tax, discount, delivery/pickup configuration and amount snapshots. The current hardcoded 5% is an implementation observation, not a verified tax rule for every bakery item. Validate tax policy with the business and authoritative current guidance before release; do not guess replacement rates.
4. Persist verified product attributes needed by UI, including dietary/ingredient/allergen fields. Model unknown separately from false. Add editable administration and API fields together.
5. Idempotent order creation with caller-scoped keys and request fingerprints, complete permitted-transition rules, inventory reservation/release, and conflict responses.
6. Exactly one invoice per accepted applicable order, historical invoice/order snapshots, atomic invoice payments and ledger/credit updates. Enforce invariants in the database as well as services.
7. Payment initiation ownership checks before idempotency replay; verify invoice/order/customer relationships. Prevent duplicate active charges where appropriate. Bind settlement to the expected provider, attempt, amount and currency. Handle duplicate, delayed, and out-of-order events without repeated financial effects or state regression.
8. Replace the payment URL scaffold with a provider integration verified against actual documentation. Keep a clearly labelled sandbox adapter for tests. Remove secret material from stored provider metadata and client responses. No claim of live payment readiness without end-to-end evidence.
9. A real email sender and durable outbox claiming/retry behavior, safe across multiple application workers. Do not hold database locks during slow external network calls. Fix transaction boundaries rather than assuming annotations on self-invoked methods are active.
10. Bounded pagination and safe sort allowlists; composable search filters; database aggregation for reports; query/N+1 review; consistent time-zone handling; historical cost snapshots for future margin accuracy.
11. Customer-owned unpaid cancellation and status recovery endpoints where needed. Add invoice-detail/print/download support rather than inventing unavailable contracts.
12. Server-managed serviceability and delivery/pickup policy if the checkout advertises it. Real capacity-based slots require their own transactional model; do not fake them with a date picker.

Treat user/account/product/financial data as distinct concerns. Avoid loading whole datasets into the browser. Do not introduce an unrelated framework rewrite as a substitute for fixing these paths.

## 13. Designing and testing for 1,000 concurrent active users

The requirement is simultaneous activity across browsing, quotation, orders, and retailer tasks. It is not “1,000 registered accounts,” and it is not automatically “1,000 requests per second.” Define user pacing and report actual throughput.

Keep the modular monolith. Use stateless application instances where practical and tune database connections against measured capacity. Multiple instances multiply pool pressure; do not allocate 1,000 database connections simply because there are 1,000 users.

Required safeguards:

- Database constraints and transactional stock/credit/financial updates.
- Consistent lock acquisition order across checkout, cancellation, stock adjustment, invoice/payment, and credit paths; bounded retries for recognised conflicts only.
- Unique/scoped idempotency and immutable order snapshots. Prices and totals are never browser authority.
- Protect account isolation in every query and mutation, including guessed IDs and replayed keys.
- Redis cache expiry/invalidation and safe fallback; never store the only copy of financial or inventory truth in Redis.
- Bounded lists, query indexes based on measured plans, efficient summary queries, and avoidance of N+1 reads.
- Short transactions; provider timeouts; durable retries outside interactive requests; multi-worker-safe outbox.
- Responsive image sizes, modern formats, selective lazy loading, useful cache headers, and no mandatory large hero video.
- Bounded/debounced search and quote requests; cancel stale requests; stop polling when tabs are hidden; back off on failures. Use explicit Refresh or sensible status polling before adding realtime infrastructure.
- Production secret management, limited monitoring endpoint exposure, rate limits, health checks, database backups and restore testing, and redacted logs.

Capacity acceptance test in an isolated, authorised staging environment:

1. Smoke-test actual authenticated customer and retailer journeys before applying load.
2. Seed at least 1,000 distinct relevant accounts and realistic volumes of orders/invoices/products; use varied owned data and approval/payment states.
3. Ramp to 1,000 concurrent VUs and sustain for at least 10 minutes, then ramp down. Include a separate longer soak and focused stock/credit/payment race tests.
4. Start with a measured traffic model around 60% browsing, 25% quotation, 10% ordering, and 5% retailer operations, then add dedicated financial-write, admin-change, and authentication scenarios. Report achieved operation counts, not only planned percentages.
5. Set proposed targets: read/quote p95 ≤500ms, transactional order creation p95 ≤1s excluding external payment wait, and unexpected failures <0.1%. Treat these as release targets requiring hardware-specific measurement.
6. Align the existing k6 threshold mismatch: 0.1% is `0.001`, not `0.01`. Add thresholds to correctness checks so failures fail the run. [Grafana k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).
7. Verify successful committed orders and payment effects. Do not let stock depletion turn the workload into mostly fast error responses. Classify expected stock/credit conflicts by business error code; do not accept every HTTP 400 as a valid stock rejection.
8. Assert inventory conservation, no negative stock, no duplicate order/invoice/settlement, consistent ledger balances, credit limits preserved, no account-data leakage, and no lost outbox work.
9. Record environment, application version, fixture size, achieved users, requests/second, latency distributions, failure classifications, CPU/memory, pool waits, locks, and raw test output. Do not report “handles 1,000 users” without this evidence.

## 14. Screen states and acceptance scenarios

For every data screen design loading, empty, populated, error/retry, and unavailable/forbidden states. Add relevant offline/slow-network, expired-session, stale-data, pending-action, and success states. Never substitute fabricated business data for loading or failed data.

Required journey checks:

| Scenario | Expected behavior |
|---|---|
| Visitor opens landing on mobile | Brand, purpose, main action and Login are clear; no operational clutter |
| Visitor adds retail products then logs in | Basket intent survives; prices and availability refresh; checkout resumes |
| Customer buys one retail unit | No wholesale minimum unexpectedly blocks them |
| Retailer registers | Profile persists; pending status is truthful; wholesale ordering remains locked until approval |
| Attacker submits admin role at signup | Server rejects it, regardless of UI |
| Customer tries retailer/admin URLs/APIs | No privileged data returned; appropriate redirect or error |
| Retailer A requests retailer B's order/invoice/payment | Server denies access, including idempotency replay paths |
| Returning retailer selects Buy again | Editable basket, current rules/prices, no automatic purchase |
| Two users buy the final available stock | Atomic valid allocation; loser sees useful recoverable stock feedback |
| Two orders compete for remaining credit | Combined exposure never exceeds approved credit |
| Checkout is double-clicked/retried | One recoverable order and no duplicate stock deduction |
| Payment redirect arrives before webhook | Pending verification shown; no invented paid status |
| Duplicate/out-of-order payment notifications | One financial effect; paid state does not regress incorrectly |
| Retailer has insufficient credit | Clear amount/eligibility explanation and supported pay-now action |
| Order is declined/cancelled | Correct stock/credit release once, truthful billing/refund status |
| Product or business details later change | Historical order/invoice remains accurate |
| Email delivery fails | Retried durable work; UI does not falsely assert successful email delivery |
| Keyboard/zoom/reduced-motion user completes checkout | Focus, labels, errors, summaries and actions remain usable |

Use meaningful unit and integration tests for rules and contracts, database-backed concurrency tests against PostgreSQL, and browser end-to-end tests for both roles. Mock-client tests alone are not integration tests. Preserve useful existing tests, but update tests that merely encode old demo assumptions.

## 15. Priorities and implementation sequence

**Core release:** landing, real role-based authentication/onboarding, customer shopping/cart/checkout/orders/addresses, retailer home/catalog/reorder/orders/payments/account, necessary private admin workflows, genuine API integration, Indian bakery content, accessibility, and data-integrity fixes.

**Next after the core works:** capacity-backed delivery slots, persisted saved order lists, cake variants/custom messages, order-linked issue reporting, verified batch freshness/shelf-life detail, and genuine invoice PDF export if not included in the core. Select by real user need and backend readiness. These are proposed extensions, not existing capabilities or promises to show in the first release.

**Defer:** recurring automatic orders/charges, loyalty schemes, multi-bakery marketplace, retailer point-of-sale/inventory ERP, speculative demand prediction, live GPS, and messaging-channel integrations.

Work in this order:

1. Recheck the source, tests, API contracts, and current screenshots. Produce an existing/partial/missing capability map. Identify any difference from this assessment.
2. Write a concise flow map, route/permission map, lifecycle rules, and screen responsibilities. Resolve the listed product choices before styling. Do not stop at a generic mood board.
3. Produce the visual system and representative desktop/mobile designs for landing, signup, customer catalog/checkout, and retailer home/order entry. Verify that the Indian bakery direction and simple task hierarchy are evident.
4. Implement the shared API/session boundary and backend release blockers. Create audience-specific layouts and migrate routes incrementally.
5. Complete one genuine customer purchase path and one genuine retailer application→approval→stock-order→invoice path before expanding secondary screens.
6. Finish all core screens/states, content and assets, account features, and required admin tasks. Remove dead controls and production mock fallbacks.
7. Run functional, authorization, accessibility, responsive, and production-build checks. Review actual desktop/mobile screenshots, fix material issues, and verify the fixes.
8. Run authorised staging performance/concurrency validation and document measured results. If live gateway credentials or staging resources are missing, finish the supported local/sandbox work, clearly report the exact remaining dependency, and do not claim production readiness.

Prefer vertical slices that remain usable and reviewable. Do not deliver only a polished homepage while customer checkout and retailer payments still use fake data.

## 16. Required deliverables and completion standard

Deliver:

- Updated product/user-flow specification and route/permission map.
- Updated design system describing the Indian bakery identity and per-role layouts.
- Complete implemented core journey with reusable accessible components and real API contracts.
- Necessary backend endpoints, policy fixes, additive migrations and meaningful tests.
- Asset provenance and a list of factual business content still needed, if any.
- Before/after desktop/mobile screenshots for representative workflows.
- Test/build results, known limitations, and measured capacity evidence or an explicit statement that capacity is not yet validated.
- A concise handoff explaining what changed, how each role uses it, and any remaining operational dependencies.

Before calling it complete, evaluate it as each person:

**Customer:** “Can I find familiar products, understand what I am buying, pay safely, and know what happens next?”

**Shopkeeper:** “Can I reorder the right stock quickly, see whether it is accepted and arriving, and understand exactly what I owe?”

**Bakery operator:** “Can I maintain the information those people rely on, resolve exceptions, and trust stock, invoices and payments under concurrent use?”

The result should feel like one thoughtful Indian bakery brand with clearly separated experiences: a memorable welcome, an easy customer shop, and a practical wholesale workspace. Every visible promise and action must correspond to real data and supported behavior.
