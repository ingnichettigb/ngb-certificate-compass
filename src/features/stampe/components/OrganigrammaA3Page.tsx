/*
 * File:      OrganigrammaA3Page.tsx
 * Percorso:  src/features/stampe/components/OrganigrammaA3Page.tsx
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 16:10 — Tavola «Organigramma della sicurezza» in A3 orizzontale sul modello del Liceo.
 *   rev 2 — 10/11/2026 18:00 — Tavola su un unico foglio A3 orizzontale, zero salto pagina.
 *   rev 3 — 11/11/2026 — Vertice su fascia superiore e riquadri in 3 colonne affiancate.
 *   rev 4 — 11/11/2026 — Bottoni «Stampa» e «Genera PDF A3».
 *   rev 5 — 12/11/2026 — Bottoni esclusivi «Preposti con nomi» / «Categorie preposti».
 *   rev 6 — 12/11/2026 — Nomi in forma breve (COGNOME + iniziali puntate).
 *   rev 7 — 13/11/2026 — Legenda «* da formare» a destra.
 *   rev 8 — 13/11/2026 — Stile verde per voci aggiuntive, campi azzurri e suggerimenti al passaggio del mouse.
 *   rev 9 — 13/11/2026 13:40 — Integrazione finestra di aggiunta voce (ruolo DB azzurro / nota marroncina) e griglia schede colorate.
 *   rev 10 — 13/11/2026 — Il ruolo creato nel DB si collega alla voce con una copia (la voce ricevuta non viene più modificata sul posto);
 *            creaRuoloSicurezza è ora in src/lib/api/ruoli.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Plus, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAttestati, getDipendenti } from "@/lib/api";
import { CHIAVE_ASSEGNAZIONI_RUOLI, CHIAVE_RUOLI, creaRuoloSicurezza, getAssegnazioniRuoli, getRuoliSicurezza } from "@/lib/api/ruoli";
import { CHIAVE_DITTA, getDitta, type VoceOrganigramma } from "@/lib/api/ditta";
import { applicaModoPreposti, calcolaBlocchiA3, normalizzaVociOrganigramma, salvaVociOrganigramma, type BloccoOrganigramma, type ModoPreposti, type NomeBlocco } from "../organigramma-a3";
import { COLONNE_TAVOLA, impaginaPerFunzione, type ElementoFunzionale } from "../impagina-organigramma-a3";
import { costruisciRiquadriPdf, scaricaPdfOrganigrammaA3 } from "../esporta-organigramma-a3-pdf";
import { PannelloVociOrganigramma } from "./PannelloVociOrganigramma";
import { DialogAggiungiVoceOrganigramma } from "./DialogAggiungiVoceOrganigramma";

/** Area utile A3 orizzontale con margine 8 mm: 420−16 = 404 mm di larghezza, 297−16 = 281 mm di altezza. */
const AREA_A3_MM = { larghezza: 404, altezza: 281 };
const PX_PER_MM = 96 / 25.4;

const STILE_A3 = `
  .tavola-a3 { width: 420mm; min-height: 297mm; }
  @media print {
    @page { size: A3 landscape; margin: 8mm; }
    html, body { height: auto !important; background: #fff !important; }
    .tavola-a3 {
      width: ${AREA_A3_MM.larghezza}mm !important;
      height: ${AREA_A3_MM.altezza}mm !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-sizing: border-box;
      break-inside: avoid; break-after: avoid; page-break-after: avoid;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .tavola-a3-interno {
      transform: scale(var(--adatta, 1));
      transform-origin: top left;
      width: calc(${AREA_A3_MM.larghezza}mm / var(--adatta, 1));
    }
    .tavola-a3 .riquadro-a3 { padding: 1mm 1.5mm !important; }
    .tavola-a3 li { line-height: 1.15 !important; }
  }
`;

/** Bottone di scelta attivo: verde scuro con testo bianco (come i pulsanti del pannello filtri). */
const ATTIVO = "border-emerald-950 bg-emerald-800 text-white shadow-md hover:border-emerald-950 hover:bg-emerald-900 hover:text-white active:bg-emerald-950 dark:bg-emerald-700";

