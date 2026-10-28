/*
 * File:          MatriceAbilitazioniRuoli.tsx
 * Percorso:      src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 20:35): Prima stesura matrice di sicurezza.
 *   - Rev 2 (2026-10-28 20:50): Ordinamento crescente/decrescente ed esportazione CSV.
 *   - Rev 3 (2026-10-28 21:05): Correzione ridimensionamento reale con tableLayout: fixed,
 *     colgroup dedicato e ridefinizione concettuale a "Fabbisogno Formativo e Aggiornamenti".
 */
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileCheck,
  Loader2,
  Search,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  type Dipendente,
  type RuoloSicurezza,
  type AssegnazioneRuolo,
  type Attestato,
  impostaRuoloDipendente,
  aggiungiRuolo,
} from "@/lib/api";

export interface ColonnaFormazione {
  id: string;
  titolo: string;
  ruoloNome: string;
  chiaveCorso: string;
}

export const COLONNE_FORMAZIONE: ColonnaFormazione[] = [
  { id: "gen", titolo: "Formazione Generale", ruoloNome: "Lavoratore", chiaveCorso: "Generale" },
  { id: "spe", titolo: "Formazione Specifica", ruoloNome: "Formazione Specifica", chiaveCorso: "Specifica" },
  { id: "ant", titolo: "Antincendio", ruoloNome: "Addetto Antincendio", chiaveCorso: "Antincendio" },
  { id: "pso", titolo: "Primo Soccorso", ruoloNome: "Addetto Primo Soccorso", chiaveCorso: "Primo Soccorso" },
  { id: "pre", titolo: "Preposti", ruoloNome: "Preposto", chiaveCorso: "Preposto" },
  { id: "eva", titolo: "Evacuazione", ruoloNome: "Addetto Evacuazione", chiaveCorso: "Evacuazione" },
  { id: "bls", titolo: "Defibrillatore", ruoloNome: "Addetto BLSD / Defibrillatore", chiaveCorso: "Defibrillatore" },
  { id: "rls", titolo: "RLS", ruoloNome: "RLS", chiaveCorso: "RLS" },
  { id: "asp", titolo: "ASPP", ruoloNome: "ASPP", chiaveCorso: "ASPP" },
];

const LARGHEZZE_BASE: Record<string, number> = {
  nome: 240,
  funzione: 180,
  ruolo: 160,
  gen: 130,
  spe: 130,
  ant: 115,
  pso: 115,
  pre: 115,
  eva: 115,
  bls: 115,
  rls: 115,
  asp: 115,
};

type TipoOrdinamento = "asc" | "desc" | null;

