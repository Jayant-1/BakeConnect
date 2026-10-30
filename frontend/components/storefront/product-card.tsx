'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '../../lib/api/types';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../lib/store/cart-context';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Check, Star, Sparkles, Clock, Leaf } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, channel } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [imgSrc, setImgSrc] = useState(
    product.imageUrl || 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04'
  );

  const price = channel === 'B2B' ? product.wholesalePrice : product.retailPrice;
  const initialQty = channel === 'B2B' ? product.moq : 1;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, initialQty);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const isEggless =
    product.isEggless ||
    product.dietaryTags?.includes('EGGLESS') ||
    product.name.toLowerCase().includes('khari') ||
    product.name.toLowerCase().includes('nankhatai') ||
    product.name.toLowerCase().includes('rusk') ||
    product.name.toLowerCase().includes('ladi pav');

  const isOutOfStock =
    product.isAvailable === false ||
    (product.stockQuantity !== undefined && product.stockQuantity <= 0);

  return (
    <div className="group relative bg-[#FFF7EB] rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] hover:shadow-[6px_6px_0px_#342421] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
      {/* 1. Product Image Thumbnail */}
      <Link
        href={`/products/${product.slug}`}
        className="relative w-full aspect-[4/3] bg-white border-b-2 border-[#342421] p-3 flex items-center justify-center overflow-hidden block"
      >
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          onError={() =>
            setImgSrc('https://images.unsplash.com/photo-1589367920969-ab8e050bbb04')
          }
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Official Indian Food Safety Green Dot / Vegetarian Indicator Only */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <div
            className={`border-2 ${
              isEggless ? 'border-emerald-700 bg-white' : 'border-amber-800 bg-white'
            } p-[2px] rounded-xs flex items-center justify-center shadow-xs`}
            title={isEggless ? 'Eggless / 100% Vegetarian' : 'Contains Egg'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isEggless ? 'bg-emerald-700' : 'bg-amber-800'
              }`}
            />
          </div>
          {isEggless && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D9EAF3] text-[#342421] border border-[#342421]/30">
              Eggless
            </span>
          )}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="px-3 py-1 rounded-full bg-[#342421] text-white text-xs font-bold uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* 2. Structured Content: Name -> Pack Details -> Description */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-[#FFF7EB]">
        <div>
          <Link
            href={`/products/${product.slug}`}
            className="group-hover:text-[#FF7836] transition-colors block"
          >
            <h3 className="font-sans text-base sm:text-lg font-bold text-[#342421] leading-snug line-clamp-2">
              {product.name}
            </h3>
          </Link>

          {/* Meaningful Pack Details directly below Name */}
          {product.packDetails && (
            <div className="text-xs text-[#342421]/70 font-medium mt-1">
              {product.packDetails}
            </div>
          )}

          <p className="text-xs text-[#342421]/75 line-clamp-2 mt-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* 3. Pricing & Accessible Add Action */}
        <div className="pt-3 border-t border-[#342421]/15 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#342421]">
                {formatCurrency(price)}
              </span>
              {channel === 'B2B' && (
                <span className="text-xs text-[#342421]/50 line-through">
                  {formatCurrency(product.retailPrice)}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#342421]/60 font-medium">
              Per {product.unitOfMeasure?.toLowerCase() || 'item'}
              {channel === 'B2B' && (
                <span className="text-emerald-700 font-bold ml-1">
                  (MOQ: {product.moq})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`rounded-full px-4 py-1.5 font-bold text-xs border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 ${
              isOutOfStock
                ? 'bg-neutral-200 text-neutral-500 border-[#342421]/30 cursor-not-allowed shadow-none'
                : isAdded
                ? 'bg-[#D9EAF3] text-[#342421]'
                : 'bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421]'
            }`}
            aria-label={`Add ${product.name} to basket`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : isOutOfStock ? (
              <span>Unavailable</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{channel === 'B2B' ? `Add ${product.moq}` : 'Add'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

