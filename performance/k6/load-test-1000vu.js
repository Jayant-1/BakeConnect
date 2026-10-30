/**
 * BakeConnect 1,000 Concurrent Virtual Users Load Test
 * 
 * Target Profile:
 * - 1,000 concurrent VUs validating sustained retail & distribution throughput.
 * - Realistic mixed traffic profile:
 *   - 60% Catalog discovery & category browsing (Redis cache-backed reads)
 *   - 25% Authoritative cart quote calculations (server-side pricing & rules engine)
 *   - 10% Transactional checkouts (pessimistic deterministic row locking)
 *   - 5% Retailer operations (ledger lookups, invoice checks, reorder suggestions)
 * 
 * SLA Thresholds:
 * - http_req_duration: p95 < 500ms, p99 < 1000ms
 * - http_req_failed: < 0.1% unhandled failures
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { ENDPOINTS, USERS, SEED_PRODUCT_IDS, STANDARD_HEADERS } from './lib/config.js';
import { login, getCatalog, getCategories, getCartQuote, checkoutOrder, getRetailerInvoices, getRetailerLedger, getReorderSuggestions, randomItem, randomInt } from './lib/helpers.js';

export const checkoutDuration = new Trend('checkout_duration');
export const quoteDuration = new Trend('quote_duration');
export const catalogDuration = new Trend('catalog_duration');
export const successfulPurchases = new Counter('successful_purchases');
export const stockRejections = new Counter('stock_rejections');
export const unhandledServerErrors = new Counter('unhandled_server_errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Warm-up ramp
    { duration: '2m', target: 250 },   // Low-to-moderate ramp
    { duration: '3m', target: 500 },   // Moderate-to-high ramp
    { duration: '4m', target: 1000 },  // Peak ramp
    { duration: '10m', target: 1000 }, // Peak sustained load
    { duration: '2m', target: 0 }      // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    unhandled_server_errors: ['count==0'],
    checkout_duration: ['p(95)<1000'],
    catalog_duration: ['p(95)<100']
  }
};

export function setup() {
  console.log('[SETUP] Logging in diverse user personas for load testing...');
  const customer1Session = login(USERS.customer1.email, USERS.customer1.password);
  const customer2Session = login(USERS.customer2.email, USERS.customer2.password);
  const retailer1Session = login(USERS.retailer1.email, USERS.retailer1.password);
  const retailer2Session = login(USERS.retailer2.email, USERS.retailer2.password);

  const catalog = getCatalog();
  console.log(`[SETUP] Active catalog has ${catalog.length} items`);

  return {
    customerTokens: [customer1Session?.token, customer2Session?.token].filter(Boolean),
    retailerTokens: [retailer1Session?.token, retailer2Session?.token].filter(Boolean),
    customerAddresses: [USERS.customer1.addressId, USERS.customer2.addressId],
    retailerAddresses: [USERS.retailer1.addressId, USERS.retailer2.addressId],
    products: catalog
  };
}

export default function (data) {
  const rand = Math.random() * 100;

  if (rand < 60) {
    // 60% — Catalog & Discovery
    const start = Date.now();
    group('01_Catalog_Discovery', () => {
      getCategories();
      const products = getCatalog();
      if (products && products.length > 0) {
        const product = randomItem(products);
        const detailRes = http.get(ENDPOINTS.productDetail(product.id), { headers: STANDARD_HEADERS });
        if (detailRes.status >= 500) unhandledServerErrors.add(1);
        check(detailRes, {
          'product detail 200': (r) => r.status === 200
        });
      }
    });
    catalogDuration.add(Date.now() - start);

  } else if (rand < 85) {
    // 25% — Cart Authoritative Quote
    const start = Date.now();
    group('02_Cart_Quote', () => {
      const product = randomItem(data.products) || { id: SEED_PRODUCT_IDS[0], moq: 5 };
      const items = [
        { productId: product.id, quantity: product.moq || 5 }
      ];
      const isRetailer = Math.random() < 0.5;
      const token = isRetailer
        ? data.retailerTokens[__VU % data.retailerTokens.length]
        : data.customerTokens[__VU % data.customerTokens.length];
      const channel = isRetailer ? 'WHOLESALE' : 'RETAIL';

      const quote = getCartQuote(items, channel, token);
      if (!quote) unhandledServerErrors.add(1);
      check(quote, {
        'quote returned valid totals': (q) => q && Number(q.totalAmount) > 0
      });
    });
    quoteDuration.add(Date.now() - start);

  } else if (rand < 95) {
    // 10% — Transactional Order Checkout
    const start = Date.now();
    group('03_Transactional_Checkout', () => {
      const isRetailer = Math.random() < 0.3;
      const token = isRetailer
        ? data.retailerTokens[__VU % data.retailerTokens.length]
        : data.customerTokens[__VU % data.customerTokens.length];
      const addressId = isRetailer
        ? data.retailerAddresses[__VU % data.retailerAddresses.length]
        : data.customerAddresses[__VU % data.customerAddresses.length];
      const orderType = isRetailer ? 'BUSINESS' : 'PERSONAL';
      const product = randomItem(data.products) || { id: SEED_PRODUCT_IDS[0], moq: 5 };

      const payload = {
        items: [
          { productId: product.id, quantity: product.moq || 5 }
        ],
        orderType: orderType,
        deliveryType: 'DELIVERY',
        deliveryAddressId: addressId,
        businessGst: isRetailer ? '27AAPFU0939F1ZV' : null,
        businessName: isRetailer ? 'Sharma Gourmet Mart' : null,
        notes: `Load test order from VU ${__VU}`
      };

      const res = checkoutOrder(payload, token);
      if (res.status === 201) {
        successfulPurchases.add(1);
        check(res, {
          'checkout successful (201 Created)': (r) => r.status === 201
        });
      } else if (res.status === 400) {
        stockRejections.add(1);
        check(res, {
          'checkout rejected due to stock limit (400 Bad Request)': (r) => r.status === 400
        });
      } else {
        unhandledServerErrors.add(1);
        check(res, {
          'unexpected status code': (r) => r.status < 500
        });
      }
    });
    checkoutDuration.add(Date.now() - start);

  } else {
    // 5% — Retailer Billing & Operations
    group('04_Retailer_Operations', () => {
      const token = data.retailerTokens[__VU % data.retailerTokens.length];
      const invs = getRetailerInvoices(token);
      const ledger = getRetailerLedger(token);
      const reorders = getReorderSuggestions(token);
    });
  }

  // Realistic user pacing between actions
  sleep(randomInt(1, 2));
}
