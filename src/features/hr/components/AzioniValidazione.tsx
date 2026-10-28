/*
 * File:          AzioniValidazione.tsx
 * Percorso:      src/features/hr/components/AzioniValidazione.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Creazione pulsanti Approva, Respingi e reinvio email di esito.
 *   - Rev 2 (2026-10-28 11:35): Aggiunto pulsante «Scollega link errato» accanto ad Approva e Respingi.
 *   - Rev 3 (2026-10-28 11:50): Aggiunto pulsante «Approva in attesa di integrazione».
 *   - Rev 4 (2026-10-28 14:15): Aggiunto pulsante «Approva e rinomina file» nella cartella di origine.
 */
import { toast } from "sonner";
import { Loader2, Check, X, Mail, Unlink, Clock, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apriEmailEsito, type Attestato, type Stato } from "@/lib/api";

export function AzioniValidazione({
  attestato,
  busy,
  haEmail,
  mostraNote,
  setMostraNote,
  onDecidi,
  onApprovaERinomina,
  onScollegaLink,
  onApriIntegrazione,
}: {
  attestato: Attestato;
  busy: boolean;
  haEmail: boolean;
  mostraNote: boolean;
  setMostraNote: (v: boolean) => void;
  onDecidi: (esito: Stato) => void;
  onApprovaERinomina?: () => void;
  onScollegaLink?: () => void;
  onApriIntegrazione?: () => void;
}) {
  const haDocumento = Boolean(attestato.url_foto_fronte?.trim() || attestato.url_foto_retro?.trim());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => onDecidi("Approvato")} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Approva
      </Button>

      {haDocumento && onApprovaERinomina && (
        <Button
          type="button"
          disabled={busy}
          onClick={onApprovaERinomina}
          className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 dark:text-teal-300"
          title="Rinomina il file fisico nella cartella originaria come CODICE-COGNOME-NOME-CORSO-ORE-CF.pdf, aggiorna il link nel DB e approva"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileEdit className="size-4" />}
          Approva e rinomina file
        </Button>
      )}

      {onApriIntegrazione && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onApriIntegrazione}
          className="border-amber-500/60 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300"
          title="Approva con riserva: serve il corso integrativo SIC-SPI-04"
        >
          <Clock className="size-4" />
          Approva in attesa di integrazione
        </Button>
      )}

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
          Scollega link ed escludi dall'attesa
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
