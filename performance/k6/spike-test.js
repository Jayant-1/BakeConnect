/**
 * BakeConnect Spike Test
 * 
 * Target: Sudden extreme traffic surge — 0 to 800 concurrent VUs within 15 seconds.
 * Purpose: Simulates flash sale or festive ordering rush. Tests thread pool elastcity,
 * virtual thread dispatch, connection pool queueing, and immediate self-recovery.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { ENDPOINTS, USERS, SEED_PRODUCT_IDS, STANDARD_HEADERS } from './lib/config.js';
import { login, getCatalog, getCartQuote, randomItem, randomInt } from './lib/helpers.js';

export const options = {
  stages: [
    { duration: '10s', target: 50 },   // Low baseline
    { duration: '15s', target: 800 },  // SUDDEN SPIKE to 800 VUs
    { duration: '1m', target: 800 },   // Hold the spike
    { duration: '15s', target: 50 },   // Fast recovery drop
    { duration: '30s', target: 0 }     // Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // Expect temporary queuing during spike
    http_req_failed: ['rate<0.02']     // Allow max 2% failure under acute spike
  }
};

export function setup() {
  const session = login(USERS.customer1.email, USERS.customer1.password);
  if (!session) throw new Error('Customer login failed in spike setup');

  return {
    customerToken: session.token
  };
}

export default function (data) {
  const rand = Math.random();

  if (rand < 0.8) {
    // 80% Read catalog & categories (Cached reads under spike)
    const res = http.get(ENDPOINTS.products, { headers: STANDARD_HEADERS });
    check(res, {
      'spike read 200': (r) => r.status === 200
    });
  } else {
    // 20% Authoritative cart quote
    const items = [{ productId: SEED_PRODUCT_IDS[0], quantity: 5 }];
    const quote = getCartQuote(items, 'RETAIL', data.customerToken);
    check(quote, {
      'spike quote calculated': (q) => q !== null
    });
  }

  sleep(randomInt(1, 2));
}
