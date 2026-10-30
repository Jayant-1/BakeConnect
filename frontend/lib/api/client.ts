import {
  Product,
  Category,
  Order,
  Invoice,
  CartItem,
  CartValidationResult,
  OrderStatus,
  PaymentStatus,
  User,
  RetailerProfile,
} from './types';
import {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_ORDERS,
  MOCK_INVOICES,
  MOCK_USERS,
  MOCK_RETAILER_PROFILE,
  MOCK_DISCOUNT_RULES,
} from './mock-data';
import { backendClient } from './backend-client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// In-memory store for fallback/demo resilience
let localProducts = [...MOCK_PRODUCTS];
let localOrders = [...MOCK_ORDERS];
let localInvoices = [...MOCK_INVOICES];

// Auth token cache by role
const tokenCache: Record<string, string> = {};

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bakeconnect_token_v1');
}

async function getAuthToken(role: 'CUSTOMER' | 'RETAILER' | 'ADMIN' = 'CUSTOMER'): Promise<string | null> {
  const userToken = getStoredToken();
  if (userToken) return userToken;
  if (tokenCache[role]) return tokenCache[role];

  const creds = {
    CUSTOMER: { email: 'customer1@bakeconnect.com', password: 'Password@123' },
    RETAILER: { email: 'retailer1@bakeconnect.com', password: 'Password@123' },
    ADMIN: { email: 'admin@bakeconnect.com', password: 'Password@123' },
  }[role];

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const token = json.data?.token;
    if (token) tokenCache[role] = token;
    return token;
  } catch (e) {
    console.warn(`[API] Auth login failed for ${role}, using local mock session:`, e);
    return null;
  }
}

function mapProduct(p: any): Product {
  return {
    id: p.id,
    categoryId: p.categoryId || 'c1111111-cccc-cccc-cccc-cccccccccccc',
    categoryName: p.categoryName || 'Artisan Bakery',
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    imageUrl: p.imageUrl || '/images/products/fresh-ladi-pav.png',
    retailPrice: Number(p.retailPrice) || 0,
    wholesalePrice: Number(p.wholesalePrice || (p.retailPrice ? p.retailPrice * 0.75 : 0)),
    unitCost: p.unitCost ? Number(p.unitCost) : undefined,
    unitOfMeasure: p.unitOfMeasure || 'PIECE',
    moq: p.moq || 1,
    moqIncrement: p.moqIncrement || 1,
    stockQuantity: p.stockQuantity ?? 100,
    isAvailable: p.isAvailable ?? true,
    isActive: p.isActive ?? true,
    fermentationHours: p.slug?.includes('sourdough') ? 36 : 18,
    isEggless: p.isEggless ?? false,
    isVegetarian: p.isVegetarian ?? true,
    dietaryTags: p.dietaryTags
      ? (Array.isArray(p.dietaryTags) ? p.dietaryTags : String(p.dietaryTags).split(','))
      : (p.isEggless ? ['Eggless', 'Vegetarian'] : ['Freshly Baked']),
    allergens: p.allergens,
    packDetails: p.packDetails,
    shelfLifeDays: p.shelfLifeDays,
    rating: 4.9,
    reviewCount: 24,
  };
}

function mapCategory(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || '',
    imageUrl: c.imageUrl,
    displayOrder: c.displayOrder || 0,
    itemCount: 4,
  };
}

