/*
 * File:      SezioneDati.tsx
 * Percorso:  src/features/carica/components/SezioneDati.tsx
 * Sezione «1. I tuoi dati»: anagrafica, reparto, profilo, classe di concorso e materia.
 */
import { CampoSuggerito, type Suggerimento } from "@/components/CampoSuggerito";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { etichettaSottoreparto, type Reparto, type Sottoreparto } from "@/lib/api";
import { type Anagrafica } from "../types";
import { suggerimentiClassi, suggerimentiMaterie } from "../selezione";
import { Field } from "./Field";

export function SezioneDati({
  anagrafica,
  set,
  onCambiaReparto,
  reparti,
  sottoreparti,
  chiedeInsegnamento,
  suggerimentiClassi,
  suggerimentiMaterie,
}: {
  anagrafica: Anagrafica;
  set: (k: keyof Anagrafica, v: string) => void;
  onCambiaReparto: (v: string) => void;
  reparti: Reparto[];
  sottoreparti: Sottoreparto[];
  chiedeInsegnamento: boolean;
  suggerimentiClassi: Suggerimento[];
  suggerimentiMaterie: Suggerimento[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold">1. I tuoi dati</h2>
      <Field label="Codice fiscale *">
        <Input
          required
          value={anagrafica.codice_fiscale}
          onChange={(e) => set("codice_fiscale", e.target.value.toUpperCase())}
          maxLength={16}
          autoCapitalize="characters"
          className="h-12 uppercase"
        />
      </Field>
      <Field label="Cognome *">
        <Input
          required
          value={anagrafica.cognome}
          onChange={(e) => set("cognome", e.target.value)}
          className="h-12"
        />
      </Field>
      <Field label="Nome *">
        <Input
          required
          value={anagrafica.nome}
          onChange={(e) => set("nome", e.target.value)}
          className="h-12"
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={anagrafica.email}
          onChange={(e) => set("email", e.target.value)}
          className="h-12"
        />
      </Field>
      {reparti.length > 0 ? (
        <Field label="Reparto *">
          <Select
            value={anagrafica.reparto}
            onValueChange={onCambiaReparto}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Scegli il reparto" />
            </SelectTrigger>
            <SelectContent>
              {reparti.map((r) => (
                <SelectItem key={r.id} value={r.nome}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Field label="Reparto">
          <Input
            value={anagrafica.reparto}
            onChange={(e) => set("reparto", e.target.value)}
            className="h-12"
          />
        </Field>
      )}

      {sottoreparti.length > 0 && (
        <Field label="Profilo / sottoreparto *">
          <Select value={anagrafica.sottoreparto} onValueChange={(v) => set("sottoreparto", v)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Scegli il profilo" />
            </SelectTrigger>
            <SelectContent>
              {sottoreparti.map((s) => (
                <SelectItem key={s.id} value={s.nome}>
                  {etichettaSottoreparto(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {chiedeInsegnamento && (
        <>
          <Field label="Classe di concorso *">
            <CampoSuggerito
              value={anagrafica.classe_concorso}
              onChange={(v: string) => set("classe_concorso", v)}
              suggerimenti={suggerimentiClassi}
              placeholder="es. A-26"
              maiuscolo
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Scegli dall'elenco oppure scrivila: se manca, viene aggiunta all'archivio.
            </p>
          </Field>
          <Field label="Materia insegnata *">
            <CampoSuggerito
              value={anagrafica.materia}
              onChange={(v: string) => set("materia", v)}
              suggerimenti={suggerimentiMaterie}
              placeholder="es. Matematica"
              className="h-12"
            />
          </Field>
        </>
      )}
      <Field label="Luogo di nascita">
        <Input
          value={anagrafica.luogo_nascita}
          onChange={(e) => set("luogo_nascita", e.target.value)}
          className="h-12"
        />
      </Field>
      <Field label="Data di nascita">
        <Input
          type="date"
          value={anagrafica.data_nascita}
          onChange={(e) => set("data_nascita", e.target.value)}
          className="h-12"
        />
      </Field>
    </section>
  );
}
