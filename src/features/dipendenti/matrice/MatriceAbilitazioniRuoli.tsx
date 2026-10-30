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
 *   - Rev 5 (2026-10-30 20:25): Dicitura completa Funzione / Reparto (Docente - [Classe] - [Materia]),
 *     larghezza base aumentata e ordinamento/export allineati.
 *   - Rev 6 (2026-10-30 20:28): Ripristino compilazione: salvataggio obblighi con impostaRuoloDipendente,
 *     query attestati senza filtro, filtro cessati su stato_lavoratore.
 */
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDipendenti,
  getTipiCorso,
  getAttestati,
  getRuoliSicurezza,
  getAssegnazioniRuoli,
  impostaRuoloDipendente,
  type Dipendente,
  type TipoCorso,
  type Attestato,
  type RuoloSicurezza,
  type AssegnazioneRuolo,
} from "@/lib/api";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  Check,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

type TipoOrdinamento = "asc" | "desc" | "none";

const CHIAVE_LARGHEZZE = "matrice_sicurezza_larghezze_v2";
const CHIAVE_NASCOSTI = "matrice_sicurezza_corsi_nascosti_v2";

const LARGHEZZE_FISSE_BASE = {
  nominativo: 220,
  funzione: 240,
  ruolo: 130,
  corso: 120,
};