function mapOrder(dto: any): Order {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    userId: dto.userId || 'usr-client',
    customerName: dto.userFullName || 'Direct Customer',
    customerEmail: dto.userEmail || 'customer1@bakeconnect.com',
    orderType: dto.orderType || 'PERSONAL',
    businessGst: dto.businessGst,
    businessName: dto.businessName,
    status: dto.status === 'PENDING_REVIEW' ? 'PENDING' : dto.status,
    paymentStatus: dto.paymentStatus || 'PENDING',
    paymentMethod: dto.paymentMethod || 'YOUPI_PG',
    fulfillmentType: dto.deliveryType === 'STORE_PICKUP' ? 'PICKUP' : 'DELIVERY',
    items: (dto.items || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot || 'Artisan Bakery Item',
      productImage: '/images/products/fresh-ladi-pav.png',
      quantity: item.quantity,
      unitPrice: Number(item.unitPriceSnapshot || item.unitPrice || 0),
      lineTotal: Number(item.totalPriceSnapshot || (item.unitPrice * item.quantity) || 0),
    })),
    subtotal: Number(dto.subtotalAmount || dto.subtotal || 0),
    discountAmount: Number(dto.discountAmount || 0),
    taxAmount: Number(dto.taxAmount || 0),
    deliveryFee: 0,
    totalAmount: Number(dto.totalAmount || 0),
    delayReason: dto.delayReason,
    estimatedDeliveryDate: dto.estimatedDeliveryAt || dto.createdAt,
    createdAt: dto.createdAt || new Date().toISOString(),
    timeline: (dto.statusHistory || []).map((h: any) => ({
      status: h.toStatus === 'PENDING_REVIEW' ? 'PENDING' : h.toStatus,
      timestamp: h.createdAt || new Date().toISOString(),
      note: h.customerMessage || h.reasonCode || 'Order event recorded',
    })),
  };
}

