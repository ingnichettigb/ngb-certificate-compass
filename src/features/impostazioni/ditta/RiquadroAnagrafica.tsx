/*
 * File:      RiquadroAnagrafica.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroAnagrafica.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: dati anagrafici e contatti della ditta. Nessun cambio di comportamento.
 *   rev 2 — 12/11/2026 06:53 — Caricamento e cancellazione del logo nel form anagrafica.
 */
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { DittaRecord } from "@/lib/api/ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";
import { LogoDitta } from "./LogoDitta";

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
}

export function RiquadroAnagrafica({ form, updateCampo }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Building2 className="size-4 text-primary" /> Anagrafica e Recapiti
      </h3>
      <LogoDitta form={form} updateCampo={updateCampo} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="ragione_sociale">Ragione Sociale / Denominazione *</Label>
          <Input
            id="ragione_sociale"
            value={form.ragione_sociale}
            onChange={(e) => updateCampo("ragione_sociale", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="referente">Referente aziendale</Label>
          <Input
            id="referente"
            value={form.referente || ""}
            onChange={(e) => updateCampo("referente", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
          <Input
            id="codice_fiscale"
            className="uppercase font-mono"
            value={form.codice_fiscale || ""}
            onChange={(e) => updateCampo("codice_fiscale", e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="partita_iva">Partita IVA</Label>
          <Input
            id="partita_iva"
            className="font-mono"
            value={form.partita_iva || ""}
            onChange={(e) => updateCampo("partita_iva", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="telefono">Telefono</Label>
          <Input
            id="telefono"
            value={form.telefono || ""}
            onChange={(e) => updateCampo("telefono", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="indirizzo">Indirizzo e civico</Label>
          <Input
            id="indirizzo"
            value={form.indirizzo || ""}
            onChange={(e) => updateCampo("indirizzo", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="comune">Comune</Label>
          <Input
            id="comune"
            value={form.comune || ""}
            onChange={(e) => updateCampo("comune", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cap">CAP</Label>
            <Input
              id="cap"
              value={form.cap || ""}
              onChange={(e) => updateCampo("cap", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="provincia">Prov.</Label>
            <Input
              id="provincia"
              maxLength={2}
              className="uppercase text-center"
              value={form.provincia || ""}
              onChange={(e) => updateCampo("provincia", e.target.value.toUpperCase())}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
        <div className="space-y-1">
          <Label htmlFor="email">Email per risposte (Reply-To)</Label>
          <Input
            id="email"
            type="email"
            value={form.email || ""}
            onChange={(e) => updateCampo("email", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pec">PEC</Label>
          <Input
            id="pec"
            type="email"
            value={form.pec || ""}
            onChange={(e) => updateCampo("pec", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sito_web">Sito web</Label>
          <Input
            id="sito_web"
            value={form.sito_web || ""}
            onChange={(e) => updateCampo("sito_web", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="intestazione_ufficiale">Riga istituzionale (intestazione nomine)</Label>
          <Input
            id="intestazione_ufficiale"
            placeholder="es. MINISTERO DELL'ISTRUZIONE E DEL MERITO"
            value={form.intestazione_ufficiale || ""}
            onChange={(e) => updateCampo("intestazione_ufficiale", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email_mittente_resend">Mittente Resend (From)</Label>
          <Input
            id="email_mittente_resend"
            className="font-mono text-xs"
            value={form.email_mittente_resend || ""}
            onChange={(e) => updateCampo("email_mittente_resend", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
