# BakeConnect: project assessment for the user-flow redesign

Reviewed on 29 October 2026. This assessment supports [the master redesign prompt](MASTER_REDESIGN_PROMPT.md). It records current implementation evidence separately from proposed behavior. Application source was not changed during this assessment.

## 1. Product understanding and confirmed scope

BakeConnect is a single bakery's direct-ordering and wholesale-distribution application. It is not currently a marketplace of independently managed bakeries. The user explicitly confirmed that **shopkeeper means a wholesale retailer buying stock**, not the bakery administrator.

There are consequently two public account choices and three operational roles:

| Person | Job | Backend role | Intended destination |
|---|---|---|---|
| Customer | Buy bakery products for personal use | `DIRECT_CUSTOMER` | Simple ecommerce storefront |
| Shopkeeper / retailer | Purchase stock, repeat orders, track deliveries, manage dues | `RETAILER` | Private wholesale workspace |
| Bakery owner / staff | Manage bakery catalog, inventory, orders, approvals, receivables | `BAKERY_ADMIN` | Private administration workspace |

`DELIVERY_PERSON` exists in the backend enum, but a delivery-person product is not needed for the requested redesign. Public visitors should browse without an account; login is required for protected checkout and account actions. Public registration must never grant administrator access.

## 2. What was inspected and verified

Inspected the frontend route tree, shared layout, navigation, hero, product and cart components, API client, types, mock data, checkout, customer order tracking, wholesale application, retailer order guide and invoices, and admin catalog/order/report screens. Inspected backend controllers, request/response contracts, security configuration, identity, catalog, quotation, ordering, retailer profiles, reorder suggestions, billing, payment/webhook handling, notification worker, reviews, reporting, entities, repositories, Flyway migrations, deployment configuration, tests, and load-test scripts. Existing design/audit/handoff documents were treated as background claims and compared with implementation.

The local frontend was already running at `http://localhost:3000`. Browser inspection covered the landing page, retailer workspace, customer shop, and admin overview at desktop and/or mobile sizes. Screenshots are in [evidence](evidence/). These show the current **demo UI**, not authenticated production workflows. No customer order or real payment was submitted.

Verification performed:

| Check | Result | What it establishes |
|---|---|---|
| `pnpm test` in frontend | 15 tests passed across 3 files | Current mock-client calculations and workflows pass their existing tests |
| `pnpm type-check` | Passed | Current TypeScript types compile |
| `mvn -o test` in backend | 66 tests passed | Existing backend unit/service tests pass |
| Browser inspection | Completed on selected screens | Current rendering and exposed navigation were observed |
| Production build | Not run in this assessment | Existing handoff build claims were not revalidated |
| Real integrated authentication/order/payment flow | Not exercised | Cannot claim live frontend/backend integration works |
| 1,000-user performance test | Not run | Capacity remains a target, not a result of this assessment |

The first backend test attempt failed because the restricted process could not initialize Mockito's agent attachment. The permitted rerun passed all 66 tests. The host runs Java 26; the project targets Java 21. Passing these tests does not resolve the source-level gaps below or establish PostgreSQL concurrency correctness.

The folder is not a Git working tree in this environment, so revision history and a Git diff were unavailable. The Impeccable context helper exited without output; interface analysis used its written guidance, the source, and browser evidence.

## 3. Current architecture

| Layer | Implementation | Assessment |
|---|---|---|
| Web application | Next.js 15.1.7, React 19, TypeScript, Tailwind 3.4, selected Radix primitives, Lucide | Suitable foundation; keep and restructure layouts by audience |
| Frontend data | Custom `apiClient`, module-level demo arrays, React context, localStorage cart | Demonstration-oriented; not an authenticated production data layer |
| Backend | Spring Boot 3.4.1 modular monolith, Java 21 target, virtual threads | Preserve; no need to introduce microservices for this brief |
| Database | PostgreSQL 18 in Compose, JPA, Flyway V1–V3 | Authoritative data belongs here; new features require additive migrations |
| Cache | Redis cache configuration with source fallback | Categories/review summaries have actual caching; product-cache names exist without corresponding cached product read methods |
| Identity | BCrypt, bearer JWT, user profile and owned addresses | Backend foundations exist; frontend login/session experience is missing |
| Ordering | Server prices, product row locks, order snapshots, history, order version | Useful foundations, but workflow and race handling need strengthening |
| Wholesale | Retailer approval records, terms, credit limits, 90-day reorder suggestions | Useful functionality currently disconnected or only partly enforced |
| Finance | Invoices, ledger, summaries, payment attempts, signed webhook handling | Needs ownership, idempotency, concurrency, and reconciliation work |
| Notifications | Persistent outbox, scheduled retry worker, `MockEmailService` | Not real email delivery |
| Testing | Vitest, Java unit/service tests, k6 scenarios | Existing tests are a starting point, not full-system evidence |

