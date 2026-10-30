/**
 * BakeConnect Smoke Test
 * 
 * Target: 5 concurrent Virtual Users for 30 seconds.
 * Purpose: Fast sanity check ensuring all critical API paths (Health, Auth, Catalog, Cart Quote,
 * Checkout, Invoicing/Ledger) are operational and meet basic latency SLAs before load testing.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { ENDPOINTS, USERS, SEED_PRODUCT_IDS } from './lib/config.js';
import { login, getCatalog, getCategories, getCartQuote, checkoutOrder, getRetailerInvoices, getRetailerLedger } from './lib/helpers.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'] // Max 1% error rate on smoke
  }
};

export default function () {
  // 1. Actuator Health
  group('01_Actuator_Health', () => {
    const res = http.get(ENDPOINTS.health);
    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health is UP': (r) => {
        try {
          return JSON.parse(r.body).status === 'UP';
        } catch (e) {
          return false;
        }
      }
    });
  });

  sleep(0.5);

  // 2. Authentication
  let customerSession = null;
  let retailerSession = null;

  group('02_Authentication', () => {
    customerSession = login(USERS.customer1.email, USERS.customer1.password);
    check(customerSession, {
      'customer session valid': (s) => s !== null && s.token !== undefined
    });

    retailerSession = login(USERS.retailer1.email, USERS.retailer1.password);
    check(retailerSession, {
      'retailer session valid': (s) => s !== null && s.token !== undefined
    });
  });

  sleep(0.5);

  // 3. Catalog & Categories
  group('03_Catalog_Browsing', () => {
    const categories = getCategories();
    check(categories, {
      'categories found': (cats) => Array.isArray(cats) && cats.length > 0
    });

    const products = getCatalog();
    check(products, {
      'products found': (prods) => Array.isArray(prods) && prods.length > 0
    });
  });

  sleep(0.5);

  // 4. Cart Authoritative Quote
  group('04_Cart_Authoritative_Quote', () => {
    const quoteItems = [
      { productId: SEED_PRODUCT_IDS[0], quantity: 5 } // Classic Country Sourdough MOQ = 5
    ];

    const quote = getCartQuote(quoteItems, 'RETAIL', customerSession ? customerSession.token : null);
    check(quote, {
      'quote calculated successfully': (q) => q !== null,
      'quote total amount > 0': (q) => q && Number(q.totalAmount) > 0,
      'quote valid for checkout': (q) => q && q.isValidForCheckout === true
    });
  });

  sleep(0.5);

  // 5. Checkout (Customer Direct Order)
  if (customerSession && customerSession.token) {
    group('05_Direct_Customer_Checkout', () => {
      const checkoutPayload = {
        items: [
          { productId: SEED_PRODUCT_IDS[0], quantity: 5 }
        ],
        orderType: 'PERSONAL',
        deliveryType: 'DELIVERY',
        deliveryAddressId: USERS.customer1.addressId,
        notes: 'Smoke test direct customer order'
      };

      const res = checkoutOrder(checkoutPayload, customerSession.token);
      check(res, {
        'checkout status is 201': (r) => r.status === 201,
        'order number generated': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body && body.data && body.data.orderNumber && body.data.orderNumber.startsWith('BC-');
          } catch (e) {
            return false;
          }
        }
      });
    });
  }

  sleep(0.5);

  // 6. Retailer Billing & Invoices
  if (retailerSession && retailerSession.token) {
    group('06_Retailer_Billing_Ledger', () => {
      const invoices = getRetailerInvoices(retailerSession.token);
      check(invoices, {
        'invoices query executed': (invs) => Array.isArray(invs)
      });

      const ledger = getRetailerLedger(retailerSession.token);
      check(ledger, {
        'ledger query executed': (ledg) => Array.isArray(ledg)
      });
    });
  }

  sleep(1);
}
