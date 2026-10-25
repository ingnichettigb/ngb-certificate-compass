/*
 * File:      SelezioneRepartoModulo.tsx
 * Percorso:  src/features/operatore/components/SelezioneRepartoModulo.tsx
 * Creato:    25/10/2026
 * Revisioni:
 *   rev 1 — 25/10/2026 10:15 — Menu reparti da Impostazioni + voce "nuovo reparto".
 */
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aggiungiReparto, getReparti, type Reparto } from "@/lib/api";

const NUOVO = "__nuovo__";

export function SelezioneRepartoModulo({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [reparti, setReparti] = useState<Reparto[]>([]);
  const [nuovo, setNuovo] = useState(false);
  const [testo, setTesto] = useState("");

  useEffect(() => {
    getReparti()
      .then((r) => setReparti(r.filter((x) => x.attivo)))
      .catch(() => setReparti([]));
  }, []);

  const nomi = reparti.map((r) => r.nome);
  const fuoriElenco = value && !nomi.some((n) => n.toLowerCase() === value.toLowerCase());

  async function conferma() {
    const nome = testo.trim();
    if (!nome) return;
    const esistente = nomi.find((n) => n.toLowerCase() === nome.toLowerCase());
    if (esistente) {
      onChange(esistente);
    } else {
      onChange(nome);
      try {
        await aggiungiReparto(nome, reparti.length + 1);
        setReparti((r) => [...r, { id: nome, nome, ordine: r.length + 1, attivo: true, richiede_classe_concorso: false }]);
        toast.success(`Reparto "${nome}" aggiunto alle impostazioni`);
      } catch (e) {
        toast.error("Reparto usato ma non salvato nell'elenco", { description: String(e) });
      }
    }
    setNuovo(false);
    setTesto("");
  }

  if (nuovo) {
    return (
      <div className="flex gap-1">
        <Input
          id="rep"
          autoFocus
          placeholder="Nome nuovo reparto"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void conferma();
            }
            if (e.key === "Escape") setNuovo(false);
          }}
        />
        <Button type="button" size="icon" variant="outline" onClick={() => void conferma()} aria-label="Conferma reparto">
          <Check className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => setNuovo(false)} aria-label="Annulla">
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => (v === NUOVO ? setNuovo(true) : onChange(v))}
    >
      <SelectTrigger id="rep">
        <SelectValue placeholder="Scegli il reparto" />
      </SelectTrigger>
      <SelectContent>
        {fuoriElenco && <SelectItem value={value}>{value}</SelectItem>}
        {nomi.map((n) => (
          <SelectItem key={n} value={n}>
            {n}
          </SelectItem>
        ))}
        <SelectItem value={NUOVO} className="font-medium text-primary">
          + Inserisci nuovo reparto…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
