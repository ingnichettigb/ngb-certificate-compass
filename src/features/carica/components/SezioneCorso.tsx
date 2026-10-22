/*
 * File:      SezioneCorso.tsx
 * Percorso:  src/features/carica/components/SezioneCorso.tsx
 * Sezione «2. Il corso»: categoria, livello, corso, data, ore e scadenza calcolata.
 */
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type TipoCorso } from "@/lib/api";
import { Field } from "./Field";
import { scadenzaCalcolata } from "../selezione";

export function SezioneCorso({
  macro,
  macros,
  livello,
  livelli,
  corsoId,
  corsiFiltrati,
  corsoSelezionato,
  dataCorso,
  setDataCorso,
  ore,
  setOre,
  onCambiaMacro,
  onCambiaLivello,
  onScegliCorso,
}: {
  macro: string;
  macros: string[];
  livello: string;
  livelli: readonly string[];
  corsoId: string;
  corsiFiltrati: TipoCorso[];
  corsoSelezionato: TipoCorso | undefined;
  dataCorso: string;
  setDataCorso: (v: string) => void;
  ore: string;
  setOre: (v: string) => void;
  onCambiaMacro: (v: string) => void;
  onCambiaLivello: (v: string) => void;
  onScegliCorso: (v: string) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold">2. Il corso</h2>
      <Field label="Categoria del corso *">
        <Select
          value={macro}
          onValueChange={onCambiaMacro}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Scegli la categoria" />
          </SelectTrigger>
          <SelectContent>
            {macros.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {macro && (
        <Field label="Livello *">
          <RadioGroup
            value={livello}
            onValueChange={onCambiaLivello}
            className="grid gap-2"
          >
            {livelli.map((l) => (
              <label
                key={l}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
              >
                <RadioGroupItem value={l} />
                {l}
              </label>
            ))}
          </RadioGroup>
        </Field>
      )}

      {macro && livello && (
        <Field label="Corso *">
          <RadioGroup
            value={corsoId}
            onValueChange={onScegliCorso}
            className="grid gap-2"
          >
            {corsiFiltrati.map((c) => (
              <label
                key={c.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
              >
                <RadioGroupItem value={c.id} className="mt-0.5" />
                <span>
                  {c.nome_corso}
                  <span className="block text-xs text-muted-foreground">
                    {c.ore_minime_legge ? `${c.ore_minime_legge} ore · ` : ""}
                    {c.durata_validita_anni
                      ? `validità ${c.durata_validita_anni} anni`
                      : "senza scadenza"}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </Field>
      )}

      <Field label="Data del corso *">
        <Input
          required
          type="date"
          value={dataCorso}
          onChange={(e) => setDataCorso(e.target.value)}
          className="h-12"
        />
      </Field>
      <Field label="Ore dichiarate">
        <Input
          type="number"
          min={0}
          step="0.5"
          value={ore}
          onChange={(e) => setOre(e.target.value)}
          className="h-12"
        />
      </Field>
      {corsoSelezionato?.durata_validita_anni && dataCorso && (
        <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
          Scadenza calcolata:{" "}
          {scadenzaCalcolata(dataCorso, corsoSelezionato.durata_validita_anni)}
        </p>
      )}
    </section>
  );
}
