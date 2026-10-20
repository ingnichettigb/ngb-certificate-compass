/*
 * File:      IconaAzione.tsx
 * Percorso:  src/features/operatore/components/IconaAzione.tsx
 * Pulsante icona quadrato usato per le azioni di riga della coda.
 */
import { Button } from "@/components/ui/button";

export function IconaAzione({
  t,
  onClick,
  children,
  danger,
  disabled,
}: {
  t: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      title={t}
      aria-label={t}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 w-8 [&_svg]:h-4 [&_svg]:w-4 ${danger ? "text-destructive" : ""}`}
    >
      {children}
    </Button>
  );
}
