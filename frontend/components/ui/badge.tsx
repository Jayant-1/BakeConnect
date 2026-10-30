import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-cream-subtle text-crust-dark border border-cream-border',
        berry: 'bg-berry-subtle text-berry-jam border border-berry-jam/20',
        butter: 'bg-butter-surface text-amber-900 border border-butter-warm/40',
        sea: 'bg-sea-subtle text-sea-tide border border-sea-tide/30',
        success: 'bg-status-success-bg text-status-success border border-status-success/30',
        warning: 'bg-status-warning-bg text-status-warning border border-status-warning/30',
        error: 'bg-status-error-bg text-status-error border border-status-error/30',
        info: 'bg-status-info-bg text-status-info border border-status-info/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
