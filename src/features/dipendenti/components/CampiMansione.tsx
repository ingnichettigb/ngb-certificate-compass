/*
 * File:      CampiMansione.tsx
 * Percorso:  src/features/dipendenti/components/CampiMansione.tsx
 * Creato:    06/11/2026
 * Campi di mansione del modulo «Modifica anagrafica»: profilo per gli ATA; classe di concorso
 * (scelta solo tra quelle del catalogo) e materia per i Docenti. Stessi dati e stesse regole
 * di SelezioneReparto, ma salvati insieme al resto dell'anagrafica.
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { etichettaSottoreparto, getClassiConcorso, getReparti, getSottoreparti, type Dipendente } from "@/lib/api";
import type { CampoAnagrafica } from "../anagrafica-completa";
import { NESSUNO } from "../types";
import { Campo } from "./Campo";

const GIALLO = "border-amber-500 bg-amber-500/10";

export function CampiMansione({
  form,
  setForm,
  mancanti = [],
}: {
  form: Omit<Dipendente, "id">;
  setForm: (f: Omit<Dipendente, "id"> | null) => void;
  mancanti?: CampoAnagrafica[];
}) {
  const nomeReparto = (form.reparto ?? "").trim();
  const chiave = nomeReparto.toLowerCase();
  const eAta = chiave === "ata";
  const eDocente = chiave === "docente";

  const { data: reparti = [] } = useQuery({ queryKey: ["reparti"], queryFn: getReparti, enabled: eAta });
  const { data: sottoreparti = [] } = useQuery({ queryKey: ["sottoreparti"], queryFn: getSottoreparti, enabled: eAta });
  const { data: classi = [] } = useQuery({ queryKey: ["classi_concorso"], queryFn: getClassiConcorso, enabled: eDocente });

  if (!eAta && !eDocente) return null;

  if (eAta) {
    const reparto = reparti.find((r) => r.nome.trim().toLowerCase() === chiave);
    const profili = reparto ? sottoreparti.filter((s) => s.reparto_id === reparto.id && s.attivo) : [];
    const corrente = (form.sottoreparto ?? "").trim();
    return (
      <div className="space-y-1.5">
        <Label>Profilo ATA</Label>
        <Select value={corrente || NESSUNO} onValueChange={(v) => setForm({ ...form, sottoreparto: v === NESSUNO ? "" : v })}>
          <SelectTrigger aria-label="Profilo ATA nel modulo anagrafica" className={mancanti.includes("sottoreparto") ? GIALLO : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NESSUNO}>Nessun profilo</SelectItem>
            {corrente && !profili.some((s) => s.nome === corrente) && <SelectItem value={corrente}>{corrente}</SelectItem>}
            {profili.map((s) => (
              <SelectItem key={s.id} value={s.nome}>
                {etichettaSottoreparto(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const classeCorrente = (form.classe_concorso ?? "").trim().toUpperCase();
  const attive = classi.filter((c) => c.attivo || c.codice === classeCorrente);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Classe di concorso</Label>
        <Select value={classeCorrente || NESSUNO} onValueChange={(v) => setForm({ ...form, classe_concorso: v === NESSUNO ? "" : v })}>
          <SelectTrigger aria-label="Classe di concorso nel modulo anagrafica" className={mancanti.includes("classe_concorso") ? GIALLO : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NESSUNO}>Nessuna classe</SelectItem>
            {classeCorrente && !attive.some((c) => c.codice === classeCorrente) && (
              <SelectItem value={classeCorrente}>{classeCorrente}</SelectItem>
            )}
            {attive.map((c) => (
              <SelectItem key={c.id} value={c.codice}>
                {c.denominazione ? `${c.codice} — ${c.denominazione}` : c.codice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Campo
        label="Materia"
        value={form.materia ?? ""}
        evidenzia={mancanti.includes("materia")}
        onChange={(v) => setForm({ ...form, materia: v })}
      />
    </div>
  );
}
