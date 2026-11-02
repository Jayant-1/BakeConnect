import {
  ApiResponse,
  Page,
  User,
  Address,
  Product,
  Category,
  CartQuote,
  CartItemRequest,
  Order,
  RetailerProfile,
  Invoice,
  BillingSummary,
  PaymentAttempt,
  PaymentSession,
  ReorderSuggestion,
  UserRole,
  PaymentTerms,
  RetailerApprovalStatus,
  SalesSummaryReport,
  TopProductItem,
  CustomerIssue,
} from './types-v2';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bakeconnect_token_v1');
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('bakeconnect_token_v1', token);
  } else {
    localStorage.removeItem('bakeconnect_token_v1');
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers,
    });
    clearTimeout(timeoutId);

    if (res.status === 204) {
      return null as T;
    }

    const json = (await res.json()) as ApiResponse<T>;

    if (!res.ok || json.success === false) {
      throw new ApiError(
        json.message || `Request failed with status ${res.status}`,
        res.status,
        json.errors
      );
    }

    return json.data;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error or backend unreachable',
      0
    );
  }
}

export const backendClient = {
  // Auth
  async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: UserRole;
  }): Promise<{ token: string; id: string; email: string; fullName: string; role: UserRole }> {
    return request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ token: string; id: string; email: string; fullName: string; role: UserRole }> {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyEmail(token: string): Promise<void> {
    return request(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`);
  },

  async forgotPassword(email: string): Promise<string> {
    return request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async getMe(): Promise<User> {
    return request('/api/v1/users/me');
  },

  // Addresses
  async getAddresses(): Promise<Address[]> {
    return request('/api/v1/addresses');
  },

  async createAddress(data: Omit<Address, 'id' | 'userId'>): Promise<Address> {
    return request('/api/v1/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteAddress(id: string): Promise<void> {
    return request(`/api/v1/addresses/${id}`, {
      method: 'DELETE',
    });
  },

  // Catalog
  async getCategories(): Promise<Category[]> {
    return request('/api/v1/catalog/categories');
  },

  async getProducts(params?: {
    categoryId?: string;
    query?: string;
    page?: number;
    size?: number;
  }): Promise<Page<Product>> {
    const q = new URLSearchParams();
    if (params?.categoryId && params.categoryId !== 'all') {
      q.set('categoryId', params.categoryId);
    }
    if (params?.query) {
      q.set('query', params.query);
    }
    if (params?.page !== undefined) q.set('page', params.page.toString());
    if (params?.size !== undefined) q.set('size', params.size.toString());

    return request(`/api/v1/catalog/products?${q.toString()}`);
  },

  async getProduct(slugOrId: string): Promise<Product> {
    return request(`/api/v1/catalog/products/${slugOrId}`);
  },

  // Cart & Quotation
  async getQuote(items: CartItemRequest[], couponCode?: string): Promise<CartQuote> {
    return request('/api/v1/cart/quote', {
      method: 'POST',
      body: JSON.stringify({ items, couponCode }),
    });
  },

  // Orders
  async createOrder(data: {
    items: CartItemRequest[];
    orderType: 'PERSONAL' | 'BUSINESS';
    deliveryType: 'DELIVERY' | 'STORE_PICKUP';
    deliveryAddressId?: string;
    businessGst?: string;
    businessName?: string;
    notes?: string;
    couponCode?: string;
  }): Promise<Order> {
    return request('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyOrders(page = 0, size = 15): Promise<Page<Order>> {
    return request(`/api/v1/orders?page=${page}&size=${size}`);
  },

  async getOrderById(id: string): Promise<Order> {
    return request(`/api/v1/orders/${id}`);
  },

  async getOrderByNumber(orderNumber: string): Promise<Order> {
    return request(`/api/v1/orders/by-number/${orderNumber}`);
  },

  // Retailer Portal
  async getMyProfile(): Promise<RetailerProfile> {
    return request('/api/v1/retailers/me');
  },

  async submitProfile(data: {
    businessName: string;
    gstNumber?: string;
    contactPersonName: string;
    contactPhone: string;
  }): Promise<RetailerProfile> {
    return request('/api/v1/retailers/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReorderSuggestions(): Promise<ReorderSuggestion[]> {
    return request('/api/v1/retailers/reorder-suggestions');
  },

  // Billing & Invoices
  async getInvoices(page = 0, size = 15): Promise<Page<Invoice>> {
    return request(`/api/v1/billing/invoices?page=${page}&size=${size}`);
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    return request(`/api/v1/billing/invoices/${id}`);
  },

  async getBillingSummary(): Promise<BillingSummary> {
    return request('/api/v1/billing/summary');
  },

  // Payments
  async initiatePayment(data: {
    orderId: string;
    invoiceId?: string;
    provider?: string;
    idempotencyKey?: string;
  }): Promise<PaymentSession> {
    const payload = {
      orderId: data.orderId,
      invoiceId: data.invoiceId,
      provider: data.provider || 'YOUPI_PG',
      idempotencyKey: data.idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
    const res = await request<any>('/api/v1/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    let checkoutUrl = res.paymentUrl || res.checkoutUrl;
    if (typeof window !== 'undefined' && checkoutUrl) {
      const origin = window.location.origin;
      if (checkoutUrl.includes('localhost:7000') && !origin.includes('localhost:7000') && !origin.includes('localhost:3000')) {
        checkoutUrl = checkoutUrl.replace(/^http:\/\/localhost:7000/, origin);
      }
    }
    return {
      ...res,
      id: res.paymentAttemptId || res.id,
      paymentAttemptId: res.paymentAttemptId || res.id,
      checkoutUrl,
      paymentUrl: checkoutUrl,
    };
  },

  async getPaymentStatus(paymentAttemptId: string): Promise<PaymentAttempt> {
    const res = await request<any>(`/api/v1/payments/${paymentAttemptId}`);
    return {
      ...res,
      id: res.id || res.paymentAttemptId,
      paymentAttemptId: res.id || res.paymentAttemptId,
      checkoutUrl: res.checkoutUrl || res.paymentUrl,
      paymentUrl: res.checkoutUrl || res.paymentUrl,
    };
  },

  async cancelPaymentAttempt(paymentAttemptId: string): Promise<PaymentAttempt> {
    const res = await request<any>(`/api/v1/payments/${paymentAttemptId}/cancel`, {
      method: 'POST',
    });
    return {
      ...res,
      id: res.id || res.paymentAttemptId,
      paymentAttemptId: res.id || res.paymentAttemptId,
    };
  },

  // Admin APIs
  async getAdminOrders(status?: string, page = 0, size = 20): Promise<Page<Order>> {
    const q = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (status && status !== 'all') q.set('status', status);
    return request(`/api/v1/admin/orders?${q.toString()}`);
  },

  async acceptOrder(orderId: string): Promise<Order> {
    return request(`/api/v1/admin/orders/${orderId}/accept`, { method: 'POST' });
  },

  async delayOrder(orderId: string, delayReason: string, delayMinutes: number): Promise<Order> {
    return request(`/api/v1/admin/orders/${orderId}/delay`, {
      method: 'POST',
      body: JSON.stringify({ delayReason, delayMinutes }),
    });
  },

  async declineOrder(orderId: string, declineReason: string, notes?: string): Promise<Order> {
    return request(`/api/v1/admin/orders/${orderId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ declineReason, notes }),
    });
  },

  async getPendingRetailers(page = 0, size = 20): Promise<Page<RetailerProfile>> {
    return request(`/api/v1/admin/retailers?status=PENDING_APPROVAL&page=${page}&size=${size}`);
  },

  async getAllRetailers(status?: string, page = 0, size = 20): Promise<Page<RetailerProfile>> {
    const q = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (status && status !== 'ALL') q.set('status', status);
    return request(`/api/v1/admin/retailers?${q.toString()}`);
  },

  async approveRetailer(
    profileId: string,
    data: {
      status?: RetailerApprovalStatus;
      approvalStatus?: RetailerApprovalStatus;
      paymentTerms?: PaymentTerms;
      creditLimit?: number;
      customTermDays?: number;
      reviewNotes?: string;
      reason?: string;
    }
  ): Promise<RetailerProfile> {
    return request(`/api/v1/admin/retailers/${profileId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({
        approvalStatus: data.approvalStatus || data.status || 'APPROVED',
        paymentTerms: data.paymentTerms || 'IMMEDIATE',
        customTermDays: data.customTermDays,
        creditLimit: data.creditLimit ?? 0,
        reason: data.reason || data.reviewNotes || 'Approved by administrator',
      }),
    });
  },

  // Reports & Analytics
  async getSalesSummary(startDate?: string, endDate?: string): Promise<SalesSummaryReport> {
    const q = new URLSearchParams();
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/api/v1/admin/reports/sales-summary${qs}`);
  },

  async getTopProducts(params: {
    channel?: string;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<TopProductItem[]> {
    const q = new URLSearchParams();
    if (params.channel) q.set('channel', params.channel);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.limit) q.set('limit', params.limit.toString());
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/api/v1/admin/reports/top-products${qs}`);
  },

  // Customer Issues & Support
  async createCustomerIssue(data: {
    orderId?: string;
    category: string;
    shortDescription: string;
    message: string;
  }): Promise<CustomerIssue> {
    return request('/api/v1/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyCustomerIssues(page = 0, size = 20): Promise<Page<CustomerIssue>> {
    return request(`/api/v1/issues?page=${page}&size=${size}`);
  },

  async getCustomerIssueDetails(id: string): Promise<CustomerIssue> {
    return request(`/api/v1/issues/${id}`);
  },

  async replyToCustomerIssue(id: string, message: string): Promise<CustomerIssue> {
    return request(`/api/v1/issues/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternalNote: false }),
    });
  },
};