export function MatriceAbilitazioniRuoli({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [ricerca, setRicerca] = useState("");
  const [rigaSelezionata, setRigaSelezionata] = useState<string | null>(null);

  const [colonnaOrd, setColonnaOrd] = useState<string | null>("nominativo");
  const [direzioneOrd, setDirezioneOrd] = useState<TipoOrdinamento>("asc");

  const [larghezze, setLarghezze] = useState<Record<string, number>>(() => {
    try {
      const salvate = localStorage.getItem(CHIAVE_LARGHEZZE);
      return salvate ? JSON.parse(salvate) : {};
    } catch {
      return {};
    }
  });

  const [corsiNascosti, setCorsiNascosti] = useState<string[]>(() => {
    try {
      const salvati = localStorage.getItem(CHIAVE_NASCOSTI);
      return salvati ? JSON.parse(salvati) : [];
    } catch {
      return [];
    }
  });

  const resizingRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
  });

  const { data: tipiCorso = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });

  const { data: attestati = [] } = useQuery({
    queryKey: ["attestati"],
    queryFn: () => getAttestati(),
  });

  const { data: ruoli = [] } = useQuery({
    queryKey: ["ruoli_sicurezza"],
    queryFn: getRuoliSicurezza,
  });

  const { data: assegnazioni = [] } = useQuery({
    queryKey: ["assegnazioni_ruoli"],
    queryFn: getAssegnazioniRuoli,
  });

  const corsiCatalogo = useMemo(() => {
    return [...tipiCorso].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));
  }, [tipiCorso]);

  const corsiVisibili = useMemo(() => {
    return corsiCatalogo.filter((c) => !corsiNascosti.includes(c.id));
  }, [corsiCatalogo, corsiNascosti]);

  const tuttiVisibili = corsiNascosti.length === 0;

  function toggleNascondiTutti() {
    if (tuttiVisibili) {
      const tuttiIds = corsiCatalogo.map((c) => c.id);
      setCorsiNascosti(tuttiIds);
      localStorage.setItem(CHIAVE_NASCOSTI, JSON.stringify(tuttiIds));
      toast.info("Tutte le colonne dei corsi sono state nascoste");
    } else {
      setCorsiNascosti([]);
      localStorage.removeItem(CHIAVE_NASCOSTI);
      toast.success("Tutte le colonne dei corsi sono ora visibili");
    }
  }

  function toggleVisibilitaCorso(corsoId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCorsiNascosti((prev) => {
      const next = prev.includes(corsoId) ? prev.filter((id) => id !== corsoId) : [...prev, corsoId];
      localStorage.setItem(CHIAVE_NASCOSTI, JSON.stringify(next));
      return next;
    });
  }

  const mappaRuoliPerNome = useMemo(() => {
    const map = new Map<string, RuoloSicurezza>();
    for (const r of ruoli) {
      map.set(r.nome.toLowerCase().trim(), r);
    }
    return map;
  }, [ruoli]);

  const mappaAssegnazioni = useMemo(() => {
    const set = new Set<string>();
    for (const a of assegnazioni) {
      set.add(`${a.dipendente_id}_${a.ruolo_id}`);
    }
    return set;
  }, [assegnazioni]);

  const mappaAttestatiValidi = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const att of attestati) {
      if (att.stato_validazione !== "Approvato" && att.stato_validazione !== "In attesa") continue;
      if (!att.dipendente_id || !att.tipo_corso_id) continue;
      if (!map.has(att.dipendente_id)) {
        map.set(att.dipendente_id, new Set());
      }
      map.get(att.dipendente_id)!.add(att.tipo_corso_id);
    }
    return map;
  }, [attestati]);

  function haObbligoCorso(dipendenteId: string, corso: TipoCorso): boolean {
    const ruoloCorrispondente = mappaRuoliPerNome.get(corso.nome_corso.toLowerCase().trim());
    if (!ruoloCorrispondente) return false;
    return mappaAssegnazioni.has(`${dipendenteId}_${ruoloCorrispondente.id}`);
  }

  function haAttestatoCorso(dipendenteId: string, corso: TipoCorso): boolean {
    const set = mappaAttestatiValidi.get(dipendenteId);
    return set ? set.has(corso.id) : false;
  }

  async function handleToggleObbligo(dipendente: Dipendente, corso: TipoCorso) {
    let ruolo = mappaRuoliPerNome.get(corso.nome_corso.toLowerCase().trim());
    if (!ruolo) {
      toast.error(`Nessun ruolo di sicurezza censito per "${corso.nome_corso}"`);
      return;
    }

    const giaAssegnato = mappaAssegnazioni.has(`${dipendente.id}_${ruolo.id}`);
    const nuovoStato = !giaAssegnato;

    try {
      await impostaRuoloDipendente(dipendente.id, ruolo.id, nuovoStato);
      await queryClient.invalidateQueries({ queryKey: ["assegnazioni_ruoli"] });
      toast.success(
        nuovoStato
          ? `Obbligo "${corso.nome_corso}" assegnato a ${dipendente.cognome}`
          : `Obbligo rimosso per ${dipendente.cognome}`,
      );
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  }

  const larghezzaTotaleTabella = useMemo(() => {
    let tot =
      (larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo) +
      (larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione) +
      (larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo);
    for (const c of corsiVisibili) {
      tot += larghezze[c.id] || LARGHEZZE_FISSE_BASE.corso;
    }
    return Math.max(tot, 1100);
  }, [larghezze, corsiVisibili]);

  function iniziaResize(colKey: string, currentWidth: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: currentWidth,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const nuova = Math.max(70, resizingRef.current.startWidth + delta);
      setLarghezze((prev) => {
        const aggiornate = { ...prev, [resizingRef.current!.colKey]: nuova };
        return aggiornate;
      });
    }

    function onMouseUp() {
      if (resizingRef.current) {
        setLarghezze((prev) => {
          localStorage.setItem(CHIAVE_LARGHEZZE, JSON.stringify(prev));
          return prev;
        });
      }
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function resetLarghezza(colKey: string) {
    setLarghezze((prev) => {
      const copia = { ...prev };
      delete copia[colKey];
      localStorage.setItem(CHIAVE_LARGHEZZE, JSON.stringify(copia));
      return copia;
    });
  }

  function handleOrdina(colonna: string) {
    if (colonnaOrd !== colonna) {
      setColonnaOrd(colonna);
      setDirezioneOrd("asc");
    } else if (direzioneOrd === "asc") {
      setDirezioneOrd("desc");
    } else {
      setColonnaOrd(null);
      setDirezioneOrd("none");
    }
  }

  const listaElaborata = useMemo(() => {
    let res = dipendenti.filter((d) => d.stato_lavoratore !== "cessato");

    if (ricerca.trim()) {
      const q = ricerca.toLowerCase().trim();
      res = res.filter(
        (d) =>
          d.cognome.toLowerCase().includes(q) ||
          d.nome.toLowerCase().includes(q) ||
          d.codice_fiscale.toLowerCase().includes(q) ||
          (d.reparto && d.reparto.toLowerCase().includes(q)) ||
          (d.materia && d.materia.toLowerCase().includes(q)) ||
          (d.classe_concorso && d.classe_concorso.toLowerCase().includes(q)),
      );
    }

    if (colonnaOrd && direzioneOrd !== "none") {
      res = [...res].sort((a, b) => {
        let comp = 0;
        if (colonnaOrd === "nominativo") {
          const nomA = `${a.cognome} ${a.nome}`.toLowerCase();
          const nomB = `${b.cognome} ${b.nome}`.toLowerCase();
          comp = nomA.localeCompare(nomB);
        } else if (colonnaOrd === "funzione") {
          const fnA = [a.reparto, a.sottoreparto, a.classe_concorso, a.materia].filter(Boolean).join(" - ").toLowerCase();
          const fnB = [b.reparto, b.sottoreparto, b.classe_concorso, b.materia].filter(Boolean).join(" - ").toLowerCase();
          comp = fnA.localeCompare(fnB);
        } else if (colonnaOrd === "ruolo") {
          comp = (a.classe_concorso || "Lavoratore").localeCompare(b.classe_concorso || "Lavoratore");
        } else {
          const c = corsiCatalogo.find((x) => x.id === colonnaOrd);
          if (c) {
            const obA = haObbligoCorso(a.id, c) ? 1 : 0;
            const obB = haObbligoCorso(b.id, c) ? 1 : 0;
            comp = obA - obB;
          }
        }
        return direzioneOrd === "asc" ? comp : -comp;
      });
    }

    return res;
  }, [dipendenti, ricerca, colonnaOrd, direzioneOrd, corsiCatalogo, mappaRuoliPerNome, mappaAssegnazioni]);

  function renderFreccia(colonna: string) {
    if (colonnaOrd !== colonna) return <ArrowUpDown className="size-3 text-muted-foreground/60 inline ml-1" />;
    if (direzioneOrd === "asc") return <ArrowUp className="size-3 text-primary inline ml-1 font-bold" />;
    return <ArrowDown className="size-3 text-primary inline ml-1 font-bold" />;
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
      const fn = [d.reparto, d.sottoreparto, d.classe_concorso, d.materia].filter(Boolean).join(" - ") || "";
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
    const now = new Date();
    const dataFmt = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    a.download = `030ArchAttestati_PianoFabbisognoCorsi_${dataFmt}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Esportazione completata");
  }

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex h-screen w-screen flex-col bg-background text-foreground animate-in fade-in duration-150"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3.5 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            className="border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all font-semibold px-4"
          >
            <ArrowLeft className="size-4 mr-2" /> Torna
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                Piano Fabbisogno Formativo e Ruoli
              </h1>
              <p className="text-xs text-muted-foreground">
                {listaElaborata.length} di {dipendenti.length} lavoratori · {corsiVisibili.length} corsi visualizzati
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca lavoratore..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleNascondiTutti}
            className="h-9 border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs"
            title={tuttiVisibili ? "Nascondi tutte le colonne dei corsi" : "Mostra tutte le colonne dei corsi"}
          >
            {tuttiVisibili ? <EyeOff className="size-3.5 mr-1.5" /> : <Eye className="size-3.5 mr-1.5" />}
            {tuttiVisibili ? "Nascondi corsi" : "Mostra tutti i corsi"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={esportaCsv}
            className="h-9 border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold"
          >
            <Download className="size-3.5 mr-1.5" /> Esporta CSV
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/20 p-4">
        <div className="rounded-xl border border-border bg-surface shadow-sm inline-block min-w-full">
          <table
            className="border-collapse text-left text-xs"
            style={{ tableLayout: "fixed", width: `${larghezzaTotaleTabella}px` }}
          >
            <colgroup>
              <col style={{ width: `${larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo}px` }} />
              <col style={{ width: `${larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione}px` }} />
              <col style={{ width: `${larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo}px` }} />
              {corsiVisibili.map((c) => (
                <col key={c.id} style={{ width: `${larghezze[c.id] || LARGHEZZE_FISSE_BASE.corso}px` }} />
              ))}
            </colgroup>

            <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur border-b border-border shadow-sm">
              <tr className="divide-x divide-border">
                {/* Colonna Nominativo con pulsante A1 master */}
                <th
                  className="sticky left-0 z-30 bg-muted/95 px-3 py-2.5 font-bold text-foreground select-none relative group"
                  style={{ width: `${larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo}px` }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => handleOrdina("nominativo")}
                      className="cursor-pointer hover:text-primary transition-colors flex items-center"
                    >
                      COGNOME E NOME {renderFreccia("nominativo")}
                    </span>

                    <button
                      type="button"
                      onClick={toggleNascondiTutti}
                      title={tuttiVisibili ? "Nascondi tutte le colonne dei corsi" : "Mostra tutte le colonne dei corsi"}
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
                    onMouseDown={(e) => iniziaResize("nominativo", larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo, e)}
                    onDoubleClick={() => resetLarghezza("nominativo")}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
                  />
                </th>

                {/* Colonna Funzione / Reparto */}
                <th
                  className="px-3 py-2.5 font-bold text-foreground select-none relative group"
                  style={{ width: `${larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione}px` }}
                >
                  <div
                    onClick={() => handleOrdina("funzione")}
                    className="cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
                  >
                    <span>FUNZIONE / REPARTO</span>
                    {renderFreccia("funzione")}
                  </div>
                  <div
                    onMouseDown={(e) => iniziaResize("funzione", larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione, e)}
                    onDoubleClick={() => resetLarghezza("funzione")}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
                  />
                </th>

                {/* Colonna Ruolo */}
                <th
                  className="px-3 py-2.5 font-bold text-foreground select-none relative group"
                  style={{ width: `${larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo}px` }}
                >
                  <div
                    onClick={() => handleOrdina("ruolo")}
                    className="cursor-pointer hover:text-primary transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">RUOLO</span>
                    {renderFreccia("ruolo")}
                  </div>
                  <div
                    onMouseDown={(e) => iniziaResize("ruolo", larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo, e)}
                    onDoubleClick={() => resetLarghezza("ruolo")}
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
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{c.codice || "CORSO"}</span>
                        <button
                          type="button"
                          onClick={(e) => toggleVisibilitaCorso(c.id, e)}
                          title="Nascondi questa colonna"
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          <EyeOff className="size-3" />
                        </button>
                      </div>

                      <div
                        onClick={() => handleOrdina(c.id)}
                        className="cursor-pointer hover:text-primary transition-colors leading-tight break-words text-[11px]"
                        title={c.nome_corso}
                      >
                        {c.nome_corso} {renderFreccia(c.id)}
                      </div>

                      <div
                        onMouseDown={(e) => iniziaResize(c.id, w, e)}
                        onDoubleClick={() => resetLarghezza(c.id)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30 transition-colors"
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
                  const funzione = [dip.reparto, dip.sottoreparto, dip.classe_concorso, dip.materia].filter(Boolean).join(" - ") || "—";
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

                      {corsiVisibili.map((c) => {
                        const obbligatorio = haObbligoCorso(dip.id, c);
                        const fatto = haAttestatoCorso(dip.id, c);

                        return (
                          <td
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleObbligo(dip, c);
                            }}
                            className="px-2 py-2 text-center select-none hover:bg-primary/10 transition-colors"
                            title={`Clicca per cambiare obbligo: ${c.nome_corso}`}
                          >
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                className={`size-5 rounded border flex items-center justify-center transition-all ${
                                  obbligatorio
                                    ? fatto
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                      : "bg-amber-500/20 border-amber-600 text-amber-700 dark:text-amber-400 font-bold"
                                    : "border-muted-foreground/30 hover:border-primary/60"
                                }`}
                              >
                                {obbligatorio && (fatto ? <Check className="size-3.5 stroke-[3]" /> : "!")}
                              </button>
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
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-6 py-2.5 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded bg-emerald-600 inline-block text-white text-[9px] font-bold text-center leading-3">
              ✓
            </span>
            <span>Obbligatorio (regolare con attestato)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded bg-amber-500/30 border border-amber-600 inline-block text-amber-700 dark:text-amber-400 text-[10px] font-bold text-center leading-3">
              !
            </span>
            <span>Fabbisogno formativo da svolgere</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded border border-muted-foreground/30 inline-block" />
            <span>Non previsto per questa figura</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Clicca sulle celle per attivare/disattivare l'obbligo</span>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
