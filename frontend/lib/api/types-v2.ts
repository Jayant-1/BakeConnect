/**
 * BakeConnect Authoritative API Contract Types
 * Directly reflects Spring Boot 3.4 REST endpoints under /api/v1
 */

export type UserRole = 'DIRECT_CUSTOMER' | 'RETAILER' | 'BAKERY_ADMIN' | 'BAKERY_MANAGER' | 'DELIVERY_PERSON';

export type OrderStatus =
  | 'PENDING_REVIEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELAYED'
  | 'DECLINED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'INITIATED'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED';

export type RetailerApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type PaymentTerms = 'IMMEDIATE' | 'NET_3_DAYS' | 'NET_15_DAYS' | 'CUSTOM';

export type DeliveryType = 'DELIVERY' | 'STORE_PICKUP';

export type OrderType = 'PERSONAL' | 'BUSINESS';

export interface FieldErrorItem {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  correlationId?: string;
  errors?: FieldErrorItem[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
}

export interface Address {
  id: string;
  userId: string;
  type: string;
  contactName: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions?: string | null;
  isDefault: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  retailPrice: number;
  wholesalePrice?: number | null;
  unitOfMeasure: string;
  moq: number;
  moqIncrement: number;
  stockQuantity: number;
  isAvailable: boolean;
  isEggless: boolean;
  isVegetarian: boolean;
  dietaryTags?: string | null;
  allergens?: string | null;
  packDetails?: string | null;
  shelfLifeDays?: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface CartItemRequest {
  productId: string;
  quantity: number;
}

export interface CartItemQuote {
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  requestedQuantity: number;
  lineSubtotal: number;
  isAvailable: boolean;
  stockAvailable: number;
  errorMessage?: string | null;
}

export interface CartQuote {
  items: CartItemQuote[];
  subtotal: number;
  discountAmount: number;
  appliedDiscountDescription?: string | null;
  taxAmount: number;
  totalAmount: number;
  isValidForCheckout: boolean;
  validationErrors: string[];
  channel: 'RETAIL' | 'WHOLESALE';
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  taxAmount: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userEmail: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryType: DeliveryType;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  businessGst?: string | null;
  businessName?: string | null;
  notes?: string | null;
  delayReason?: string | null;
  declineReason?: string | null;
  estimatedDeliveryTime?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface RetailerProfile {
  id: string;
  userId: string;
  businessName: string;
  gstNumber?: string | null;
  contactPersonName: string;
  contactPhone: string;
  approvalStatus: RetailerApprovalStatus;
  paymentTerms: PaymentTerms;
  customTermDays?: number | null;
  creditLimit: number;
  availableCredit?: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  balanceDue: number;
  status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  paymentTerms: string;
  dueDate: string;
  issueDate: string;
}

export interface BillingSummary {
  totalOutstanding: number;
  overdueAmount: number;
  creditLimit: number;
  availableCredit: number;
  unpaidInvoicesCount: number;
  overdueInvoicesCount: number;
}

export interface PaymentAttempt {
  id: string;
  orderId: string;
  invoiceId?: string | null;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  transactionRef?: string | null;
  redirectUrl?: string | null;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  productSlug: string;
  wholesalePrice: number;
  suggestedQuantity: number;
  unitOfMeasure: string;
  moq: number;
  moqIncrement: number;
  stockQuantity: number;
  isAvailable: boolean;
  purchaseCountLast90Days: number;
}

export interface SalesSummaryReport {
  periodStart: string;
  periodEnd: string;
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  totalTax: number;
  totalRevenue: number;
  totalOrders: number;
  b2cOrdersCount: number;
  b2cGrossSales: number;
  b2cAov: number;
  b2bOrdersCount: number;
  b2bGrossSales: number;
  b2bAov: number;
  blendedAov: number;
  totalCostOfGoodsSold: number;
  grossMargin: number;
  grossMarginPercentage: number;
  marginStatus: 'AVAILABLE' | 'NOT_AVAILABLE';
  marginExplanatoryNote?: string;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  productSlug: string;
  channel: string;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  previousPeriodQuantitySold: number;
  previousPeriodRevenue: number;
  previousPeriodOrderCount: number;
  quantityGrowthPercentage?: number;
  revenueGrowthPercentage?: number;
}

export interface IssueMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  isInternalNote: boolean;
  createdAt: string;
}

export interface CustomerIssue {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  orderId?: string | null;
  orderNumber?: string | null;
  category: string;
  shortDescription: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolutionNotes?: string | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: IssueMessage[];
}

