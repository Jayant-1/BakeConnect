export type UserRole = 'CUSTOMER' | 'RETAILER' | 'ADMIN' | 'DELIVERY';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
}

export type PaymentTerms = 'IMMEDIATE' | 'NET_3' | 'NET_15';

export interface RetailerProfile {
  id: string;
  userId: string;
  businessName: string;
  gstNumber: string;
  contactPersonName: string;
  contactPhone: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  paymentTerms: PaymentTerms;
  creditLimit: number;
  availableCredit: number;
}

export interface Address {
  id: string;
  userId: string;
  type: 'SHIPPING' | 'BILLING';
  contactName: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  displayOrder: number;
  itemCount: number;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  retailPrice: number;
  wholesalePrice: number;
  unitCost?: number;
  unitOfMeasure: string;
  moq: number;
  moqIncrement: number;
  stockQuantity: number;
  isAvailable: boolean;
  isActive: boolean;
  fermentationHours?: number;
  dietaryTags?: string[];
  isEggless?: boolean;
  isVegetarian?: boolean;
  packDetails?: string | null;
  allergens?: string | null;
  shelfLifeDays?: number | null;
  rating: number;
  reviewCount: number;
}

export type OrderType = 'PERSONAL' | 'BUSINESS';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DELAYED'
  | 'PROCESSING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'INITIATED'
  | 'AWAITING_PAYMENT'
  | 'PROCESSING'
  | 'OBSERVED_SUCCESS'
  | 'COMPLETED'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type PaymentMethod = 'YOUPI_PG' | 'CREDIT_CYCLE' | 'COD';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  orderType: OrderType;
  businessGst?: string;
  businessName?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  shippingAddress?: Address;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  appliedDiscountName?: string;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  delayReason?: string;
  delayPreset?: 'STAFF_SHORTAGE' | 'PEAK_WORKLOAD' | 'MATERIAL_SHORTAGE' | 'WEATHER' | 'OTHER';
  estimatedDeliveryDate?: string;
  createdAt: string;
  timeline: OrderTimelineEvent[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  retailerBusinessName: string;
  gstNumber: string;
  amount: number;
  paidAmount: number;
  outstandingBalance: number;
  paymentTerms: PaymentTerms;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  issuedAt: string;
}

export interface DiscountRule {
  id: string;
  name: string;
  code?: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FIXED_FINAL_TOTAL';
  discountValue: number;
  minOrderThreshold: number;
  channelEligibility: 'ALL' | 'B2C_ONLY' | 'B2B_ONLY';
  isActive: boolean;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

export interface CartValidationResult {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  appliedDiscount?: DiscountRule;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  qualifiesForFreeDelivery: boolean;
  freeDeliveryThresholdRemaining: number;
  isMoqMet: boolean;
  moqThresholdRemaining: number;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}
