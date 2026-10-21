/*
 * File:      FormNuovoDipendente.tsx
 * Percorso:  src/features/dipendenti/components/FormNuovoDipendente.tsx
 * Modulo «Nuovo dipendente».
 */
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
import { Campo } from "./Campo";

export function FormNuovoDipendente({
  form,
  setForm,
  repartiAttivi,
  saving,
  onSalva,
  onAnnulla,
}: {
  form: Omit<Dipendente, "id">;
  setForm: (f: Omit<Dipendente, "id"> | null) => void;
  repartiAttivi: string[];
  saving: boolean;
  onSalva: () => void;
  onAnnulla: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Nuovo dipendente</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          label="Cognome"
          value={form.cognome}
          onChange={(v) => setForm({ ...form, cognome: v })}
        />
        <Campo
          label="Nome"
          value={form.nome}
          onChange={(v) => setForm({ ...form, nome: v })}
        />
        <Campo
          label="Codice fiscale"
          value={form.codice_fiscale}
          onChange={(v) => setForm({ ...form, codice_fiscale: v.toUpperCase() })}
        />
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
              <SelectTrigger>
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
          onChange={(v) => setForm({ ...form, luogo_nascita: v })}
        />
        <Campo
          label="Data di nascita"
          type="date"
          value={form.data_nascita ?? ""}
          onChange={(v) => setForm({ ...form, data_nascita: v })}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={onSalva} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />} Salva
        </Button>
        <Button variant="outline" onClick={onAnnulla}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
