/*
 * File:      FiltriScadenze.tsx
 * Percorso:  src/features/scadenze/components/FiltriScadenze.tsx
 * Revisione: 4 — 28/11/2026 10:01
 * Menù a tendina per periodo, reparto, ruolo e corso (in quest'ordine), ricerca per testo e spunta incarichi.
 * Revisioni:
 * - Rev 2 (2026-11-06 18:30): Aggiunta spunta «Solo incarichi attualmente assegnati» (attiva di default).
 * - Rev 3 (28/11/2026 09:11): Ordine dei filtri Periodo → Reparto → Ruolo → Corso; nuovo menù «Ruolo» (un solo ruolo);
 *   opzioni «Scaduti o in scadenza»; con un ruolo scelto la spunta incarichi è sempre attiva (e bloccata);
 *   i filtri non si stampano.
 * - Rev 4 (28/11/2026 10:01): Nuova voce «Da formare / Mancanti» nel menù periodo (dopo «Scaduti»).
 */
import { CalendarClock, Search, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TUTTI, VISTA_DA_FORMARE, type Vista } from "../types";

export function FiltriScadenze({
  vista,
  setVista,
  ruoloSelezionato,
  cambiaRuolo,
  ruoli,
  corsoSelezionato,
  setCorsoSelezionato,
  corsi,
  reparto,
  setReparto,
  reparti,
  q,
  setQ,
  soloIncarichiAssegnati,
  setSoloIncarichiAssegnati,
}: {
  vista: Vista;
  setVista: (v: Vista) => void;
  ruoloSelezionato: string;
  cambiaRuolo: (id: string) => void;
  ruoli: { id: string; nome: string }[];
  corsoSelezionato: string;
  setCorsoSelezionato: (v: string) => void;
  corsi: string[];
  reparto: string;
  setReparto: (v: string) => void;
  reparti: string[];
  q: string;
  setQ: (v: string) => void;
  soloIncarichiAssegnati: boolean;
  setSoloIncarichiAssegnati: (v: boolean) => void;
}) {
  return (
  <div className="flex flex-wrap items-center gap-3 print:hidden">
    {/* Menù a tendina periodo temporale */}
    <div className="flex items-center gap-1.5">
      <CalendarClock className="size-4 text-muted-foreground" />
      <Select
        value={vista}
        onValueChange={(v) => setVista(v as Vista)}
      >
        <SelectTrigger className="w-[210px]">
          <SelectValue placeholder="Periodo di scadenza" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Scaduti">Scaduti</SelectItem>
          <SelectItem value={VISTA_DA_FORMARE}>{VISTA_DA_FORMARE}</SelectItem>
          <SelectItem value="In scadenza (90 gg)">
            In scadenza (90 gg)
          </SelectItem>
          <SelectItem value="In scadenza (6 mesi)">
            In scadenza (6 mesi)
          </SelectItem>
          <SelectItem value="In scadenza (1 anno)">
            In scadenza (1 anno)
          </SelectItem>
          <SelectItem value="Scaduti o in scadenza (90 gg)">
            Scaduti o in scadenza (90 gg)
          </SelectItem>
          <SelectItem value="Scaduti o in scadenza (6 mesi)">
            Scaduti o in scadenza (6 mesi)
          </SelectItem>
          <SelectItem value="Scaduti o in scadenza (1 anno)">
            Scaduti o in scadenza (1 anno)
          </SelectItem>
          <SelectItem value="Tutti con scadenza">
            Tutti con scadenza
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Menù a tendina reparti */}
    <Select value={reparto} onValueChange={setReparto}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Tutti i reparti" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TUTTI}>Tutti i reparti</SelectItem>
        {reparti.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Menù a tendina ruoli (catalogo ruoli di sicurezza): un solo ruolo alla volta */}
    <Select value={ruoloSelezionato} onValueChange={cambiaRuolo}>
      <SelectTrigger className="w-[220px]" data-aiuto="Scegli un ruolo: vedi chi ha quell'incarico assegnato e i suoi corsi scaduti o in scadenza">
        <SelectValue placeholder="Tutti i ruoli" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TUTTI}>Tutti i ruoli</SelectItem>
        {ruoli.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Menù a tendina corsi */}
    <Select
      value={corsoSelezionato}
      onValueChange={setCorsoSelezionato}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Tutti i corsi" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TUTTI}>Tutti i corsi</SelectItem>
        {corsi.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Ricerca per testo */}
    <div className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca dipendente, CF o corso"
        className="pl-9"
      />
    </div>

    {/* Filtro incarichi attualmente assegnati */}
    <label
      data-aiuto={ruoloSelezionato !== TUTTI ? "Con un ruolo scelto si vedono solo le persone a cui l'incarico è realmente assegnato" : undefined}
      className="flex cursor-pointer select-none items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/70">
      <Checkbox
        checked={soloIncarichiAssegnati || ruoloSelezionato !== TUTTI}
        disabled={ruoloSelezionato !== TUTTI}
        onCheckedChange={(v) => setSoloIncarichiAssegnati(Boolean(v))}
      />
      <ShieldCheck className="size-4 text-primary" />
      <span>Solo incarichi attualmente assegnati</span>
    </label>
  </div>
  );
}
