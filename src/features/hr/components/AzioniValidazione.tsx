/*
 * File:      AzioniValidazione.tsx
 * Percorso:  src/features/hr/components/AzioniValidazione.tsx
 * Pulsanti Approva, Respingi e «Invia di nuovo email di esito».
 */
import { toast } from "sonner";
import { Loader2, Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apriEmailEsito, type Attestato, type Stato } from "@/lib/api";

export function AzioniValidazione({
  attestato,
  busy,
  haEmail,
  mostraNote,
  setMostraNote,
  onDecidi,
}: {
  attestato: Attestato;
  busy: boolean;
  haEmail: boolean;
  mostraNote: boolean;
  setMostraNote: (v: boolean) => void;
  onDecidi: (esito: Stato) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onDecidi("Approvato")} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Approva
      </Button>
      <Button
        variant="destructive"
        disabled={busy}
        onClick={() => (mostraNote ? onDecidi("Respinto") : setMostraNote(true))}
      >
        <X className="size-4" />
        Respingi
      </Button>
      {attestato.stato_validazione !== "In attesa" && (
        <Button
          variant="outline"
          disabled={!haEmail}
          onClick={() => {
            if (!apriEmailEsito(attestato, attestato.stato_validazione))
              toast.error("Il dipendente non ha un'email in archivio");
          }}
        >
          <Mail className="size-4" />
          Invia di nuovo email di esito
        </Button>
      )}
    </div>
  );
}
