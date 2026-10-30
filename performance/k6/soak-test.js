/**
 * BakeConnect Soak / Endurance Test
 * 
 * Target: Sustained 200 concurrent VUs over an extended operational window.
 * Purpose: Detect slow memory leaks, database connection pool exhaustion, Redis client
 * unclosed resources, garbage collection pauses, and performance degradation over time.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { ENDPOINTS, USERS, SEED_PRODUCT_IDS, STANDARD_HEADERS } from './lib/config.js';
import { login, getCatalog, getCategories, getCartQuote, checkoutOrder, randomItem, randomInt } from './lib/helpers.js';

export const iterationLatency = new Trend('soak_iteration_latency');

export const options = {
  stages: [
    { duration: '2m', target: 200 },                     // Ramp up
    { duration: __ENV.SOAK_DURATION || '15m', target: 200 }, // Steady state soak
    { duration: '1m', target: 0 }                       // Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<600', 'p(99)<1200'],
    http_req_failed: ['rate<0.005']
  }
};

export function setup() {
  const customerSession = login(USERS.customer1.email, USERS.customer1.password);
  const retailerSession = login(USERS.retailer1.email, USERS.retailer1.password);

  if (!customerSession || !retailerSession) {
    throw new Error('Failed to login personas in soak test setup');
  }

  return {
    customerToken: customerSession.token,
    retailerToken: retailerSession.token
  };
}

export default function (data) {
  const start = Date.now();
  const rand = Math.random();

  if (rand < 0.6) {
    // 60% Read-heavy browsing
    http.get(ENDPOINTS.categories, { headers: STANDARD_HEADERS });
    const res = http.get(ENDPOINTS.products, { headers: STANDARD_HEADERS });
    check(res, { 'catalog ok': (r) => r.status === 200 });

  } else if (rand < 0.85) {
    // 25% Cart quotes
    const items = [{ productId: SEED_PRODUCT_IDS[0], quantity: 5 }];
    const quote = getCartQuote(items, 'RETAIL', data.customerToken);
    check(quote, { 'quote ok': (q) => q !== null });

  } else {
    // 15% Transactional orders
    const payload = {
      items: [{ productId: randomItem(SEED_PRODUCT_IDS), quantity: 5 }],
      orderType: 'PERSONAL',
      deliveryType: 'DELIVERY',
      deliveryAddressId: USERS.customer1.addressId,
      notes: `Soak order VU ${__VU}`
    };

    const res = checkoutOrder(payload, data.customerToken);
    check(res, { 'order processed': (r) => r.status === 201 || r.status === 400 });
  }

  iterationLatency.add(Date.now() - start);
  sleep(randomInt(2, 4));
}