/** Titolo apribile «Voci aggiuntive»: stile pulsanti verdi (sfondo verdino, bordo verde elettrico). */
const TITOLO_VERDE =
  "cursor-pointer rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100";

function Suggerimento({ testo, children, lato = "bottom" }: { testo: string; children: React.ReactNode; lato?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={lato} className="max-w-xs text-xs leading-snug">{testo}</TooltipContent>
    </Tooltip>
  );
}

const SUGG_SQUADRA = "Nominativi presi dagli incarichi assegnati ai lavoratori. L'asterisco indica chi è da formare (nessun attestato valido per l'incarico).";
const SUGG_DITTA = "Dato preso dall'anagrafica Ditta: si modifica da lì.";
const SUGG_VOCE = "Voce libera o ruolo dell'organigramma: titolo e nominativi si modificano da «Voci aggiuntive», in alto.";

const annoScolastico = (d = new Date()) => {
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};

function Nomi({ elenco }: { elenco: NomeBlocco[] }) {
  return (
    <>
      {elenco.map((n, i) => (
        <li key={`${n.testo}-${i}`} className="leading-tight" style={{ breakInside: "avoid" }}>{n.testo}{n.daFormare && <b> *</b>}</li>
      ))}
    </>
  );
}

function Riquadro({ b, colonne = 1, className = "" }: { b: BloccoOrganigramma; colonne?: 1 | 2; className?: string }) {
  const vuoto = !b.ata.length && !b.docenti.length;
  return (
    <Suggerimento testo={SUGG_SQUADRA}>
      <section className={`riquadro-a3 border border-foreground p-1.5 ${className}`} style={{ breakInside: "avoid" }}>
        <h3 className="mb-1 text-[13px] font-bold uppercase">{b.titolo}</h3>
        <ul className="text-[12px]" style={{ columnCount: colonne, columnGap: "4mm" }}>
          <Nomi elenco={b.ata} />
          {colonne === 1 && b.ata.length > 0 && b.docenti.length > 0 && <li className="h-2" aria-hidden />}
          <Nomi elenco={b.docenti.map((n) => ({ ...n, testo: `Prof. ${n.testo}` }))} />
          {vuoto && <li className="italic text-muted-foreground">Nessun incarico assegnato</li>}
        </ul>
      </section>
    </Suggerimento>
  );
}

function Figura({ etichetta, valore }: { etichetta: string; valore: string | null | undefined }) {
  return (
    <Suggerimento testo={SUGG_DITTA}>
      <div className="border border-foreground px-2 py-1 text-[13px]">
        <b>{etichetta}</b> {valore || "—"}
      </div>
    </Suggerimento>
  );
}

