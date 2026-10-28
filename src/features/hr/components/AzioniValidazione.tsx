/*
 * File:          AzioniValidazione.tsx
 * Percorso:      src/features/hr/components/AzioniValidazione.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Creazione pulsanti Approva, Respingi e reinvio email di esito.
 *   - Rev 2 (2026-10-28 11:35): Aggiunto pulsante «Scollega link errato» accanto ad Approva e Respingi.
 */
import { toast } from "sonner";
import { Loader2, Check, X, Mail, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apriEmailEsito, type Attestato, type Stato } from "@/lib/api";

export function AzioniValidazione({
  attestato,
  busy,
  haEmail,
  mostraNote,
  setMostraNote,
  onDecidi,
  onScollegaLink,
}: {
  attestato: Attestato;
  busy: boolean;
  haEmail: boolean;
  mostraNote: boolean;
  setMostraNote: (v: boolean) => void;
  onDecidi: (esito: Stato) => void;
  onScollegaLink?: () => void;
}) {
  const haDocumento = Boolean(attestato.url_foto_fronte?.trim() || attestato.url_foto_retro?.trim());

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      {haDocumento && onScollegaLink && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onScollegaLink}
          className="border-amber-500/50 text-amber-800 hover:bg-amber-500/10 dark:border-amber-400/40 dark:text-amber-300"
          title="Rimuove il link al file errato ma conserva il corso e le date inserite"
        >
          <Unlink className="size-4" />
          Scollega link errato
        </Button>
      )}

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
