/*
 * File:          MatriceAbilitazioniRuoli.tsx
 * Percorso:      src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 20:35): Prima stesura matrice di sicurezza.
 *   - Rev 2 (2026-10-28 20:50): Ordinamento clic crescente/decrescente ed export CSV.
 *   - Rev 3 (2026-10-28 21:05): Tabella fixed con colgroup e logica fabbisogno formativo.
 *   - Rev 4 (2026-10-28 21:15): Colonne dinamiche lette dal DB (tipi_corso), wrap a capo del testo
 *     quando si stringe la colonna, spunta in alto a destra per nascondere e spunta master in cella A1.
 */
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  type Dipendente,
  type RuoloSicurezza,
  type AssegnazioneRuolo,
  type Attestato,
  type TipoCorso,
  getTipiCorso,
  impostaRuoloDipendente,
  aggiungiRuolo,
} from "@/lib/api";

type TipoOrdinamento = "asc" | "desc" | null;

const LARGHEZZA_BASE_CORSO = 130;
const LARGHEZZE_FISSE_BASE = {
  nome: 240,
  funzione: 180,
  ruolo: 160,
};

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

  // 1. Carica dinamica dei corsi dal Database
  const { data: corsiDb = [], isLoading: caricandoCorsi } = useQuery<TipoCorso[]>({
    queryKey: ["tipi-corso"],
    queryFn: getTipiCorso,
  });

  const [colonnaOrd, setColonnaOrd] = useState<string>("nome");
  const [versoOrd, setVersoOrd] = useState<TipoOrdinamento>("asc");

  // 2. Colonne nascoste con memoria in localStorage
  const [colonneNascoste, setColonneNascoste] = useState<Set<string>>(() => {
    try {
      const salvate = localStorage.getItem("matrice_colonne_nascoste_v1");
      return salvate ? new Set(JSON.parse(salvate)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("matrice_colonne_nascoste_v1", JSON.stringify([...colonneNascoste]));
    } catch {}
  }, [colonneNascoste]);

  // 3. Larghezze colonne con memoria in localStorage
  const [larghezze, setLarghezze] = useState<Record<string, number>>(() => {
    try {
      const salvate = localStorage.getItem("matrice_colonne_larghezze_v3");
      return salvate ? { ...LARGHEZZE_FISSE_BASE, ...JSON.parse(salvate) } : LARGHEZZE_FISSE_BASE;
    } catch {
      return LARGHEZZE_FISSE_BASE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("matrice_colonne_larghezze_v3", JSON.stringify(larghezze));
    } catch {}
  }, [larghezze]);

  const dragRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  function iniziaResize(id: string, larghezzaIniziale: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, startX: e.clientX, startW: larghezzaIniziale };

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
    setLarghezze((prev) => ({ ...prev, [id]: (LARGHEZZE_FISSE_BASE as Record<string, number>)[id] || LARGHEZZA_BASE_CORSO }));
  }

  // Corsi attualmente visibili
  const corsiVisibili = useMemo(() => {
    return corsiDb.filter((c) => !colonneNascoste.has(c.id));
  }, [corsiDb, colonneNascoste]);

  // Gestione visibilità colonne singole e master A1
  function toggleVisibilitaColonna(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setColonneNascoste((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMostraTutteA1() {
    if (colonneNascoste.size > 0) {
      setColonneNascoste(new Set());
      toast.success("Tutte le colonne sono ora visibili");
    } else {
      toast.info("Tutte le colonne sono già visibili");
    }
  }

  // Calcolo larghezza complessiva tabella
  const larghezzaTotale = useMemo(() => {
    const fisse =
      (larghezze["nome"] || LARGHEZZE_FISSE_BASE.nome) +
      (larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione) +
      (larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo);
    const corsi = corsiVisibili.reduce((acc, c) => acc + (larghezze[c.id] || LARGHEZZA_BASE_CORSO), 0);
    return fisse + corsi;
  }, [larghezze, corsiVisibili]);

  // Mappa ruoli catalogo
  const mappaRuoli = useMemo(() => {
    const map = new Map<string, RuoloSicurezza>();
    ruoliCatalogo.forEach((r) => map.set(r.nome.toLowerCase().trim(), r));
    return map;
  }, [ruoliCatalogo]);

  const haObbligoCorso = (dipendenteId: string, corso: TipoCorso): boolean => {
    const ruoloTrovato = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
    if (!ruoloTrovato) return false;
    if (ruoloTrovato.obbligatorio_tutti) return true;
    return assegnazioni.some((a) => a.dipendente_id === dipendenteId && a.ruolo_id === ruoloTrovato.id);
  };

  const haAttestatoCorso = (dipendenteId: string, corso: TipoCorso): boolean => {
    const cNome = corso.nome_corso.toLowerCase();
    const cCod = (corso.codice || "").toLowerCase();
    return attestati.some((att) => {
      const nomeAtt = att.tipi_corso?.nome_corso;
      if (att.dipendente_id !== dipendenteId || !nomeAtt) return false;
      const t = nomeAtt.toLowerCase();
      return (cCod && t.includes(cCod)) || t.includes(cNome);
    });
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
        comp = `${a.cognome || ""} ${a.nome || ""}`.localeCompare(`${b.cognome || ""} ${b.nome || ""}`);
      } else if (colonnaOrd === "funzione") {
        comp = (a.reparto || "").localeCompare(b.reparto || "");
      } else if (colonnaOrd === "ruolo") {
        comp = (a.classe_concorso || "").localeCompare(b.classe_concorso || "");
      } else {
        const corso = corsiDb.find((c) => c.id === colonnaOrd);
        if (corso) {
          const vA = haObbligoCorso(a.id, corso) ? 1 : 0;
          const vB = haObbligoCorso(b.id, corso) ? 1 : 0;
          comp = vA - vB;
        }
      }
      return versoOrd === "desc" ? -comp : comp;
    });
  }, [dipendenti, ricerca, colonnaOrd, versoOrd, corsiDb, mappaRuoli, assegnazioni]);

  async function toggleObbligo(dipendente: Dipendente, corso: TipoCorso, e: React.MouseEvent) {
    e.stopPropagation();
    const chiaveOp = `${dipendente.id}-${corso.id}`;
    if (inSalvataggio === chiaveOp) return;

    let ruoloTrovato = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
    if (!ruoloTrovato) {
      try {
        setInSalvataggio(chiaveOp);
        await aggiungiRuolo({
          nome: corso.nome_corso,
          macro_categoria: corso.macro_categoria || "Corsi",
          obbligatorio_tutti: false,
          ordine: ruoliCatalogo.length + 1,
        });
        await qc.invalidateQueries({ queryKey: ["ruoli-sicurezza"] });
        ruoloTrovato = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
      } catch (err) {
        toast.error("Errore inizializzazione corso", { description: (err as Error).message });
        setInSalvataggio(null);
        return;
      }
    }

    if (!ruoloTrovato || ruoloTrovato.obbligatorio_tutti) return;

    const giaObbligato = haObbligoCorso(dipendente.id, corso);
    setInSalvataggio(chiaveOp);
    try {
      await impostaRuoloDipendente(dipendente.id, ruoloTrovato.id, !giaObbligato);
      await qc.invalidateQueries({ queryKey: ["dipendenti-ruoli"] });
      toast.success(
        !giaObbligato
          ? `Obbligo aggiunto: ${corso.nome_corso} per ${dipendente.cognome} ${dipendente.nome}`
          : `Obbligo rimosso: ${corso.nome_corso} per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (err) {
      toast.error("Errore salvataggio", { description: (err as Error).message });
    } finally {
      setInSalvataggio(null);
    }
  }

  function esportaCsv() {
    const sep = ";";
    const intestazioni = [
      "Cognome e Nome",
      "Codice Fiscale",
      "Funzione / Reparto",
      "Ruolo Aziendale",
      ...corsiVisibili.map((c) => `${c.codice ? `[${c.codice}] ` : ""}${c.nome_corso}`),
    ];

    const righe = listaElaborata.map((d) => {
      const fn = [d.reparto, d.sottoreparto, d.materia].filter(Boolean).join(" - ") || "";
      const corsiVal = corsiVisibili.map((c) => {
        const ob = haObbligoCorso(d.id, c);
        const at = haAttestatoCorso(d.id, c);
        if (ob && at) return "OBBLIGATORIO (REGOLARE)";
        if (ob && !at) return "OBBLIGATORIO (DA FORMARE)";
        return "NON PREVISTO";
      });
      return [
        `"${d.cognome || ""} ${d.nome || ""}"`,
        `"${d.codice_fiscale || ""}"`,
        `"${fn.replace(/"/g, '""')}"`,
        `"${(d.classe_concorso || "Lavoratore").replace(/"/g, '""')}"`,
        ...corsiVal,
      ].join(sep);
    });

    const csvContent = "\uFEFF" + [intestazioni.join(sep), ...righe].join("\r\n");
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
    if (colonnaOrd !== id) return <ArrowUpDown className="size-3 opacity-30 group-hover:opacity-100 shrink-0" />;
    return versoOrd === "asc" ? (
      <ArrowUp className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
    ) : (
      <ArrowDown className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
    );
  }

  const tutteVisibili = colonneNascoste.size === 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Testata Superiore */}
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
                {listaElaborata.length} di {dipendenti.length} lavoratori • {corsiVisibili.length} corsi visualizzati
                {colonneNascoste.size > 0 && ` (${colonneNascoste.size} nascosti)`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {colonneNascoste.size > 0 && (
            <Button variant="outline" size="sm" onClick={toggleMostraTutteA1} className="gap-1.5 text-xs">
              <Eye className="size-3.5" /> Mostra tutte ({corsiDb.length})
            </Button>
          )}

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

      {/* Area Tabella con scorrimento orizzontale in fondo */}
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto">
        <table
          className="border-collapse text-left text-sm"
          style={{
            tableLayout: "fixed",
            width: `${larghezzaTotale}px`,
          }}
        >
          <colgroup>
            <col style={{ width: `${larghezze["nome"] || LARGHEZZE_FISSE_BASE.nome}px` }} />
            <col style={{ width: `${larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione}px` }} />
            <col style={{ width: `${larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo}px` }} />
            {corsiVisibili.map((c) => (
              <col key={c.id} style={{ width: `${larghezze[c.id] || LARGHEZZA_BASE_CORSO}px` }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm select-none">
            <tr className="divide-x divide-border">
              {/* CELLA A1: COGNOME E NOME CON SPUNTA MASTER PER MOSTRARE TUTTO */}
              <th className="group relative sticky left-0 z-30 bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)] align-top">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex flex-1 cursor-pointer items-center justify-between gap-1"
                    onClick={() => handleOrdina("nome")}
                  >
                    <span className="truncate">Cognome e Nome</span>
                    {renderFreccia("nome")}
                  </div>

                  {/* SPUNTA MASTER CELLA A1 */}
                  <input
                    type="checkbox"
                    checked={tutteVisibili}
                    onChange={toggleMostraTutteA1}
                    className="size-4 cursor-pointer rounded accent-emerald-600 mt-0.5"
                    title={
                      tutteVisibili
                        ? "Tutte le colonne dei corsi sono visibili"
                        : "Clicca per mostrare tutte le colonne nascoste"
                    }
                  />
                </div>

                <div
                  onMouseDown={(e) => iniziaResize("nome", larghezze["nome"] || LARGHEZZE_FISSE_BASE.nome, e)}
                  onDoubleClick={() => resetLarghezza("nome")}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                  title="Trascina per ridimensionare (doppio clic per ripristinare)"
                />
              </th>

              {/* FUNZIONE / REPARTO */}
              <th className="group relative bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground align-top">
                <div
                  className="flex cursor-pointer items-center justify-between gap-1"
                  onClick={() => handleOrdina("funzione")}
                >
                  <span className="truncate">Funzione / Reparto</span>
                  {renderFreccia("funzione")}
                </div>
                <div
                  onMouseDown={(e) => iniziaResize("funzione", larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione, e)}
                  onDoubleClick={() => resetLarghezza("funzione")}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                  title="Trascina per ridimensionare"
                />
              </th>

              {/* RUOLO AZIENDALE */}
              <th className="group relative bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground align-top">
                <div
                  className="flex cursor-pointer items-center justify-between gap-1"
                  onClick={() => handleOrdina("ruolo")}
                >
                  <span className="truncate">Ruolo Aziendale</span>
                  {renderFreccia("ruolo")}
                </div>
                <div
                  onMouseDown={(e) => iniziaResize("ruolo", larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo, e)}
                  onDoubleClick={() => resetLarghezza("ruolo")}
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                  title="Trascina per ridimensionare"
                />
              </th>

              {/* COLONNE CORSI DINAMICHE DAL DATABASE */}
              {corsiVisibili.map((c) => {
                const conObbligo = dipendenti.filter((d) => haObbligoCorso(d.id, c)).length;
                const larghCol = larghezze[c.id] || LARGHEZZA_BASE_CORSO;

                return (
                  <th
                    key={c.id}
                    className="group relative bg-surface px-2 py-2 text-center text-xs font-bold tracking-tight text-foreground align-top"
                  >
                    {/* Spunta in alto a destra per nascondere la colonna */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {conObbligo} obbl.
                      </span>
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => {}}
                        onClick={(e) => toggleVisibilitaColonna(c.id, e)}
                        className="size-3.5 cursor-pointer rounded accent-emerald-600"
                        title="Togli la spunta per nascondere questa colonna"
                      />
                    </div>

                    {/* Testo dell'intestazione con WORD-WRAP dinamico se si stringe */}
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center gap-0.5 text-center whitespace-normal break-words leading-tight"
                      onClick={() => handleOrdina(c.id)}
                    >
                      {c.codice && (
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {c.codice}
                        </span>
                      )}
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-xs leading-tight">{c.nome_corso}</span>
                        {renderFreccia(c.id)}
                      </div>
                    </div>

                    <div
                      onMouseDown={(e) => iniziaResize(c.id, larghCol, e)}
                      onDoubleClick={() => resetLarghezza(c.id)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-emerald-500/60"
                      title="Trascina per allargare o stringere"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {listaElaborata.length === 0 ? (
              <tr>
                <td colSpan={3 + corsiVisibili.length} className="p-12 text-center text-muted-foreground">
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

                    {/* Caselle di spunta corsi dal DB */}
                    {corsiVisibili.map((c) => {
                      const obbligato = haObbligoCorso(dip.id, c);
                      const haAttestato = haAttestatoCorso(dip.id, c);
                      const chiaveOp = `${dip.id}-${c.id}`;
                      const isBusy = inSalvataggio === chiaveOp;

                      return (
                        <td
                          key={c.id}
                          className="px-2 py-2 text-center"
                          onClick={(e) => toggleObbligo(dip, c, e)}
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
                                    ? "Corso obbligatorio (clicca per rimuovere l'obbligo)"
                                    : "Clicca per rendere obbligatorio questo corso"
                                }
                              />
                            )}

                            {obbligato && haAttestato && (
                              <span title="Regolare: corso svolto con attestato valido">
                                <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              </span>
                            )}
                            {obbligato && !haAttestato && (
                              <span title="Obbligatorio ma attestato non registrato (da formare)">
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

      {/* Didascalia inferiore */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-surface px-6 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-emerald-600 bg-emerald-600" /> Obbligo assegnato
          </span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="size-3.5 text-emerald-600" /> In regola (attestato valido)
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-amber-500" /> Da formare
          </span>
          <span>Spunta in A1 per mostrare tutte • Spunta su colonna per nascondere</span>
        </div>
        <div>
          Totale lavoratori: <strong>{dipendenti.length}</strong>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
