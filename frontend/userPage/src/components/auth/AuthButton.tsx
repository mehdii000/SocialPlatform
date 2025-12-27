import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ children, loading, variant = 'primary', className, disabled, ...props }, ref) => {
    const variants = {
      primary: cn(
        "bg-primary text-primary-foreground",
        "hover:opacity-90 active:scale-[0.98]",
        "glow animate-pulse-glow"
      ),
      secondary: cn(
        "bg-secondary text-secondary-foreground",
        "hover:bg-secondary/80 active:scale-[0.98]",
        "border border-border"
      ),
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "w-full py-3 px-4 rounded-lg font-medium",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none",
          variants[variant],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Please wait...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

AuthButton.displayName = 'AuthButton';
