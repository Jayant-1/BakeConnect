/**
 * BakeConnect Stress Test
 * 
 * Target: Beyond nominal capacity — ramp up to 1,500 concurrent Virtual Users.
 * Purpose: Identify breaking points, resource exhaustion thresholds, database pool saturation,
 * and recovery characteristics under extreme stress.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { ENDPOINTS, USERS, SEED_PRODUCT_IDS, STANDARD_HEADERS } from './lib/config.js';
import { login, getCatalog, getCategories, getCartQuote, checkoutOrder, randomItem, randomInt } from './lib/helpers.js';

export const errorCount = new Counter('stress_errors');

export const options = {
  stages: [
    { duration: '1m', target: 250 },   // Initial acceleration
    { duration: '2m', target: 750 },   // Exceeding normal load
    { duration: '2m', target: 1200 },  // Entering stress territory
    { duration: '3m', target: 1500 },  // Peak breaking point evaluation
    { duration: '3m', target: 1500 },  // Hold at peak stress
    { duration: '2m', target: 0 }      // Recovery ramp-down
  ],
  thresholds: {
    // Under stress we observe degradation; SLA allows higher latencies but expects graceful recovery
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'] // Keep total unexpected failures below 5%
  }
};

export function setup() {
  const customerSession = login(USERS.customer1.email, USERS.customer1.password);
  if (!customerSession) throw new Error('Customer login failed in stress setup');

  return {
    customerToken: customerSession.token
  };
}

export default function (data) {
  const rand = Math.random();

  if (rand < 0.7) {
    // 70% Catalog browsing (Redis cache stress)
    const res = http.get(ENDPOINTS.products, { headers: STANDARD_HEADERS });
    if (res.status !== 200) errorCount.add(1);
    check(res, { 'catalog status 200': (r) => r.status === 200 });

  } else if (rand < 0.9) {
    // 20% Authoritative quote computation
    const items = [{ productId: SEED_PRODUCT_IDS[0], quantity: 5 }];
    const quote = getCartQuote(items, 'RETAIL', data.customerToken);
    if (!quote) errorCount.add(1);

  } else {
    // 10% Transactional checkouts (Pessimistic DB lock stress)
    const payload = {
      items: [{ productId: randomItem(SEED_PRODUCT_IDS), quantity: 5 }],
      orderType: 'PERSONAL',
      deliveryType: 'DELIVERY',
      deliveryAddressId: USERS.customer1.addressId,
      notes: `Stress order VU ${__VU}`
    };

    const res = checkoutOrder(payload, data.customerToken);
    if (res.status >= 500) {
      errorCount.add(1);
    }
  }

  sleep(randomInt(1, 2));
}
