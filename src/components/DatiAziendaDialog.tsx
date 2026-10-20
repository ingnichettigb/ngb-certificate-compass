/*
 * File:      DatiAziendaDialog.tsx
 * Percorso:  src/components/DatiAziendaDialog.tsx
 * Dialog per la configurazione dei dati ditta/studio e firma Resend.
 */
import { useState, useEffect } from "react";
import { Building2, Save } from "lucide-react";
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
import { useDatiAzienda, DatiAzienda } from "@/lib/dati-azienda";

export function DatiAziendaDialog() {
  const [aperto, setAperto] = useState(false);
  const [dati, setDati] = useDatiAzienda();
  const [form, setForm] = useState<DatiAzienda>(dati);

  useEffect(() => {
    if (aperto) setForm(dati);
  }, [aperto, dati]);

  function handleSalva(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomeAzienda.trim()) {
      return void toast.error("Inserisci il nome dello studio o della ditta");
    }
    setDati(form);
    toast.success("Dati ditta / studio salvati con successo");
    setAperto(false);
  }

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="size-4 text-primary" />
          <span>Dati ditta o studio</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            Dati ditta / studio e firma email
          </DialogTitle>
          <DialogDescription>
            Questi dati compariranno nelle email spedite tramite Resend e come mittente per le risposte dei destinatari.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSalva} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nomeAzienda">Nome ditta o studio *</Label>
            <Input
              id="nomeAzienda"
              placeholder="Es. Studio Tecnico Nichetti Gian Battista"
              value={form.nomeAzienda}
              onChange={(e) => setForm({ ...form, nomeAzienda: e.target.value })}
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                value={form.referente}
                onChange={(e) => setForm({ ...form, referente: e.target.value })}
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
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="via">Via e numero civico</Label>
              <Input
                id="via"
                placeholder="Es. Via Roma, 10"
                value={form.via}
                onChange={(e) => setForm({ ...form, via: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cap">CAP</Label>
              <Input
                id="cap"
                placeholder="Es. 26015"
                value={form.cap}
                onChange={(e) => setForm({ ...form, cap: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="comune">Località (Comune) e Prov.</Label>
              <div className="flex gap-2">
                <Input
                  id="comune"
                  placeholder="Soresina"
                  className="flex-1"
                  value={form.comune}
                  onChange={(e) => setForm({ ...form, comune: e.target.value })}
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

          <div className="rounded-lg border p-3 bg-muted/30 space-y-2 text-xs">
            <Label htmlFor="mittenteResend" className="font-semibold text-xs text-foreground">
              Indirizzo di spedizione Resend (From)
            </Label>
            <Input
              id="mittenteResend"
              className="h-8 text-xs font-mono"
              placeholder="onboarding@resend.dev oppure notifiche@tuodominio.it"
              value={form.emailMittenteResend}
              onChange={(e) => setForm({ ...form, emailMittenteResend: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Se hai verificato il tuo dominio su Resend inserisci il tuo indirizzo (es. <code>notifiche@iltuodominio.it</code>). Altrimenti lascia <code>onboarding@resend.dev</code> per l'invio immediato.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setAperto(false)}>
              Annulla
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="size-4" /> Salva dati
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