The repository's current appearance intentionally imitates an artisan French boulangerie. This conflicts with the new Indian-neighbourhood-bakery brief. Reuse useful typography and components if appropriate, but replace the subject matter, information hierarchy, and mixed-role navigation.

## 4. Frontend findings that directly affect users

| Priority | Finding and evidence | User impact / redesign consequence |
|---|---|---|
| Release blocker | No login, signup, verification, reset-password, or account route exists in the current route tree. `apiClient.getCurrentUser()` always returns a mock persona. | The requested real account journey must be built, not merely restyled. |
| Release blocker | `frontend/lib/api/client.ts` calls `/api/products`, `/api/cart/validate`, `/api/retailer/invoices`, and other paths different from the backend. It returns `res.json()` as domain objects without unwrapping `ApiResponse.data` or paginated `data.content`. Protected calls do not attach bearer authentication. | Setting the API URL alone cannot connect this frontend to Spring Boot. Build a contract-correct API layer. |
| High | `frontend/app/layout.tsx` wraps every route with the same announcement bar, storefront navbar, cart drawer, and footer. | Retailers and administrators see irrelevant shopping/marketing controls. Introduce distinct layouts. |
| High | Navbar, hero, and cart expose B2C/B2B toggles; `/retailer` changes the shared cart channel automatically. | A visitor can change pricing context accidentally. Role and eligibility must come from the server. |
| High | Retailer screen requests `getAllOrders()` and filters by `BUSINESS`, rather than using the authenticated user's order endpoint. | Incorrect authorization model for live integration; use ownership-scoped requests. |
| High | Checkout prepopulates a fictional identity/address, submits browser-computed totals and embedded address data, and does not initiate the backend payment flow. Demo order creation immediately marks many orders paid. | Customers can see false success. Replace with owned saved addresses, server quotation, order creation, and verified payment state. |
| High | Frontend and backend disagree on quantity rules, delivery charges, order status names, address shape, and fulfillment enums. | A visually successful demo can fail on real checkout. Resolve contracts before polishing. |
| High | Product reviews are hardcoded/local and new reviews receive `verifiedPurchase: true` without checking a purchase. Slicing options are not included in the submitted cart/order. | Trust and customization are misleading; use real review APIs and only offer persisted options. |
| High | Retailer/invoice screens contain fixed approval, Net-15 terms, credit fallback amounts, a cutoff countdown, and a due date. | Missing or failed data can look like real financial entitlement. Use loading, unknown, pending, rejected, and error states. |
| Medium | Wholesale application form only changes `submitted` state. | It appears to apply without creating an account/profile. Replace with real onboarding. |
| Medium | Catalog fetches the full product list, then filters/sorts on the client. | Does not align with backend pagination and becomes inefficient as the catalog grows. |
| Medium | Many failures are only logged to the console; stale cart validation can remain visible after a failed refresh. | Users do not know whether data is current. Add recoverable inline errors and block checkout with an invalid/stale quote. |
| Medium | Admin reports calculate finances in the browser and invent missing unit cost as 45% of price. | Reports can imply profit that is not supported by data. Consume backend reports and show unavailable values honestly. |
| Medium | Technical terms such as “authoritative,” “Spring Boot,” “SKU matrix,” and “CRUD” appear in ordinary screens. | Replace with “Order stock,” “Payment status,” “Products,” and clear next actions. |

Browser evidence supports the layout findings:

- [Desktop landing](evidence/bakeconnect-before-desktop.png): multiple context controls compete with the hero; its primary action is below the captured short-laptop viewport.
- [Retailer mobile](evidence/bakeconnect-retailer-mobile.png): the first 844 pixels are largely announcements, account summary, and reorder banner; actual products are below them. The product table needs horizontal scrolling to reach quantities/actions.
- [Shop mobile](evidence/bakeconnect-shop-mobile.png): navigation and a large filter block push the first product substantially down the page.
- [Admin desktop](evidence/bakeconnect-admin-desktop.png): private operations inherit storefront navigation and a consumer cart. This is demo accessibility, not evidence that backend admin authorization is absent.
- [Landing mobile after visiting retailer](evidence/bakeconnect-landing-mobile.png): wholesale mode persists back into the landing page, illustrating the shared-channel problem.

## 5. Backend gaps that the redesign must not conceal

These are source-review findings, not exploitation results.

