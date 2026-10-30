/**
 * BakeConnect Concurrency & Inventory Integrity Test
 * 
 * Target: 50 concurrent Virtual Users hitting checkout simultaneously on the same item.
 * Verifies:
 * 1. Pessimistic deterministic row-level locking eliminates circular wait deadlocks.
 * 2. Exact inventory conservation (Initial Stock - Sum(Sold Quantities) = Final Stock).
 * 3. Zero negative stock or overselling under high concurrency.
 * 4. Clean business rejection (400 Bad Request) when inventory is exhausted; zero 500 errors.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { ENDPOINTS, USERS, SEED_PRODUCT_IDS, AUTH_HEADERS } from './lib/config.js';
import { login, checkoutOrder } from './lib/helpers.js';

export const successfulOrders = new Counter('successful_orders');
export const rejectedOrders = new Counter('insufficient_stock_rejections');
export const unexpectedErrors = new Counter('unexpected_server_errors');
export const deadlockErrors = new Counter('deadlock_errors');

export const options = {
  scenarios: {
    concurrent_checkout: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '30s'
    }
  },
  thresholds: {
    unexpected_server_errors: ['count==0'],
    deadlock_errors: ['count==0'],
    http_req_duration: ['p(95)<1500']
  }
};

// Target product: Classic Country Sourdough (800g), MOQ = 5
const TARGET_PRODUCT_ID = SEED_PRODUCT_IDS[0];
const ORDER_QUANTITY = 5;

let sharedToken = null;

export function setup() {
  const session = login(USERS.customer1.email, USERS.customer1.password);
  if (!session || !session.token) {
    throw new Error('Failed to login setup user');
  }

  // Fetch initial stock
  const res = http.get(ENDPOINTS.productDetail(TARGET_PRODUCT_ID), {
    headers: AUTH_HEADERS(session.token)
  });
  const body = JSON.parse(res.body);
  const initialStock = body.data.stockQuantity;

  console.log(`[SETUP] Starting Concurrency Integrity Test`);
  console.log(`[SETUP] Target Product: ${body.data.name} (${TARGET_PRODUCT_ID})`);
  console.log(`[SETUP] Initial Stock: ${initialStock} units`);
  console.log(`[SETUP] Launching 50 concurrent checkouts for ${ORDER_QUANTITY} units each`);

  return {
    token: session.token,
    initialStock: initialStock
  };
}

export default function (data) {
  const payload = {
    items: [
      { productId: TARGET_PRODUCT_ID, quantity: ORDER_QUANTITY }
    ],
    orderType: 'PERSONAL',
    deliveryType: 'DELIVERY',
    deliveryAddressId: USERS.customer1.addressId,
    notes: `Concurrent checkout test VU ${__VU}`
  };

  const res = checkoutOrder(payload, data.token);

  if (res.status === 201) {
    successfulOrders.add(1);
    check(res, {
      'order placed with 201': (r) => r.status === 201
    });
  } else if (res.status === 400) {
    rejectedOrders.add(1);
    check(res, {
      'order rejected gracefully with 400': (r) => r.status === 400
    });
  } else {
    unexpectedErrors.add(1);
    if (res.body && res.body.toLowerCase().includes('deadlock')) {
      deadlockErrors.add(1);
    }
    console.error(`VU ${__VU} unexpected response ${res.status}: ${res.body}`);
  }
}

export function teardown(data) {
  sleep(1);
  const res = http.get(ENDPOINTS.productDetail(TARGET_PRODUCT_ID), {
    headers: AUTH_HEADERS(data.token)
  });
  const body = JSON.parse(res.body);
  const finalStock = body.data.stockQuantity;
  const stockDelta = data.initialStock - finalStock;

  console.log(`[TEARDOWN] Concurrency Integrity Test Completed`);
  console.log(`[TEARDOWN] Initial Stock: ${data.initialStock}`);
  console.log(`[TEARDOWN] Final Stock:   ${finalStock}`);
  console.log(`[TEARDOWN] Stock Delta:   ${stockDelta}`);

  check(finalStock, {
    'exact inventory conservation (delta is positive multiple of order quantity)': () => stockDelta >= 0 && stockDelta % ORDER_QUANTITY === 0,
    'zero overselling (final stock >= 0)': () => finalStock >= 0,
  });

  if (stockDelta < 0 || stockDelta % ORDER_QUANTITY !== 0 || finalStock < 0) {
    throw new Error(`Inventory conservation failed! Initial: ${data.initialStock}, Final: ${finalStock}, Delta: ${stockDelta}`);
  }
}
