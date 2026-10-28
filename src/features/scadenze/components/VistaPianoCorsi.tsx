/*
 * File:      VistaPianoCorsi.tsx
 * Percorso:  src/features/scadenze/components/VistaPianoCorsi.tsx
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 17:40 — Vista Piano Corsi aggregata Reparto x Corso con accordion nominativo ed export.
 */
import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Download, GraduationCap, Users } from "lucide-react";
import { type RigaScadenza } from "../hooks/useScadenze";
import { esportaPianoCorsiCSV, type GruppoPianoCorso, type PartecipantePiano } from "../export-piano-corsi";

interface Props {
  righe: RigaScadenza[];
}

export function VistaPianoCorsi({ righe }: Props) {
  const [repartoFiltro, setRepartoFiltro] = useState("tutti");
  const [chiaveEspansa, setChiaveEspansa] = useState<string | null>(null);

  // Raggruppa le scadenze (scaduti o entro 90 giorni) per Reparto e Corso
  const gruppi = useMemo<GruppoPianoCorso[]>(() => {
    const mappa = new Map<string, GruppoPianoCorso>();

    righe.forEach((r) => {
      // Ignora quelli non urgenti
      if (r.statoScadenza !== "scaduto" && r.statoScadenza !== "in_scadenza") return;

      const rep = r.reparto?.trim() || "Non Assegnato";
      const cor = r.titoloCorso?.trim() || "Corso";
      const chiave = `${rep}|||${cor}`;

      if (!mappa.has(chiave)) {
        mappa.set(chiave, {
          reparto: rep,
          corso: cor,
          scaduti: 0,
          inScadenza: 0,
          totale: 0,
          partecipanti: [],
        });
      }

      const g = mappa.get(chiave)!;
      if (r.statoScadenza === "scaduto") g.scaduti++;
      else g.inScadenza++;
      g.totale++;

      const p: PartecipantePiano = {
        id: r.id,
        cognome: r.cognome,
        nome: r.nome,
        codiceFiscale: r.codiceFiscale,
        reparto: rep,
        mansione: r.ruolo || "",
        corso: cor,
        dataScadenza: r.scadenza || "",
        stato: r.statoScadenza,
      };
      g.partecipanti.push(p);
    });

    return Array.from(mappa.values()).sort((a, b) =>
      a.reparto === b.reparto ? a.corso.localeCompare(b.corso) : a.reparto.localeCompare(b.reparto),
    );
  }, [righe]);

  const reparti = useMemo(() => {
    const r = Array.from(new Set(gruppi.map((g) => g.reparto))).sort();
    return ["tutti", ...r];
  }, [gruppi]);

  const filtrati = useMemo(() => {
    if (repartoFiltro === "tutti") return gruppi;
    return gruppi.filter((g) => g.reparto === repartoFiltro);
  }, [gruppi, repartoFiltro]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <GraduationCap className="size-5 text-primary" />
            Piano Corsi Formativi per Reparto
          </h2>
          <p className="text-xs text-muted-foreground">
            Fabbisogno formativo per la programmazione dei corsi (scaduti e in scadenza a 90 gg).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={repartoFiltro}
            onChange={(e) => setRepartoFiltro(e.target.value)}
            className="rounded-lg border-2 border-primary bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            {reparti.map((rep) => (
              <option key={rep} value={rep} className="bg-background text-foreground">
                {rep === "tutti" ? "Tutti i reparti" : rep}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => esportaPianoCorsiCSV(filtrati)}
            disabled={filtrati.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="size-3.5" />
            Esporta Piano Excel
          </button>
        </div>
      </div>

      {filtrati.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Nessun corso con fabbisogno formativo urgente da pianificare per il filtro selezionato.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reparto</th>
                <th className="px-4 py-3">Corso Formativo</th>
                <th className="px-4 py-3 text-center">🔴 Scaduti</th>
                <th className="px-4 py-3 text-center">🟡 In Scadenza (90gg)</th>
                <th className="px-4 py-3 text-center">Totale Fabbisogno</th>
                <th className="px-4 py-3 text-right">Dettaglio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrati.map((g) => {
                const k = `${g.reparto}|||${g.corso}`;
                const aperta = chiaveEspansa === k;
                return (
                  <tr key={k} className="group">
                    <td colSpan={6} className="p-0">
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                        <div className="flex items-center gap-2 font-medium">
                          <Building2 className="size-4 text-muted-foreground" />
                          <span>{g.reparto}</span>
                        </div>
                        <div className="flex-1 px-6 font-medium text-foreground">{g.corso}</div>
                        <div className="w-20 text-center font-bold text-destructive">{g.scaduti}</div>
                        <div className="w-28 text-center font-bold text-amber-600">{g.inScadenza}</div>
                        <div className="w-28 text-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                            <Users className="size-3" /> {g.totale}
                          </span>
                        </div>
                        <div className="w-24 text-right">
                          <button
                            type="button"
                            onClick={() => setChiaveEspansa(aperta ? null : k)}
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            {aperta ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            {aperta ? "Chiudi" : "Nomi"}
                          </button>
                        </div>
                      </div>

                      {aperta && (
                        <div className="border-t border-border bg-muted/10 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                            Partecipanti ({g.partecipanti.length}):
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {g.partecipanti.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-border bg-surface p-2.5 text-xs"
                              >
                                <div>
                                  <p className="font-semibold">{p.cognome} {p.nome}</p>
                                  <p className="text-[11px] text-muted-foreground">{p.mansione || "Dipendente"}</p>
                                </div>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    p.stato === "scaduto"
                                      ? "bg-destructive/15 text-destructive"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {p.dataScadenza}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
