/**
 * BakeConnect k6 Performance Test Suite — Configuration
 * 
 * Shared configuration, endpoints, default headers, and performance SLA thresholds.
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const USERS = {
  admin: {
    email: __ENV.ADMIN_EMAIL || 'admin@bakeconnect.com',
    password: __ENV.ADMIN_PASSWORD || 'Password@123',
    role: 'BAKERY_ADMIN'
  },
  retailer1: {
    email: __ENV.RETAILER_EMAIL || 'retailer1@bakeconnect.com',
    password: __ENV.RETAILER_PASSWORD || 'Password@123',
    role: 'RETAILER',
    addressId: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  },
  retailer2: {
    email: 'retailer2@bakeconnect.com',
    password: 'Password@123',
    role: 'RETAILER',
    addressId: 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  },
  customer1: {
    email: __ENV.CUSTOMER_EMAIL || 'customer1@bakeconnect.com',
    password: __ENV.CUSTOMER_PASSWORD || 'Password@123',
    role: 'DIRECT_CUSTOMER',
    addressId: 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  },
  customer2: {
    email: 'customer2@bakeconnect.com',
    password: 'Password@123',
    role: 'DIRECT_CUSTOMER',
    addressId: 'b4444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  }
};

export const SEED_PRODUCT_IDS = [
  'd1111111-dddd-dddd-dddd-dddddddddddd', // Classic Country Sourdough (800g)
  'd2222222-dddd-dddd-dddd-dddddddddddd', // French Artisan Baguette (250g)
  'd3333333-dddd-dddd-dddd-dddddddddddd', // Multigrain Seed Loaf (600g)
  'd4444444-dddd-dddd-dddd-dddddddddddd', // Pure Butter Croissant Pack
  'd5555555-dddd-dddd-dddd-dddddddddddd', // Pain Au Chocolat
  'd6666666-dddd-dddd-dddd-dddddddddddd', // Brioche Burger Buns
  'd7777777-dddd-dddd-dddd-dddddddddddd', // Rosemary Sea Salt Focaccia Slab
  'd8888888-dddd-dddd-dddd-dddddddddddd'  // Belgian Chocolate Brownie Slab
];

export const ENDPOINTS = {
  health: `${BASE_URL}/actuator/health`,
  login: `${BASE_URL}/api/v1/auth/login`,
  register: `${BASE_URL}/api/v1/auth/register`,
  categories: `${BASE_URL}/api/v1/catalog/categories`,
  products: `${BASE_URL}/api/v1/catalog/products`,
  productDetail: (id) => `${BASE_URL}/api/v1/catalog/products/${id}`,
  cartQuote: `${BASE_URL}/api/v1/cart/quote`,
  orders: `${BASE_URL}/api/v1/orders`,
  orderDetail: (id) => `${BASE_URL}/api/v1/orders/${id}`,
  retailerProfile: `${BASE_URL}/api/v1/retailers/profile`,
  reorderSuggestions: `${BASE_URL}/api/v1/retailers/reorder-suggestions`,
  billingInvoices: `${BASE_URL}/api/v1/billing/invoices`,
  billingLedger: `${BASE_URL}/api/v1/billing/ledger`,
  billingSummary: `${BASE_URL}/api/v1/billing/summary`,
  salesSummary: `${BASE_URL}/api/v1/admin/reports/sales-summary`,
  topProducts: `${BASE_URL}/api/v1/admin/reports/top-products`
};

export const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

export const AUTH_HEADERS = (token) => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${token}`
});

export const SLA_THRESHOLDS = {
  duration: {
    p95: 500, // 95th percentile under 500ms
    p99: 1000 // 99th percentile under 1000ms
  },
  maxErrorRate: 0.001 // Less than 0.1% unhandled failures
};
