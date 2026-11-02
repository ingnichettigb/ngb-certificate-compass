/*
 * File:          MatriceAbilitazioniRuoli.tsx
 * Percorso:      src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 20:35): Prima stesura matrice di sicurezza.
 *   - Rev 2 (2026-10-28 20:50): Ordinamento clic crescente/decrescente ed export CSV.
 *   - Rev 3 (2026-10-28 21:05): Tabella fixed con colgroup e logica fabbisogno formativo.
 *   - Rev 4 (2026-10-28 21:15): Colonne dinamiche lette dal DB (tipi_corso), wrap a capo del testo.
 *   - Rev 5 (2026-10-30 20:25): Dicitura completa Funzione / Reparto (Docente - [Classe] - [Materia]).
 *   - Rev 6 (2026-10-30 20:28): Ripristino compilazione con impostaRuoloDipendente.
 *   - Rev 7 (2026-11-01 21:40): Filtro pillole per macro-gruppo corso e selettore a 3 stati lavoratori.
 *   - Rev 8 (2026-11-01 21:55): Navigazione alfabetica rapida: salto da tastiera e barre alfabetiche.
 *   - Rev 9 (2026-11-02 10:25): Assegnazione ruoli da matrice: risoluzione automatica ruolo-corso con mappatura-ruoli-corsi,
 *     colonna ruoli con badge sicurezza e sincronizzazione istantanea con dipendenti_ruoli.
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
  CHIAVE_RUOLI,
  CHIAVE_ASSEGNAZIONI_RUOLI,
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
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { BarraFiltriGruppo, type FiltroStatoLavoratori } from "./BarraFiltriGruppo";
import { BarraAlfabeticaOrizzontale, BarraAlfabeticaVerticale } from "./BarraAlfabeticaMatrice";
import {
  trovaRuoloPerCorso,
  trovaRuoloPerChiaveGruppo,
  isCorsoObbligatorioPerDipendente,
  ruoliSicurezzaAssegnati,
} from "./mappatura-ruoli-corsi";

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
  ruolo: 160,
  corso: 120,
};

export function MatriceAbilitazioniRuoli({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [ricerca, setRicerca] = useState("");
  const [colonnaOrd, setColonnaOrd] = useState<string>("nominativo");
  const [direzioneOrd, setDirezioneOrd] = useState<TipoOrdinamento>("asc");
  const [rigaSelezionata, setRigaSelezionata] = useState<string | null>(null);

  // Filtro macro-gruppo corso (colonne) e selettore a 3 stati (righe lavoratori)
  const [gruppoSelezionato, setGruppoSelezionato] = useState<string | null>(null);
  const [filtroStatoLavoratori, setFiltroStatoLavoratori] = useState<FiltroStatoLavoratori>("tutti");

  // Riferimento al contenitore per lo scorrimento
  const contenitoreTabellaRef = useRef<HTMLDivElement>(null);

  // Persistenza larghezze colonne
  const [larghezze, setLarghezze] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(CHIAVE_LARGHEZZE);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persistenza colonne nascoste (id dei corsi)
  const [corsiNascosti, setCorsiNascosti] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CHIAVE_NASCOSTI);
      return saved ? JSON.parse(saved) : [];
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
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
  });

  const { data: assegnazioni = [] } = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
  });

  const corsiCatalogo = useMemo(() => {
    return [...tipiCorso].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));
  }, [tipiCorso]);

  // Conteggio corsi per gruppo
  const conteggiCorsiPerGruppo = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corsiCatalogo) {
      const g = assegnaGruppoArgomento(c);
      counts[g.chiave] = (counts[g.chiave] || 0) + 1;
    }
    return counts;
  }, [corsiCatalogo]);

  // Corsi filtrati per gruppo argomento (colonne)
  const corsiFiltratiPerGruppo = useMemo(() => {
    if (!gruppoSelezionato) return corsiCatalogo;
    return corsiCatalogo.filter((c) => assegnaGruppoArgomento(c).chiave === gruppoSelezionato);
  }, [corsiCatalogo, gruppoSelezionato]);

  const corsiVisibili = useMemo(() => {
    return corsiFiltratiPerGruppo.filter((c) => !corsiNascosti.includes(c.id));
  }, [corsiFiltratiPerGruppo, corsiNascosti]);

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
    return isCorsoObbligatorioPerDipendente(dipendenteId, corso, ruoli, mappaAssegnazioni);
  }

  function haAttestatoCorso(dipendenteId: string, corso: TipoCorso): boolean {
    const set = mappaAttestatiValidi.get(dipendenteId);
    return set ? set.has(corso.id) : false;
  }

  function haObbligoNelGruppo(dipendenteId: string, gruppoChiave: string): boolean {
    const ruoloDelGruppo = trovaRuoloPerChiaveGruppo(gruppoChiave, ruoli);
    if (ruoloDelGruppo && (ruoloDelGruppo.obbligatorio_tutti || mappaAssegnazioni.has(`${dipendenteId}_${ruoloDelGruppo.id}`))) {
      return true;
    }
    const corsiDelGruppo = corsiCatalogo.filter((c) => assegnaGruppoArgomento(c).chiave === gruppoChiave);
    return corsiDelGruppo.some((c) => haObbligoCorso(dipendenteId, c));
  }

  function handleCambiaGruppo(chiave: string | null) {
    setGruppoSelezionato(chiave);
    setFiltroStatoLavoratori("tutti");
  }

  async function handleToggleObbligo(dipendente: Dipendente, corso: TipoCorso) {
    const ruolo = trovaRuoloPerCorso(corso, ruoli);
    if (!ruolo) {
      toast.error(`Nessun ruolo di sicurezza censito per "${corso.nome_corso}"`);
      return;
    }

    const giaAssegnato = mappaAssegnazioni.has(`${dipendente.id}_${ruolo.id}`);
    const nuovoStato = !giaAssegnato;

    try {
      await impostaRuoloDipendente(dipendente.id, ruolo.id, nuovoStato);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
        queryClient.invalidateQueries({ queryKey: CHIAVE_RUOLI }),
      ]);
      toast.success(
        nuovoStato
          ? `Ruolo "${ruolo.nome}" assegnato a ${dipendente.cognome} ${dipendente.nome}`
          : `Ruolo "${ruolo.nome}" rimosso per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  }

  const conteggiLavoratori = useMemo(() => {
    const attivi = dipendenti.filter((d) => d.stato_lavoratore !== "cessato");
    if (!gruppoSelezionato) {
      return { tutti: attivi.length, assegnati: 0, senza: 0 };
    }
    let assegnati = 0;
    for (const d of attivi) {
      if (haObbligoNelGruppo(d.id, gruppoSelezionato)) {
        assegnati++;
      }
    }
    return {
      tutti: attivi.length,
      assegnati,
      senza: attivi.length - assegnati,
    };
  }, [dipendenti, gruppoSelezionato, corsiCatalogo, ruoli, mappaAssegnazioni]);

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
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: currentWidth,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const newWidth = Math.max(70, resizingRef.current.startWidth + diff);
      setLarghezze((prev) => {
        const next = { ...prev, [resizingRef.current!.colKey]: newWidth };
        localStorage.setItem(CHIAVE_LARGHEZZE, JSON.stringify(next));
        return next;
      });
    }

    function onMouseUp() {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function resetLarghezza(colKey: string) {
    setLarghezze((prev) => {
      const next = { ...prev };
      delete next[colKey];
      localStorage.setItem(CHIAVE_LARGHEZZE, JSON.stringify(next));
      return next;
    });
  }

  function handleOrdina(colKey: string) {
    if (colonnaOrd === colKey) {
      if (direzioneOrd === "asc") setDirezioneOrd("desc");
      else if (direzioneOrd === "desc") setDirezioneOrd("none");
      else setDirezioneOrd("asc");
    } else {
      setColonnaOrd(colKey);
      setDirezioneOrd("asc");
    }
  }

  function renderFreccia(colKey: string) {
    if (colonnaOrd !== colKey || direzioneOrd === "none") {
      return <ArrowUpDown className="size-3 text-muted-foreground/40 ml-1 inline" />;
    }
    return direzioneOrd === "asc" ? (
      <ArrowUp className="size-3 text-primary ml-1 inline" />
    ) : (
      <ArrowDown className="size-3 text-primary ml-1 inline" />
    );
  }

  const listaElaborata = useMemo(() => {
    let res = dipendenti.filter((d) => d.stato_lavoratore !== "cessato");

    if (gruppoSelezionato && filtroStatoLavoratori !== "tutti") {
      res = res.filter((d) => {
        const haIncarico = haObbligoNelGruppo(d.id, gruppoSelezionato);
        return filtroStatoLavoratori === "solo_assegnati" ? haIncarico : !haIncarico;
      });
    }

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
          const rA = ruoliSicurezzaAssegnati(a.id, ruoli, mappaAssegnazioni).map((r) => r.nome).join(", ");
          const rB = ruoliSicurezzaAssegnati(b.id, ruoli, mappaAssegnazioni).map((r) => r.nome).join(", ");
          comp = (rA || a.classe_concorso || "Lavoratore").localeCompare(rB || b.classe_concorso || "Lavoratore");
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
  }, [
    dipendenti,
    ricerca,
    colonnaOrd,
    direzioneOrd,
    gruppoSelezionato,
    filtroStatoLavoratori,
    corsiCatalogo,
    ruoli,
    mappaAssegnazioni,
  ]);

  // Set di lettere presenti per abilitare i pulsanti delle barre alfabetiche
  const letterePresenti = useMemo(() => {
    const set = new Set<string>();
    for (const d of listaElaborata) {
      const iniziale = (d.cognome || "").trim().charAt(0).toUpperCase();
      if (iniziale >= "A" && iniziale <= "Z") {
        set.add(iniziale);
      }
    }
    return set;
  }, [listaElaborata]);

  // Funzione per scorrere al primo lavoratore con la lettera selezionata
  function saltaALettera(lettera: string) {
    const target = listaElaborata.find((d) => (d.cognome || "").trim().toUpperCase().startsWith(lettera));
    if (!target) return;

    setRigaSelezionata(target.id);
    const elem = document.getElementById(`riga-dipendente-${target.id}`);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleEsportaCsv() {
    const sep = ";";
    const intestazioni = [
      "Nominativo",
      "Codice Fiscale",
      "Funzione / Reparto",
      "Ruolo di Sicurezza",
      ...corsiVisibili.map((c) => `"${(c.codice ? `[${c.codice}] ` : "") + c.nome_corso}"`),
    ];

    const righe = listaElaborata.map((d) => {
      const fn = [d.reparto, d.sottoreparto, d.classe_concorso, d.materia].filter(Boolean).join(" - ") || "";
      const ruoliTxt = ruoliSicurezzaAssegnati(d.id, ruoli, mappaAssegnazioni).map((r) => r.nome).join("; ") || (d.classe_concorso || "Lavoratore");
      const corsiVal = corsiVisibili.map((c) => {
        const ob = haObbligoCorso(d.id, c);
        const fatto = haAttestatoCorso(d.id, c);
        if (!ob) return '"Non previsto"';
        return fatto ? '"In regola"' : '"Da svolgere"';
      });
      return [
        `"${d.cognome || ""} ${d.nome || ""}"`,
        `"${d.codice_fiscale || ""}"`,
        `"${fn.replace(/"/g, '""')}"`,
        `"${ruoliTxt.replace(/"/g, '""')}"`,
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
      if (e.key === "Escape") {
        onClose();
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        saltaALettera(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, listaElaborata]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in-0 duration-150"
    >
      {/* Intestazione */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Torna a Dipendenti
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Piano Fabbisogno Formativo e Ruoli
            </h1>
            <p className="text-xs text-muted-foreground">
              {listaElaborata.length} lavoratori attivi • Clicca sulle caselle per assegnare o togliere il ruolo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca per nominativo, CF, reparto..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEsportaCsv}
            className="h-8 gap-1.5 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          >
            <Download className="size-3.5" /> Esporta CSV
          </Button>
        </div>
      </header>

      {/* Barra Filtri Macro-Gruppi Corsi e Selettore Lavoratori */}
      <BarraFiltriGruppo
        gruppoSelezionato={gruppoSelezionato}
        onSelezionaGruppo={handleCambiaGruppo}
        filtroStato={filtroStatoLavoratori}
        onChangeFiltroStato={setFiltroStatoLavoratori}
        conteggiCorsiPerGruppo={conteggiCorsiPerGruppo}
        totaleCorsi={corsiCatalogo.length}
        conteggiLavoratori={conteggiLavoratori}
      />

      {/* Barra Alfabetica Orizzontale */}
      <BarraAlfabeticaOrizzontale
        letterePresenti={letterePresenti}
        onSelezionaLettera={saltaALettera}
      />

      {/* Corpo Principale Tabella con Barra Alfabetica Verticale */}
      <main className="flex-1 relative flex overflow-hidden">
        <BarraAlfabeticaVerticale
          letterePresenti={letterePresenti}
          onSelezionaLettera={saltaALettera}
        />

        <div ref={contenitoreTabellaRef} className="flex-1 overflow-auto bg-background">
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
                {/* Colonna Nominativo con master checkbox */}
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
                  const ruoliDelDip = ruoliSicurezzaAssegnati(dip.id, ruoli, mappaAssegnazioni);
                  const ruoliSpecifici = ruoliDelDip.filter((r) => !r.obbligatorio_tutti && r.nome.toLowerCase() !== "lavoratore");

                  return (
                    <tr
                      key={dip.id}
                      id={`riga-dipendente-${dip.id}`}
                      data-lettera={(dip.cognome || "").trim().charAt(0).toUpperCase()}
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

                        return (
                          <td
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleObbligo(dip, c);
                            }}
                            className="px-2 py-2 text-center select-none hover:bg-primary/10 transition-colors"
                            title={
                              ruoloCollegato
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
          <span>Tasti A-Z o clic sull'indice per scorrere rapidamente al cognome</span>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
