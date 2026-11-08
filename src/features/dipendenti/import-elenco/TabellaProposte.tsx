/*
 * File:      TabellaProposte.tsx
 * Percorso:  src/features/dipendenti/import-elenco/TabellaProposte.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DialogImportaElenco.tsx: tabella di anteprima dei nominativi con spunte, tipo e mansione/classe proposta. Nessun cambio di comportamento.
 */
import { Checkbox } from "@/components/ui/checkbox";
import { PROFILI_ATA, type Proposta, type ProfiloAta } from "./analisi-elenco";
import type { Dispatch, SetStateAction } from "react";

interface Props {
  proposte: Proposta[];
  nomeFile: string;
  nSel: number;
  spunte: Record<string, boolean>;
  setSpunte: Dispatch<SetStateAction<Record<string, boolean>>>;
  codiciClasse: string[];
  dataFine: string;
  onTipoRiga: (cf: string, tipo: "ata" | "docente" | "cessazione") => void;
  onProfiloAta: (cf: string, profilo: string) => void;
  onClasse: (cf: string, classe: string) => void;
}

export function TabellaProposte({
  proposte,
  nomeFile,
  nSel,
  spunte,
  setSpunte,
  codiciClasse,
  dataFine,
  onTipoRiga,
  onProfiloAta,
  onClasse,
}: Props) {
  return (
    <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/60 text-xs text-muted-foreground border-b border-border">
        <span>
          <strong>{nomeFile}</strong>: {proposte.length} righe (
          {proposte.filter((p) => !p.dipendenteId).length} nuovi ingressi)
        </span>
        <span>{nSel} pronti da aggiornare</span>
      </div>

      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted text-left">
          <tr>
            <th className="p-2 w-10 text-center">N°</th>
            <th className="p-2 w-10" />
            <th className="p-2">Nominativo</th>
            <th className="p-2">Codice fiscale</th>
            <th className="p-2 w-32">Tipo</th>
            <th className="p-2">Mansione / Classe proposta</th>
          </tr>
        </thead>
        <tbody>
          {proposte.map((p, n) => (
            <tr
              key={p.cf}
              className={`border-t border-border ${p.dipendenteId ? "" : "bg-amber-500/10"}`}
            >
              <td className="p-2 text-center font-mono text-xs text-muted-foreground">{n + 1}</td>
              <td className="p-2 text-center">
                <Checkbox
                  checked={!!spunte[p.cf]}
                  onCheckedChange={(v) => setSpunte((s) => ({ ...s, [p.cf]: !!v }))}
                />
              </td>
              <td className="p-2">
                <span className="font-medium">
                  {p.cognome} {p.nome}
                </span>
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold ${p.dipendenteId ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/25 text-amber-800"}`}
                >
                  {p.dipendenteId ? "in archivio" : "nuovo"}
                </span>
              </td>
              <td className="p-2 font-mono text-xs text-muted-foreground">{p.cf}</td>

              <td className="p-2">
                <select
                  className="rounded border border-border bg-background px-2 py-1 text-xs font-medium"
                  value={p.tipo}
                  onChange={(e) =>
                    onTipoRiga(p.cf, e.target.value as "ata" | "docente" | "cessazione")
                  }
                >
                  <option value="ata">ATA</option>
                  <option value="docente">Docente</option>
                  <option value="cessazione">Cessato</option>
                </select>
              </td>

              <td className="p-2">
                {p.tipo === "ata" && (
                  <div className="flex items-center gap-2">
                    <select
                      className="block rounded border border-border bg-background px-2 py-1 text-xs font-medium"
                      value={p.sottorepartoAta ?? ""}
                      onChange={(e) => onProfiloAta(p.cf, e.target.value)}
                    >
                      <option value="">— scegli mansione ATA —</option>
                      {PROFILI_ATA.map((pr) => (
                        <option key={pr.codice} value={pr.nome}>
                          {pr.nome} ({pr.codice})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {p.tipo === "docente" && (
                  <div className="flex items-center gap-2">
                    <select
                      className="block rounded border border-border bg-background px-2 py-1 text-xs"
                      value={p.classe ?? ""}
                      onChange={(e) => onClasse(p.cf, e.target.value)}
                    >
                      <option value="">— scegli classe —</option>
                      {codiciClasse.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {p.materia && (
                      <span className="text-xs text-muted-foreground">({p.materia})</span>
                    )}
                  </div>
                )}

                {p.tipo === "cessazione" && (
                  <span className="text-xs text-muted-foreground">
                    {p.dipendenteId
                      ? `Data fine servizio: ${dataFine}`
                      : "Non presente in archivio"}
                  </span>
                )}

                {p.nota && (
                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">{p.nota}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