export function OrganigrammaA3Page() {
  const qc = useQueryClient();
  const att = useQuery({ queryKey: ["stampe-attestati"], queryFn: () => getAttestati("Approvato") });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });
  const ruoli = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const ass = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli });

  const [voci, setVoci] = useState<VoceOrganigramma[]>([]);
  const [dialogAperto, setDialogAperto] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);

  useEffect(() => {
    if (!ditta.data) return;
    setVoci(normalizzaVociOrganigramma(ditta.data.organigramma_voci ?? []));
  }, [ditta.data]);

  const [modoPreposti, setModoPreposti] = useState<ModoPreposti>("nomi");
  const blocchiBase = useMemo(
    () => calcolaBlocchiA3(dip.data ?? [], att.data ?? [], ruoli.data ?? [], ass.data ?? []),
    [dip.data, att.data, ruoli.data, ass.data],
  );
  const blocchi = useMemo(() => applicaModoPreposti(blocchiBase, modoPreposti), [blocchiBase, modoPreposti]);
  const b = (k: string) => blocchi.find((x) => x.chiave === k)!;
  const vociVisibili = useMemo(() => voci.filter((v) => v.titolo.trim()), [voci]);

  const colonneTavola = useMemo(() => {
    const elementi: ElementoFunzionale[] = [
      ...blocchi.map((bl) => ({
        id: bl.chiave,
        titolo: bl.titolo,
        righe: bl.ata.length + bl.docenti.length,
        separatori: bl.ata.length > 0 && bl.docenti.length > 0 ? 1 : 0,
      })),
      ...vociVisibili.map((v, i) => ({ id: `voce-${i}`, titolo: v.titolo, righe: v.nomi.filter((n) => n.trim()).length })),
    ];
    return impaginaPerFunzione(elementi, COLONNE_TAVOLA);
  }, [blocchi, vociVisibili]);

  const d = ditta.data;
  const carica = att.isLoading || dip.isLoading || ditta.isLoading || ruoli.isLoading || ass.isLoading;

  const articolo = useRef<HTMLElement | null>(null);
  const interno = useRef<HTMLDivElement | null>(null);
  const adattaAlFoglio = useCallback(() => {
    const art = articolo.current;
    const int = interno.current;
    if (!art || !int) return;
    art.style.removeProperty("--adatta");
    const altezzaPx = int.scrollHeight;
    const maxPx = AREA_A3_MM.altezza * PX_PER_MM;
    const scala = altezzaPx > maxPx ? Math.floor((maxPx / altezzaPx) * 97) / 100 : 1;
    art.style.setProperty("--adatta", String(scala));
  }, []);

  useEffect(() => {
    window.addEventListener("beforeprint", adattaAlFoglio);
    return () => window.removeEventListener("beforeprint", adattaAlFoglio);
  }, [adattaAlFoglio]);

  const stampa = () => {
    adattaAlFoglio();
    window.print();
  };

  const [generando, setGenerando] = useState(false);
  const generaPdf = async () => {
    setGenerando(true);
    try {
      await scaricaPdfOrganigrammaA3({
        ditta: d,
        annoScolastico: annoScolastico(),
        colonne: costruisciRiquadriPdf(colonneTavola, blocchi, vociVisibili),
      });
      toast.success("PDF A3 generato");
    } catch (e) {
      toast.error(`Generazione PDF non riuscita: ${(e as Error).message}`);
    } finally {
      setGenerando(false);
    }
  };

  const salva = async () => {
    setSalvataggio(true);
    try {
      const pulite = await salvaVociOrganigramma(voci);
      setVoci(pulite);
      await qc.invalidateQueries({ queryKey: CHIAVE_DITTA });
      toast.success("Voci dell'organigramma salvate");
    } catch (e) {
      toast.error(`Salvataggio non riuscito: ${(e as Error).message}`);
    } finally {
      setSalvataggio(false);
    }
  };

  const cambia = (i: number, v: Partial<VoceOrganigramma>) =>
    setVoci((vv) => vv.map((x, j) => (j === i ? { ...x, ...v } : x)));

  const elimina = (i: number) =>
    setVoci((vv) => vv.filter((_, j) => j !== i));

  const aggiungiVoce = async (nuovaVoce: VoceOrganigramma, creaRuoloNelDb = false) => {
    let voce = nuovaVoce;
    if (creaRuoloNelDb && nuovaVoce.tipo === "ruolo") {
      try {
        const creato = await creaRuoloSicurezza({
          nome: nuovaVoce.titolo,
          macro_categoria: "Altro",
          descrizione: "Ruolo creato dall'organigramma A3",
          obbligatorio_tutti: false,
        });
        voce = { ...nuovaVoce, ruolo_id: creato.id };
        await qc.invalidateQueries({ queryKey: CHIAVE_RUOLI });
        toast.success(`Ruolo «${nuovaVoce.titolo}» aggiunto al DB e all'organigramma`);
      } catch (err) {
        toast.error(`Impossibile creare il ruolo nel DB: ${(err as Error).message}`);
        return;
      }
    }
    setVoci((vv) => [...vv, voce]);
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-background">
        <style>{STILE_A3}</style>
        <header className="border-b border-border bg-surface print:hidden">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-5 py-3">
            <Suggerimento testo="Torna all'elenco delle stampe predefinite.">
              <Button asChild size="sm" variant="ghost">
                <Link to="/stampe/predefinite"><ArrowLeft className="size-4" /> Stampe predefinite</Link>
              </Button>
            </Suggerimento>
            <h1 className="text-lg font-semibold">Carta 01 – Organigramma della sicurezza (A3)</h1>
            <div className="ml-auto flex flex-wrap gap-2">
              {([["nomi", "Preposti con nomi", "Mostra il riquadro Preposti con i nominativi."], ["categorie", "Categorie preposti", "Toglie il riquadro Preposti con i nomi."]] as [ModoPreposti, string, string][]).map(([m, etichetta, aiuto]) => (
                <Suggerimento key={m} testo={aiuto}>
                  <Button
                    size="sm"
                    type="button"
                    variant={modoPreposti === m ? "default" : "outline"}
                    aria-pressed={modoPreposti === m}
                    className={modoPreposti === m ? ATTIVO : ""}
                    onClick={() => setModoPreposti(m)}
                  >
                    {etichetta}
                  </Button>
                </Suggerimento>
              ))}
              <Suggerimento testo="Apre la stampa del browser con la tavola su un foglio A3 orizzontale.">
                <Button size="sm" variant="outline" onClick={stampa} disabled={carica}>
                  <Printer className="size-4" /> Stampa
                </Button>
              </Suggerimento>
              <Suggerimento testo="Crea il file PDF A3 orizzontale in un solo foglio.">
                <Button size="sm" onClick={generaPdf} disabled={carica || generando}>
                  <FileDown className="size-4" /> {generando ? "Genero…" : "Genera PDF A3"}
                </Button>
              </Suggerimento>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-4 p-4 print:max-w-none print:p-0">
          <details className="rounded-lg border border-border bg-card p-3 print:hidden" open={false}>
            <Suggerimento testo="Apre o chiude le voci aggiuntive: ruoli DB (azzurri) e note descrittive (marroncine)." lato="right">
              <summary className={TITOLO_VERDE}>Voci aggiuntive (ruoli DB e note descrittive organigramma)</summary>
            </Suggerimento>
            <p className="mt-2 text-xs text-muted-foreground">
              Schede azzurre per ruoli di sicurezza aziendali (collegati alle Nomine e al personale); schede marroncine per testi descrittivi liberi.
            </p>

            <div className="mt-3">
              <PannelloVociOrganigramma
                voci={voci}
                dipendenti={dip.data ?? []}
                onAggiornaVoce={cambia}
                onEliminaVoce={elimina}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <Suggerimento testo="Apre la finestra per aggiungere un ruolo DB o una nota all'organigramma." lato="top">
                <Button size="sm" onClick={() => setDialogAperto(true)}>
                  <Plus className="size-4" /> Aggiungi voce
                </Button>
              </Suggerimento>
              <Suggerimento testo="Salva le voci nell'anagrafica Ditta." lato="top">
                <Button size="sm" onClick={salva} disabled={salvataggio}><Save className="size-4" /> Salva voci</Button>
              </Suggerimento>
            </div>
          </details>

          <DialogAggiungiVoceOrganigramma
            aperto={dialogAperto}
            onChiudi={() => setDialogAperto(false)}
            ruoliEsistenti={ruoli.data ?? []}
            onAggiungi={aggiungiVoce}
          />

          <div className="overflow-auto rounded-lg border border-border bg-muted/40 p-4 print:overflow-visible print:border-0 print:bg-transparent print:p-0">
            <article
              ref={articolo}
              className="tavola-a3 mx-auto bg-card p-6 text-foreground shadow-sm print:p-0 print:shadow-none"
              aria-label="Tavola organigramma A3"
            >
              <div ref={interno} className="tavola-a3-interno">
              {carica ? (
                <p className="text-sm">Caricamento…</p>
              ) : (
                <>
                  <p className="text-center text-xs uppercase">Organigramma del servizio di prevenzione e protezione della sicurezza</p>
                  <div className="mb-3 flex items-end justify-between print:mb-1.5">
                    <h2 className="flex-1 text-center text-xl font-bold">{d?.ragione_sociale}</h2>
                    <p className="text-right text-xs font-bold">ANNO SCOLASTICO <span className="ml-2 text-xl">{annoScolastico()}</span></p>
                  </div>

                  {/* Vertice */}
                  <Suggerimento testo={SUGG_DITTA}>
                    <div className="mx-auto w-1/3 border-2 border-foreground px-2 py-2 text-center text-sm font-semibold">
                      <span className="block text-[10px] font-normal uppercase">Datore di lavoro</span>
                      {d?.datore_di_lavoro || "—"}
                    </div>
                  </Suggerimento>
                  <div className="mx-auto h-3 border-l border-foreground print:h-2" aria-hidden />
                  <div className="grid grid-cols-4 gap-3 border-t border-foreground pt-2 print:gap-2 print:pt-1">
                    <Figura etichetta="R.L.S." valore={d?.rls} />
                    <Figura etichetta="Medico Competente" valore={d?.medico_competente} />
                    <Figura etichetta="R.S.P.P." valore={d?.rspp} />
                    <Figura etichetta="A.S.P.P." valore={d?.aspp} />
                  </div>

                  {/* Squadre e incarichi */}
                  <div className="mt-3 grid grid-cols-3 items-start gap-3 print:mt-2 print:gap-2">
                    {colonneTavola.map((colonna, c) => (
                      <div key={c} className="space-y-3 print:space-y-2">
                        {colonna.map((posto) => {
                          const iVoce = posto.id.startsWith("voce-") ? Number(posto.id.slice(5)) : -1;
                          return iVoce >= 0 ? (
                            <VoceLibera key={posto.id} v={vociVisibili[iVoce]!} colonne={posto.colonneInterne} />
                          ) : (
                            <Riquadro key={posto.id} b={b(posto.id)} colonne={posto.colonneInterne} />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <Suggerimento testo="Asterisco: lavoratore da formare (nessun attestato valido per l'incarico)." lato="top">
                    <p className="ml-auto mt-3 w-fit text-right text-[11px] print:mt-1.5"><b>*</b> da formare</p>
                  </Suggerimento>

                  <div className="mt-6 grid grid-cols-3 items-end gap-6 text-[11px] print:mt-3 print:gap-4" style={{ breakInside: "avoid" }}>
                    <div>Per presa visione R.L.S. {d?.rls}<div className="mt-8 border-b border-foreground print:mt-5" /></div>
                    <div className="text-center">Il Datore di lavoro<br />{d?.datore_di_lavoro}<div className="mt-8 border-b border-foreground print:mt-5" /></div>
                    <div className="border border-foreground p-2 text-center">
                      <p className="font-semibold">{d?.ragione_sociale}</p>
                      <p>{[d?.indirizzo, [d?.cap, d?.comune].filter(Boolean).join(" "), d?.provincia && `(${d.provincia})`].filter(Boolean).join(" ")}</p>
                    </div>
                  </div>
                </>
              )}
              </div>
            </article>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

function VoceLibera({ v, colonne = 1 }: { v: VoceOrganigramma; colonne?: 1 | 2 }) {
  return (
    <Suggerimento testo={SUGG_VOCE}>
      <section className="riquadro-a3 border border-foreground p-1.5" style={{ breakInside: "avoid" }}>
        <h3 className="mb-1 text-[13px] font-bold uppercase">{v.titolo}</h3>
        <ul className="text-[12px]" style={{ columnCount: colonne, columnGap: "4mm" }}>
          {v.nomi.filter((n) => n.trim()).map((n) => <li key={n} style={{ breakInside: "avoid" }}>{n}</li>)}
          {!v.nomi.some((n) => n.trim()) && <li className="italic text-muted-foreground">—</li>}
        </ul>
      </section>
    </Suggerimento>
  );
}