1. **Registration role escalation.** `RegisterRequest` accepts the full `UserRole` enum; `AuthService.register()` persists `request.role()` unchanged; `/api/v1/auth/**` is public. Restrict public registration to customer and retailer server-side. Hiding an administrator option in the form is insufficient.
2. **Approval and credit eligibility.** Catalog and quotation select wholesale prices from role alone. `OrderService.createOrder()` checks role for business orders but does not check an approved retailer profile or enforce credit exposure. A profile's recorded credit limit is not an enforced credit limit. Make eligibility and credit checks transactional.
3. **Identity lifecycle is incomplete.** Registration creates a verification token, and reset requests create reset tokens, but neither path sends the relevant email. Verification tokens have no explicit expiry in the inspected model. Login checks active status but not verification. Define and implement the complete email-verification/session policy.
4. **Retail quantities inherit wholesale MOQ.** Quote and order creation apply product MOQ and increments regardless of customer versus retailer. The UI lets a customer add one item. Define a retail selling unit separately from wholesale packs/minimums.
5. **Quotation and order policy drift.** Tax and volume discount logic are duplicated in quote and order services. Delivery fees/free-delivery thresholds exist in the frontend demo but not in the inspected backend quote/order totals. Discount-rule tables exist, while the active services use constants. Use one authoritative calculation policy.
6. **Incomplete order transition validation.** `validateStatusTransition()` only blocks transitions from a few terminal states; it does not implement a complete allowed-transition graph. Generic `CONFIRMED` transitions and payment confirmation can bypass the invoice-creation behavior in `acceptOrder()`. Personal orders can be marked paid merely by marking them delivered. Centralize lifecycle transitions and separate fulfillment from payment.
7. **Incomplete retry and concurrency protection.** Order creation has no request idempotency key. Product and order versions help, but invoice/payment records and ledger running-balance updates lack an equivalent demonstrated serialization strategy. `invoices.order_id` has an index, not a uniqueness constraint. Cancellation stock restoration is not using the same sorted locking approach as creation. Test and implement atomic retry-safe behavior across these paths.
8. **Payment ownership gaps.** `PaymentService.initiatePayment()` returns an existing idempotency-key attempt before verifying ownership; a supplied invoice is loaded without checking that it belongs to the requester and selected order. Scope keys and validate the whole relationship first.
9. **Payment integration is a scaffold.** `YouPiPgPaymentProvider` constructs a URL/random reference and its verification method returns success; it makes no real gateway request. Its metadata also includes the API key. Do not present this as a production payment integration or store secret material in payment-response metadata.
10. **Webhook state/reconciliation gaps.** Amount and currency are checked only when provided. Delivery-ID deduplication is not the same as settlement idempotency across distinct event deliveries. Successful events can auto-confirm wholesale orders without the normal acceptance/invoice flow; a later failure can downgrade an attempt. Enforce provider/order/invoice binding, required fields, monotonic transitions, and exactly-once financial effects.
11. **Outbox is not deployment-ready email.** The only email service logs messages. The worker has no claim/lease/skip-locked coordination for multiple workers, and `pollOutbox()` calls its own transactional method. Define transaction boundaries explicitly and account for worker crashes and duplicate delivery.
12. **Reporting has scale and historical-correctness gaps.** Reports load and traverse full collections; retailer growth iterates retailer histories. Cost is read from the current product rather than a historical order-item cost snapshot. Add aggregate queries, bounded periods, correct business-date boundaries, and historical snapshots where required.
13. **Pagination/caching is uneven.** Catalog limits page size, but several other controllers do not. Catalog search takes precedence over category rather than composing both. Product cache configurations are not proof that read paths use them. Measure queries and bound all list/search paths.
14. **Deployment configuration needs a production pass.** Demo identities and development secret defaults appear in configuration; actuator paths are public; image remote patterns accept any HTTPS host. Separate development configuration and constrain production exposure and image origins.

These issues warrant backend work in the eventual implementation. They are not reasons to rewrite the entire stack.

## 6. API contract map

All backend paths below begin with `/api/v1`. Responses are wrapped in `ApiResponse<T>`; lists may use Spring `Page<T>`.