export const apiClient = {
  // 1. Catalog & Discovery
  async getProducts(params?: {
    category?: string;
    search?: string;
    channel?: 'B2C' | 'B2B';
  }): Promise<Product[]> {
    try {
      const token = params?.channel === 'B2B' ? await getAuthToken('RETAILER') : null;
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `${BASE_URL}/api/v1/catalog/products?size=50`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.data || [];
        if (Array.isArray(content) && content.length > 0) {
          let prods = content.map(mapProduct);
          if (params?.category && params.category !== 'all') {
            const cat = params.category.toLowerCase();
            prods = prods.filter(
              (p) => p.categoryId === params.category || p.categoryName?.toLowerCase().includes(cat)
            );
          }
          if (params?.search) {
            const s = params.search.toLowerCase();
            prods = prods.filter(
              (p) => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s)
            );
          }
          return prods;
        }
      }
    } catch (e) {
      console.warn('[API] Backend getProducts fallback to local store:', e);
    }

    // Local fallback
    let filtered = [...localProducts];
    if (params?.category && params.category !== 'all') {
      const cat = params.category.toLowerCase();
      filtered = filtered.filter(
        (p) => p.categoryId === params.category || p.categoryName?.toLowerCase().includes(cat)
      );
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s)
      );
    }
    return filtered;
  },

  async getProduct(slugOrId: string): Promise<Product | null> {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/catalog/products/${slugOrId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) return mapProduct(json.data);
      }
    } catch (e) {
      console.warn(`[API] Backend getProduct(${slugOrId}) fallback:`, e);
    }
    return localProducts.find((p) => p.slug === slugOrId || p.id === slugOrId) || null;
  },

  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/catalog/categories`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        if (Array.isArray(list) && list.length > 0) {
          return list.map(mapCategory);
        }
      }
    } catch (e) {
      console.warn('[API] Backend getCategories fallback:', e);
    }
    return MOCK_CATEGORIES;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const idx = localProducts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      localProducts[idx] = { ...localProducts[idx], ...updates };
      return localProducts[idx];
    }
    const synthetic: Product = {
      id,
      name: updates.name || 'Product',
      slug: updates.slug || 'product',
      description: updates.description || '',
      categoryId: 'c1111111-cccc-cccc-cccc-cccccccccccc',
      categoryName: 'Artisan Breads',
      retailPrice: updates.retailPrice || 100,
      wholesalePrice: updates.wholesalePrice || 80,
      unitOfMeasure: 'PIECE',
      moq: 1,
      moqIncrement: 1,
      stockQuantity: updates.stockQuantity ?? 100,
      ...updates,
      imageUrl: updates.imageUrl || '',
      isAvailable: updates.isAvailable ?? true,
      isActive: updates.isActive ?? true,
      rating: updates.rating ?? 4.8,
      reviewCount: updates.reviewCount ?? 24,
    };
    localProducts.push(synthetic);
    return synthetic;
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: `prod-custom-${Date.now().toString().slice(-4)}`,
    };
    localProducts = [newProduct, ...localProducts];
    return newProduct;
  },

  async deleteProduct(id: string): Promise<boolean> {
    localProducts = localProducts.filter((p) => p.id !== id);
    return true;
  },

  // 2. Authoritative Cart Validation & Calculation
  async validateCart(payload: {
    items: { productId: string; quantity: number }[];
    channel: 'B2C' | 'B2B';
    orderType?: 'PERSONAL' | 'BUSINESS';
    businessGst?: string;
  }): Promise<CartValidationResult> {
    try {
      const token = await getAuthToken(payload.channel === 'B2B' ? 'RETAILER' : 'CUSTOMER');
      const quotePayload = {
        items: payload.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        channel: payload.channel === 'B2B' ? 'WHOLESALE' : 'RETAIL',
      };

      const res = await fetch(`${BASE_URL}/api/v1/cart/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(quotePayload),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data) {
          const subtotal = Number(data.subtotal) || 0;
          const discountAmount = Number(data.discountAmount) || 0;
          const taxAmount = Number(data.taxAmount) || 0;
          const deliveryFee = payload.channel === 'B2B' || subtotal >= 500 ? 0 : 50;
          const totalAmount = subtotal - discountAmount + taxAmount + deliveryFee;

          const populatedItems: CartItem[] = payload.items.map((it) => {
            const prod = localProducts.find((p) => p.id === it.productId) || {
              id: it.productId,
              name: 'Bakery Item',
              slug: 'item',
              description: '',
              imageUrl: '/images/products/fresh-ladi-pav.png',
              retailPrice: subtotal / it.quantity,
              wholesalePrice: subtotal / it.quantity,
              unitOfMeasure: 'PIECE',
              moq: 1,
              moqIncrement: 1,
              stockQuantity: 100,
              isAvailable: true,
              isActive: true,
              rating: 4.9,
              reviewCount: 10,
              categoryId: '',
            };
            return {
              productId: it.productId,
              product: prod,
              quantity: it.quantity,
            };
          });

          return {
            items: populatedItems,
            subtotal,
            discountAmount,
            appliedDiscount: data.appliedDiscountDescription
              ? {
                  id: data.appliedDiscountRuleId || 'disc-1',
                  code: 'BULK25',
                  name: data.appliedDiscountDescription,
                  description: data.appliedDiscountDescription,
                  discountType: 'PERCENTAGE',
                  discountValue: 2.5,
                  minOrderThreshold: 10000,
                  channelEligibility: 'ALL',
                  isActive: true,
                }
              : undefined,
            taxAmount,
            deliveryFee,
            totalAmount,
            qualifiesForFreeDelivery: payload.channel === 'B2B' || subtotal >= 500,
            freeDeliveryThresholdRemaining: Math.max(0, 500 - subtotal),
            isMoqMet: (data.isValidForCheckout ?? true) && (payload.channel === 'B2C' || subtotal >= 5000),
            moqThresholdRemaining: payload.channel === 'B2B' ? Math.max(0, 5000 - subtotal) : 0,
          };
        }
      }
    } catch (e) {
      console.warn('[API] Backend validateCart fallback:', e);
    }

    // Server-authoritative computation simulation fallback
    const populatedItems: CartItem[] = [];
    let subtotal = 0;

    for (const item of payload.items) {
      const prod = localProducts.find((p) => p.id === item.productId);
      if (prod) {
        const unitPrice = payload.channel === 'B2B' ? prod.wholesalePrice : prod.retailPrice;
        subtotal += unitPrice * item.quantity;
        populatedItems.push({
          productId: prod.id,
          product: prod,
          quantity: item.quantity,
        });
      }
    }

    let discountAmount = 0;
    let appliedDiscount = undefined;
    for (const rule of MOCK_DISCOUNT_RULES) {
      if (!rule.isActive) continue;
      const isEligible =
        rule.channelEligibility === 'ALL' ||
        (rule.channelEligibility === 'B2B_ONLY' && payload.channel === 'B2B') ||
        (rule.channelEligibility === 'B2C_ONLY' && payload.channel === 'B2C');

      if (isEligible && subtotal >= rule.minOrderThreshold) {
        const calc = rule.discountType === 'PERCENTAGE' ? (subtotal * rule.discountValue) / 100 : rule.discountValue;
        if (calc > discountAmount) {
          discountAmount = calc;
          appliedDiscount = rule;
        }
      }
    }

    const taxable = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(taxable * 0.05 * 100) / 100;
    const qualifiesForFreeDelivery = payload.channel === 'B2B' || subtotal >= 500;
    const deliveryFee = qualifiesForFreeDelivery ? 0 : 50;
    const isMoqMet = payload.channel === 'B2C' || subtotal >= 5000;

    return {
      items: populatedItems,
      subtotal,
      discountAmount,
      appliedDiscount,
      taxAmount,
      deliveryFee,
      totalAmount: taxable + taxAmount + deliveryFee,
      qualifiesForFreeDelivery,
      freeDeliveryThresholdRemaining: Math.max(0, 500 - subtotal),
      isMoqMet,
      moqThresholdRemaining: Math.max(0, 5000 - subtotal),
    };
  },

  // 3. Orders
  async createOrder(payload: Partial<Order>): Promise<Order> {
    try {
      const isBusiness = payload.orderType === 'BUSINESS';
      const token = await getAuthToken(isBusiness ? 'RETAILER' : 'CUSTOMER');

      if (token && payload.items && payload.items.length > 0) {
        const orderRequest = {
          items: payload.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          orderType: payload.orderType || 'PERSONAL',
          deliveryType: payload.fulfillmentType === 'PICKUP' ? 'STORE_PICKUP' : 'DELIVERY',
          deliveryAddressId: (payload as any).deliveryAddressId || (isBusiness
            ? 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
            : 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
          businessGst: payload.businessGst || null,
          businessName: payload.businessName || null,
          notes: payload.shippingAddress?.addressLine1
            ? `${payload.shippingAddress.addressLine1}, ${payload.shippingAddress.city}`
            : 'BakeConnect Order',
        };

        const res = await fetch(`${BASE_URL}/api/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(orderRequest),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            const mapped = mapOrder(json.data);
            localOrders = [mapped, ...localOrders];
            return mapped;
          }
        }
      }
    } catch (e) {
      console.warn('[API] Backend createOrder fallback:', e);
    }

    // Local mock creation
    const newOrder: Order = {
      id: `ord-${Date.now().toString().slice(-5)}`,
      orderNumber:
        payload.orderType === 'BUSINESS'
          ? `BC-B2B-${Math.floor(1000 + Math.random() * 9000)}`
          : `BC-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: payload.userId || 'usr-guest',
      customerName: payload.customerName || 'Customer',
      customerEmail: payload.customerEmail || 'customer1@bakeconnect.com',
      orderType: payload.orderType || 'PERSONAL',
      businessGst: payload.businessGst,
      businessName: payload.businessName,
      status: payload.orderType === 'BUSINESS' ? 'PENDING' : 'PROCESSING',
      paymentStatus: payload.paymentMethod === 'CREDIT_CYCLE' ? 'PENDING' : 'PAID',
      paymentMethod: payload.paymentMethod || 'YOUPI_PG',
      fulfillmentType: payload.fulfillmentType || 'DELIVERY',
      shippingAddress: payload.shippingAddress,
      items: payload.items || [],
      subtotal: payload.subtotal || 0,
      discountAmount: payload.discountAmount || 0,
      appliedDiscountName: payload.appliedDiscountName,
      taxAmount: payload.taxAmount || 0,
      deliveryFee: payload.deliveryFee || 0,
      totalAmount: payload.totalAmount || 0,
      createdAt: new Date().toISOString(),
      estimatedDeliveryDate: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
      timeline: [
        {
          status: 'PENDING',
          timestamp: new Date().toISOString(),
          note:
            payload.orderType === 'BUSINESS'
              ? 'Wholesale order submitted for bakery review'
              : 'Order received & queued for hearth baking',
        },
      ],
    };

    localOrders = [newOrder, ...localOrders];
    return newOrder;
  },

  async getOrder(orderNumberOrId: string): Promise<Order | null> {
    try {
      const token = await getAuthToken('CUSTOMER');
      if (token) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumberOrId);
        const url = isUuid
          ? `${BASE_URL}/api/v1/orders/${orderNumberOrId}`
          : `${BASE_URL}/api/v1/orders/by-number/${encodeURIComponent(orderNumberOrId)}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) return mapOrder(json.data);
        }
      }
    } catch (e) {
      console.warn(`[API] Backend getOrder(${orderNumberOrId}) fallback:`, e);
    }
    return localOrders.find((o) => o.orderNumber === orderNumberOrId || o.id === orderNumberOrId) || null;
  },

  async getMyOrders(): Promise<Order[]> {
    try {
      const token = await getAuthToken('CUSTOMER');
      if (token) {
        const res = await fetch(`${BASE_URL}/api/v1/orders?size=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.content || json.data || [];
          if (Array.isArray(list) && list.length > 0) {
            return list.map(mapOrder);
          }
        }
      }
    } catch (e) {
      console.warn('[API] Backend getMyOrders fallback:', e);
    }
    return localOrders.filter((o) => o.orderType === 'PERSONAL' || !o.businessGst);
  },

  async getAllOrders(): Promise<Order[]> {
    try {
      const token = await getAuthToken('ADMIN');
      if (token) {
        const res = await fetch(`${BASE_URL}/api/v1/admin/orders?size=50`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.content || json.data || [];
          if (Array.isArray(list) && list.length > 0) {
            return list.map(mapOrder);
          }
        }
      }
    } catch (e) {
      console.warn('[API] Backend getAllOrders fallback:', e);
    }
    return [...localOrders];
  },

  async updateOrderStatus(
    orderId: string,
    action: {
      status: OrderStatus;
      preset?: 'STAFF_SHORTAGE' | 'PEAK_WORKLOAD' | 'MATERIAL_SHORTAGE' | 'WEATHER' | 'OTHER';
      reason?: string;
      newDeliveryDate?: string;
    }
  ): Promise<Order> {
    try {
      const token = await getAuthToken('ADMIN');
      if (token) {
        let endpoint = `${BASE_URL}/api/v1/admin/orders/${orderId}/accept`;
        let body: any = {};

        if (action.status === 'DELAYED') {
          endpoint = `${BASE_URL}/api/v1/admin/orders/${orderId}/delay`;
          body = {
            reasonCode: action.preset || 'OTHER',
            customerMessage: action.reason || 'Operations delay',
          };
        } else if (action.status === 'CANCELLED') {
          endpoint = `${BASE_URL}/api/v1/admin/orders/${orderId}/decline`;
          body = {
            reasonCode: action.preset || 'CAPACITY_REACHED',
            customerMessage: action.reason || 'Order declined',
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data) return mapOrder(json.data);
        }
      }
    } catch (e) {
      console.warn('[API] Backend updateOrderStatus fallback:', e);
    }

    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const updated = { ...localOrders[idx] };
    updated.status = action.status;
    if (action.preset) updated.delayPreset = action.preset;
    if (action.reason) updated.delayReason = action.reason;
    if (action.newDeliveryDate) updated.estimatedDeliveryDate = action.newDeliveryDate;

    let note = `Order status set to ${action.status}`;
    if (action.status === 'DELAYED') {
      note = `Delayed due to: ${action.preset || 'Operations delay'}. Note: ${action.reason || 'Rescheduling batch'}`;
    } else if (action.status === 'CONFIRMED') {
      note = 'Approved by Bakery Operations Dispatch';
    }

    updated.timeline = [
      ...updated.timeline,
      {
        status: action.status,
        timestamp: new Date().toISOString(),
        note,
      },
    ];

    localOrders[idx] = updated;
    return updated;
  },

  // 4. Retailer Invoices & Ledger
  async getRetailerInvoices(): Promise<Invoice[]> {
    try {
      const token = await getAuthToken('RETAILER');
      if (token) {
        const res = await fetch(`${BASE_URL}/api/v1/billing/invoices?size=50`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.content || json.data || [];
          if (Array.isArray(list) && list.length > 0) {
            return list.map((dto: any) => ({
              id: dto.id,
              invoiceNumber: dto.invoiceNumber,
              orderId: dto.orderId,
              orderNumber: dto.orderNumber,
              retailerBusinessName: dto.retailerName || 'Sharma Gourmet Mart',
              gstNumber: '27AAPFU0939F1ZV',
              amount: Number(dto.totalAmount) || 0,
              paidAmount: Number(dto.paidAmount) || 0,
              outstandingBalance: Number(dto.balanceAmount) || 0,
              paymentTerms: 'NET_15',
              dueDate: dto.dueDate || new Date().toISOString().split('T')[0],
              status: dto.status === 'ISSUED' ? 'PENDING' : dto.status,
              issuedAt: dto.createdAt || new Date().toISOString(),
            }));
          }
        }
      }
    } catch (e) {
      console.warn('[API] Backend getRetailerInvoices fallback:', e);
    }
    return [...localInvoices];
  },

  async payInvoice(invoiceId: string, customAmount?: number): Promise<Invoice> {
    try {
      const token = await getAuthToken('ADMIN');
      if (token) {
        let amountToPay = customAmount || 1000;
        try {
          const invRes = await fetch(`${BASE_URL}/api/v1/billing/invoices/${invoiceId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (invRes.ok) {
            const invJson = await invRes.json();
            if (invJson.data?.balanceAmount) {
              amountToPay = Number(invJson.data.balanceAmount);
            }
          }
        } catch {
          // fallback
        }

        const res = await fetch(`${BASE_URL}/api/v1/admin/billing/invoices/${invoiceId}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amountToPay,
            referenceNumber: `PAY-REC-${Date.now().toString().slice(-4)}`,
            notes: 'Payment settled via retailer dashboard',
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            const dto = json.data;
            return {
              id: dto.id,
              invoiceNumber: dto.invoiceNumber,
              orderId: dto.orderId,
              orderNumber: dto.orderNumber,
              retailerBusinessName: dto.retailerName || 'Sharma Gourmet Mart',
              gstNumber: '27AAPFU0939F1ZV',
              amount: Number(dto.totalAmount),
              paidAmount: Number(dto.paidAmount),
              outstandingBalance: Number(dto.balanceAmount),
              paymentTerms: 'NET_15',
              dueDate: dto.dueDate,
              status: dto.status === 'PAID' ? 'PAID' : 'PENDING',
              issuedAt: dto.createdAt,
            };
          }
        }
      }
    } catch (e) {
      console.warn('[API] Backend payInvoice fallback:', e);
    }

    const idx = localInvoices.findIndex((inv) => inv.id === invoiceId);
    if (idx === -1) throw new Error('Invoice not found');
    const updated = {
      ...localInvoices[idx],
      paidAmount: localInvoices[idx].amount,
      outstandingBalance: 0,
      status: 'PAID' as const,
    };
    localInvoices[idx] = updated;
    return updated;
  },

  // 5. Auth & Profile
  async getCurrentUser(role: 'CUSTOMER' | 'RETAILER' | 'ADMIN' = 'CUSTOMER'): Promise<{
    user: User;
    retailerProfile?: RetailerProfile;
  }> {
    try {
      const user = await backendClient.getMe();
      let profile: RetailerProfile | undefined = undefined;
      if (user.role === 'RETAILER' || role === 'RETAILER') {
        try {
          const p = await backendClient.getMyProfile();
          if (p) {
            profile = {
              id: p.id,
              userId: p.userId,
              businessName: p.businessName,
              gstNumber: p.gstNumber || '27AABCU9603R1ZM',
              contactPersonName: p.contactPersonName,
              contactPhone: p.contactPhone,
              approvalStatus: p.approvalStatus,
              paymentTerms: (p.paymentTerms === 'NET_15_DAYS' ? 'NET_15' : 'IMMEDIATE') as any,
              creditLimit: p.creditLimit || 100000,
              availableCredit: p.availableCredit ?? p.creditLimit ?? 100000,
            };
          }
        } catch {
          // profile not created yet
        }
      }
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone || undefined,
          role: user.role === 'BAKERY_ADMIN' ? 'ADMIN' : user.role === 'RETAILER' ? 'RETAILER' : 'CUSTOMER',
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          createdAt: (user as any).createdAt || new Date().toISOString(),
        },
        retailerProfile: profile || MOCK_RETAILER_PROFILE,
      };
    } catch {
      if (role === 'RETAILER') {
        return { user: MOCK_USERS.retailer, retailerProfile: MOCK_RETAILER_PROFILE };
      }
      if (role === 'ADMIN') {
        return { user: MOCK_USERS.admin };
      }
      return { user: MOCK_USERS.customer };
    }
  },
};
