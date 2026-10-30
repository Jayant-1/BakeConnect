import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-jam focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-berry-jam text-cream-base hover:bg-berry-hover shadow-sm active:bg-berry-hover',
        secondary:
          'bg-cream-surface text-crust-dark border border-cream-border hover:bg-cream-subtle hover:border-crust-faint',
        butter:
          'bg-butter-warm text-crust-dark hover:bg-yellow-400 font-semibold shadow-sm',
        outline:
          'border border-berry-jam text-berry-jam bg-transparent hover:bg-berry-subtle',
        ghost:
          'text-crust-dark hover:bg-cream-subtle hover:text-berry-jam',
        danger:
          'bg-status-error text-white hover:bg-red-700 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-full min-h-[36px]',
        default: 'h-10 px-5 py-2 text-sm rounded-full min-h-[44px]',
        lg: 'h-12 px-7 text-base rounded-full min-h-[48px]',
        icon: 'h-10 w-10 rounded-full min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
