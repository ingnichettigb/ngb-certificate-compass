/*
 * File:      FormNuovoDipendente.tsx
 * Percorso:  src/features/dipendenti/components/FormNuovoDipendente.tsx
 * Data creazione: non registrata nel file originale.
 * Modulo «Nuovo dipendente».
 * Revisioni:
 *   rev 2 — 28/10/2026 10:00 — Campi contrattuali (tipo, assunzione, scadenza libera, note).
 *   rev 3 — 05/11/2026 17:50 — Modalità «modifica» e avviso codice fiscale da verificare.
 *   rev 4 — 06/11/2026 06:53 UTC — Nome accessibile per la scelta del reparto nel modulo.
 *   rev 5 — 06/11/2026 08:20 — Cognome, nome e luogo di nascita sempre in MAIUSCOLO mentre si scrive; nella modifica anche profilo ATA,
 *            classe di concorso e materia; opzioni per la coda «Da completare»: dati mancanti evidenziati in giallo,
 *            etichette dei pulsanti personalizzabili, messa a fuoco sul primo dato mancante.
 */
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Dipendente } from "@/lib/api";
import { inMaiuscolo } from "@/lib/testo-maiuscolo";
import { Campo } from "./Campo";
import { CampiMansione } from "./CampiMansione";
import type { CampoAnagrafica } from "../anagrafica-completa";
import { CampiContratto } from "@/features/contratti/CampiContratto";
import { analizzaCodiceFiscale } from "../codice-fiscale/controllo-cf";

export function FormNuovoDipendente({
  modo = "nuovo",
  form,
  setForm,
  repartiAttivi,
  saving,
  onSalva,
  onAnnulla,
  etichettaSalva,
  etichettaAnnulla = "Annulla",
  mancanti = [],
  focusSuMancante = false,
  intestazione,
}: {
  modo?: "nuovo" | "modifica";
  form: Omit<Dipendente, "id">;
  setForm: (f: Omit<Dipendente, "id"> | null) => void;
  repartiAttivi: string[];
  saving: boolean;
  onSalva: () => void;
  onAnnulla: () => void;
  /** Testo del pulsante di salvataggio (predefinito: «Salva» o «Salva modifiche»). */
  etichettaSalva?: string;
  etichettaAnnulla?: string;
  /** Dati mancanti da evidenziare in giallo. */
  mancanti?: CampoAnagrafica[];
  /** Mette il cursore sul primo dato di testo mancante (cognome, nome, CF, luogo, data di nascita). */
  focusSuMancante?: boolean;
  intestazione?: ReactNode;
}) {
  const esitoCF = analizzaCodiceFiscale(form.codice_fiscale);
  const manca = (c: CampoAnagrafica) => mancanti.includes(c);
  const primoMancante = focusSuMancante
    ? (["cognome", "nome", "codice_fiscale", "luogo_nascita", "data_nascita"] as CampoAnagrafica[]).find(manca)
    : undefined;
  return (
    <div className="space-y-4">
      {intestazione}
      <h2 className="text-lg font-semibold">{modo === "modifica" ? "Modifica anagrafica" : "Nuovo dipendente"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          label="Cognome"
          value={form.cognome}
          evidenzia={manca("cognome")}
          autoFocus={primoMancante === "cognome"}
          onChange={(v) => setForm({ ...form, cognome: inMaiuscolo(v) })}
        />
        <Campo
          label="Nome"
          value={form.nome}
          evidenzia={manca("nome")}
          autoFocus={primoMancante === "nome"}
          onChange={(v) => setForm({ ...form, nome: inMaiuscolo(v) })}
        />
        <div className="space-y-1">
          <Campo
            label="Codice fiscale"
            value={form.codice_fiscale}
            evidenzia={manca("codice_fiscale")}
            autoFocus={primoMancante === "codice_fiscale"}
            onChange={(v) => setForm({ ...form, codice_fiscale: v.toUpperCase() })}
          />
          {!esitoCF.valido && (
            <p className="text-xs font-medium text-destructive">
              ⚠ Codice fiscale da verificare: {esitoCF.problemi.join("; ")}
            </p>
          )}
        </div>
        <Campo
          label="Email"
          value={form.email ?? ""}
          onChange={(v) => setForm({ ...form, email: v })}
        />
        {repartiAttivi.length > 0 ? (
          <div className="space-y-1.5">
            <Label>Reparto</Label>
            <Select
              value={form.reparto ?? ""}
              onValueChange={(v) => setForm({ ...form, reparto: v })}
            >
              <SelectTrigger
                aria-label="Reparto nel modulo anagrafica"
                className={manca("reparto") ? "border-amber-500 bg-amber-500/10" : undefined}
              >
                <SelectValue placeholder="Scegli il reparto" />
              </SelectTrigger>
              <SelectContent>
                {repartiAttivi.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Campo
            label="Reparto"
            value={form.reparto ?? ""}
            onChange={(v) => setForm({ ...form, reparto: v })}
          />
        )}
        <Campo
          label="Codice ATECO"
          value={form.codice_ateco ?? ""}
          onChange={(v) => setForm({ ...form, codice_ateco: v })}
        />
        <Campo
          label="Luogo di nascita"
          value={form.luogo_nascita ?? ""}
          evidenzia={manca("luogo_nascita")}
          autoFocus={primoMancante === "luogo_nascita"}
          onChange={(v) => setForm({ ...form, luogo_nascita: inMaiuscolo(v) })}
        />
        <Campo
          label="Data di nascita"
          type="date"
          value={form.data_nascita ?? ""}
          evidenzia={manca("data_nascita")}
          autoFocus={primoMancante === "data_nascita"}
          onChange={(v) => setForm({ ...form, data_nascita: v })}
        />
      </div>
      {modo === "modifica" && <CampiMansione form={form} setForm={setForm} mancanti={mancanti} />}
      <CampiContratto
        valori={form}
        onChange={(v) => setForm({ ...form, ...v })}
        evidenzia={mancanti.filter((c): c is "data_assunzione" | "data_fine_contratto" => c === "data_assunzione" || c === "data_fine_contratto")}
      />
      <div className="flex gap-2">
        <Button onClick={onSalva} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}{" "}
          {etichettaSalva ?? (modo === "modifica" ? "Salva modifiche" : "Salva")}
        </Button>
        <Button variant="outline" onClick={onAnnulla}>
          {etichettaAnnulla}
        </Button>
      </div>
    </div>
  );
}
