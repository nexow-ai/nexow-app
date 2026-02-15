import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: [
    "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white",
    "hover:from-emerald-500 hover:to-emerald-400",
    "shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50",
    "active:scale-[0.98]",
  ].join(" "),
  secondary: [
    "bg-zinc-800/80 text-zinc-100 border border-zinc-700/50",
    "hover:bg-zinc-700/80 hover:border-zinc-600/50",
    "shadow-lg shadow-black/20",
    "active:scale-[0.98]",
  ].join(" "),
  outline: [
    "border border-zinc-700/60 text-zinc-300 bg-transparent",
    "hover:bg-zinc-800/60 hover:border-zinc-600/60 hover:text-zinc-100",
    "active:scale-[0.98]",
  ].join(" "),
  ghost: [
    "text-zinc-400 bg-transparent",
    "hover:text-zinc-100 hover:bg-zinc-800/50",
    "active:scale-[0.98]",
  ].join(" "),
  danger: [
    "bg-gradient-to-r from-red-600 to-red-500 text-white",
    "hover:from-red-500 hover:to-red-400",
    "shadow-lg shadow-red-900/30",
    "active:scale-[0.98]",
  ].join(" "),
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          "disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button, type ButtonProps };
