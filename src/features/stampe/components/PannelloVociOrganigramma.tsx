/*
 * File:      PannelloVociOrganigramma.tsx
 * Percorso:  src/features/stampe/components/PannelloVociOrganigramma.tsx
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 13:20 — Griglia delle schede voci aggiuntive: schede azzurre per ruoli DB
 *            e marroncine per note descrittive, con selezione nominativi del personale e cancellazione collegata.
 *   rev 2 — 13/11/2026 13:40 — Corretto filtro stato_lavoratore dei dipendenti in forza.
 *   rev 3 — 16/11/2026 — Schede azzurre collegate a un ruolo (ruolo_id): i nominativi NON si scrivono, si scelgono tra i lavoratori
 *            in forza e si salvano subito in dipendenti_ruoli (stessa fonte delle Nomine). Più persone con «Aggiungi».
 *            I vecchi nomi scritti a mano che non corrispondono a nessun lavoratore compaiono come «da abbinare».
 *            Le note (marroncine) restano testo libero.
 */
import { useMemo, useState } from "react";
import { AlertTriangle, FileText, Plus, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Dipendente } from "@/lib/api";
import type { VoceOrganigramma } from "@/lib/api/ditta";
import type { AssegnazioneRuolo } from "@/lib/api/ruoli";
import { dipendentiDelRuolo } from "../organigramma-a3";

type Props = {
  voci: VoceOrganigramma[];
  dipendenti: Dipendente[];
  assegnazioni: AssegnazioneRuolo[];
  /** Con più sedi: sede della tavola mostrata; gli incarichi si assegnano e si tolgono in questa sede. */
  sedeId?: string | null | undefined;
  sedeNome?: string | null | undefined;
  onAggiornaVoce: (indice: number, patch: Partial<VoceOrganigramma>) => void;
  onEliminaVoce: (indice: number) => void;
  onAssegna: (dipendenteId: string, ruoloId: string) => Promise<void>;
  onRimuovi: (dipendenteId: string, ruoloId: string) => Promise<void>;
};

const maiusc = (t: string) => t.toLocaleUpperCase("it-IT");
const nomeCompletoMaiuscolo = (d: Pick<Dipendente, "cognome" | "nome">) => maiusc(`${d.cognome} ${d.nome ?? ""}`.trim());