export function MatriceAbilitazioniRuoli({
  open,
  onChiudi,
  dipendenti,
  ruoliCatalogo,
  assegnazioni,
  attestati,
}: {
  open: boolean;
  onChiudi: () => void;
  dipendenti: Dipendente[];
  ruoliCatalogo: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  attestati: Attestato[];
}) {
  const qc = useQueryClient();
  const [ricerca, setRicerca] = useState("");
  const [rigaSelezionata, setRigaSelezionata] = useState<string | null>(null);
  const [inSalvataggio, setInSalvataggio] = useState<string | null>(null);

  const [colonnaOrd, setColonnaOrd] = useState<string>("nome");
  const [versoOrd, setVersoOrd] = useState<TipoOrdinamento>("asc");

  const [larghezze, setLarghezze] = useState<Record<string, number>>(() => {
    try {
      const salvate = localStorage.getItem("matrice_colonne_larghezze_v2");
      return salvate ? { ...LARGHEZZE_BASE, ...JSON.parse(salvate) } : LARGHEZZE_BASE;
    } catch {
      return LARGHEZZE_BASE;
    }
  });

  const dragRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("matrice_colonne_larghezze_v2", JSON.stringify(larghezze));
    } catch {}
  }, [larghezze]);

  // Ridimensionamento effettivo con calcolo larghezza fissa e blocco selezione testo
  function iniziaResize(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, startX: e.clientX, startW: larghezze[id] || LARGHEZZE_BASE[id] || 120 };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const diff = ev.clientX - dragRef.current.startX;
      const nuovaW = Math.max(70, dragRef.current.startW + diff);
      setLarghezze((prev) => ({ ...prev, [dragRef.current!.id]: nuovaW }));
    }

    function onMouseUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function resetLarghezza(id: string) {
    setLarghezze((prev) => ({ ...prev, [id]: LARGHEZZE_BASE[id] || 120 }));
  }

  const larghezzaTotale = useMemo(() => {
    return (
      (larghezze.nome || LARGHEZZE_BASE.nome) +
      (larghezze.funzione || LARGHEZZE_BASE.funzione) +
      (larghezze.ruolo || LARGHEZZE_BASE.ruolo) +
      COLONNE_FORMAZIONE.reduce((acc, c) => acc + (larghezze[c.id] || LARGHEZZE_BASE[c.id] || 115), 0)
    );
  }, [larghezze]);

  const mappaRuoli = useMemo(() => {
    const map = new Map<string, RuoloSicurezza>();
    ruoliCatalogo.forEach((r) => map.set(r.nome.toLowerCase().trim(), r));
    return map;
  }, [ruoliCatalogo]);

  const haObbligo = (dipendenteId: string, colonna: ColonnaFormazione): boolean => {
    const ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());
    if (!ruoloTrovato) return false;
    if (ruoloTrovato.obbligatorio_tutti) return true;
    return assegnazioni.some((a) => a.dipendente_id === dipendenteId && a.ruolo_id === ruoloTrovato.id);
  };

  const haAttestatoValido = (dipendenteId: string, colonna: ColonnaFormazione): boolean => {
    return attestati.some(
      (att) =>
        att.dipendente_id === dipendenteId &&
        att.tipo &&
        att.tipo.toLowerCase().includes(colonna.chiaveCorso.toLowerCase()),
    );
  };

  function handleOrdina(id: string) {
    if (colonnaOrd !== id) {
      setColonnaOrd(id);
      setVersoOrd("asc");
    } else if (versoOrd === "asc") {
      setVersoOrd("desc");
    } else if (versoOrd === "desc") {
      setColonnaOrd("nome");
      setVersoOrd("asc");
    }
  }

  const listaElaborata = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    let res = dipendenti;

    if (q) {
      res = res.filter((d) => {
        const nc = `${d.cognome || ""} ${d.nome || ""}`.toLowerCase();
        const fz = `${d.reparto || ""} ${d.sottoreparto || ""} ${d.materia || ""}`.toLowerCase();
        return nc.includes(q) || fz.includes(q);
      });
    }

    return [...res].sort((a, b) => {
      let comp = 0;
      if (colonnaOrd === "nome") {
        const na = `${a.cognome || ""} ${a.nome || ""}`.toLowerCase();
        const nb = `${b.cognome || ""} ${b.nome || ""}`.toLowerCase();
        comp = na.localeCompare(nb);
      } else if (colonnaOrd === "funzione") {
        const fa = (a.reparto || "").toLowerCase();
        const fb = (b.reparto || "").toLowerCase();
        comp = fa.localeCompare(fb);
      } else if (colonnaOrd === "ruolo") {
        const ra = (a.classe_concorso || "").toLowerCase();
        const rb = (b.classe_concorso || "").toLowerCase();
        comp = ra.localeCompare(rb);
      } else {
        const col = COLONNE_FORMAZIONE.find((c) => c.id === colonnaOrd);
        if (col) {
          const vA = haObbligo(a.id, col) ? 1 : 0;
          const vB = haObbligo(b.id, col) ? 1 : 0;
          comp = vA - vB;
        }
      }
      return versoOrd === "desc" ? -comp : comp;
    });
  }, [dipendenti, ricerca, colonnaOrd, versoOrd, mappaRuoli, assegnazioni]);

  async function toggleObbligo(dipendente: Dipendente, colonna: ColonnaFormazione, e: React.MouseEvent) {
    e.stopPropagation();
    const chiaveOp = `${dipendente.id}-${colonna.id}`;
    if (inSalvataggio === chiaveOp) return;

    let ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());
    if (!ruoloTrovato) {
      try {
        setInSalvataggio(chiaveOp);
        await aggiungiRuolo({
          nome: colonna.ruoloNome,
          macro_categoria: colonna.titolo,
          obbligatorio_tutti: false,
          ordine: ruoliCatalogo.length + 1,
        });
        await qc.invalidateQueries({ queryKey: ["ruoli-sicurezza"] });
        ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());
      } catch (err) {
        toast.error("Errore inizializzazione corso", { description: (err as Error).message });
        setInSalvataggio(null);
        return;
      }
    }

    if (!ruoloTrovato || ruoloTrovato.obbligatorio_tutti) return;

    const giaObbligato = haObbligo(dipendente.id, colonna);
    setInSalvataggio(chiaveOp);
    try {
      await impostaRuoloDipendente(dipendente.id, ruoloTrovato.id, !giaObbligato);
      await qc.invalidateQueries({ queryKey: ["dipendenti-ruoli"] });
      toast.success(
        !giaObbligato
          ? `Obbligo aggiunto: ${colonna.titolo} per ${dipendente.cognome} ${dipendente.nome}`
          : `Obbligo rimosso: ${colonna.titolo} per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (err) {
      toast.error("Errore salvataggio", { description: (err as Error).message });
    } finally {
      setInSalvataggio(null);
    }
  }

  function esportaCsv() {
    const separatore = ";";
    const intestazioni = [
      "Cognome e Nome",
      "Codice Fiscale",
      "Funzione / Reparto",
      "Ruolo Aziendale",
      ...COLONNE_FORMAZIONE.map((c) => c.titolo),
    ];

    const righe = listaElaborata.map((d) => {
      const fn = [d.reparto, d.sottoreparto, d.materia].filter(Boolean).join(" - ") || "";
      const corsi = COLONNE_FORMAZIONE.map((c) => {
        const ob = haObbligo(d.id, c);
        const at = haAttestatoValido(d.id, c);
        if (ob && at) return "OBBLIGATORIO (REGOLARE)";
        if (ob && !at) return "OBBLIGATORIO (DA FORMARE)";
        return "NON PREVISTO";
      });
      return [
        `"${d.cognome || ""} ${d.nome || ""}"`,
        `"${d.codice_fiscale || ""}"`,
        `"${fn.replace(/"/g, '""')}"`,
        `"${(d.classe_concorso || "Lavoratore").replace(/"/g, '""')}"`,
        ...corsi,
      ].join(separatore);
    });

    const csvContent = "\uFEFF" + [intestazioni.join(separatore), ...righe].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `030ArchAttestati_Piano_Formazione_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Esportazione piano formazione completata");
  }

  if (!open) return null;

  function renderFreccia(id: string) {
    if (colonnaOrd !== id) return <ArrowUpDown className="size-3 opacity-30 group-hover:opacity-100" />;
    return versoOrd === "asc" ? (
      <ArrowUp className="size-3 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <ArrowDown className="size-3 text-emerald-600 dark:text-emerald-400" />
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Testata */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onChiudi} className="gap-1.5">
            <ArrowLeft className="size-4" /> Torna
          </Button>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Users className="size-4" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight">Piano Fabbisogno Formativo e Ruoli</h1>
              <p className="text-xs text-muted-foreground">
                {listaElaborata.length} di {dipendenti.length} lavoratori • Spunta i corsi e aggiornamenti obbligatori
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64 md:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca cognome, nome, reparto..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="pl-9 pr-8"
            />
            {ricerca && (
              <button
                type="button"
                onClick={() => setRicerca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={esportaCsv} className="gap-1.5">
            <Download className="size-4" /> Esporta Excel (CSV)
          </Button>
        </div>
      </header>

      {/* Contenitore con larghezza totale calcolata e scorrimento fluido */}
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto">
        <table
          className="border-collapse text-left text-sm"
          style={{
            tableLayout: "fixed",
            width: `${larghezzaTotale}px`,
          }}
        >
          {/* Definizione fissa delle larghezze colonna per ridimensionamento reale */}
          <colgroup>
            <col style={{ width: `${larghezze.nome || LARGHEZZE_BASE.nome}px` }} />
            <col style={{ width: `${larghezze.funzione || LARGHEZZE_BASE.funzione}px` }} />
            <col style={{ width: `${larghezze.ruolo || LARGHEZZE_BASE.ruolo}px` }} />
            {COLONNE_FORMAZIONE.map((c) => (
              <col key={c.id} style={{ width: `${larghezze[c.id] || LARGHEZZE_BASE[c.id]}px` }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm select-none">
            <tr className="divide-x divide-border">
              {/* Cognome e Nome */}
              <th className="group relative sticky left-0 z-30 bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                <div
                  className="flex cursor-pointer items-center justify-between gap-1"
                  onClick={() => handleOrdina("nome")}
                >
                  <span className="truncate">Cognome e Nome</span>
                  {renderFreccia("nome")}
                </div>
                <div
                  onMouseDown={(e) => iniziaResize("nome", e)}
                  onDoubleClick={() => resetLarghezza("nome")}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                  title="Trascina per allargare/stringere (doppio clic per ripristinare)"
                />
              </th>

              {/* Funzione / Reparto */}
              <th className="group relative bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <div
                  className="flex cursor-pointer items-center justify-between gap-1"
                  onClick={() => handleOrdina("funzione")}
                >
                  <span className="truncate">Funzione / Reparto</span>
                  {renderFreccia("funzione")}
                </div>
                <div
                  onMouseDown={(e) => iniziaResize("funzione", e)}
                  onDoubleClick={() => resetLarghezza("funzione")}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                  title="Trascina per allargare/stringere"
                />
              </th>

              {/* Ruolo Aziendale */}
              <th className="group relative bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <div
                  className="flex cursor-pointer items-center justify-between gap-1"
                  onClick={() => handleOrdina("ruolo")}
                >
                  <span className="truncate">Ruolo Aziendale</span>
                  {renderFreccia("ruolo")}
                </div>
                <div
                  onMouseDown={(e) => iniziaResize("ruolo", e)}
                  onDoubleClick={() => resetLarghezza("ruolo")}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                  title="Trascina per allargare/stringere"
                />
              </th>

              {/* Colonne Formazione e Aggiornamenti */}
              {COLONNE_FORMAZIONE.map((col) => {
                const conObbligo = dipendenti.filter((d) => haObbligo(d.id, col)).length;
                return (
                  <th
                    key={col.id}
                    className="group relative bg-surface px-2 py-2.5 text-center text-xs font-bold tracking-tight text-foreground"
                  >
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center gap-0.5"
                      onClick={() => handleOrdina(col.id)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate font-semibold">{col.titolo}</span>
                        {renderFreccia(col.id)}
                      </div>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {conObbligo} obbligati
                      </span>
                    </div>
                    <div
                      onMouseDown={(e) => iniziaResize(col.id, e)}
                      onDoubleClick={() => resetLarghezza(col.id)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                      title="Trascina per allargare/stringere"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {listaElaborata.length === 0 ? (
              <tr>
                <td colSpan={3 + COLONNE_FORMAZIONE.length} className="p-12 text-center text-muted-foreground">
                  Nessun lavoratore corrisponde ai criteri di ricerca.
                </td>
              </tr>
            ) : (
              listaElaborata.map((dip) => {
                const isAttiva = rigaSelezionata === dip.id;
                const funzione = [dip.reparto, dip.sottoreparto, dip.materia].filter(Boolean).join(" - ") || "—";
                const ruoloAziendale = dip.classe_concorso || "Lavoratore";

                return (
                  <tr
                    key={dip.id}
                    onClick={() => setRigaSelezionata(dip.id)}
                    className={`cursor-pointer divide-x divide-border transition-colors ${
                      isAttiva
                        ? "bg-emerald-500/15 ring-2 ring-inset ring-emerald-500/60"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 px-3 py-2.5 font-semibold text-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${
                        isAttiva ? "bg-emerald-500/20" : "bg-surface"
                      }`}
                    >
                      <div className="truncate">
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
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium truncate max-w-full">
                        {ruoloAziendale}
                      </span>
                    </td>

                    {COLONNE_FORMAZIONE.map((col) => {
                      const obbligato = haObbligo(dip.id, col);
                      const haAttestato = haAttestatoValido(dip.id, col);
                      const chiaveOp = `${dip.id}-${col.id}`;
                      const isBusy = inSalvataggio === chiaveOp;

                      return (
                        <td
                          key={col.id}
                          className="px-2 py-2 text-center"
                          onClick={(e) => toggleObbligo(dip, col, e)}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={obbligato}
                                onChange={() => {}}
                                className="size-4 cursor-pointer rounded accent-emerald-600"
                                title={
                                  obbligato
                                    ? "Obbligo formativo assegnato (clicca per rimuovere)"
                                    : "Clicca per assegnare l'obbligo di questo corso"
                                }
                              />
                            )}

                            {/* Stato dell'attestato rispetto all'obbligo */}
                            {obbligato && haAttestato && (
                              <span title="Regolare: corso svolto con attestato valido">
                                <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              </span>
                            )}
                            {obbligato && !haAttestato && (
                              <span title="Attenzione: corso obbligatorio ma attestato non ancora registrato">
                                <AlertCircle className="size-3.5 text-amber-500" />
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Didascalia */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-surface px-6 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-emerald-600 bg-emerald-600" /> Obbligo formazione assegnato
          </span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="size-3.5 text-emerald-600" /> Attestato valido presente (In regola)
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-amber-500" /> Obbligatorio ma da formare
          </span>
          <span>Trascina i divisori per regolare la larghezza</span>
        </div>
        <div>
          Totale lavoratori: <strong>{dipendenti.length}</strong>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
