/*
 * File:      ModaleEmail.tsx
 * Percorso:  src/features/operatore/components/ModaleEmail.tsx
 * Finestra di anteprima e modifica dell'email prima dell'invio con Resend.
 */
import type { Dispatch, SetStateAction } from "react";
import { Loader2, Mail, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StatoModaleEmail } from "../types";

export function ModaleEmail({
  stato,
  setStato,
  inviando,
  onConferma,
}: {
  stato: StatoModaleEmail;
  setStato: Dispatch<SetStateAction<StatoModaleEmail>>;
  inviando: boolean;
  onConferma: () => void;
}) {
  return (
      <Dialog
        open={stato.aperta}
        onOpenChange={(open) => !inviando && setStato((m) => ({ ...m, aperta: open }))}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              Verifica e invia email esito attestati
            </DialogTitle>
            <DialogDescription>
              Controlla o inserisci l'indirizzo email del destinatario e il testo del messaggio prima di procedere.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!stato.destinatari.trim() && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>
                  <b>Email mancante:</b> inserisci qui sotto l'indirizzo email a cui inviare l'esito. Verrà salvato automaticamente per questo lavoratore.
                </span>
              </div>
            )}

            <div>
              <Label htmlFor="destinatariEmail" className="font-semibold">
                Destinatari (separati da virgola se più di uno) *
              </Label>
              <Input
                id="destinatariEmail"
                placeholder="es. domenico.perziano@email.it, hr@azienda.com"
                value={stato.destinatari}
                onChange={(e) => setStato((m) => ({ ...m, destinatari: e.target.value }))}
                className="mt-1"
                autoFocus={!stato.destinatari.trim()}
              />
            </div>

            <div>
              <Label htmlFor="oggettoEmail" className="font-semibold">
                Oggetto email
              </Label>
              <Input
                id="oggettoEmail"
                value={stato.oggetto}
                onChange={(e) => setStato((m) => ({ ...m, oggetto: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="corpoEmail" className="font-semibold">
                Testo del messaggio
              </Label>
              <Textarea
                id="corpoEmail"
                rows={7}
                value={stato.testoCorpo}
                onChange={(e) => setStato((m) => ({ ...m, testoCorpo: e.target.value }))}
                className="mt-1 font-sans text-xs leading-relaxed"
              />
            </div>

            <div className="rounded-md border p-2.5 bg-muted/30 text-[11px] text-muted-foreground">
              <b>Mittente / Firma:</b> Inviato tramite Resend con i dati configurati in <i>Dati ditta / studio</i>.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={inviando}
              onClick={() => setStato((m) => ({ ...m, aperta: false }))}
            >
              Annulla
            </Button>
            <Button
              type="button"
              disabled={inviando || !stato.destinatari.trim()}
              onClick={onConferma}
              className="gap-2"
            >
              {inviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Invia adesso con Resend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
