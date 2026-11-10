/*
 * File:      RigaLavoratoreMatrice.tsx
 * Percorso:  src/features/dipendenti/matrice/RigaLavoratoreMatrice.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: riga di un lavoratore con funzione, ruoli e caselle dei corsi. Nessun cambio di comportamento.
 *   rev 2 — 10/11/2026 — Casella «E» (esente) per l'aggiornamento Preposto di chi ha un RSPP valido.
 */
import { Check } from "lucide-react";
import type { Dipendente, TipoCorso } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { ruoliSicurezzaAssegnati, trovaRuoloPerCorso } from "./mappatura-ruoli-corsi";

interface Props {
  dip: Dipendente;
  indice: number;
  attiva: boolean;
  corsiVisibili: TipoCorso[];
  ruoli: RuoloSicurezza[];
  mappaAssegnazioni: Set<string>;
  haObbligoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
  motivoEsenzione?: (dipendenteId: string, corso: TipoCorso) => string | null;
  haAttestatoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
  onSeleziona: (id: string) => void;
  onToggleObbligo: (dip: Dipendente, corso: TipoCorso) => void;
}

export function RigaLavoratoreMatrice({
  dip,
  indice,
  attiva,
  corsiVisibili,
  ruoli,
  mappaAssegnazioni,
  haObbligoCorso,
  motivoEsenzione,
  haAttestatoCorso,
  onSeleziona,
  onToggleObbligo,
}: Props) {
  const isAttiva = attiva;
  const funzione =
    [dip.reparto, dip.sottoreparto, dip.classe_concorso, dip.materia].filter(Boolean).join(" - ") ||
    "—";
  const ruoliDelDip = ruoliSicurezzaAssegnati(dip.id, ruoli, mappaAssegnazioni);
  const ruoliSpecifici = ruoliDelDip.filter(
    (r) => !r.obbligatorio_tutti && r.nome.toLowerCase() !== "lavoratore",
  );

  return (
    <tr
      id={`riga-dipendente-${dip.id}`}
      data-lettera={(dip.cognome || "").trim().charAt(0).toUpperCase()}
      onClick={() => onSeleziona(dip.id)}
      className={`cursor-pointer divide-x divide-border transition-colors ${
        isAttiva ? "bg-emerald-500/15 ring-2 ring-inset ring-emerald-500/60" : "hover:bg-muted/40"
      }`}
    >
      <td
        className={`sticky left-0 z-10 px-3 py-2.5 font-semibold text-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${
          isAttiva ? "bg-emerald-500/20" : "bg-surface"
        }`}
      >
        <div className="truncate">
          <span className="mr-1.5 inline-block min-w-[1.75rem] text-right font-mono text-[11px] font-normal text-muted-foreground">
            {indice + 1}.
          </span>
          {dip.cognome} {dip.nome}
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">{dip.codice_fiscale}</div>
      </td>

      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        <div className="truncate" title={funzione}>
          {funzione}
        </div>
      </td>

      <td className="px-3 py-2.5 text-xs">
        {ruoliSpecifici.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-full">
            {ruoliSpecifici.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 text-[11px] font-medium truncate"
                title={r.nome}
              >
                {r.nome}
              </span>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium truncate max-w-full text-muted-foreground">
            {dip.classe_concorso || "Lavoratore"}
          </span>
        )}
      </td>

      {corsiVisibili.map((c) => {
        const obbligatorio = haObbligoCorso(dip.id, c);
        const fatto = haAttestatoCorso(dip.id, c);
        const ruoloCollegato = trovaRuoloPerCorso(c, ruoli);
        const esente = motivoEsenzione?.(dip.id, c) ?? null;

        return (
          <td
            key={c.id}
            onClick={(e) => {
              e.stopPropagation();
              onToggleObbligo(dip, c);
            }}
            className="px-2 py-2 text-center select-none hover:bg-primary/10 transition-colors"
            title={
              esente
                ? esente
                : ruoloCollegato
                ? `${obbligatorio ? "Revoca" : "Assegna"} ruolo "${ruoloCollegato.nome}" a ${dip.cognome}`
                : `Corso: ${c.nome_corso}`
            }
          >
            <div className="flex items-center justify-center">
              <button
                type="button"
                className={`size-5 rounded border flex items-center justify-center transition-all ${
                  obbligatorio
                    ? fatto
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-amber-500/20 border-amber-600 text-amber-700 dark:text-amber-400 font-bold"
                    : esente
                      ? "border-slate-400/60 bg-slate-500/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold"
                      : "border-muted-foreground/30 hover:border-primary/60"
                }`}
              >
                {esente ? "E" : obbligatorio && (fatto ? <Check className="size-3.5 stroke-[3]" /> : "!")}
              </button>
            </div>
          </td>
        );
      })}
    </tr>
  );
}
