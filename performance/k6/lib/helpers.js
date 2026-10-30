/**
 * BakeConnect k6 Performance Test Suite — Reusable Helpers & Workflows
 */

import http from 'k6/http';
import { check } from 'k6';
import { ENDPOINTS, STANDARD_HEADERS, AUTH_HEADERS } from './config.js';

/**
 * Authenticates a user and returns their JWT token.
 */
export function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const res = http.post(ENDPOINTS.login, payload, { headers: STANDARD_HEADERS });

  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.data && body.data.token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (!success) {
    return null;
  }

  const json = JSON.parse(res.body);
  return {
    token: json.data.token,
    user: json.data
  };
}

/**
 * Fetches the active product catalog.
 */
export function getCatalog(token = null, categoryId = null) {
  let url = ENDPOINTS.products;
  if (categoryId) {
    url += `?categoryId=${categoryId}`;
  }

  const headers = token ? AUTH_HEADERS(token) : STANDARD_HEADERS;
  const res = http.get(url, { headers });

  check(res, {
    'catalog status is 200': (r) => r.status === 200,
    'catalog returns items': (r) => {
      try {
        const body = JSON.parse(r.body);
        const items = body && body.data && (body.data.content || body.data);
        return Array.isArray(items) && items.length > 0;
      } catch (e) {
        return false;
      }
    }
  });

  try {
    const body = JSON.parse(res.body);
    return body && body.data && (body.data.content || body.data) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Fetches product categories.
 */
export function getCategories(token = null) {
  const headers = token ? AUTH_HEADERS(token) : STANDARD_HEADERS;
  const res = http.get(ENDPOINTS.categories, { headers });

  check(res, {
    'categories status is 200': (r) => r.status === 200
  });

  try {
    return JSON.parse(res.body).data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Requests an authoritative server-side cart quote.
 */
export function getCartQuote(items, channel, token = null) {
  const payload = JSON.stringify({
    items: items,
    channel: channel
  });

  const headers = token ? AUTH_HEADERS(token) : STANDARD_HEADERS;
  const res = http.post(ENDPOINTS.cartQuote, payload, { headers });

  check(res, {
    'cart quote status is 200': (r) => r.status === 200,
    'cart quote has valid amounts': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.data && (body.data.totalAmount !== undefined || body.data.netAmount !== undefined);
      } catch (e) {
        return false;
      }
    }
  });

  try {
    return JSON.parse(res.body).data;
  } catch (e) {
    return null;
  }
}

/**
 * Checks out an order.
 */
export function checkoutOrder(orderPayload, token) {
  const payload = JSON.stringify(orderPayload);
  const headers = AUTH_HEADERS(token);
  const res = http.post(ENDPOINTS.orders, payload, { headers });

  return res;
}

/**
 * Fetches retailer invoices.
 */
export function getRetailerInvoices(token) {
  const headers = AUTH_HEADERS(token);
  const res = http.get(ENDPOINTS.billingInvoices, { headers });

  check(res, {
    'retailer invoices status is 200': (r) => r.status === 200
  });

  try {
    const body = JSON.parse(res.body);
    return body && body.data && (body.data.content || body.data) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Fetches retailer ledger entries.
 */
export function getRetailerLedger(token) {
  const headers = AUTH_HEADERS(token);
  const res = http.get(ENDPOINTS.billingLedger, { headers });

  check(res, {
    'retailer ledger status is 200': (r) => r.status === 200
  });

  try {
    const body = JSON.parse(res.body);
    return body && body.data && (body.data.content || body.data) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Fetches retailer billing summary.
 */
export function getBillingSummary(token) {
  const headers = AUTH_HEADERS(token);
  const res = http.get(ENDPOINTS.billingSummary, { headers });

  check(res, {
    'billing summary status is 200': (r) => r.status === 200
  });

  try {
    return JSON.parse(res.body).data;
  } catch (e) {
    return null;
  }
}

/**
 * Fetches retailer reorder suggestions.
 */
export function getReorderSuggestions(token) {
  const headers = AUTH_HEADERS(token);
  const res = http.get(ENDPOINTS.reorderSuggestions, { headers });

  check(res, {
    'reorder suggestions status is 200': (r) => r.status === 200
  });

  try {
    return JSON.parse(res.body).data;
  } catch (e) {
    return [];
  }
}

/**
 * Utility: picks a random element from an array.
 */
export function randomItem(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Utility: returns a random integer in [min, max].
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
