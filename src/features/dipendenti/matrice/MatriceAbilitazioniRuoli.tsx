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
 *   - Rev 9 (2026-11-02 10:25): Assegnazione ruoli da matrice: risoluzione automatica ruolo-corso con mappatura-ruoli-corsi.
 *   - Rev 10 (2026-11-02 10:48): Passaggio dipendenti={listaElaborata} alle barre alfabetiche per conteggio e protezione runtime.
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 *   - Rev 11 (2026-11-07): Diviso in file per responsabilità (useDatiMatrice, useColonneMatrice, matrice-lista, esporta-matrice-csv e sottocomponenti). Nessun cambio di comportamento.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { BarraFiltriGruppo, type FiltroStatoLavoratori } from "./BarraFiltriGruppo";
import { BarraAlfabeticaOrizzontale, BarraAlfabeticaVerticale } from "./BarraAlfabeticaMatrice";
import { IntestazioneMatrice } from "./IntestazioneMatrice";
import { TestataTabellaMatrice } from "./TestataTabellaMatrice";
import { RigaLavoratoreMatrice } from "./RigaLavoratoreMatrice";
import { LegendaMatrice } from "./LegendaMatrice";
import { LARGHEZZE_FISSE_BASE, type TipoOrdinamento } from "./matrice-costanti";
import { elaboraListaMatrice } from "./matrice-lista";
import { esportaMatriceCsv } from "./esporta-matrice-csv";
import { useDatiMatrice } from "./useDatiMatrice";
import { useColonneMatrice } from "./useColonneMatrice";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MatriceAbilitazioniRuoli({ open, onClose }: Props) {
  const [ricerca, setRicerca] = useState("");
  const [colonnaOrd, setColonnaOrd] = useState<string>("nominativo");
  const [direzioneOrd, setDirezioneOrd] = useState<TipoOrdinamento>("asc");
  const [rigaSelezionata, setRigaSelezionata] = useState<string | null>(null);

  // Filtro macro-gruppo corso (colonne) e selettore a 3 stati (righe lavoratori)
  const [gruppoSelezionato, setGruppoSelezionato] = useState<string | null>(null);
  const [filtroStatoLavoratori, setFiltroStatoLavoratori] = useState<FiltroStatoLavoratori>("tutti");

  // Riferimento al contenitore per lo scorrimento
  const contenitoreTabellaRef = useRef<HTMLDivElement>(null);

  const {
    dipendenti,
    ruoli,
    corsiCatalogo,
    conteggiCorsiPerGruppo,
    mappaAssegnazioni,
    haObbligoCorso,
    motivoEsenzione,
    haAttestatoCorso,
    haObbligoNelGruppo,
    handleToggleObbligo,
  } = useDatiMatrice();

  // Corsi filtrati per gruppo argomento (colonne)
  const corsiFiltratiPerGruppo = useMemo(() => {
    if (!gruppoSelezionato) return corsiCatalogo;
    return corsiCatalogo.filter((c) => assegnaGruppoArgomento(c).chiave === gruppoSelezionato);
  }, [corsiCatalogo, gruppoSelezionato]);

  const {
    larghezze,
    corsiVisibili,
    tuttiVisibili,
    larghezzaTotaleTabella,
    toggleNascondiTutti,
    toggleVisibilitaCorso,
    iniziaResize,
    resetLarghezza,
  } = useColonneMatrice(corsiCatalogo, corsiFiltratiPerGruppo);

  function handleCambiaGruppo(chiave: string | null) {
    setGruppoSelezionato(chiave);
    setFiltroStatoLavoratori("tutti");
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

  const listaElaborata = useMemo(
    () =>
      elaboraListaMatrice({
        dipendenti,
        ricerca,
        colonnaOrd,
        direzioneOrd,
        gruppoSelezionato,
        filtroStatoLavoratori,
        corsiCatalogo,
        ruoli,
        mappaAssegnazioni,
        haObbligoNelGruppo,
        haObbligoCorso,
      }),
    [
      dipendenti,
      ricerca,
      colonnaOrd,
      direzioneOrd,
      gruppoSelezionato,
      filtroStatoLavoratori,
      corsiCatalogo,
      ruoli,
      mappaAssegnazioni,
    ],
  );

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
    esportaMatriceCsv({
      corsiVisibili,
      lavoratori: listaElaborata,
      ruoli,
      mappaAssegnazioni,
      haObbligoCorso,
      haAttestatoCorso,
      motivoEsenzione,
    });
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
      <IntestazioneMatrice
        totale={listaElaborata.length}
        ricerca={ricerca}
        onRicerca={setRicerca}
        onEsporta={handleEsportaCsv}
        onClose={onClose}
      />

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
        dipendenti={listaElaborata}
        letterePresenti={letterePresenti}
        onSelezionaLettera={saltaALettera}
      />

      {/* Corpo Principale Tabella con Barra Alfabetica Verticale */}
      <main className="flex-1 relative flex overflow-hidden">
        <BarraAlfabeticaVerticale
          dipendenti={listaElaborata}
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

            <TestataTabellaMatrice
              larghezze={larghezze}
              corsiVisibili={corsiVisibili}
              tuttiVisibili={tuttiVisibili}
              colonnaOrd={colonnaOrd}
              direzioneOrd={direzioneOrd}
              onOrdina={handleOrdina}
              onToggleTutti={toggleNascondiTutti}
              onToggleCorso={toggleVisibilitaCorso}
              onResize={iniziaResize}
              onResetLarghezza={resetLarghezza}
            />

            <tbody className="divide-y divide-border">
              {listaElaborata.length === 0 ? (
                <tr>
                  <td colSpan={3 + corsiVisibili.length} className="p-12 text-center text-muted-foreground">
                    Nessun lavoratore corrisponde ai criteri di ricerca.
                  </td>
                </tr>
              ) : (
                listaElaborata.map((dip, n) => (
                  <RigaLavoratoreMatrice
                    key={dip.id}
                    dip={dip}
                    indice={n}
                    attiva={rigaSelezionata === dip.id}
                    corsiVisibili={corsiVisibili}
                    ruoli={ruoli}
                    mappaAssegnazioni={mappaAssegnazioni}
                    haObbligoCorso={haObbligoCorso}
                    motivoEsenzione={motivoEsenzione}
                    haAttestatoCorso={haAttestatoCorso}
                    onSeleziona={setRigaSelezionata}
                    onToggleObbligo={handleToggleObbligo}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <LegendaMatrice />
    </div>,
    document.body,
  );
}
