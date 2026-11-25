/*
 * File:      StampaSelezionePage.tsx
 * Percorso:  src/features/stampe/components/StampaSelezionePage.tsx
 * Data creaz: 23/11/2026
 * Revisioni:
 *   rev 1 — 23/11/2026 10:30 — Pagina «Stampa selezione»: scelta di uno o più lavoratori (filtri Tutti / In forza / Nuovi arrivati / Cessati,
 *            ricerca, seleziona visibili / nessuno), poi lo stesso fascicolo della Stampa globale ma solo per quelli scelti:
 *            copertina con l'elenco dei nomi, schede e PDF degli attestati, indice finale. Niente organigramma A3.
 *            Se superano il limite di MB il fascicolo si divide in blocchi. Usa il motore di ../globale/genera.
 *   rev 2 — 23/11/2026 17:25 — Selezione per argomenti (barra 11 pulsanti con i colori ufficiali): al clic seleziona automaticamente i
 *            lavoratori con corsi dell'argomento. Due bottoni mutuamente esclusivi «Tutti i corsi» e «Solo argomento» per allegare e
 *            specificare tutti i corsi oppure filtrare scheda e copie PDF solo su quelli dell'argomento prescelto.
 *   rev 3 — 23/11/2026 17:45 — Selezione per argomenti ancorata alla matrice ruoli di sicurezza (dipendenti_ruoli / ruoli_sicurezza):
 *            seleziona solo gli addetti formalmente incaricati (es. 12 DAE) filtrati per stato; fallback su attestati per argomenti
 *            senza ruolo. Risolto errore di compilazione TS2345 su tipo corso opzionale.
 */
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calculator, FileDown, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAttestati, getDipendenti } from "@/lib/api";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  CHIAVE_RUOLI,
  getAssegnazioniRuoli,
  getRuoliSicurezza,
  type RuoloSicurezza,
} from "@/lib/api/ruoli";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import { filtraPerStato, isCessato, type FiltroStato } from "@/features/contratti/contratto";
import {
  GRUPPI_ARGOMENTO,
  GRUPPO_ASPP_RSPP_VISIVO,
  appartieneAGruppo,
} from "@/features/tipi-corso/tipi-raggruppamento";
import {
  INDICAZIONI_SELEZIONE,
  generaBlocco,
  stimaPiano,
  type DatiStampaGlobale,
  type OpzioniStampaGlobale,
  type PianoStampa,
} from "../globale/genera";
import {
  byteInMb,
  etichettaIntervallo,
  LIMITE_PREDEFINITO_MB,
  mbInByte,
  ordinaLavoratori,
} from "../globale/piano-blocchi";
import type { Problema } from "../globale/pagine-fisse";
import { dataIt } from "../stampa-formati";

const mb = (b: number) => `${byteInMb(b).toFixed(1)} MB`;

const FILTRI: { id: FiltroStato; label: string }[] = [
  { id: "tutti", label: "Tutti" },
  { id: "in_forza", label: "In forza" },
  { id: "nuovi_arrivati", label: "Nuovi arrivati" },
  { id: "cessati", label: "Cessati" },
];

