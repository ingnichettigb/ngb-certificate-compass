/*
 * File:          BarraFiltriGruppo.tsx
 * Percorso:      src/features/dipendenti/matrice/BarraFiltriGruppo.tsx
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 21:40): Prima stesura barra filtri per macro-argomento corsi e selettore a 3 stati per lavoratori.
 */
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { Users, UserCheck, UserX, Layers } from "lucide-react";

export type FiltroStatoLavoratori = "tutti" | "solo_assegnati" | "senza_incarico";

interface Props {
  gruppoSelezionato: string | null;
  onSelezionaGruppo: (chiave: string | null) => void;
  filtroStato: FiltroStatoLavoratori;
  onChangeFiltroStato: (stato: FiltroStatoLavoratori) => void;
  conteggiCorsiPerGruppo: Record<string, number>;
  totaleCorsi: number;
  conteggiLavoratori: {
    tutti: number;
    assegnati: number;
    senza: number;
  };
}

export function BarraFiltriGruppo({
  gruppoSelezionato,
  onSelezionaGruppo,
  filtroStato,
  onChangeFiltroStato,
  conteggiCorsiPerGruppo,
  totaleCorsi,
  conteggiLavoratori,
}: Props) {
  const gruppoAttivoInfo = GRUPPI_ARGOMENTO.find((g) => g.chiave === gruppoSelezionato);

  return (
    <div className="flex flex-col gap-2.5 border-b border-border bg-surface/80 px-6 py-2.5 backdrop-blur shrink-0">
      {/* 1. Barra Pillole Argomenti Corso */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
          <Layers className="size-3.5" /> Corsi:
        </span>

        <button
          type="button"
          onClick={() => onSelezionaGruppo(null)}
          className={`h-7 px-3 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
            gruppoSelezionato === null
              ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
              : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
          }`}
        >
          <span>Tutti</span>
          <span className="text-[10px] opacity-80 font-mono">({totaleCorsi})</span>
        </button>

        {GRUPPI_ARGOMENTO.map((g) => {
          const isAttivo = gruppoSelezionato === g.chiave;
          const numCorsi = conteggiCorsiPerGruppo[g.chiave] || 0;
          if (numCorsi === 0) return null;

          return (
            <button
              key={g.chiave}
              type="button"
              onClick={() => onSelezionaGruppo(isAttivo ? null : g.chiave)}
              className={`h-7 px-3 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                isAttivo
                  ? "bg-emerald-700 text-white border-emerald-800 shadow-sm ring-1 ring-emerald-500"
                  : `${g.coloreSfondo} ${g.coloreTesto} border-border/50`
              }`}
            >
              <span>{g.titolo}</span>
              <span className="text-[10px] opacity-80 font-mono">({numCorsi})</span>
            </button>
          );
        })}
      </div>

      {/* 2. Selettore a 3 stati per i Lavoratori (visibile e attivo quando un gruppo è selezionato) */}
      {gruppoSelezionato && gruppoAttivoInfo && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs animate-in fade-in duration-150">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
            Filtra lavoratori per {gruppoAttivoInfo.titolo}:
          </span>

          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => onChangeFiltroStato("tutti")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                filtroStato === "tutti"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Mostra tutti i lavoratori per assegnare nuovi ruoli"
            >
              <Users className="size-3.5" />
              <span>Tutti i lavoratori</span>
              <span className="text-[10px] opacity-80 font-mono ml-0.5">({conteggiLavoratori.tutti})</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeFiltroStato("solo_assegnati")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                filtroStato === "solo_assegnati"
                  ? "bg-emerald-700 text-white shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={`Mostra solo chi ha già un ruolo ${gruppoAttivoInfo.titolo} assegnato`}
            >
              <UserCheck className="size-3.5" />
              <span>Solo con {gruppoAttivoInfo.titolo}</span>
              <span className="text-[10px] opacity-80 font-mono ml-0.5">({conteggiLavoratori.assegnati})</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeFiltroStato("senza_incarico")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                filtroStato === "senza_incarico"
                  ? "bg-amber-600 text-white shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={`Mostra solo chi non ha ruoli ${gruppoAttivoInfo.titolo}`}
            >
              <UserX className="size-3.5" />
              <span>Senza {gruppoAttivoInfo.titolo}</span>
              <span className="text-[10px] opacity-80 font-mono ml-0.5">({conteggiLavoratori.senza})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
