/*
 * File:      DatiAziendaDialog.tsx
 * Percorso:  src/components/DatiAziendaDialog.tsx
 * Dialog per la configurazione dei dati ditta/studio, della firma Resend e dei dati di sicurezza (ATECO, rischio, lavoratori).
 * Revisioni:
 *   - Rev 2 (2026-11-01 12:00): I dati stanno nel database (tabella ditta) e non più nel browser; aggiunti anagrafica completa
 *     (codice fiscale, partita IVA, PEC, datore di lavoro, RSPP, medico competente) e sezione «Sicurezza e rischio».
 */
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHIAVE_DITTA, salvaDitta } from "@/lib/api/ditta";
import { useDitta, useLavoratoriInForza, useSoglieDitta } from "@/features/ditta/useDitta";
import { SezioneSicurezzaDitta } from "@/features/ditta/SezioneSicurezzaDitta";
import type { Soglia } from "@/features/ditta/regole-ditta";
import {
  formDaDitta,
  modificaDaForm,
  type FormAnagrafica,
  type FormDitta,
} from "@/features/ditta/form-ditta";

export function DatiAziendaDialog() {
  const [aperto, setAperto] = useState(false);
  const [inSalvataggio, setInSalvataggio] = useState(false);
  const qc = useQueryClient();
  const { data: ditta, isLoading } = useDitta();
  const { data: soglie } = useSoglieDitta();
  const { data: inForza } = useLavoratoriInForza();
  const [form, setForm] = useState<FormDitta>(() => formDaDitta(ditta));

  useEffect(() => {
    if (aperto) setForm(formDaDitta(ditta));
  }, [aperto, ditta]);

  async function handleSalva(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ragione_sociale.trim()) {
      return void toast.error("Inserisci il nome dello studio o della ditta");
    }
    const oggi = new Date().toISOString().slice(0, 10);
    setInSalvataggio(true);
    try {
      await salvaDitta(modificaDaForm(form, ditta, oggi));
      await qc.invalidateQueries({ queryKey: CHIAVE_DITTA });
      toast.success("Dati ditta / studio salvati con successo");
      setAperto(false);
    } catch (err) {
      toast.error("Dati ditta non salvati", { description: (err as Error).message });
    } finally {
      setInSalvataggio(false);
    }
  }

  const campo = (k: keyof FormAnagrafica) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="size-4 text-primary" />
          <span>Dati ditta o studio</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            Dati ditta / studio e firma email
          </DialogTitle>
          <DialogDescription>
            Questi dati compariranno nelle email spedite tramite Resend e come mittente per le
            risposte dei destinatari. Sono salvati nel database e quindi uguali su ogni computer.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Caricamento dati ditta...
          </div>
        ) : (
          <form onSubmit={handleSalva} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nomeAzienda">Nome ditta o studio *</Label>
              <Input
                id="nomeAzienda"
                placeholder="Es. Studio Tecnico Nichetti Gian Battista"
                {...campo("ragione_sociale")}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="emailAzienda">Email per risposte (Reply-To) *</Label>
                <Input
                  id="emailAzienda"
                  type="email"
                  placeholder="info@tuodominio.it"
                  {...campo("email")}
                />
                <p className="text-[11px] text-muted-foreground">
                  A questo indirizzo arriveranno le risposte dei destinatari.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referente">Nome referente / operatore</Label>
                <Input
                  id="referente"
                  placeholder="Es. Gian Battista Nichetti"
                  {...campo("referente")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Numero di telefono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="Es. 0374 123456"
                  {...campo("telefono")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="via">Via e numero civico</Label>
                <Input id="via" placeholder="Es. Via Roma, 10" {...campo("indirizzo")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cap">CAP</Label>
                <Input id="cap" placeholder="Es. 26015" {...campo("cap")} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="comune">Località (Comune) e Prov.</Label>
                <div className="flex gap-2">
                  <Input
                    id="comune"
                    placeholder="Soresina"
                    className="flex-1"
                    {...campo("comune")}
                  />
                  <Input
                    id="provincia"
                    placeholder="CR"
                    className="w-16 uppercase text-center"
                    maxLength={2}
                    value={form.provincia}
                    onChange={(e) => setForm({ ...form, provincia: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="codiceFiscale">Codice fiscale</Label>
                <Input
                  id="codiceFiscale"
                  className="font-mono uppercase"
                  {...campo("codice_fiscale")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partitaIva">Partita IVA</Label>
                <Input id="partitaIva" className="font-mono" {...campo("partita_iva")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pec">PEC</Label>
                <Input id="pec" type="email" {...campo("pec")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="datoreLavoro">Datore di lavoro</Label>
                <Input id="datoreLavoro" {...campo("datore_di_lavoro")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rspp">RSPP</Label>
                <Input id="rspp" {...campo("rspp")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="medicoCompetente">Medico competente</Label>
                <Input id="medicoCompetente" {...campo("medico_competente")} />
              </div>
            </div>

            <div className="rounded-lg border p-3 bg-muted/30 space-y-2 text-xs">
              <Label htmlFor="mittenteResend" className="font-semibold text-xs text-foreground">
                Indirizzo di spedizione Resend (From)
              </Label>
              <Input
                id="mittenteResend"
                className="h-8 text-xs font-mono"
                placeholder="onboarding@resend.dev oppure notifiche@tuodominio.it"
                {...campo("email_mittente_resend")}
              />
              <p className="text-[11px] text-muted-foreground">
                Se hai verificato il tuo dominio su Resend inserisci il tuo indirizzo (es.{" "}
                <code>notifiche@iltuodominio.it</code>). Altrimenti lascia{" "}
                <code>onboarding@resend.dev</code> per l'invio immediato.
              </p>
            </div>

            <SezioneSicurezzaDitta
              form={form}
              onChange={(f) => setForm({ ...form, ...f })}
              soglie={(soglie ?? []) as Soglia[]}
              inForza={inForza}
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setAperto(false)}>
                Annulla
              </Button>
              <Button type="submit" className="gap-2" disabled={inSalvataggio}>
                {inSalvataggio ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}{" "}
                Salva dati
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