function scarica(bytes: Uint8Array, nome: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Verifica se un ruolo di sicurezza appartiene a uno degli 11 gruppi di argomento */
function ruoloAppartieneAGruppo(r: RuoloSicurezza, ordine: number | null): boolean {
  if (ordine === null) return true;
  const cod = (r.codice ?? "").toUpperCase();
  const nome = (r.nome ?? "").toLowerCase();
  const macro = (r.macro_categoria ?? "").toLowerCase();

  switch (ordine) {
    case 1: // Sicurezza lavoratori
      return cod === "LAVORATORE" || nome === "lavoratore" || macro.includes("sicurezza lavoratori");
    case 2: // Preposti
      return cod === "PREPOSTO" || nome.includes("preposto") || macro.includes("preposto");
    case 3: // Evacuazione
      return cod === "ADD-EVACUAZIONE" || nome.includes("evacuaz") || macro.includes("emergenz");
    case 4: // Antincendio
      return cod.includes("ANTINCENDIO") || nome.includes("antincendio") || macro.includes("antincendio");
    case 5: // Primo soccorso
      return cod === "ADD-PRIMO-SOCCORSO" || nome.includes("primo soccorso") || macro.includes("primo soccorso");
    case 6: // Defibrillatore
      return cod === "ADD-DAE" || nome.includes("defibrillat") || nome.includes("blsd") || macro.includes("defibrillat");
    case 7: // Privacy
      return cod === "INC-PRIVACY" || nome.includes("privacy") || macro.includes("privacy");
    case 8: // Covid
      return false;
    case 9: // Altro
      return false;
    case 10: // DL - Dir - ASPP - RSPP
      return ["DL", "DL-RSPP", "ASPP", "RSPP", "DSGA", "VICEDSGA"].includes(cod) || /^(dl|dir|aspp|rspp)/i.test(nome);
    case 11: // Cantieri
      return cod.startsWith("OPER-") || macro.includes("attrezzatur");
    default:
      return false;
  }
}

export function StampaSelezionePage() {
  const att = useQuery({
    queryKey: ["stampe-attestati"],
    queryFn: () => getAttestati("Approvato"),
  });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });
  const ruoli = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const ass = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli });

  const [filtro, setFiltro] = useState<FiltroStato>("tutti");
  const [ricerca, setRicerca] = useState("");
  const [filtroArgomento, setFiltroArgomento] = useState<number | null>(null);
  const [modalitaCorsi, setModalitaCorsi] = useState<"tutto" | "solo_argomento">("solo_argomento");
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [limiteMb, setLimiteMb] = useState(LIMITE_PREDEFINITO_MB);
  const [indicazioni, setIndicazioni] = useState(INDICAZIONI_SELEZIONE);
  const [piano, setPiano] = useState<PianoStampa | null>(null);
  const [occupato, setOccupato] = useState<"stima" | "genera" | null>(null);
  const [stato, setStato] = useState("");
  const [problemi, setProblemi] = useState<Problema[]>([]);
  const controllo = useRef<AbortController | null>(null);

  const caricamento =
    att.isLoading || dip.isLoading || ditta.isLoading || ruoli.isLoading || ass.isLoading;
  const dati: DatiStampaGlobale | null = useMemo(
    () =>
      dip.data && att.data && ruoli.data && ass.data
        ? {
            dipendenti: dip.data,
            attestati: att.data,
            ruoli: ruoli.data,
            assegnazioni: ass.data,
            ditta: ditta.data,
          }
        : null,
    [dip.data, att.data, ruoli.data, ass.data, ditta.data],
  );

  const conteggi = useMemo(() => {
    const oggi = new Date();
    const elenco = dip.data ?? [];
    return Object.fromEntries(
      FILTRI.map(({ id }) => [id, filtraPerStato(elenco, id, oggi).length]),
    ) as Record<FiltroStato, number>;
  }, [dip.data]);

  /** Lavoratori collegati all'argomento: primariamente da matrice ruoli di sicurezza, con fallback su attestati */
  const idsArgomento = useMemo(() => {
    if (filtroArgomento === null) return null;
    const s = new Set<string>();

    // 1. Cerca nella matrice ruoli di sicurezza assegnati
    if (ruoli.data && ass.data) {
      const ruoliGruppo = ruoli.data.filter((r) => ruoloAppartieneAGruppo(r, filtroArgomento));
      if (ruoliGruppo.length > 0) {
        const rIds = new Set(ruoliGruppo.map((r) => r.id));
        for (const a of ass.data) {
          if (rIds.has(a.ruolo_id) && a.dipendente_id) {
            s.add(a.dipendente_id);
          }
        }
      }
    }

    // 2. Se l'argomento non ha ruoli (es. Covid, Altro), ripiega sui corsi svolti
    if (s.size === 0 && att.data) {
      for (const a of att.data) {
        if (a.dipendente_id && appartieneAGruppo(a.tipi_corso ?? {}, filtroArgomento)) {
          s.add(a.dipendente_id);
        }
      }
    }
    return s;
  }, [filtroArgomento, ruoli.data, ass.data, att.data]);

  /** Titolo visuale dell'argomento attivo */
  const titoloArgomentoAttivo = useMemo(() => {
    if (filtroArgomento === null) return "Tutti";
    if (filtroArgomento === 10) return GRUPPO_ASPP_RSPP_VISIVO.titolo;
    const g = GRUPPI_ARGOMENTO.find((x) => x.ordine === filtroArgomento);
    return g ? `${g.ordine}. ${g.titolo}` : `Argomento ${filtroArgomento}`;
  }, [filtroArgomento]);

  /** Lavoratori mostrati: filtro di stato + eventuale filtro argomento + ricerca */
  const visibili = useMemo(() => {
    const base = filtraPerStato(dip.data ?? [], filtro, new Date());
    const q = ricerca.trim().toLowerCase();
    let trovati = q
      ? base.filter((d) => `${d.cognome} ${d.nome}`.toLowerCase().includes(q))
      : base;
    if (idsArgomento !== null) {
      trovati = trovati.filter((d) => idsArgomento.has(d.id));
    }
    return ordinaLavoratori(trovati);
  }, [dip.data, filtro, ricerca, idsArgomento]);

  const opzioni: OpzioniStampaGlobale = {
    includiCessati: true,
    soloIds: [...scelti],
    includiOrganigramma: false,
    tipo: "SELEZIONE",
    limiteByte: mbInByte(Math.max(5, limiteMb || LIMITE_PREDEFINITO_MB)),
    indicazioni,
    filtroArgomento: modalitaCorsi === "solo_argomento" ? filtroArgomento : null,
  };

  /** Ogni cambio di scelta rende vecchio il piano già calcolato */
  const cambiaScelti = (nuovi: Set<string>) => {
    setScelti(nuovi);
    setPiano(null);
    setProblemi([]);
  };

  const applicaArgomento = (ordine: number | null) => {
    setFiltroArgomento(ordine);
    setPiano(null);
    setProblemi([]);
    if (ordine === null) {
      setModalitaCorsi("tutto");
      return;
    }
    setModalitaCorsi("solo_argomento");

    // Individua i candidati dell'argomento dalla matrice ruoli (o dai corsi se non ci sono ruoli)
    const candidati = new Set<string>();
    if (ruoli.data && ass.data) {
      const ruoliGruppo = ruoli.data.filter((r) => ruoloAppartieneAGruppo(r, ordine));
      if (ruoliGruppo.length > 0) {
        const rIds = new Set(ruoliGruppo.map((r) => r.id));
        for (const a of ass.data) {
          if (rIds.has(a.ruolo_id) && a.dipendente_id) {
            candidati.add(a.dipendente_id);
          }
        }
      }
    }
    if (candidati.size === 0 && att.data) {
      for (const a of att.data) {
        if (a.dipendente_id && appartieneAGruppo(a.tipi_corso ?? {}, ordine)) {
          candidati.add(a.dipendente_id);
        }
      }
    }

    // Rispetta il filtro di stato (es. solo in forza se siamo su «In forza» o «Tutti»)
    const base = filtraPerStato(dip.data ?? [], filtro === "tutti" ? "in_forza" : filtro, new Date());
    const validi = new Set(base.map((d) => d.id));
    const sceltiFiltrati = new Set([...candidati].filter((id) => validi.has(id)));
    cambiaScelti(sceltiFiltrati.size > 0 ? sceltiFiltrati : candidati);
  };

  const alterna = (id: string) => {
    const n = new Set(scelti);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    cambiaScelti(n);
  };
  const selezionaVisibili = () => cambiaScelti(new Set([...scelti, ...visibili.map((d) => d.id)]));
  const deselezionaVisibili = () => {
    const n = new Set(scelti);
    visibili.forEach((d) => n.delete(d.id));
    cambiaScelti(n);
  };

  const annulla = () => controllo.current?.abort();

  const calcola = async () => {
    if (!dati || scelti.size === 0) return;
    controllo.current = new AbortController();
    setOccupato("stima");
    setPiano(null);
    setProblemi([]);
    try {
      const p = await stimaPiano(
        dati,
        opzioni,
        (f, t) => setStato(`Controllo dimensione file: ${f} di ${t}`),
        controllo.current.signal,
      );
      setPiano(p);
      setStato("");
    } catch (e) {
      setStato("");
      if ((e as Error).name !== "AbortError")
        toast.error(`Stima non riuscita: ${(e as Error).message}`);
    } finally {
      setOccupato(null);
    }
  };

  const genera = async () => {
    if (!dati || !piano) return;
    controllo.current = new AbortController();
    setOccupato("genera");
    setProblemi([]);
    const quando = new Date();
    const tuttiProblemi: Problema[] = [];
    try {
      for (const blocco of piano.blocchi) {
        const r = await generaBlocco(
          dati,
          piano,
          blocco,
          opzioni,
          quando,
          (t, f, tot) =>
            setStato(`Blocco ${blocco.numero} di ${piano.blocchi.length} – ${t} (${f}/${tot})`),
          controllo.current.signal,
        );
        scarica(r.bytes, r.nomeFile);
        tuttiProblemi.push(...r.problemi);
        setStato(`Blocco ${blocco.numero} pronto: ${mb(r.bytes.length)}, ${r.pagine} pagine`);
        await new Promise((ok) => setTimeout(ok, 700));
      }
      setProblemi(tuttiProblemi);
      toast.success(
        piano.blocchi.length === 1 ? "Generato 1 file" : `Generati ${piano.blocchi.length} file`,
      );
      setStato("");
    } catch (e) {
      setStato("");
      if ((e as Error).name === "AbortError") toast.message("Generazione annullata");
      else toast.error(`Generazione non riuscita: ${(e as Error).message}`);
    } finally {
      setOccupato(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-5 py-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/stampe/predefinite">
              <ArrowLeft className="size-4" /> Stampe predefinite
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">
            Stampa selezione – fascicolo dei lavoratori scelti
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        <p className="text-sm text-muted-foreground">
          Scegli uno o più lavoratori: ottieni lo stesso fascicolo della Stampa globale, ma solo per
          loro. Copertina con l&apos;elenco dei nomi, poi per ciascuno la scheda seguita dai PDF
          degli attestati, e in fondo l&apos;indice. Niente organigramma A3. Se superano il limite
          scelto il fascicolo si divide in più file; un lavoratore non viene mai spezzato.
        </p>

        {/* Barra di selezione per argomenti con colori e i 2 bottoni mutuamente esclusivi */}
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Argomenti:</span>

            {/* Pulsante «Tutti» */}
            <button
              type="button"
              onClick={() => applicaArgomento(null)}
              className={`cursor-pointer rounded border px-2 py-0.5 font-medium transition-all ${
                filtroArgomento === null
                  ? "border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary"
                  : "border-border/60 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title="Mostra tutti i lavoratori"
            >
              Tutti
            </button>

            {/* Gruppi 1-9 */}
            {GRUPPI_ARGOMENTO.filter((g) => g.ordine < 10).map((g) => {
              const attivo = filtroArgomento === g.ordine;
              return (
                <button
                  key={g.chiave}
                  type="button"
                  onClick={() => applicaArgomento(g.ordine)}
                  className={`cursor-pointer rounded border px-2 py-0.5 font-medium transition-all ${g.coloreSfondo} ${g.coloreTesto} ${
                    attivo
                      ? "border-current shadow-xs ring-2 ring-current/40 font-semibold"
                      : "border-border/40 hover:opacity-90"
                  }`}
                  title={`Seleziona addetti e corsi del tema: ${g.ordine}. ${g.titolo}`}
                >
                  {g.ordine}. {g.titolo}
                </button>
              );
            })}

            {/* Gruppo 10. DL - Dir - ASPP - RSPP */}
            {(() => {
              const attivo = filtroArgomento === 10;
              return (
                <button
                  type="button"
                  onClick={() => applicaArgomento(10)}
                  className={`cursor-pointer rounded border px-2 py-0.5 font-medium transition-all ${GRUPPO_ASPP_RSPP_VISIVO.coloreSfondo} ${GRUPPO_ASPP_RSPP_VISIVO.coloreTesto} ${
                    attivo
                      ? "border-current shadow-xs ring-2 ring-current/40 font-semibold"
                      : "border-border/40 hover:opacity-90"
                  }`}
                  title="Seleziona lavoratori DL, Dirigente, ASPP, RSPP"
                >
                  {GRUPPO_ASPP_RSPP_VISIVO.titolo}
                </button>
              );
            })()}

            {/* Gruppo 11. Cantieri */}
            {GRUPPI_ARGOMENTO.filter((g) => g.ordine > 10).map((g) => {
              const attivo = filtroArgomento === g.ordine;
              return (
                <button
                  key={g.chiave}
                  type="button"
                  onClick={() => applicaArgomento(g.ordine)}
                  className={`cursor-pointer rounded border px-2 py-0.5 font-medium transition-all ${g.coloreSfondo} ${g.coloreTesto} ${
                    attivo
                      ? "border-current shadow-xs ring-2 ring-current/40 font-semibold"
                      : "border-border/40 hover:opacity-90"
                  }`}
                  title={`Seleziona addetti e corsi del tema: ${g.ordine}. ${g.titolo}`}
                >
                  {g.ordine}. {g.titolo}
                </button>
              );
            })}
          </div>

          {/* I due bottoni mutuamente esclusivi: Tutto vs Solo argomento */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <span className="text-xs font-medium text-muted-foreground">Fascicolo PDF:</span>
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setModalitaCorsi("tutto");
                  setPiano(null);
                }}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  modalitaCorsi === "tutto"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Include tutti i corsi svolti e allega tutte le copie PDF dei certificati"
              >
                Tutti i corsi (scheda completa + tutte le copie PDF)
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalitaCorsi("solo_argomento");
                  setPiano(null);
                }}
                disabled={filtroArgomento === null}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  modalitaCorsi === "solo_argomento"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                title={
                  filtroArgomento === null
                    ? "Seleziona prima un argomento per limitare la stampa a quel tema"
                    : `Filtra scheda e copie PDF solo per ${titoloArgomentoAttivo}`
                }
              >
                Solo argomento (scheda e copie PDF solo di questo tema)
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap gap-1.5">
            {FILTRI.map(({ id, label }) => {
              const attivo = filtro === id;
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  aria-pressed={attivo}
                  onClick={() => setFiltro(id)}
                  className={attivo ? "bg-emerald-600 text-white border-emerald-700 shadow-md" : ""}
                >
                  {label} ({conteggi[id] ?? 0})
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder="Cerca per cognome o nome"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              aria-label="Cerca lavoratore"
            />
            <Button type="button" size="sm" variant="outline" onClick={selezionaVisibili}>
              Seleziona tutti quelli mostrati
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={deselezionaVisibili}>
              Deseleziona quelli mostrati
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => cambiaScelti(new Set())}
              disabled={scelti.size === 0}
            >
              Nessuno
            </Button>
            <span className="text-sm font-medium" role="status">
              {scelti.size} {scelti.size === 1 ? "scelto" : "scelti"}
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
            {caricamento ? (
              <p className="p-3 text-sm text-muted-foreground">Carico i lavoratori…</p>
            ) : visibili.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Nessun lavoratore con questo filtro.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {visibili.map((d) => (
                  <li key={d.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={scelti.has(d.id)}
                        onChange={() => alterna(d.id)}
                      />
                      <span className="font-medium">
                        {d.cognome} {d.nome}
                      </span>
                      {isCessato(d) && (
                        <span className="text-xs text-muted-foreground">
                          Cessato{d.data_cessazione ? ` il ${dataIt(d.data_cessazione)}` : ""}
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Limite di dimensione per file (MB)</span>
            <Input
              type="number"
              min={5}
              step={5}
              value={limiteMb}
              onChange={(e) => {
                setLimiteMb(Number(e.target.value));
                setPiano(null);
              }}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Indicazioni sulla copertina</span>
            <Textarea
              rows={4}
              value={indicazioni}
              onChange={(e) => setIndicazioni(e.target.value)}
            />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={calcola}
            disabled={!dati || caricamento || scelti.size === 0 || occupato !== null}
          >
            <Calculator className="size-4" />{" "}
            {caricamento ? "Carico i dati…" : "Calcola dimensione e blocchi"}
          </Button>
          <Button onClick={genera} disabled={!piano || occupato !== null}>
            <FileDown className="size-4" /> Genera e scarica i PDF
          </Button>
          {occupato && (
            <Button variant="outline" onClick={annulla}>
              <Square className="size-4" /> Annulla
            </Button>
          )}
          {stato && (
            <span className="text-sm text-muted-foreground" role="status">
              {stato}
            </span>
          )}
        </div>

        {piano && (
          <section className="space-y-3">
            <p className="text-sm">
              <b>{piano.lavoratori.length}</b>{" "}
              {piano.lavoratori.length === 1 ? "lavoratore" : "lavoratori"} · dimensione stimata{" "}
              <b>{mb(piano.byteTotali)}</b> · <b>{piano.blocchi.length}</b>{" "}
              {piano.blocchi.length === 1 ? "file" : "file"}
              {piano.senzaFile > 0 && (
                <>
                  {" "}
                  · <span className="text-destructive">{piano.senzaFile} attestati senza file</span>
                </>
              )}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-2">N.</th>
                    <th className="p-2">Intervallo</th>
                    <th className="p-2">Lavoratori</th>
                    <th className="p-2">Dimensione stimata</th>
                  </tr>
                </thead>
                <tbody>
                  {piano.blocchi.map((b) => (
                    <tr key={b.numero} className="border-t border-border">
                      <td className="p-2 font-mono">{String(b.numero).padStart(2, "0")}</td>
                      <td className="p-2">{etichettaIntervallo(b.da, b.a)}</td>
                      <td className="p-2">{b.voci.length}</td>
                      <td
                        className={`p-2 ${b.oltreLimite ? "font-semibold text-destructive" : ""}`}
                      >
                        {mb(b.byte)}
                        {b.oltreLimite && " (un solo lavoratore oltre il limite)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              La stima somma le dimensioni dei file degli attestati; la dimensione reale può
              differire un poco. Il browser può chiedere di consentire più download di seguito.
            </p>
          </section>
        )}

        {problemi.length > 0 && (
          <section className="space-y-2 rounded-lg border border-destructive/40 p-4">
            <h2 className="text-sm font-semibold text-destructive">
              Da sistemare ({problemi.length})
            </h2>
            <ul className="space-y-1 text-sm">
              {problemi.map((p, i) => (
                <li key={i}>
                  <b>{p.lavoratore}</b> – {p.corso}: {p.motivo}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Gli stessi punti sono scritti nella pagina finale di ogni file.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
