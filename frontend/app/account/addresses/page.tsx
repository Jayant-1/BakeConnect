'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { useAuth } from '../../../lib/store/auth-context';
import { apiClient } from '../../../lib/api/client';
import { Address } from '../../../lib/api/types';
import {
  MapPin,
  Plus,
  Check,
  Edit2,
  Trash2,
  ShieldCheck,
  Building,
  Home,
  Phone,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';

interface AddressFormData {
  id?: string;
  contactName: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions: string;
  type: 'SHIPPING' | 'BILLING';
  isDefault: boolean;
}

const INITIAL_FORM: AddressFormData = {
  contactName: '',
  contactPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411001',
  deliveryInstructions: '',
  type: 'SHIPPING',
  isDefault: false,
};

export default function SavedAddressesPage() {
  const router = useRouter();
  const { user, role, isLoading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    setIsLoading(true);
    try {
      const data = await apiClient.getAddresses();
      setAddresses(data);
    } catch (e) {
      console.error('Failed to load addresses:', e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenAdd() {
    setEditingAddress(null);
    setFormData({
      ...INITIAL_FORM,
      contactName: user?.fullName || '',
      contactPhone: user?.phone || '',
      isDefault: addresses.length === 0,
    });
    setFormError(null);
    setShowModal(true);
  }

  function handleOpenEdit(addr: Address) {
    setEditingAddress(addr);
    setFormData({
      id: addr.id,
      contactName: addr.contactName,
      contactPhone: addr.contactPhone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      deliveryInstructions: addr.deliveryInstructions || '',
      type: addr.type === 'BILLING' ? 'BILLING' : 'SHIPPING',
      isDefault: addr.isDefault,
    });
    setFormError(null);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingAddress(null);
    setFormError(null);
  }

  function validateForm(): boolean {
    if (!formData.contactName.trim()) {
      setFormError('Please enter recipient full name');
      return false;
    }
    const cleanPhone = formData.contactPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return false;
    }
    if (!formData.addressLine1.trim()) {
      setFormError('Please enter flat/house no., building and street');
      return false;
    }
    if (!formData.city.trim()) {
      setFormError('Please enter city');
      return false;
    }
    if (!formData.postalCode.trim() || formData.postalCode.trim().length !== 6) {
      setFormError('Please enter a valid 6-digit postal PIN code');
      return false;
    }
    setFormError(null);
    return true;
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingAddress) {
        await apiClient.updateAddress(editingAddress.id, {
          contactName: formData.contactName.trim(),
          contactPhone: formData.contactPhone.trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          deliveryInstructions: formData.deliveryInstructions.trim() || undefined,
          type: formData.type,
          isDefault: formData.isDefault,
        });
        showStatus('Address updated successfully');
      } else {
        await apiClient.createAddress({
          contactName: formData.contactName.trim(),
          contactPhone: formData.contactPhone.trim(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          deliveryInstructions: formData.deliveryInstructions.trim() || undefined,
          type: formData.type,
          isDefault: formData.isDefault,
        });
        showStatus('New address saved to your address book');
      }
      handleCloseModal();
      await loadAddresses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await apiClient.setDefaultAddress(id);
      showStatus('Default delivery address updated');
      await loadAddresses();
    } catch (err: any) {
      showStatus('Failed to update default address', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this saved address?')) return;
    try {
      await apiClient.deleteAddress(id);
      showStatus('Address deleted');
      await loadAddresses();
    } catch (err: any) {
      showStatus('Failed to delete address', 'error');
    }
  }

  function showStatus(text: string, type: 'success' | 'error' = 'success') {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  }

  return (
    <StorefrontLayout>
      <div className="min-h-screen bg-[#FFF7EB] pb-24">
        {/* Breadcrumb & Navigation Header */}
        <div className="bg-[#FFECCC] border-b-2 border-[#342421] py-4 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#342421]/70">
              <Link href="/" className="hover:text-[#FF7836] transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/account/orders" className="hover:text-[#FF7836] transition-colors">
                My Account
              </Link>
              <span>/</span>
              <span className="text-[#342421]">Delivery Addresses</span>
            </div>
            <Link
              href="/checkout"
              className="inline-flex items-center gap-1.5 text-xs font-black text-[#342421] bg-white border-2 border-[#342421] rounded-lg px-3 py-1.5 shadow-[2px_2px_0px_#342421] hover:bg-[#FF7836] hover:text-white transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          {/* Status Message Notification */}
          {statusMessage && (
            <div
              className={`mb-6 p-4 rounded-xl border-2 border-[#342421] flex items-center justify-between shadow-[3px_3px_0px_#342421] ${
                statusMessage.type === 'success'
                  ? 'bg-[#A3E635] text-[#1E3A10]'
                  : 'bg-[#FECDD3] text-[#881337]'
              }`}
            >
              <div className="flex items-center gap-3 text-sm font-bold">
                <Check className="w-5 h-5 flex-shrink-0" />
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-current hover:opacity-70 p-1"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page Title & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-[#342421]/20">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9EAF3] border-2 border-[#342421] text-xs font-black text-[#342421] uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#342421]">
                <MapPin className="w-3.5 h-3.5 text-[#342421]" />
                <span>Customer Address Book</span>
              </div>
              <h1 className="font-anton text-3xl sm:text-4xl uppercase tracking-wider text-[#342421]">
                MY SAVED ADDRESSES
              </h1>
              <p className="text-sm font-medium text-[#342421]/75 mt-1">
                Save and organize your delivery locations for Amazon-style 1-click checkout.
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              id="add-new-address-btn"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#FF7836] text-white font-black text-sm uppercase tracking-wider rounded-xl border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#342421] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Address</span>
            </button>
          </div>

          {/* Quick Context Tip */}
          <div className="mt-6 p-4 rounded-xl bg-white border-2 border-[#342421] shadow-[3px_3px_0px_#342421] flex items-start gap-3">
            <Info className="w-5 h-5 text-[#FF7836] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#342421] font-medium leading-relaxed">
              <span className="font-black">Amazon-style Instant Delivery:</span> Your default address will be automatically selected when ordering warm artisan bakes. You can also pick alternate addresses during checkout in one click.
            </div>
          </div>

          {/* Address Cards Grid */}
          <div className="mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-white border-2 border-[#342421]/20 animate-pulse h-48"
                  />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 px-4 rounded-3xl bg-white border-2 border-[#342421] shadow-[5px_5px_0px_#342421] max-w-xl mx-auto my-8">
                <div className="w-16 h-16 rounded-2xl bg-[#FFECCC] border-2 border-[#342421] flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#342421]">
                  <MapPin className="w-8 h-8 text-[#FF7836]" />
                </div>
                <h2 className="font-anton text-2xl uppercase tracking-wider text-[#342421] mb-2">
                  NO SAVED ADDRESSES YET
                </h2>
                <p className="text-sm font-medium text-[#342421]/70 max-w-md mx-auto mb-6">
                  Add your home, office, or bakery drop-off point once, and never type your delivery details again.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#FF7836] text-white font-black text-sm uppercase tracking-wider rounded-xl border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:bg-[#e66324] transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add Your First Address</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`relative flex flex-col justify-between rounded-2xl p-6 border-2 border-[#342421] transition-all shadow-[4px_4px_0px_#342421] ${
                      addr.isDefault
                        ? 'bg-[#FFF2D6] ring-2 ring-[#FF7836] ring-offset-2'
                        : 'bg-white hover:bg-[#FFFDF9]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FF7836] text-white text-[11px] font-black uppercase tracking-wider border border-[#342421]">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Default Address
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFECCC] text-[#342421] text-[11px] font-bold border border-[#342421]">
                            {addr.addressLine2?.toLowerCase().includes('office') || addr.addressLine2?.toLowerCase().includes('tower') ? (
                              <Building className="w-3 h-3" />
                            ) : (
                              <Home className="w-3 h-3" />
                            )}
                            {addr.type === 'BILLING' ? 'Billing' : 'Delivery'}
                          </span>
                        </div>

                        {/* Quick actions: Edit / Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(addr)}
                            className="p-1.5 rounded-lg border border-[#342421]/30 hover:border-[#342421] hover:bg-white text-[#342421] transition-colors"
                            title="Edit Address"
                            aria-label="Edit Address"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(addr.id)}
                            className="p-1.5 rounded-lg border border-red-300 hover:border-red-600 hover:bg-red-50 text-red-600 transition-colors"
                            title="Delete Address"
                            aria-label="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Recipient Contact */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-[#342421]">
                            {addr.contactName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#342421]/70 mt-0.5">
                          <Phone className="w-3 h-3 text-[#FF7836]" />
                          <span>+91 {addr.contactPhone}</span>
                        </div>
                      </div>

                      {/* Full Address */}
                      <div className="text-xs text-[#342421] font-medium leading-relaxed mb-3">
                        <p className="font-bold text-[#342421]">{addr.addressLine1}</p>
                        {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                        <p className="font-bold">
                          {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                      </div>

                      {/* Delivery Instructions note */}
                      {addr.deliveryInstructions && (
                        <div className="p-2.5 rounded-lg bg-[#FFECCC]/60 border border-[#342421]/20 text-[11px] text-[#342421] font-medium mb-4 flex items-start gap-1.5">
                          <span className="font-bold text-[#FF7836] whitespace-nowrap">Note:</span>
                          <span className="italic">{addr.deliveryInstructions}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Set as Default or Default Status */}
                    <div className="pt-3 border-t border-[#342421]/15 flex items-center justify-between gap-3">
                      {addr.isDefault ? (
                        <span className="text-xs font-bold text-[#342421]/70 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#A3E635]" />
                          Preferred address for orders
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-xs font-black text-[#342421] hover:text-[#FF7836] underline underline-offset-4 transition-colors"
                        >
                          Set as Default
                        </button>
                      )}

                      <Link
                        href="/checkout"
                        className="text-xs font-bold text-[#FF7836] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Deliver Here</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Modal: Add or Edit Address */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-[#FFF7EB] border-2 border-[#342421] rounded-3xl shadow-[8px_8px_0px_#342421] p-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-[#342421]/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFECCC] border border-[#342421] flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#FF7836]" />
                  </div>
                  <h3 className="font-anton text-xl uppercase tracking-wider text-[#342421]">
                    {editingAddress ? 'EDIT SAVED ADDRESS' : 'ADD NEW DELIVERY ADDRESS'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg border border-[#342421]/20 hover:bg-[#FFECCC] text-[#342421] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Notice */}
              {formError && (
                <div className="mt-4 p-3 rounded-xl bg-[#FECDD3] border-2 border-[#342421] text-xs font-bold text-[#881337] flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                {/* Contact Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohit Deshmukh"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                      10-Digit Mobile *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9820398201"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                    />
                  </div>
                </div>

                {/* Address Line 1 */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                    Flat, House No., Building, Street *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 402, Ganga Carnation, Lane 5"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                    Area, Colony, Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near German Bakery, Koregaon Park"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                {/* City, State, PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="411001"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                    />
                  </div>
                </div>

                {/* Delivery Instructions */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#342421] mb-1">
                    Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ring bell, leave with security guard if not available"
                    value={formData.deliveryInstructions}
                    onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                {/* Default Address Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded-sm border-2 border-[#342421] text-[#FF7836] focus:ring-[#FF7836]"
                    />
                    <span className="text-xs font-bold text-[#342421]">
                      Make this my default delivery address
                    </span>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 border-t-2 border-[#342421]/15 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl border-2 border-[#342421] text-xs font-black text-[#342421] hover:bg-[#FFECCC] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl border-2 border-[#342421] bg-[#FF7836] text-white text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#342421] hover:bg-[#e66324] disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
