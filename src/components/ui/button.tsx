/**
 * @file button.tsx
 * @path src/components/ui/button.tsx
 * @created 2024-05-10
 * @revision 2026-10-28 20:15 - rev 3 - Centralizzazione stile globale pulsanti verdi con bordo brillante e rossi
 * @description Componente unificato per tutti i bottoni dell'applicazione.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Variante standard VERDE: sfondo verdino, bordo verde elettrico evidente, hover verde marcato
        default:
          "bg-emerald-50 text-emerald-950 border-2 border-emerald-500 shadow-sm hover:bg-emerald-100 hover:border-emerald-600 active:bg-emerald-200 active:border-emerald-700 focus-visible:ring-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-400",
        
        // Variante ROSSA / DISTRUTTIVA: sfondo rosso tenue, bordo rosso vivo brillante, hover intenso
        destructive:
          "bg-red-50 text-red-950 border-2 border-red-500 shadow-sm hover:bg-red-100 hover:border-red-600 active:bg-red-200 active:border-red-700 focus-visible:ring-red-400 dark:bg-red-950/40 dark:text-red-100 dark:border-red-400",
        
        // Altre varianti collegate alla palette verde/neutra
        outline:
          "bg-background text-foreground border-2 border-emerald-500/60 shadow-sm hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-950",
        secondary:
          "bg-emerald-100/70 text-emerald-900 border border-emerald-400/50 shadow-sm hover:bg-emerald-200/80 hover:border-emerald-500",
        ghost:
          "hover:bg-emerald-50 hover:text-emerald-900",
        link:
          "text-emerald-700 underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
