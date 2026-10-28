/*
 * File:          MatriceAbilitazioniRuoli.tsx
 * Percorso:      src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 20:35): Prima stesura matrice con riga attiva e 9 colonne di sicurezza.
 *   - Rev 2 (2026-10-28 20:50): Ordinamento clic crescente/decrescente, ridimensionamento colonne
 *     con memoria permanente (localStorage), ripristino doppio clic ed esportazione Excel (CSV).
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

export interface ColonnaAbilitazione {
  id: string;
  titolo: string;
  ruoloNome: string;
  chiaveCorso: string;
}

export const COLONNE_ABILITAZIONI: ColonnaAbilitazione[] = [
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
  gen: 120,
  spe: 120,
  ant: 110,
  pso: 110,
  pre: 110,
  eva: 110,
  bls: 110,
  rls: 110,
  asp: 110,
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

  // Stato ordinamento
  const [colonnaOrd, setColonnaOrd] = useState<string>("nome");
  const [versoOrd, setVersoOrd] = useState<TipoOrdinamento>("asc");

  // Larghezze colonne con memoria in localStorage
  const [larghezze, setLarghezze] = useState<Record<string, number>>(() => {
    try {
      const salvate = localStorage.getItem("matrice_colonne_larghezze_v1");
      return salvate ? { ...LARGHEZZE_BASE, ...JSON.parse(salvate) } : LARGHEZZE_BASE;
    } catch {
      return LARGHEZZE_BASE;
    }
  });

  const dragRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("matrice_colonne_larghezze_v1", JSON.stringify(larghezze));
    } catch {}
  }, [larghezze]);

  // Gestione ridimensionamento colonne
  function iniziaResize(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, startX: e.clientX, startW: larghezze[id] || 120 };

    function onMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const diff = ev.clientX - dragRef.current.startX;
      const nuovaW = Math.max(75, dragRef.current.startW + diff);
      setLarghezze((prev) => ({ ...prev, [dragRef.current!.id]: nuovaW }));
    }

    function onMouseUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function resetLarghezza(id: string) {
    setLarghezze((prev) => ({ ...prev, [id]: LARGHEZZE_BASE[id] || 120 }));
  }

  // Mappa ruoli catalogo
  const mappaRuoli = useMemo(() => {
    const map = new Map<string, RuoloSicurezza>();
    ruoliCatalogo.forEach((r) => map.set(r.nome.toLowerCase().trim(), r));
    return map;
  }, [ruoliCatalogo]);

  const haRuolo = (dipendenteId: string, colonna: ColonnaAbilitazione): boolean => {
    const ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());
    if (!ruoloTrovato) return false;
    if (ruoloTrovato.obbligatorio_tutti) return true;
    return assegnazioni.some((a) => a.dipendente_id === dipendenteId && a.ruolo_id === ruoloTrovato.id);
  };

  const haAttestatoValido = (dipendenteId: string, colonna: ColonnaAbilitazione): boolean => {
    return attestati.some(
      (att) =>
        att.dipendente_id === dipendenteId &&
        att.tipo &&
        att.tipo.toLowerCase().includes(colonna.chiaveCorso.toLowerCase()),
    );
  };

  // Click su intestazione: 1° asc -> 2° desc -> 3° reset (default)
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

  // Ordinamento e filtraggio lista
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
        const col = COLONNE_ABILITAZIONI.find((c) => c.id === colonnaOrd);
        if (col) {
          const vA = haRuolo(a.id, col) ? 1 : 0;
          const vB = haRuolo(b.id, col) ? 1 : 0;
          comp = vA - vB;
        }
      }
      return versoOrd === "desc" ? -comp : comp;
    });
  }, [dipendenti, ricerca, colonnaOrd, versoOrd, mappaRuoli, assegnazioni]);

  // Toggle casella abilitazione
  async function toggleAbilitazione(dipendente: Dipendente, colonna: ColonnaAbilitazione, e: React.MouseEvent) {
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
        toast.error("Errore inizializzazione ruolo", { description: (err as Error).message });
        setInSalvataggio(null);
        return;
      }
    }

    if (!ruoloTrovato || ruoloTrovato.obbligatorio_tutti) return;

    const giaAssegnato = haRuolo(dipendente.id, colonna);
    setInSalvataggio(chiaveOp);
    try {
      await impostaRuoloDipendente(dipendente.id, ruoloTrovato.id, !giaAssegnato);
      await qc.invalidateQueries({ queryKey: ["dipendenti-ruoli"] });
      toast.success(
        !giaAssegnato
          ? `Abilitato: ${colonna.titolo} per ${dipendente.cognome} ${dipendente.nome}`
          : `Disabilitato: ${colonna.titolo} per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (err) {
      toast.error("Errore salvataggio", { description: (err as Error).message });
    } finally {
      setInSalvataggio(null);
    }
  }

  // Esportazione CSV compatibile Excel
  function esportaCsv() {
    const separatore = ";";
    const intestazioni = [
      "Cognome e Nome",
      "Codice Fiscale",
      "Funzione / Reparto",
      "Ruolo Aziendale",
      ...COLONNE_ABILITAZIONI.map((c) => c.titolo),
    ];

    const righe = listaElaborata.map((d) => {
      const fn = [d.reparto, d.sottoreparto, d.materia].filter(Boolean).join(" - ") || "";
      const ruoliCorsi = COLONNE_ABILITAZIONI.map((c) => (haRuolo(d.id, c) ? "SI" : "NO"));
      return [
        `"${d.cognome || ""} ${d.nome || ""}"`,
        `"${d.codice_fiscale || ""}"`,
        `"${fn.replace(/"/g, '""')}"`,
        `"${(d.classe_concorso || "Lavoratore").replace(/"/g, '""')}"`,
        ...ruoliCorsi,
      ].join(separatore);
    });

    const csvContent = "\uFEFF" + [intestazioni.join(separatore), ...righe].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `030ArchAttestati_Matrice_Abilitazioni_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Esportazione Excel completata");
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
              <h1 className="text-base font-bold leading-tight">Matrice Abilitazioni e Ruoli Sicurezza</h1>
              <p className="text-xs text-muted-foreground">
                {listaElaborata.length} di {dipendenti.length} lavoratori visibili
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

      {/* Area Tabella con scorrimento orizzontale in basso */}
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto">
        <table className="border-collapse text-left text-sm" style={{ minWidth: "1250px" }}>
          <thead className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm select-none">
            <tr className="divide-x divide-border">
              {/* Cognome e Nome */}
              <th
                style={{ width: `${larghezze.nome}px`, minWidth: "120px" }}
                className="group relative sticky left-0 z-30 bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
              >
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
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/50"
                  title="Trascina per ridimensionare (doppio clic per ripristinare)"
                />
              </th>

              {/* Funzione / Reparto */}
              <th
                style={{ width: `${larghezze.funzione}px`, minWidth: "100px" }}
                className="group relative bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
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
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/50"
                  title="Trascina per ridimensionare"
                />
              </th>

              {/* Ruolo Aziendale */}
              <th
                style={{ width: `${larghezze.ruolo}px`, minWidth: "100px" }}
                className="group relative bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
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
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/50"
                  title="Trascina per ridimensionare"
                />
              </th>

              {/* 9 Colonne Abilitazioni */}
              {COLONNE_ABILITAZIONI.map((col) => {
                const totaliAbilitati = dipendenti.filter((d) => haRuolo(d.id, col)).length;
                const colW = larghezze[col.id] || 110;

                return (
                  <th
                    key={col.id}
                    style={{ width: `${colW}px`, minWidth: "80px" }}
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
                        {totaliAbilitati} abilitati
                      </span>
                    </div>
                    <div
                      onMouseDown={(e) => iniziaResize(col.id, e)}
                      onDoubleClick={() => resetLarghezza(col.id)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/50"
                      title="Trascina per ridimensionare"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {listaElaborata.length === 0 ? (
              <tr>
                <td colSpan={3 + COLONNE_ABILITAZIONI.length} className="p-12 text-center text-muted-foreground">
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
                      style={{ width: `${larghezze.nome}px` }}
                      className={`sticky left-0 z-10 px-3 py-2.5 font-semibold text-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${
                        isAttiva ? "bg-emerald-500/20" : "bg-surface"
                      }`}
                    >
                      <div className="truncate">
                        {dip.cognome} {dip.nome}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">{dip.codice_fiscale}</div>
                    </td>

                    <td style={{ width: `${larghezze.funzione}px` }} className="px-3 py-2.5 text-xs text-muted-foreground">
                      <div className="truncate" title={funzione}>
                        {funzione}
                      </div>
                    </td>

                    <td style={{ width: `${larghezze.ruolo}px` }} className="px-3 py-2.5 text-xs">
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium truncate max-w-full">
                        {ruoloAziendale}
                      </span>
                    </td>

                    {COLONNE_ABILITAZIONI.map((col) => {
                      const attivo = haRuolo(dip.id, col);
                      const haAttestato = haAttestatoValido(dip.id, col);
                      const chiaveOp = `${dip.id}-${col.id}`;
                      const isBusy = inSalvataggio === chiaveOp;

                      return (
                        <td
                          key={col.id}
                          style={{ width: `${larghezze[col.id] || 110}px` }}
                          className="px-2 py-2 text-center"
                          onClick={(e) => toggleAbilitazione(dip, col, e)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={attivo}
                                onChange={() => {}}
                                className="size-4 cursor-pointer rounded accent-emerald-600"
                              />
                            )}
                            {haAttestato && (
                              <span title="Attestato presente nel sistema">
                                <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
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
            <span className="size-3 rounded border border-emerald-600 bg-emerald-600" /> Abilitato
          </span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="size-3.5 text-emerald-600" /> Attestato registrato
          </span>
          <span>Trascina le linee per regolare le colonne • Clicca per ordinare</span>
        </div>
        <div>
          Totale lavoratori: <strong>{dipendenti.length}</strong>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
