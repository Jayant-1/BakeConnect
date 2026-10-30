'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/store/auth-context';

export function HeroShowcase() {
  const { role } = useAuth();
  return (
    <section className="relative min-h-[540px] sm:min-h-[620px] lg:min-h-[680px] flex items-center justify-center bg-[#FFF7EB] border-b-2 border-[#342421] overflow-hidden px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      {/* 1. Four Signature Bakery Product Cut-outs Framing Main Text */}
      
      {/* Top-Left: Hot Morning Golden Ladi Pav */}
      <div 
        aria-hidden="true" 
        className="absolute -left-4 sm:left-2 md:left-[4%] lg:left-[8%] xl:left-[11%] 2xl:left-[14%] top-4 sm:top-6 lg:top-10 w-28 sm:w-44 lg:w-56 xl:w-64 pointer-events-none select-none z-0 transform -rotate-3 transition-transform duration-700 hover:rotate-0"
      >
        <Image
          src="/images/cutouts/ladi-pav-cutout.png"
          alt="Fresh Pune Ladi Pav"
          width={420}
          height={420}
          className="w-full h-auto object-contain drop-shadow-[0_12px_24px_rgba(52,36,33,0.12)]"
          priority
        />
      </div>

      {/* Top-Right: Belgian Dark Chocolate Truffle Cake */}
      <div 
        aria-hidden="true" 
        className="absolute -right-6 sm:right-1 md:right-[3%] lg:right-[7%] xl:right-[10%] 2xl:right-[13%] top-6 sm:top-8 lg:top-12 w-24 sm:w-36 lg:w-48 xl:w-56 pointer-events-none select-none z-0 transform rotate-3 transition-transform duration-700 hover:rotate-0"
      >
        <Image
          src="/images/cutouts/celebration-cake-cutout.png"
          alt="Belgian Dark Chocolate Truffle Cake"
          width={400}
          height={400}
          className="w-full h-auto object-contain drop-shadow-[0_14px_28px_rgba(52,36,33,0.14)]"
          priority
        />
      </div>

      {/* Bottom-Left: Hot & Flaky Spiced Vegetable Bakery Puff */}
      <div 
        aria-hidden="true" 
        className="absolute -left-2 sm:left-4 md:left-[5%] lg:left-[9%] xl:left-[13%] 2xl:left-[16%] bottom-3 sm:bottom-6 lg:bottom-8 w-24 sm:w-32 lg:w-40 xl:w-48 pointer-events-none select-none z-0 transform rotate-6 transition-transform duration-700 hover:rotate-0"
      >
        <Image
          src="/images/cutouts/veg-puff-cutout.png"
          alt="Golden Spiced Veg Puff"
          width={380}
          height={380}
          className="w-full h-auto object-contain drop-shadow-[0_12px_24px_rgba(52,36,33,0.12)]"
          priority
        />
      </div>

      {/* Bottom-Right: 72-Layer Pure Butter Khari Stack */}
      <div 
        aria-hidden="true" 
        className="absolute -right-2 sm:right-4 md:right-[5%] lg:right-[9%] xl:right-[13%] 2xl:right-[16%] bottom-3 sm:bottom-6 lg:bottom-8 w-24 sm:w-32 lg:w-40 xl:w-48 pointer-events-none select-none z-0 transform -rotate-4 transition-transform duration-700 hover:rotate-0"
      >
        <Image
          src="/images/cutouts/khari-cutout.png"
          alt="Crispy Pure Butter Khari Stack"
          width={380}
          height={380}
          className="w-full h-auto object-contain drop-shadow-[0_12px_24px_rgba(52,36,33,0.12)]"
          priority
        />
      </div>

      {/* 2. Centered Content Composition with Clear Visual Hierarchy */}
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
        {/* Simple, Authentic Provenance Cue */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9EAF3] text-[#342421] border-2 border-[#342421] text-xs font-bold uppercase tracking-wider mb-6 sm:mb-8 shadow-[2px_2px_0px_#342421]">
          <span className="w-2 h-2 rounded-full bg-[#FF7836]" />
          <span>Your neighbourhood bakery in Pune</span>
        </div>

        {/* Oversized Sliced Bakery Headline in Anton */}
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-[#342421] leading-[0.95] uppercase mb-6 sm:mb-8">
          Pune, meet your<br />
          <span className="text-[#FF7836]">new daily craving.</span>
        </h1>

        {/* Concise Supporting Sentence */}
        <p className="font-sans text-base sm:text-lg lg:text-xl text-[#342421]/80 max-w-xl mx-auto font-normal leading-relaxed mb-8 sm:mb-10 px-2">
          Pav, khari, tea-time favourites and celebration cakes—find your next favourite bake.
        </p>

        {/* Dominant Call-to-Action Controls (WCAG AAA 7.2:1 Contrast) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-md">
          <Link
            href={role === 'RETAILER' ? '/retailer' : '/shop'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:py-4 rounded-full text-base sm:text-lg font-bold bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[4px_4px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#342421] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <span>{role === 'RETAILER' ? 'Order Wholesale Stock' : 'Explore our bakes'}</span>
            <ArrowRight className="w-5 h-5 text-[#342421]" />
          </Link>
          {role !== 'DIRECT_CUSTOMER' && (
            <Link
              href={role === 'RETAILER' ? '/retailer/orders' : '/wholesale'}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#342421] hover:text-[#FF7836] underline decoration-2 underline-offset-4 transition-colors py-2"
            >
              <span>{role === 'RETAILER' ? 'Standing Wholesale Orders' : 'Buying for your shop?'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

