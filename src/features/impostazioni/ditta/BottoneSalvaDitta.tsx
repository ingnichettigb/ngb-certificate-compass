/*
 * File:      BottoneSalvaDitta.tsx
 * Percorso:  src/features/impostazioni/ditta/BottoneSalvaDitta.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: pulsante «Salva modifiche DB» (usato in alto e in basso). Nessun cambio di comportamento.
 */
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottoneSalvaDitta({ isSaving }: { isSaving: boolean }) {
  return (
    <Button
      type="submit"
      disabled={isSaving}
      className="border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold gap-2"
    >
      {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      Salva modifiche DB
    </Button>
  );
}
