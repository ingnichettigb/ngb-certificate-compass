/*
 * File:      PannelloVociOrganigramma.tsx
 * Percorso:  src/features/stampe/components/PannelloVociOrganigramma.tsx
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 13:20 — Griglia delle schede voci aggiuntive: schede azzurre per ruoli DB
 *            e marroncine per note descrittive, con selezione nominativi del personale e cancellazione collegata.
 */
import { ShieldCheck, FileText, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Dipendente } from "@/lib/api";
import type { VoceOrganigramma } from "@/lib/api/ditta";

type Props = {
  voci: VoceOrganigramma[];
  dipendenti: Dipendente[];
  onAggiornaVoce: (indice: number, patch: Partial<VoceOrganigramma>) => void;
  onEliminaVoce: (indice: number) => void;
};

export function PannelloVociOrganigramma({ voci, dipendenti, onAggiornaVoce, onEliminaVoce }: Props) {
  const inForza = dipendenti
    .filter((d) => d.stato_lavoratore !== "cessato")
    .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || (a.nome ?? "").localeCompare(b.nome ?? "", "it"));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {voci.map((voce, indice) => {
        const eRuolo = (voce.tipo ?? "ruolo") === "ruolo";

        return (
          <div
            key={`${voce.titolo}-${indice}`}
            className={`flex flex-col justify-between rounded-lg border-2 p-3 transition-all ${
              eRuolo
                ? "border-sky-300 bg-sky-50/60 shadow-sm"
                : "border-amber-300 bg-amber-50/60 shadow-sm"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {eRuolo ? (
                    <span title="Ruolo collegato al DB" className="shrink-0"><ShieldCheck className="h-4 w-4 text-sky-600" /></span>
                  ) : (
                    <span title="Nota descrittiva organigramma" className="shrink-0"><FileText className="h-4 w-4 text-amber-700" /></span>
                  )}
                  <Input
                    value={voce.titolo}
                    onChange={(e) => onAggiornaVoce(indice, { titolo: e.target.value })}
                    className="h-7 text-xs font-semibold bg-card/90"
                    placeholder="Titolo della voce"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => onEliminaVoce(indice)}
                  title="Elimina voce"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {eRuolo ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-sky-900">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                      Lavoratori incaricati:
                    </span>
                    <span className="text-muted-foreground">{voce.nomi.length} selezionati</span>
                  </div>
                  <Textarea
                    value={voce.nomi.join("\n")}
                    onChange={(e) =>
                      onAggiornaVoce(indice, {
                        nomi: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Un nominativo per riga (es. Bardelli Mariacristina)"
                    rows={4}
                    className="text-xs bg-card/90 leading-relaxed font-mono"
                  />
                  <div className="text-[10px] text-sky-800">
                    I nomi qui inseriti riceveranno l&apos;incarico e saranno disponibili nelle Nomine.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-amber-900">Righe descrittive / categorie:</div>
                  <Textarea
                    value={voce.nomi.join("\n")}
                    onChange={(e) =>
                      onAggiornaVoce(indice, {
                        nomi: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Un testo per riga (es. Alunni aprifila)"
                    rows={4}
                    className="text-xs bg-card/90 leading-relaxed"
                  />
                  <div className="text-[10px] text-amber-800">
                    Testo libero stampato sulla tavola A3 (nessun legame con anagrafiche o nomine).
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
