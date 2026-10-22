/*
 * File:      FiltriScadenze.tsx
 * Percorso:  src/features/scadenze/components/FiltriScadenze.tsx
 * Menù a tendina per periodo, corso e reparto e ricerca per testo.
 */
import { CalendarClock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TUTTI, type Vista } from "../types";

export function FiltriScadenze({
  vista,
  setVista,
  corsoSelezionato,
  setCorsoSelezionato,
  corsi,
  reparto,
  setReparto,
  reparti,
  q,
  setQ,
}: {
  vista: Vista;
  setVista: (v: Vista) => void;
  corsoSelezionato: string;
  setCorsoSelezionato: (v: string) => void;
  corsi: string[];
  reparto: string;
  setReparto: (v: string) => void;
  reparti: string[];
  q: string;
  setQ: (v: string) => void;
}) {
  return (
  <div className="flex flex-wrap items-center gap-3">
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
          <SelectItem value="In scadenza (90 gg)">
            In scadenza (90 gg)
          </SelectItem>
          <SelectItem value="In scadenza (6 mesi)">
            In scadenza (6 mesi)
          </SelectItem>
          <SelectItem value="In scadenza (1 anno)">
            In scadenza (1 anno)
          </SelectItem>
          <SelectItem value="Tutti con scadenza">
            Tutti con scadenza
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

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
  </div>
  );
}
