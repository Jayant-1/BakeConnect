'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { apiClient } from '../../../lib/api/client';
import { Product, Review } from '../../../lib/api/types';
import { useCart } from '../../../lib/store/cart-context';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  Check,
  Star,
  Plus,
  Minus,
  Truck,
  ArrowLeft,
  ChevronRight,
  Flame,
  Award,
  PackageCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { addItem, channel } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState('https://images.unsplash.com/photo-1589367920969-ab8e050bbb04');

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 'rev-01',
      productId: 'prod-01',
      userName: 'Kavita Joshi',
      rating: 5,
      comment:
        'Softest pav we have had in Koregaon Park. Warmed it on a tawa with butter and it melted right in. Fresh morning delivery was punctual at 6:45 AM.',
      verifiedPurchase: true,
      createdAt: '2026-10-25T07:15:00Z',
    },
    {
      id: 'rev-02',
      productId: 'prod-02',
      userName: 'Chef Aniruddh',
      rating: 5,
      comment:
        'The pure butter khari is exceptionally flaky with delicate layers. Perfect accompaniment with ginger cardamom chai.',
      verifiedPurchase: true,
      createdAt: '2026-10-22T08:30:00Z',
    },
  ]);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      if (!slug) return;
      setIsLoading(true);
      try {
        const prod = await apiClient.getProduct(slug);
        setProduct(prod);
        if (prod) {
          setImgSrc(prod.imageUrl || '/images/products/fresh-ladi-pav.png');
          setQuantity(channel === 'B2B' ? prod.moq : 1);
        }
      } catch (err) {
        console.error('Failed to fetch product detail:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [slug, channel]);

  if (isLoading) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-7xl mx-auto px-4 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#9C3D2B] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-[#7A685D]">Loading fresh bakery details...</p>
        </div>
      </StorefrontLayout>
    );
  }

  if (!product) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-7xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl font-bold text-[#2D211B] mb-2">Item Not Found</h2>
          <p className="text-sm text-[#7A685D] mb-6">
            The requested bakery item is currently unavailable in today&apos;s batch schedule.
          </p>
          <Link href="/shop">
            <Button className="bg-[#9C3D2B] hover:bg-[#7A2C1D] text-white">Back to Bakery Counter</Button>
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const unitPrice = channel === 'B2B' ? product.wholesalePrice : product.retailPrice;
  const lineTotal = unitPrice * quantity;

  const isEggless =
    product.isEggless ||
    product.dietaryTags?.includes('EGGLESS') ||
    product.dietaryTags?.includes('Eggless') ||
    product.name.toLowerCase().includes('khari') ||
    product.name.toLowerCase().includes('nankhatai') ||
    product.name.toLowerCase().includes('rusk') ||
    product.name.toLowerCase().includes('ladi pav');

  const handleAddToCart = () => {
    addItem(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      productId: product.id,
      userName: 'Verified Customer',
      rating: newReviewRating,
      comment: newReviewComment,
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    };

    setReviews([newRev, ...reviews]);
    setNewReviewComment('');
    setReviewSubmitted(true);
  };

  return (
    <StorefrontLayout>
      <div className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[#7A685D] mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#9C3D2B] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#D5C7B4]" />
          <Link href="/shop" className="hover:text-[#9C3D2B] transition-colors">
            Bakery Counter
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#D5C7B4]" />
          <span className="text-[#2D211B] font-semibold truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Product Photography & Sensory Highlights (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-[#FFFDF9] border-2 border-[#342421] shadow-[5px_5px_0px_#342421] p-6 flex items-center justify-center">
              <Image
                src={imgSrc}
                alt={product.name}
                fill
                priority
                onError={() =>
                  setImgSrc('/images/products/fresh-ladi-pav.png')
                }
                className="object-contain p-4 transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />

              {/* Dietary Green/Amber Dot Pill */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border-2 border-[#342421] text-xs font-bold shadow-[2px_2px_0px_#342421]">
                <div
                  className={`border-2 ${
                    isEggless ? 'border-emerald-700 bg-white' : 'border-amber-800 bg-white'
                  } p-[2px] rounded-xs flex items-center justify-center`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isEggless ? 'bg-emerald-700' : 'bg-amber-800'
                    }`}
                  />
                </div>
                <span className={isEggless ? 'text-emerald-800' : 'text-amber-900'}>
                  {isEggless ? '100% Eggless' : 'Contains Egg'}
                </span>
              </div>
            </div>

            {/* Sensory Highlights Strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FFF7EB] rounded-2xl p-3.5 border-2 border-[#342421] text-center shadow-[2px_2px_0px_#342421]">
                <span className="text-[10px] uppercase font-bold text-[#342421]/60 block">Daily Dawn Pull</span>
                <span className="text-xs font-bold text-[#342421] mt-0.5 block">4:30 AM Morning Hearth</span>
              </div>
              <div className="bg-[#FFF7EB] rounded-2xl p-3.5 border-2 border-[#342421] text-center shadow-[2px_2px_0px_#342421]">
                <span className="text-[10px] uppercase font-bold text-[#342421]/60 block">Specification</span>
                <span className="text-xs font-bold text-[#342421] mt-0.5 block truncate">
                  {product.packDetails || `Per ${product.unitOfMeasure?.toLowerCase() || 'unit'}`}
                </span>
              </div>
              <div className="bg-[#FFF7EB] rounded-2xl p-3.5 border-2 border-[#342421] text-center shadow-[2px_2px_0px_#342421]">
                <span className="text-[10px] uppercase font-bold text-[#342421]/60 block">Shelf Life</span>
                <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                  {product.shelfLifeDays ? `${product.shelfLifeDays} Days Sealed` : 'Consume Fresh'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Details & Customization (5 cols) */}
          <div className="lg:col-span-5 bg-[#FFF7EB] rounded-3xl p-6 sm:p-8 border-2 border-[#342421] shadow-[5px_5px_0px_#342421] space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-block bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  {product.categoryName || 'Bakery Counter'}
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-[#342421]">
                  <Star className="w-3.5 h-3.5 fill-[#FF7836] text-[#FF7836]" />
                  <span>{product.rating || '4.9'}</span>
                  <span className="text-[#342421]/60">({product.reviewCount || 28} reviews)</span>
                </div>
              </div>

              <h1 className="font-display uppercase text-2xl sm:text-4xl font-bold text-[#342421] leading-tight">
                {product.name}
              </h1>

              <p className="text-sm text-[#342421]/75 mt-3 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#342421]">
                    {formatCurrency(unitPrice)}
                  </span>
                  {channel === 'B2B' && (
                    <span className="text-sm text-[#342421]/50 line-through">
                      {formatCurrency(product.retailPrice)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#342421]/60 font-medium">
                  Per {product.unitOfMeasure?.toLowerCase() || 'pack'}
                  {channel === 'B2B' && (
                    <span className="text-emerald-700 font-bold ml-1.5">(MOQ: {product.moq})</span>
                  )}
                </span>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D9EAF3] text-[#342421] border border-[#342421]/30">
                {channel === 'B2B' ? 'Wholesale Net Rate' : 'Oven Fresh'}
              </span>
            </div>

            {/* Packaging & Ingredients Detail */}
            <div className="space-y-2 text-xs bg-white p-4 rounded-2xl border-2 border-[#342421]/20">
              {product.packDetails && (
                <div className="flex items-center gap-2 text-[#342421]">
                  <PackageCheck className="w-4 h-4 text-[#FF7836] shrink-0" />
                  <span><strong>Packaging:</strong> {product.packDetails}</span>
                </div>
              )}
              {product.allergens && (
                <div className="flex items-center gap-2 text-[#342421]/80">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span><strong>Allergens:</strong> {product.allergens}</span>
                </div>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#342421] block">
                Quantity {channel === 'B2B' && `(Min wholesale MOQ: ${product.moq})`}
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-[#342421] rounded-full bg-white p-1 shadow-[2px_2px_0px_#342421]">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((prev) =>
                        Math.max(
                          channel === 'B2B' ? product.moq : 1,
                          prev - (channel === 'B2B' ? product.moqIncrement : 1)
                        )
                      )
                    }
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#342421] hover:bg-[#FFF7EB] transition"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-[#342421]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((prev) => prev + (channel === 'B2B' ? product.moqIncrement : 1))
                    }
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#342421] hover:bg-[#FFF7EB] transition"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right flex-1">
                  <div className="text-xs text-[#342421]/60 font-medium">Line Total:</div>
                  <div className="text-xl font-bold text-[#342421]">{formatCurrency(lineTotal)}</div>
                </div>
              </div>
            </div>

            {/* Add to Basket Action */}
            <button
              type="button"
              className="w-full justify-center font-bold bg-[#FF7836] hover:bg-[#FF6A1F] text-white py-4 rounded-full border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs uppercase tracking-wider flex items-center gap-2"
              onClick={handleAddToCart}
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Basket</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add {quantity} to Basket • {formatCurrency(lineTotal)}</span>
                </>
              )}
            </button>

            {/* Fulfillment Guarantee */}
            <div className="pt-3 border-t-2 border-[#342421]/15 flex items-center gap-2 text-xs font-semibold text-[#342421]/80">
              <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Doorstep delivery available across Pune • Freshly pulled from Koregaon Park hearth.</span>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <section className="mt-16 pt-12 border-t border-[#E6DAC8]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Reviews List */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-[#2D211B]">
                  Verified Customer Reviews
                </h2>
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#2D211B]">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{product.rating || '4.9'} / 5.0</span>
                </div>
              </div>

              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white rounded-2xl p-5 border border-[#E6DAC8] space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D211B]">{rev.userName}</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#7A685D] leading-relaxed">{rev.comment}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold pt-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified Neighbourhood Purchase</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave a Review Form */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E6DAC8] space-y-4 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-[#2D211B]">
                Review this Bake
              </h3>
              <p className="text-xs text-[#7A685D]">
                Share your thoughts on freshness, softness, or tea pairing for other neighbourhood customers.
              </p>

              {reviewSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Thank you! Your verified review has been published.</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#6A4B35] block mb-1">
                      Star Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setNewReviewRating(star)}
                          className="p-1 text-[#A19183] hover:text-amber-500"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= newReviewRating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-[#E6DAC8]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6A4B35] block mb-1">
                      Your Tasting Notes
                    </label>
                    <textarea
                      rows={3}
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="How was the crumb, softness, or flavor pairing?"
                      className="w-full p-3 rounded-xl border border-[#D5C7B4] bg-[#FDFBF7] text-xs text-[#2D211B] placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B]"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#9C3D2B] hover:bg-[#7A2C1D] text-white">
                    Submit Review
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </StorefrontLayout>
  );
}
