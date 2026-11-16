'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../../lib/store/cart-context';
import { useAuth } from '../../lib/store/auth-context';
import { StorefrontLayout } from '../../components/layout/storefront-layout';
import { BakeryProcessingSuite } from '../../components/checkout/bakery-processing-suite';
import { apiClient } from '../../lib/api/client';
import { backendClient } from '../../lib/api/backend-client';
import { formatCurrency, validateGST } from '../../lib/utils';
import { OrderType, PaymentMethod, Address } from '../../lib/api/types';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ShieldCheck,
  CreditCard,
  Building,
  User,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Sparkles,
  Plus,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { items, channel, clearCart, validation, couponCode, applyCoupon, isValidating } = useCart();

  // Coupon state
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  React.useEffect(() => {
    if (couponCode) {
      setCouponInput(couponCode);
    }
  }, [couponCode]);

  // Authentication & Contact details
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');

  // Protect wholesale checkout: require authentication only for B2B wholesale orders
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && channel === 'B2B') {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
    }
  }, [isLoading, isAuthenticated, channel, router]);

  // Pre-fill user details if logged in
  React.useEffect(() => {
    if (user) {
      if (user.fullName) setCustomerName(user.fullName);
      if (user.email) setCustomerEmail(user.email);
      if (user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // Order Type is channel-driven: B2B is BUSINESS, retail B2C is PERSONAL
  const orderType: OrderType = channel === 'B2B' ? 'BUSINESS' : 'PERSONAL';
  const [businessName, setBusinessName] = useState('');
  const [businessGst, setBusinessGst] = useState('');
  const [gstError, setGstError] = useState<string | null>(null);
  const [isBusinessAutofilled, setIsBusinessAutofilled] = useState(false);

  // Pre-fill business details (Registered Business Name & GSTIN) like name and address
  React.useEffect(() => {
    let isMounted = true;

    async function loadBusinessDetails() {
      // 1. First check local cached business details (fast local prefill)
      try {
        const cached = localStorage.getItem('bakeconnect_business_details');
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          if (parsed.businessName) {
            setBusinessName((prev) => prev || parsed.businessName);
          }
          if (parsed.businessGst) {
            setBusinessGst((prev) => prev || parsed.businessGst);
          }
          if (parsed.businessName || parsed.businessGst) {
            setIsBusinessAutofilled(true);
          }
        }
      } catch {}

      // 2. Authoritative profile from backend for authenticated users / retailers
      if (isAuthenticated) {
        try {
          const profile = await backendClient.getMyProfile();
          if (isMounted && profile) {
            if (profile.businessName) {
              setBusinessName(profile.businessName);
            }
            if (profile.gstNumber) {
              setBusinessGst(profile.gstNumber);
            }
            if (profile.businessName || profile.gstNumber) {
              setIsBusinessAutofilled(true);
              try {
                localStorage.setItem(
                  'bakeconnect_business_details',
                  JSON.stringify({
                    businessName: profile.businessName,
                    businessGst: profile.gstNumber,
                  })
                );
              } catch {}
            }
          }
        } catch {
          // Non-retailer customer or profile not created yet - gracefully ignore
        }
      }
    }

    loadBusinessDetails();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Fulfillment Type
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');

  // Address (Pune defaults)
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('411001');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Saved Addresses (Amazon-style pre-saved address support)
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [makeNewAddressDefault, setMakeNewAddressDefault] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const applySavedAddress = React.useCallback((addr: Address) => {
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setDeliveryInstructions(addr.deliveryInstructions || '');
    if (addr.contactName) setCustomerName(addr.contactName);
    if (addr.contactPhone) setCustomerPhone(addr.contactPhone);
  }, []);

  React.useEffect(() => {
    async function fetchAddresses() {
      try {
        const addrs = await apiClient.getAddresses();
        setSavedAddresses(addrs);
        if (addrs.length > 0) {
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(def.id);
          applySavedAddress(def);
        } else {
          setIsAddingNewAddress(true);
        }
      } catch (e) {
        console.error('Failed to load saved addresses:', e);
        setIsAddingNewAddress(true);
      } finally {
        setLoadingAddresses(false);
      }
    }
    fetchAddresses();
  }, [applySavedAddress]);

  function handleSelectSavedAddress(addr: Address) {
    setSelectedAddressId(addr.id);
    setIsAddingNewAddress(false);
    applySavedAddress(addr);
  }

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(channel === 'B2B' ? 'CREDIT_CYCLE' : 'YOUPI_PG');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<1 | 2 | 3 | 4>(1);
  const [processingOrderInfo, setProcessingOrderInfo] = useState<{
    orderNumber?: string;
    totalAmount?: number;
    itemCount?: number;
    fulfillmentType?: 'DELIVERY' | 'PICKUP';
  } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const subtotal =
    validation?.subtotal ??
    items.reduce((sum, i) => sum + (channel === 'B2B' ? i.product.wholesalePrice : i.product.retailPrice) * i.quantity, 0);
  const total = validation?.totalAmount ?? subtotal;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setGstError(null);

    // Business GST validation check for B2B wholesale orders only
    if (orderType === 'BUSINESS') {
      if (!businessGst.trim()) {
        setGstError('GSTIN is required for wholesale business tax invoicing.');
        return;
      }
      if (!validateGST(businessGst)) {
        setGstError('Invalid GSTIN format. Example: 27AABCU9603R1ZM');
        return;
      }
      if (!businessName.trim()) {
        setGstError('Registered Business Name is required for wholesale invoices.');
        return;
      }
    }

    setIsSubmitting(true);
    setProcessingStep(1);
    setProcessingOrderInfo({
      totalAmount: total,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      fulfillmentType,
    });

    try {
      // Auto-save address if adding new and user opted to save
      let activeAddressId = selectedAddressId && selectedAddressId !== 'NEW' ? selectedAddressId : undefined;
      if (
        fulfillmentType === 'DELIVERY' &&
        (isAddingNewAddress || savedAddresses.length === 0) &&
        saveAddressForFuture &&
        addressLine1.trim()
      ) {
        try {
          const createdAddr = await apiClient.createAddress({
            contactName: customerName || 'Valued Customer',
            contactPhone: customerPhone || '9820398201',
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim() || undefined,
            city: city.trim() || 'Pune',
            state: state.trim() || 'Maharashtra',
            postalCode: postalCode.trim() || '411001',
            deliveryInstructions: deliveryInstructions.trim() || undefined,
            type: 'SHIPPING',
            isDefault: makeNewAddressDefault || savedAddresses.length === 0,
          });
          activeAddressId = createdAddr.id;
        } catch (e) {
          console.warn('Failed to auto-save address:', e);
        }
      }

      const orderPayload = {
        customerName,
        customerEmail,
        orderType,
        businessName: orderType === 'BUSINESS' ? businessName : undefined,
        businessGst: orderType === 'BUSINESS' ? businessGst.toUpperCase() : undefined,
        fulfillmentType,
        paymentMethod,
        shippingAddress: {
          id: activeAddressId || 'addr-client-01',
          userId: user?.id || 'usr-guest',
          type: 'SHIPPING' as const,
          contactName: customerName,
          contactPhone: customerPhone,
          addressLine1: fulfillmentType === 'PICKUP' ? 'Shop 4, Lane 5, Koregaon Park Counter' : addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          deliveryInstructions,
          isDefault: true,
        },
        items: items.map((i) => ({
          id: `item-${Date.now()}-${i.productId}`,
          productId: i.productId,
          productName: i.product.name,
          productImage: i.product.imageUrl,
          quantity: i.quantity,
          unitPrice: channel === 'B2B' ? i.product.wholesalePrice : i.product.retailPrice,
          lineTotal: (channel === 'B2B' ? i.product.wholesalePrice : i.product.retailPrice) * i.quantity,
        })),
        subtotal,
        discountAmount: validation?.discountAmount || 0,
        appliedDiscountName: validation?.appliedDiscount?.name,
        taxAmount: validation?.taxAmount || Math.round(subtotal * 0.05),
        deliveryFee: fulfillmentType === 'PICKUP' ? 0 : (validation?.deliveryFee || 0),
        totalAmount: total,
        couponCode: couponCode || undefined,
      };

      setProcessingStep(2);
      const created = await apiClient.createOrder(orderPayload);
      if (orderType === 'BUSINESS' && (businessName || businessGst)) {
        try {
          localStorage.setItem(
            'bakeconnect_business_details',
            JSON.stringify({
              businessName: businessName.trim(),
              businessGst: businessGst.trim().toUpperCase(),
            })
          );
        } catch {}
      }
      setProcessingOrderInfo((prev) => ({
        ...prev,
        orderNumber: created.orderNumber,
        totalAmount: created.totalAmount,
      }));
      setProcessingStep(3);
      clearCart();

      if (paymentMethod === 'YOUPI_PG') {
        try {
          const session = await apiClient.initiatePayment({
            orderId: created.id,
            provider: 'YOUPI_PG',
            baseAmount: created.totalAmount,
          } as any);
          setProcessingStep(4);
          const targetUrl = session.checkoutUrl || session.paymentUrl;
          if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('/'))) {
            window.location.href = targetUrl;
            return;
          }
        } catch (payErr) {
          console.error('[Checkout] Failed to initiate YouPi PG session directly:', payErr);
        }
        setProcessingStep(4);
        router.push(`/order/${created.orderNumber}?pay=true`);
      } else {
        setProcessingStep(4);
        router.push(`/order/${created.orderNumber}`);
      }
    } catch (err: any) {
      setOrderError(err?.message || 'Unable to submit order. Please check connection.');
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7836] mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-[#342421]/70">Checking authentication...</p>
        </div>
      </StorefrontLayout>
    );
  }

  if (isSubmitting) {
    return (
      <StorefrontLayout>
        <BakeryProcessingSuite
          step={processingStep}
          orderNumber={processingOrderInfo?.orderNumber}
          totalAmount={processingOrderInfo?.totalAmount ?? total}
          itemCount={processingOrderInfo?.itemCount ?? items.length}
          fulfillmentType={fulfillmentType}
        />
      </StorefrontLayout>
    );
  }

  if (items.length === 0) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF7EB] border-2 border-[#342421] flex items-center justify-center text-[#342421] mx-auto mb-4">
            <Truck className="w-8 h-8 opacity-60" />
          </div>
          <h2 className="font-display uppercase text-2xl font-bold text-[#342421] mb-2">No Items in Basket</h2>
          <p className="text-sm text-[#342421]/70 mb-6">
            Your cart was cleared or has no active bakes. Please add items before checking out.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Return to Catalog
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  return (
    <StorefrontLayout>
      <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="inline-block bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            BakeConnect Checkout • Pune
          </div>
          <h1 className="font-display uppercase text-3xl sm:text-5xl font-bold text-[#342421] tracking-tight">
            ORDER DETAILS & FINAL REVIEW
          </h1>
          <p className="text-xs text-[#342421]/70">
            Direct ordering authenticated via verified email. Authoritative taxes & totals computed by Spring Boot.
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Authentication & Contact */}
            <div className="bg-[#FFF7EB] rounded-3xl p-6 sm:p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b-2 border-[#342421]/15">
                <div className="w-8 h-8 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h2 className="font-sans text-base sm:text-lg font-bold text-[#342421] tracking-tight">
                  Customer Contact & Identification
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#342421] block mb-1">
                    Full Name / Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#342421] block mb-1">
                    Email Address (Confirmation sent here) *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#342421] block mb-1">
                    Phone Number (Driver delivery coordination only — Zero SMS Spam) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: B2B Wholesale GST Details (Only shown in B2B channel) */}
            {channel === 'B2B' && (
              <div className="bg-[#FFF7EB] rounded-3xl p-6 sm:p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-[#342421]/15">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h2 className="font-sans text-base sm:text-lg font-bold text-[#342421] tracking-tight">
                      Wholesale Business Invoicing & GST
                    </h2>
                  </div>
                  {isBusinessAutofilled && (businessName || businessGst) && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-300 shadow-[1px_1px_0px_#342421]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Auto-filled
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-[#342421]/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[#342421] block mb-1">
                        Registered Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Pune Harvest Cafe & Bakery"
                        className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#342421] block mb-1">
                        GSTIN (15-digit Indian GST) *
                      </label>
                      <input
                        type="text"
                        required
                        value={businessGst}
                        onChange={(e) => setBusinessGst(e.target.value.toUpperCase())}
                        placeholder="27AABCU9603R1ZM"
                        className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-mono uppercase text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                      />
                    </div>
                  </div>

                  {gstError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>{gstError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Fulfillment & Address */}
            <div className="bg-[#FFF7EB] rounded-3xl p-6 sm:p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b-2 border-[#342421]/15">
                <div className="w-8 h-8 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center font-bold text-xs">
                  {channel === 'B2B' ? 3 : 2}
                </div>
                <h2 className="font-sans text-base sm:text-lg font-bold text-[#342421] tracking-tight">
                  Fulfillment & Destination
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('DELIVERY')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    fulfillmentType === 'DELIVERY'
                      ? 'border-[#342421] bg-[#FF7836] text-white shadow-[2px_2px_0px_#342421]'
                      : 'border-[#342421]/30 bg-white text-[#342421] hover:bg-[#FFF7EB]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    <span>Morning Doorstep Delivery</span>
                  </div>
                  <div className={`text-[10px] mt-1 font-medium ${fulfillmentType === 'DELIVERY' ? 'text-white/80' : 'text-[#342421]/60'}`}>
                    Dispatched from Koregaon Park at 06:30 AM
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType('PICKUP')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    fulfillmentType === 'PICKUP'
                      ? 'border-[#342421] bg-[#FF7836] text-white shadow-[2px_2px_0px_#342421]'
                      : 'border-[#342421]/30 bg-white text-[#342421] hover:bg-[#FFF7EB]'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>Bakery Counter Pickup</span>
                  </div>
                  <div className={`text-[10px] mt-1 font-medium ${fulfillmentType === 'PICKUP' ? 'text-white/80' : 'text-[#342421]/60'}`}>
                    Koregaon Park Counter (Free)
                  </div>
                </button>
              </div>

              {fulfillmentType === 'DELIVERY' && (
                <div className="space-y-4 pt-2">
                  {/* Saved Addresses Selector (Amazon-style) */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-[#342421] tracking-wider">
                          Select Delivery Address
                        </span>
                        <Link
                          href="/account/addresses"
                          target="_blank"
                          className="text-[11px] font-bold text-[#FF7836] hover:underline flex items-center gap-1"
                        >
                          <span>Manage Address Book</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Address Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id && !isAddingNewAddress;
                          return (
                            <div
                              key={addr.id}
                              onClick={() => handleSelectSavedAddress(addr)}
                              className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative flex flex-col justify-between ${
                                isSelected
                                  ? 'border-[#342421] bg-[#FFF2D6] ring-2 ring-[#FF7836] shadow-[3px_3px_0px_#342421]'
                                  : 'border-[#342421]/30 bg-white hover:border-[#342421] hover:bg-[#FFFDF9]'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                        isSelected
                                          ? 'border-[#FF7836] bg-[#FF7836]'
                                          : 'border-[#342421]/40 bg-white'
                                      }`}
                                    >
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="font-bold text-xs text-[#342421]">
                                      {addr.contactName || customerName}
                                    </span>
                                  </div>

                                  {addr.isDefault && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#FF7836] text-white text-[9px] font-black uppercase tracking-wider">
                                      Default
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-[#342421]/80 leading-relaxed pl-6">
                                  <p className="font-medium text-[#342421]">{addr.addressLine1}</p>
                                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                                  <p className="font-semibold">
                                    {addr.city}, {addr.state} - {addr.postalCode}
                                  </p>
                                  {addr.contactPhone && (
                                    <p className="text-[10px] text-[#342421]/60 mt-1">
                                      Phone: {addr.contactPhone}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div className="mt-2.5 pt-2 border-t border-[#342421]/15 text-[11px] font-bold text-[#FF7836] flex items-center gap-1 pl-6">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Delivering to this address</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add new address button toggle */}
                      {!isAddingNewAddress ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewAddress(true);
                            setSelectedAddressId('NEW');
                            setAddressLine1('');
                            setAddressLine2('');
                            setPostalCode('411001');
                            setDeliveryInstructions('');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#342421]/40 hover:border-[#342421] bg-white/60 hover:bg-white text-xs font-bold text-[#342421] flex items-center justify-center gap-2 transition-all"
                        >
                          <Plus className="w-4 h-4 text-[#FF7836]" />
                          <span>+ Add a new delivery address</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-black uppercase text-[#342421]">
                            New Delivery Address
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewAddress(false);
                              if (savedAddresses.length > 0) {
                                const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                                handleSelectSavedAddress(def);
                              }
                            }}
                            className="text-xs font-bold text-[#FF7836] hover:underline"
                          >
                            Cancel (Use Saved Address)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual / New Address Form Fields */}
                  {(isAddingNewAddress || savedAddresses.length === 0) && (
                    <div className="space-y-3 p-4 rounded-2xl bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421]">
                      <div>
                        <label className="text-xs font-bold text-[#342421] block mb-1">
                          Street Address / Flat / Unit *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder="e.g. Flat 301, Silver Oak Society, Lane 7"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#342421] block mb-1">
                          Area / Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          placeholder="e.g. Near German Bakery, Koregaon Park"
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#342421] block mb-1">City</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#342421] block mb-1">State</label>
                          <input
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#342421] block mb-1">PIN Code</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold font-mono text-[#342421]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#342421] block mb-1">
                          Delivery Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryInstructions}
                          onChange={(e) => setDeliveryInstructions(e.target.value)}
                          placeholder="Gate code, landmark, or reception drop-off instructions..."
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-medium text-[#342421]"
                        />
                      </div>

                      {/* Amazon-style Save Checkboxes */}
                      <div className="pt-2 space-y-2 border-t border-[#342421]/15">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveAddressForFuture}
                            onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                            className="w-4 h-4 rounded-sm border-2 border-[#342421] text-[#FF7836] focus:ring-[#FF7836]"
                          />
                          <span className="text-xs font-bold text-[#342421]">
                            Save this address to my account for future orders
                          </span>
                        </label>

                        {saveAddressForFuture && (
                          <label className="flex items-center gap-2 cursor-pointer pl-6">
                            <input
                              type="checkbox"
                              checked={makeNewAddressDefault}
                              onChange={(e) => setMakeNewAddressDefault(e.target.checked)}
                              className="w-3.5 h-3.5 rounded-sm border-2 border-[#342421] text-[#FF7836] focus:ring-[#FF7836]"
                            />
                            <span className="text-[11px] font-medium text-[#342421]/80">
                              Make this my default address
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Payment Gateway */}
            <div className="bg-[#FFF7EB] rounded-3xl p-6 sm:p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b-2 border-[#342421]/15">
                <div className="w-8 h-8 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center font-bold text-xs">
                  {channel === 'B2B' ? 4 : 3}
                </div>
                <h2 className="font-sans text-base sm:text-lg font-bold text-[#342421] tracking-tight">
                  Authorized Payment Gateway
                </h2>
              </div>

              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'YOUPI_PG'
                      ? 'border-[#342421] bg-white shadow-[2px_2px_0px_#342421]'
                      : 'border-[#342421]/20 bg-white/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'YOUPI_PG'}
                    onChange={() => setPaymentMethod('YOUPI_PG')}
                    className="mt-1 text-[#FF7836] focus:ring-[#FF7836]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#342421]">
                        UPI (Google Pay, PhonePe, Paytm, BHIM)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        Instant Confirmation
                      </span>
                    </div>
                    <p className="text-[11px] text-[#342421]/70 mt-1">
                      Direct UPI payment via QR or app (nominal platform fees included) for instant automated order confirmation.
                    </p>
                  </div>
                </label>

                {channel === 'B2B' && (
                  <label
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'CREDIT_CYCLE'
                        ? 'border-[#342421] bg-white shadow-[2px_2px_0px_#342421]'
                        : 'border-[#342421]/20 bg-white/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'CREDIT_CYCLE'}
                      onChange={() => setPaymentMethod('CREDIT_CYCLE')}
                      className="mt-1 text-[#FF7836] focus:ring-[#FF7836]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#342421]">
                          B2B Credit Cycle (Net-15 Invoice Settlement)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          Approved Terms
                        </span>
                      </div>
                      <p className="text-[11px] text-[#342421]/70 mt-1">
                        Order will be scheduled upon Bakery Operations dispatch review. Invoice generated with 15-day due date.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order (5 cols) */}
          <div className="lg:col-span-5 bg-[#FFF7EB] rounded-3xl p-6 sm:p-7 border-2 border-[#342421] shadow-[5px_5px_0px_#342421] space-y-6 sticky top-28">
            <h2 className="font-sans text-lg sm:text-xl font-bold text-[#342421] tracking-tight pb-3 border-b-2 border-[#342421]/15">
              Order Review ({items.length} Items)
            </h2>

            <div className="max-h-64 overflow-y-auto divide-y-2 divide-[#342421]/10 text-xs">
              {items.map((item) => (
                <div key={item.productId} className="py-2.5 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#FFFDF9] border border-[#342421]/20 flex-shrink-0 flex items-center justify-center p-0.5">
                      <Image
                        src={item.product.imageUrl || '/images/products/fresh-ladi-pav.png'}
                        alt={item.product.name}
                        fill
                        className="object-contain p-0.5"
                        sizes="40px"
                      />
                    </div>
                    <div className="truncate pr-1">
                      <div className="font-bold text-[#342421] truncate">{item.product.name}</div>
                      <div className="text-[#342421]/60">
                        Qty: {item.quantity} × {formatCurrency(channel === 'B2B' ? item.product.wholesalePrice : item.product.retailPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-[#342421] flex-shrink-0">
                    {formatCurrency((channel === 'B2B' ? item.product.wholesalePrice : item.product.retailPrice) * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Promo / Live Verification Coupon */}
            <div className="pt-3 border-t-2 border-[#342421]/15 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#342421]">Have a coupon code?</span>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('qazwsx');
                    applyCoupon('qazwsx').then((res) => {
                      setCouponMessage({ text: res.message, isError: !res.success });
                    });
                  }}
                  className="text-[11px] font-bold text-[#FF7836] hover:text-[#e06325] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Apply &quot;qazwsx&quot; (₹1 Test)
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter code (e.g. qazwsx)"
                  className="flex-1 px-3 py-1.5 rounded-full border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                />
                <button
                  type="button"
                  disabled={isValidating || !couponInput.trim()}
                  onClick={async () => {
                    const res = await applyCoupon(couponInput);
                    setCouponMessage({ text: res.message, isError: !res.success });
                  }}
                  className="px-4 py-1.5 rounded-full bg-[#342421] hover:bg-[#201513] text-white text-xs font-bold uppercase tracking-wider border-2 border-[#342421] disabled:opacity-50"
                >
                  {isValidating ? '...' : 'Apply'}
                </button>
                {couponCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setCouponInput('');
                      applyCoupon(null).then((res) => {
                        setCouponMessage({ text: res.message, isError: false });
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 hover:bg-rose-200"
                  >
                    Remove
                  </button>
                )}
              </div>

              {couponMessage && (
                <p className={`text-[11px] font-bold ${couponMessage.isError ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t-2 border-[#342421]/15 text-xs text-[#342421]/70 font-medium">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-[#342421]">{formatCurrency(subtotal)}</span>
              </div>

              {validation?.discountAmount ? (
                <div className="flex justify-between text-[#FF7836] font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{validation.appliedDiscount?.name || 'Discount Applied'}</span>
                  </span>
                  <span>-{formatCurrency(validation.discountAmount)}</span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span>Bakery GST (5%)</span>
                <span className="font-bold text-[#342421]">
                  {formatCurrency(validation?.taxAmount ?? Math.round(subtotal * 0.05))}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Fulfillment ({fulfillmentType})</span>
                <span className="font-bold text-[#342421]">
                  {fulfillmentType === 'PICKUP' || validation?.deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatCurrency(validation?.deliveryFee ?? 50)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t-2 border-[#342421]/15 flex justify-between text-xl font-display uppercase font-bold text-[#342421]">
                <span>Total Payable</span>
                <span className="text-[#FF7836]">{formatCurrency(total)}</span>
              </div>
            </div>

            {orderError && (
              <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full justify-between py-4 px-6 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all flex items-center"
            >
              <span>{isSubmitting ? 'Confirming...' : 'Confirm & Place Order'}</span>
              <span>{formatCurrency(total)}</span>
            </button>

            <div className="space-y-1.5 text-[11px] text-[#342421]/60 text-center font-medium">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero SMS spam • Delivery coordination via verified email</span>
              </div>
              <p>Spring Boot Authoritative Tax & Invoice Computation</p>
            </div>
          </div>
        </form>
      </div>
    </StorefrontLayout>
  );
}
