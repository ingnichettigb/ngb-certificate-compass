/*
 * File:      FiltriStampa.tsx
 * Percorso:  src/features/stampe/components/FiltriStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Pannello scelta modello e filtri di stampa.
 *   rev 2 — 03/11/2026 20:25 — Aggiunti filtri dinamici ruolo, categoria, materia e opzione 9 mesi.
 */
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Dipendente } from "@/lib/api";
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { TITOLI_MODELLO, TUTTI, type FiltriStampa as Filtri, type Modello, type Finestra } from "../dati-stampa";

type Props = {
  filtri: Filtri;
  onChange: (f: Filtri) => void;
  reparti: string[];
  ruoli: Array<{ id: string; nome: string }>;
  categorie: string[];
  materie: string[];
  dipendenti: Dipendente[];
  conteggio: number;
};

const sel = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

export function FiltriStampa({
  filtri,
  onChange,
  reparti,
  ruoli,
  categorie,
  materie,
  dipendenti,
  conteggio,
}: Props) {
  const set = <K extends keyof Filtri>(k: K, v: Filtri[K]) => onChange({ ...filtri, [k]: v });

  const handleCambioReparto = (nuovoReparto: string) => {
    // Reset dinamico di categoria e materia se non pertinenti al nuovo reparto
    onChange({
      ...filtri,
      reparto: nuovoReparto,
      categoria: nuovoReparto === "Docente" ? TUTTI : filtri.categoria,
      materia: nuovoReparto === "ATA" ? TUTTI : filtri.materia,
    });
  };

  const mostraCategorie = filtri.reparto !== "Docente" && categorie.length > 0;
  const mostraMaterie = filtri.reparto !== "ATA" && materie.length > 0;

  return (
    <aside className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm print:hidden">
      <div>
        <p className="mb-2 font-semibold">Tipo di documento</p>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(TITOLI_MODELLO) as Modello[]).map((m) => (
            <Button
              key={m}
              size="sm"
              type="button"
              variant={filtri.modello === m ? "default" : "outline"}
              className="justify-start"
              onClick={() => set("modello", m)}
            >
              {TITOLI_MODELLO[m]}
            </Button>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="font-medium">Gruppo corsi</span>
        <select className={sel} value={filtri.gruppo} onChange={(e) => set("gruppo", e.target.value)}>
          <option value={TUTTI}>Tutti i gruppi</option>
          {GRUPPI_ARGOMENTO.map((g) => <option key={g.chiave} value={g.chiave}>{g.titolo}</option>)}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-medium">Reparto</span>
        <select className={sel} value={filtri.reparto} onChange={(e) => handleCambioReparto(e.target.value)}>
          <option value={TUTTI}>Tutti i reparti</option>
          {reparti.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      {/* Ruolo di sicurezza (mostra solo quelli presenti con assegnazioni) */}
      <label className="block space-y-1">
        <span className="font-medium">Ruolo di sicurezza</span>
        <select className={sel} value={filtri.ruoloId} onChange={(e) => set("ruoloId", e.target.value)}>
          <option value={TUTTI}>Tutti i ruoli</option>
          {ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
      </label>

      {/* Categoria / Profilo ATA (dinamico) */}
      {mostraCategorie && (
        <label className="block space-y-1">
          <span className="font-medium">Categoria / Profilo ATA</span>
          <select className={sel} value={filtri.categoria} onChange={(e) => set("categoria", e.target.value)}>
            <option value={TUTTI}>Tutte le categorie</option>
            {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}

      {/* Materia Docente (dinamico) */}
      {mostraMaterie && (
        <label className="block space-y-1">
          <span className="font-medium">Materia</span>
          <select className={sel} value={filtri.materia} onChange={(e) => set("materia", e.target.value)}>
            <option value={TUTTI}>Tutte le materie</option>
            {materie.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="font-medium">Lavoratore</span>
        <select className={sel} value={filtri.dipendenteId} onChange={(e) => set("dipendenteId", e.target.value)}>
          <option value={TUTTI}>Tutti i lavoratori</option>
          {dipendenti.map((d) => <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>)}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-medium">Scadenza</span>
        <select className={sel} value={filtri.finestra} onChange={(e) => set("finestra", e.target.value as Finestra)}>
          <option value="tutti">{filtri.modello === "scadenze" ? "Entro 1 anno" : "Tutti"}</option>
          <option value="scaduti">Solo scaduti</option>
          <option value="90">Scaduti + entro 90 giorni</option>
          <option value="180">Scaduti + entro 6 mesi</option>
          <option value="270">Scaduti + entro 9 mesi</option>
          <option value="365">Scaduti + entro 1 anno</option>
        </select>
      </label>

      <div className="space-y-2">
        {([
          ["soloUltimo", "Solo l'attestato più recente per corso"],
          ["includiCessati", "Includi lavoratori cessati"],
          ["mostraCf", "Mostra codice fiscale"],
          ["mostraFirme", "Spazio firme in fondo"],
        ] as const).map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={filtri[k]} onCheckedChange={(v) => set(k, v === true)} />
            {l}
          </label>
        ))}
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-medium">
        {conteggio} righe da stampare
      </div>
      <Button type="button" className="w-full" disabled={!conteggio} onClick={() => window.print()}>
        <Printer className="size-4" /> Stampa / Salva in PDF
      </Button>
    </aside>
  );
}
