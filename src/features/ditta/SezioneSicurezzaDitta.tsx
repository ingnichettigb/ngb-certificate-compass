/*
 * File:          SezioneSicurezzaDitta.tsx
 * Percorso:      src/features/ditta/SezioneSicurezzaDitta.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:00): Sezione «Sicurezza e rischio» dei dati ditta: codici ATECO, rischio, lavoratori, presenze della scuola,
 *     livello antincendio e fasce di legge calcolate dalle soglie.
 */
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  normalizzaAteco,
  suggerisciRischioAteco,
  trovaSoglia,
  type CodiceAteco,
  type LivelloRischio,
  type Soglia,
} from "./regole-ditta";

export type FormSicurezza = {
  codici_ateco: CodiceAteco[];
  rischio_ditta: "" | LivelloRischio;
  reparti_rischio_differenziato: boolean;
  n_lavoratori_dichiarato: string;
  e_scuola: boolean;
  presenze_contemporanee_max: string;
  livello_antincendio: "" | "1" | "2" | "3";
};

const NESSUNO = "nessuno";

function numero(testo: string): number | null {
  if (testo.trim() === "") return null;
  const n = Number(testo);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function SezioneSicurezzaDitta({
  form,
  onChange,
  soglie,
  inForza,
}: {
  form: FormSicurezza;
  onChange: (f: FormSicurezza) => void;
  soglie: Soglia[];
  inForza: number | null | undefined;
}) {
  const [nuovoAteco, setNuovoAteco] = useState("");

  function aggiungiAteco() {
    const codice = normalizzaAteco(nuovoAteco);
    if (!codice) {
      return void toast.error("Codice ATECO non valido", { description: "Esempio: 85.31.20 oppure 85.31" });
    }
    if (form.codici_ateco.some((c) => c.codice === codice)) {
      return void toast.error("Codice già inserito");
    }
    const nuovo: CodiceAteco = {
      codice,
      rischio: suggerisciRischioAteco(codice),
      principale: form.codici_ateco.length === 0,
    };
    onChange({ ...form, codici_ateco: [...form.codici_ateco, nuovo] });
    setNuovoAteco("");
  }

  function togliAteco(codice: string) {
    const resto = form.codici_ateco.filter((c) => c.codice !== codice);
    if (resto.length > 0 && !resto.some((c) => c.principale)) resto[0] = { ...resto[0]!, principale: true };
    onChange({ ...form, codici_ateco: resto });
  }

  const dichiarati = numero(form.n_lavoratori_dichiarato);
  const presenze = numero(form.presenze_contemporanee_max);
  const rls = trovaSoglia(soglie, "rls", dichiarati);
  const soccorso = trovaSoglia(soglie, "primo_soccorso", dichiarati);
  const incendio = form.e_scuola ? trovaSoglia(soglie, "antincendio_presenze", presenze) : null;
  const idoneita = form.e_scuola ? trovaSoglia(soglie, "idoneita_tecnica_presenze", presenze) : null;
  const rlsReale = trovaSoglia(soglie, "rls", inForza ?? null);
  const fasciaDiversa = rls && rlsReale && rls.id !== rlsReale.id;

  return (
    <section className="space-y-4 rounded-lg border p-3" aria-label="Sicurezza e rischio">
      <div>
        <h3 className="text-sm font-semibold">Sicurezza e rischio</h3>
        <p className="text-[11px] text-muted-foreground">
          Servono a proporre i corsi giusti (rischio, RLS, Primo Soccorso, Antincendio). Sono indicazioni: per legge conta la
          valutazione dei rischi (DVR).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nuovoAteco">Codici ATECO dell'attività</Label>
        <div className="flex gap-2">
          <Input
            id="nuovoAteco"
            placeholder="Es. 85.31.20"
            value={nuovoAteco}
            onChange={(e) => setNuovoAteco(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aggiungiAteco();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={aggiungiAteco} aria-label="Aggiungi codice ATECO">
            <Plus className="size-4" /> Aggiungi
          </Button>
        </div>
        {form.codici_ateco.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {form.codici_ateco.map((c) => (
              <li
                key={c.codice}
                className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs"
              >
                <span className="font-mono">{c.codice}</span>
                {c.principale && <span className="text-muted-foreground">principale</span>}
                {c.rischio && <span className="text-muted-foreground">· suggerito {c.rischio}</span>}
                <button
                  type="button"
                  onClick={() => togliAteco(c.codice)}
                  aria-label={`Togli ATECO ${c.codice}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rischioDitta">Livello di rischio della ditta</Label>
          <Select
            value={form.rischio_ditta || NESSUNO}
            onValueChange={(v) =>
              onChange({ ...form, rischio_ditta: v === NESSUNO ? "" : (v as LivelloRischio) })
            }
          >
            <SelectTrigger id="rischioDitta">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NESSUNO}>Non indicato</SelectItem>
              <SelectItem value="basso">Basso</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Switch
            id="repartiRischio"
            checked={form.reparti_rischio_differenziato}
            onCheckedChange={(v) => onChange({ ...form, reparti_rischio_differenziato: v })}
          />
          <Label htmlFor="repartiRischio" className="text-xs leading-tight">
            Ci sono reparti con rischio diverso (basso, medio, alto)
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nLavoratori">Numero di lavoratori</Label>
          <Input
            id="nLavoratori"
            type="number"
            min={0}
            placeholder="Es. 85"
            value={form.n_lavoratori_dichiarato}
            onChange={(e) => onChange({ ...form, n_lavoratori_dichiarato: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            In forza nel programma: <strong>{inForza ?? "—"}</strong>
            {fasciaDiversa && <span className="text-amber-600"> · la fascia non coincide con quella dichiarata</span>}
          </p>
        </div>
        <div className="space-y-1 text-xs">
          {rls && (
            <p>
              <span className="text-muted-foreground">RLS:</span> <strong>{rls.esito}</strong>
            </p>
          )}
          {soccorso && (
            <p>
              <span className="text-muted-foreground">Primo Soccorso:</span> <strong>{soccorso.esito}</strong>
              {soccorso.note && <span className="block text-[11px] text-muted-foreground">{soccorso.note}</span>}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="eScuola"
          checked={form.e_scuola}
          onCheckedChange={(v) => onChange({ ...form, e_scuola: v })}
        />
        <Label htmlFor="eScuola" className="text-xs">
          È una scuola (servono le presenze di alunni e personale)
        </Label>
      </div>

      {form.e_scuola && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="presenze">Persone presenti contemporaneamente (massimo)</Label>
            <Input
              id="presenze"
              type="number"
              min={0}
              placeholder="Alunni + personale"
              value={form.presenze_contemporanee_max}
              onChange={(e) => onChange({ ...form, presenze_contemporanee_max: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">Presenze contemporanee, non il totale degli iscritti.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="livelloAntincendio">Livello antincendio stabilito</Label>
            <Select
              value={form.livello_antincendio || NESSUNO}
              onValueChange={(v) =>
                onChange({ ...form, livello_antincendio: v === NESSUNO ? "" : (v as "1" | "2" | "3") })
              }
            >
              <SelectTrigger id="livelloAntincendio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NESSUNO}>Non indicato</SelectItem>
                <SelectItem value="1">Livello 1 (1-FOR, 4 ore)</SelectItem>
                <SelectItem value="2">Livello 2 (2-FOR, 8 ore)</SelectItem>
                <SelectItem value="3">Livello 3 (3-FOR, 16 ore)</SelectItem>
              </SelectContent>
            </Select>
            {incendio && (
              <p className="text-[11px] text-muted-foreground">
                Dalle presenze: <strong>{incendio.esito}</strong>
                {idoneita && <> · idoneità tecnica: <strong>{idoneita.esito}</strong></>}. Il livello lo conferma il
                datore di lavoro.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