/** Scheda azzurra collegata al DB: incaricati, scelta tra i lavoratori in forza, tasto Aggiungi. */
function SchedaRuoloDb({
  voce,
  indice,
  inForza,
  assegnazioni,
  sedeId,
  sedeNome,
  onAggiornaVoce,
  onAssegna,
  onRimuovi,
}: {
  voce: VoceOrganigramma;
  indice: number;
  inForza: Dipendente[];
  assegnazioni: AssegnazioneRuolo[];
  sedeId?: string | null | undefined;
  sedeNome?: string | null | undefined;
  onAggiornaVoce: Props["onAggiornaVoce"];
  onAssegna: Props["onAssegna"];
  onRimuovi: Props["onRimuovi"];
}) {
  const ruoloId = voce.ruolo_id as string;
  const [scelta, setScelta] = useState("");
  const [occupato, setOccupato] = useState(false);

  const incaricati = useMemo(
    () => dipendentiDelRuolo(ruoloId, inForza, assegnazioni, sedeId),
    [ruoloId, inForza, assegnazioni, sedeId],
  );
  const giaIds = useMemo(() => new Set(incaricati.map((d) => d.id)), [incaricati]);
  const candidati = useMemo(() => inForza.filter((d) => !giaIds.has(d.id)), [inForza, giaIds]);
  const daAbbinare = voce.nomi.filter((n) => n.trim());

  const esegui = async (azione: () => Promise<void>) => {
    setOccupato(true);
    try {
      await azione();
    } finally {
      setOccupato(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-sky-900">
        <span className="flex items-center gap-1">
          <UserCheck className="h-3.5 w-3.5 text-sky-600" />
          Lavoratori incaricati{sedeNome ? ` — ${sedeNome}` : ""}:
        </span>
        <span className="text-muted-foreground">{incaricati.length} selezionati</span>
      </div>

      {incaricati.length ? (
        <ul className="space-y-1">
          {incaricati.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md border border-sky-200 bg-card/90 px-2 py-1 text-xs font-medium"
            >
              <span className="min-w-0 truncate">{nomeCompletoMaiuscolo(d)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10"
                title="Togli l'incarico"
                aria-label={`Togli l'incarico a ${nomeCompletoMaiuscolo(d)}`}
                disabled={occupato}
                onClick={() => esegui(() => onRimuovi(d.id, ruoloId))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-card/70 px-2 py-1 text-xs italic text-muted-foreground">Nessun incarico assegnato</p>
      )}

      <div className="flex items-center gap-1.5">
        <select
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card/90 px-2 text-xs"
          value={scelta}
          onChange={(e) => setScelta(e.target.value)}
          aria-label="Lavoratore da aggiungere"
          disabled={occupato}
        >
          <option value="">— scegli un lavoratore —</option>
          {candidati.map((d) => (
            <option key={d.id} value={d.id}>
              {nomeCompletoMaiuscolo(d)}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={!scelta || occupato}
          onClick={() =>
            esegui(async () => {
              await onAssegna(scelta, ruoloId);
              setScelta("");
            })
          }
        >
          <Plus className="size-4" /> Aggiungi
        </Button>
      </div>

      {daAbbinare.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
          <p className="mb-1 flex items-center gap-1 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" /> Nomi da abbinare (non trovati nell&apos;elenco dei lavoratori):
          </p>
          <ul className="space-y-1">
            {daAbbinare.map((n) => (
              <li key={n} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{n}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10"
                  title="Rimuovi questo nome (poi premi «Salva voci»)"
                  onClick={() => onAggiornaVoce(indice, { nomi: voce.nomi.filter((x) => x !== n) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-1">
            Non compaiono in tavola né nelle Nomine: scegli il lavoratore dal menu qui sopra, poi rimuovi il nome e premi «Salva voci».
          </p>
        </div>
      )}

      <div className="text-[10px] text-sky-800">
        Gli incarichi si salvano subito e sono gli stessi delle Nomine: aggiungere o togliere qui o là è la stessa cosa.
      </div>
    </div>
  );
}

export function PannelloVociOrganigramma({
  voci,
  dipendenti,
  assegnazioni,
  sedeId,
  sedeNome,
  onAggiornaVoce,
  onEliminaVoce,
  onAssegna,
  onRimuovi,
}: Props) {
  const inForza = useMemo(
    () =>
      dipendenti
        .filter((d) => d.stato_lavoratore !== "cessato")
        .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || (a.nome ?? "").localeCompare(b.nome ?? "", "it")),
    [dipendenti],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {voci.map((voce, indice) => {
        const eRuolo = (voce.tipo ?? "ruolo") === "ruolo";
        const collegata = eRuolo && !!voce.ruolo_id;

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

              {collegata ? (
                <SchedaRuoloDb
                  voce={voce}
                  indice={indice}
                  inForza={inForza}
                  assegnazioni={assegnazioni}
                  sedeId={sedeId}
                  sedeNome={sedeNome}
                  onAggiornaVoce={onAggiornaVoce}
                  onAssegna={onAssegna}
                  onRimuovi={onRimuovi}
                />
              ) : eRuolo ? (
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
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] text-amber-900">
                    Voce non collegata a un ruolo del DB: i nomi scritti qui non sono controllati e non si riflettono nelle Nomine.
                    Se è un elenco di categorie, eliminala e riaggiungila come nota; altrimenti riaggiungila come ruolo del DB.
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
                    Testo libero stampato sulla tavola A3 (senza legame con ruoli o nomine).
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
