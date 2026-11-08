/*
 * File:      TestataTabellaMatrice.tsx
 * Percorso:  src/features/dipendenti/matrice/TestataTabellaMatrice.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: intestazione della tabella (colonne, ordinamento, ridimensionamento, nascondi colonna). Nessun cambio di comportamento.
 */
import type { MouseEvent as EventoMouse } from "react";
import { CheckSquare, EyeOff, Square } from "lucide-react";
import type { TipoCorso } from "@/lib/api";
import { FrecciaOrdine } from "./FrecciaOrdine";
import { LARGHEZZE_FISSE_BASE, type TipoOrdinamento } from "./matrice-costanti";

interface Props {
  larghezze: Record<string, number>;
  corsiVisibili: TipoCorso[];
  tuttiVisibili: boolean;
  colonnaOrd: string;
  direzioneOrd: TipoOrdinamento;
  onOrdina: (colKey: string) => void;
  onToggleTutti: () => void;
  onToggleCorso: (corsoId: string, e: EventoMouse) => void;
  onResize: (colKey: string, larghezza: number, e: EventoMouse) => void;
  onResetLarghezza: (colKey: string) => void;
}

export function TestataTabellaMatrice({
  larghezze,
  corsiVisibili,
  tuttiVisibili,
  colonnaOrd,
  direzioneOrd,
  onOrdina,
  onToggleTutti,
  onToggleCorso,
  onResize,
  onResetLarghezza,
}: Props) {
  return (
    <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur border-b border-border shadow-sm">
      <tr className="divide-x divide-border">
        {/* Colonna Nominativo con master checkbox */}
        <th
          className="sticky left-0 z-30 bg-muted/95 px-3 py-2.5 font-bold text-foreground select-none relative group"
          style={{ width: `${larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo}px` }}
        >
          <div className="flex items-center justify-between gap-1">
            <span
              onClick={() => onOrdina("nominativo")}
              className="cursor-pointer hover:text-primary transition-colors flex items-center"
            >
              N° · COGNOME E NOME{" "}
              <FrecciaOrdine
                colKey="nominativo"
                colonnaOrd={colonnaOrd}
                direzioneOrd={direzioneOrd}
              />
            </span>

            <button
              type="button"
              onClick={onToggleTutti}
              title={
                tuttiVisibili
                  ? "Nascondi tutte le colonne dei corsi"
                  : "Mostra tutte le colonne dei corsi"
              }
              className="p-0.5 rounded hover:bg-primary/20 text-primary transition-colors"
            >
              {tuttiVisibili ? (
                <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Square className="size-4 text-muted-foreground" />
              )}
            </button>
          </div>

          <div
            onMouseDown={(e) =>
              onResize("nominativo", larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo, e)
            }
            onDoubleClick={() => onResetLarghezza("nominativo")}
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
          />
        </th>

        {/* Colonna Funzione / Reparto */}
        <th
          className="px-3 py-2.5 font-bold text-foreground select-none relative group"
          style={{ width: `${larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione}px` }}
        >
          <div
            onClick={() => onOrdina("funzione")}
            className="cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
          >
            <span>FUNZIONE / REPARTO</span>
            <FrecciaOrdine colKey="funzione" colonnaOrd={colonnaOrd} direzioneOrd={direzioneOrd} />
          </div>
          <div
            onMouseDown={(e) =>
              onResize("funzione", larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione, e)
            }
            onDoubleClick={() => onResetLarghezza("funzione")}
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
          />
        </th>

        {/* Colonna Ruolo */}
        <th
          className="px-3 py-2.5 font-bold text-foreground select-none relative group"
          style={{ width: `${larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo}px` }}
        >
          <div
            onClick={() => onOrdina("ruolo")}
            className="cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
          >
            <span className="truncate">RUOLO</span>
            <FrecciaOrdine colKey="ruolo" colonnaOrd={colonnaOrd} direzioneOrd={direzioneOrd} />
          </div>
          <div
            onMouseDown={(e) =>
              onResize("ruolo", larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo, e)
            }
            onDoubleClick={() => onResetLarghezza("ruolo")}
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
          />
        </th>

        {/* Colonne Corsi */}
        {corsiVisibili.map((c) => {
          const w = larghezze[c.id] || LARGHEZZE_FISSE_BASE.corso;
          return (
            <th
              key={c.id}
              className="px-2 py-2 font-semibold text-foreground select-none relative group align-top"
              style={{ width: `${w}px` }}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {c.codice || "CORSO"}
                </span>
                <button
                  type="button"
                  onClick={(e) => onToggleCorso(c.id, e)}
                  title="Nascondi questa colonna"
                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                >
                  <EyeOff className="size-3" />
                </button>
              </div>

              <div
                onClick={() => onOrdina(c.id)}
                className="cursor-pointer hover:text-primary transition-colors leading-tight break-words text-[11px]"
                title={c.nome_corso}
              >
                {c.nome_corso}{" "}
                <FrecciaOrdine colKey={c.id} colonnaOrd={colonnaOrd} direzioneOrd={direzioneOrd} />
              </div>

              <div
                onMouseDown={(e) => onResize(c.id, w, e)}
                onDoubleClick={() => onResetLarghezza(c.id)}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
              />
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
