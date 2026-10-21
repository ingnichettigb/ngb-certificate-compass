/*
 * File:      FiltriDipendenti.tsx
 * Percorso:  src/features/dipendenti/components/FiltriDipendenti.tsx
 * Barra di ricerca, filtri per reparto e ruolo e pulsante «Nuovo».
 */
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TUTTI, NESSUNO } from "../types";
import { type RuoloSicurezza } from "@/lib/api";

export function FiltriDipendenti({
  q,
  setQ,
  filtroReparto,
  setFiltroReparto,
  filtroRuolo,
  setFiltroRuolo,
  repartiFiltro,
  ruoliAttivi,
  onNuovo,
}: {
  q: string;
  setQ: (v: string) => void;
  filtroReparto: string;
  setFiltroReparto: (v: string) => void;
  filtroRuolo: string;
  setFiltroRuolo: (v: string) => void;
  repartiFiltro: string[];
  ruoliAttivi: RuoloSicurezza[];
  onNuovo: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per cognome, nome, CF o reparto"
          className="pl-9"
        />
      </div>
      <Select value={filtroReparto} onValueChange={setFiltroReparto}>
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TUTTI}>Tutti i reparti</SelectItem>
          {repartiFiltro.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
          <SelectItem value={NESSUNO}>Senza reparto</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filtroRuolo} onValueChange={setFiltroRuolo}>
        <SelectTrigger className="w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TUTTI}>Tutti i ruoli</SelectItem>
          {ruoliAttivi.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.nome}
            </SelectItem>
          ))}
          <SelectItem value="__mancanti__">Con corsi mancanti</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={() => onNuovo()}>
        <Plus className="size-4" /> Nuovo
      </Button>
    </div>
  );
}
