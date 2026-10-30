'use client';

import React from 'react';
import { Category } from '../../lib/api/types';
import { cn } from '../../lib/utils';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  totalProductsCount: number;
}

export function CategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductsCount,
}: CategoryPillsProps) {
  return (
    <div className="w-full border-b-2 border-[#342421] bg-[#FFF7EB]/95 sticky top-20 z-30 backdrop-blur-md py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 py-1">
          {/* "All" Pill */}
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={cn(
              'flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-150',
              selectedCategory === 'all'
                ? 'bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421]'
                : 'bg-white text-[#342421] border-2 border-[#342421]/30 hover:border-[#342421] hover:bg-[#FFF7EB]'
            )}
          >
            <span>All Daily Bakes</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                selectedCategory === 'all'
                  ? 'bg-[#342421] text-white'
                  : 'bg-[#D9EAF3] text-[#342421]'
              )}
            >
              {totalProductsCount}
            </span>
          </button>

          {/* Individual Category Pills */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-150',
                  isSelected
                    ? 'bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421]'
                    : 'bg-white text-[#342421] border-2 border-[#342421]/30 hover:border-[#342421] hover:bg-[#FFF7EB]'
                )}
              >
                <span>{cat.name}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    isSelected
                      ? 'bg-[#342421] text-white'
                      : 'bg-[#D9EAF3] text-[#342421]'
                  )}
                >
                  {cat.itemCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