| Capability | Existing endpoint(s) |
|---|---|
| Identity | `POST /auth/register`, `POST /auth/login`, `GET /users/me` |
| Verification/recovery | `GET /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Addresses | `GET/POST /addresses`, `PUT/DELETE /addresses/{id}` |
| Categories/products | `GET /catalog/categories`, `GET /catalog/products`, `GET /catalog/products/{idOrSlug}` |
| Quotation | `POST /cart/quote` |
| Own orders | `POST/GET /orders`, `GET /orders/{id}`, `GET /orders/by-number/{orderNumber}` |
| Retailer onboarding | `POST /retailers/profile`, `GET /retailers/me` |
| Reorder suggestions | `GET /retailers/reorder-suggestions` |
| Billing | `GET /billing/invoices`, `GET /billing/invoices/{id}`, `GET /billing/ledger`, `GET /billing/summary` |
| Payments | `POST /payments/initiate`, `GET /payments/{paymentAttemptId}`, provider webhook |
| Reviews | `POST /reviews`, `GET /reviews/products/{productId}`, `GET /reviews/products/{productId}/summary` |
| Administration | Catalog CRUD/stock, order accept/delay/decline/status, retailer approvals, manual invoice-payment recording, reports under `/admin/**` |

The product contract has no persisted dietary/allergen/freshness/variant fields equivalent to the rich frontend mock model. There is no inspected first-class delivery-slot, saved-list, wishlist, complaint, cancellation-request, refund-execution, or invoice-PDF endpoint. Those must be added deliberately or omitted from functional UI until supported.

## 7. Capacity assessment

The design goal of 1,000 concurrent active users is reasonable to test against with the existing architecture. It is **not established by the README or a UI redesign**.

The README explicitly reports a load run at **100 VUs peak**, despite referencing a 1,000-VU engine; it separately reports a short 500-VU spike. The 1,000-VU script exists, but its setup reuses two authenticated personas. That does not demonstrate isolation or realistic data access for 1,000 accounts.

Additional test-suite weaknesses:

- The headline error target is 0.1%, while the main script permits `http_req_failed < 0.01` (1%).
- Checks may fail without failing the run unless connected to thresholds. Add explicit correctness thresholds. [Grafana's checks documentation](https://grafana.com/docs/k6/latest/using-k6/checks/).
- Checkout treats any HTTP 400 as a stock-limit rejection, potentially hiding payload/rule failures. Check business error codes and distinguish expected contention from broken requests.
- The integrity script logs initial/final stock but does not assert conservation against successful order quantities.
- Stock exhaustion can turn a sustained write benchmark into mostly fast rejections. Maintain realistic fixture capacity and report successful committed writes separately.
- Billing writes, payment retries, out-of-order webhooks, cancellation races, approval changes, and multiple outbox workers need separate contention tests.

Use explicit hardware and deployment assumptions; record achieved VUs, throughput, p95/p99 by operation, CPU/memory, database pool waits/locks, business rejection rates, inventory conservation, ledger reconciliation, and account-isolation results. Consistent acquisition order matters across all competing database write paths, not only order creation. [PostgreSQL locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html).

## 8. Recommended product decisions

Choose **one brand, separate role-specific workspaces**, using the existing backend modules. A cosmetic-only update would leave the broken journey intact. A new marketplace/microservice rewrite would add complexity beyond the user's need.

| Audience problem | Recommended response | Dependency / priority |
|---|---|---|
| Customer cannot quickly tell what to buy | Familiar product categories, clear pack size and price, simple search | Core redesign; real catalog data |
| Customer worries about egg/ingredients | Verified eggless/ingredient/allergen fields, clear unknown state | Core product-data extension; do not infer from photography |
| Customer loses context after login | Preserve cart and intended route; refresh the quote | Core auth/cart integration |
| Customer is unsure whether payment succeeded | Payment pending/confirmed/failed screens; recover the existing order | Core payment integration |
| Customer does not know delivery feasibility | Real service area, delivery/pickup policy, honest ETA | Core configuration; capacity-based slots are a later extension |
| Retailer re-enters the same purchase | Reorder last order into an editable, revalidated basket | Core; existing history and suggestion services |
| Retailer makes pack-size mistakes | Show pack contents, minimum packs, order increment and line total | Core; quantity-model correction |
| Retailer struggles to understand dues | Amount due, next due date, available credit, invoice/statement history | Core; real billing APIs and concurrency fixes |
| Retailer gets delayed stock unexpectedly | Visible exception with revised ETA and contact/help action | Core; existing delay data, real notifications |
| Bakery must approve retailers | Private review queue, approval reasons, payment terms and credit | Core admin completion |
| Retailer wastes stock | Editable cadence suggestions and verified shelf-life information | Core informational support; stock forecasting requires new retailer inventory data |
| Customer has a celebration-specific order | Cake variant/message/date flow | Later; variant pricing and capacity support required |
| Retailer receives damaged/short delivery | Order-linked issue reporting and resolution tracking | Later; new support workflow required |

Do not pretend BakeConnect knows stock inside the retailer's shop: it currently knows purchases from the bakery. Reorder suggestions must explain that basis. Avoid presenting a retail/wholesale price difference as the retailer's actual profit.

Use the master prompt as the implementation brief. Its chosen flow prioritizes warmth and appetite on the public landing page, familiarity in customer shopping, and speed and clarity in wholesale operations.
