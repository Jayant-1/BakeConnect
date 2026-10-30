'use client';

import React from 'react';
import { AnnouncementBar } from '../storefront/announcement-bar';
import { StorefrontHeader } from './storefront-header';
import { Footer } from '../storefront/footer';
export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream-base text-crust-dark font-sans selection:bg-berry-jam selection:text-cream-base">
      <AnnouncementBar />
      <StorefrontHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
