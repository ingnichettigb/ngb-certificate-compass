/*
 * File:      OrganigrammaA3Page.tsx
 * Percorso:  src/features/stampe/components/OrganigrammaA3Page.tsx
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 16:10 — Tavola «Organigramma della sicurezza» in A3 orizzontale, sul modello del Liceo: vertice (Datore di
 *            lavoro, RLS, Medico, RSPP, ASPP) dalla Ditta, blocchi delle squadre dagli incarichi, «*» da formare, voci libere
 *            modificabili (es. registro antincendio, distribuzione DPI, custodia SDS), firme. Stampa diretta (anche «Salva come PDF»).
 *   rev 2 — 10/11/2026 18:00 — Tavola su un unico foglio A3 orizzontale, zero salto pagina: @page A3 landscape con margine 8 mm, tavola a
 *            404×281 mm (area utile), spazi/margini/interlinea ridotti in stampa e adattamento automatico (scala) se il contenuto eccede
 *            il foglio (anche con Ctrl+P). Titolo aggiornato a «Carta 01 – Organigramma della sicurezza».
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Printer, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAttestati, getDipendenti } from "@/lib/api";
import { CHIAVE_ASSEGNAZIONI_RUOLI, CHIAVE_RUOLI, getAssegnazioniRuoli, getRuoliSicurezza } from "@/lib/api/ruoli";
import { CHIAVE_DITTA, getDitta, type VoceOrganigramma } from "@/lib/api/ditta";
import { calcolaBlocchiA3, salvaVociOrganigramma, VOCI_PREDEFINITE, type BloccoOrganigramma, type NomeBlocco } from "../organigramma-a3";

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

const annoScolastico = (d = new Date()) => {
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};

function Nomi({ elenco }: { elenco: NomeBlocco[] }) {
  return (
    <>
      {elenco.map((n) => (
        <li key={n.testo} className="leading-tight">{n.testo}{n.daFormare && <b> *</b>}</li>
      ))}
    </>
  );
}

function Riquadro({ b, className = "" }: { b: BloccoOrganigramma; className?: string }) {
  const vuoto = !b.ata.length && !b.docenti.length;
  return (
    <section className={`riquadro-a3 border border-foreground p-1.5 ${className}`} style={{ breakInside: "avoid" }}>
      <h3 className="mb-1 text-[11px] font-bold uppercase">{b.titolo}</h3>
      <ul className="text-[10px]">
        <Nomi elenco={b.ata} />
        {b.ata.length > 0 && b.docenti.length > 0 && <li className="h-2" aria-hidden />}
        <Nomi elenco={b.docenti.map((n) => ({ ...n, testo: `Prof. ${n.testo}` }))} />
        {vuoto && <li className="italic text-muted-foreground">Nessun incarico assegnato</li>}
      </ul>
    </section>
  );
}

function Figura({ etichetta, valore }: { etichetta: string; valore: string | null | undefined }) {
  return (
    <div className="border border-foreground px-2 py-1 text-[11px]">
      <b>{etichetta}</b> {valore || "—"}
    </div>
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
  const [salvataggio, setSalvataggio] = useState(false);
  useEffect(() => {
    if (!ditta.data) return;
    const v = ditta.data.organigramma_voci ?? [];
    setVoci(v.length ? v : VOCI_PREDEFINITE);
  }, [ditta.data]);

  const blocchi = useMemo(
    () => calcolaBlocchiA3(dip.data ?? [], att.data ?? [], ruoli.data ?? [], ass.data ?? []),
    [dip.data, att.data, ruoli.data, ass.data],
  );
  const b = (k: string) => blocchi.find((x) => x.chiave === k)!;
  const d = ditta.data;
  const carica = att.isLoading || dip.isLoading || ditta.isLoading || ruoli.isLoading || ass.isLoading;

  // Adattamento di sicurezza: se la tavola (alla larghezza di stampa) supera l'altezza utile A3, la riduce in scala per restare in un foglio solo.
  const articolo = useRef<HTMLElement | null>(null);
  const interno = useRef<HTMLDivElement | null>(null);
  const adattaAlFoglio = useCallback(() => {
    const art = articolo.current;
    const int = interno.current;
    if (!art || !int) return;
    art.style.removeProperty("--adatta");
    const altezzaPx = int.scrollHeight;
    const maxPx = AREA_A3_MM.altezza * PX_PER_MM;
    const scala = altezzaPx > maxPx ? Math.floor((maxPx / altezzaPx) * 97) / 100 : 1; // 3% di margine di sicurezza
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
  const cambia = (i: number, v: Partial<VoceOrganigramma>) => setVoci((vv) => vv.map((x, j) => (j === i ? { ...x, ...v } : x)));

  return (
    <div className="min-h-screen bg-background">
      <style>{STILE_A3}</style>
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-5 py-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/stampe/predefinite"><ArrowLeft className="size-4" /> Stampe predefinite</Link>
          </Button>
          <h1 className="text-lg font-semibold">Carta 01 – Organigramma della sicurezza (A3)</h1>
          <Button size="sm" className="ml-auto" onClick={stampa} disabled={carica}>
            <Printer className="size-4" /> Stampa / PDF A3
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-4 p-4 print:max-w-none print:p-0">
        <details className="rounded-lg border border-border bg-card p-3 print:hidden" open={false}>
          <summary className="cursor-pointer text-sm font-semibold">Voci aggiuntive (incarichi liberi, es. registro antincendio, distribuzione DPI, custodia SDS)</summary>
          <p className="mt-2 text-xs text-muted-foreground">Un nominativo per riga. Le voci si salvano nell'anagrafica Ditta.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {voci.map((v, i) => (
              <div key={i} className="space-y-1.5 rounded-md border border-border p-2">
                <div className="flex gap-1">
                  <Input aria-label="Titolo voce" value={v.titolo} onChange={(e) => cambia(i, { titolo: e.target.value })} />
                  <Button size="icon" variant="destructive" aria-label="Elimina voce" onClick={() => setVoci((vv) => vv.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea aria-label="Nominativi" rows={4} value={v.nomi.join("\n")} onChange={(e) => cambia(i, { nomi: e.target.value.split("\n") })} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setVoci((vv) => [...vv, { titolo: "Nuova voce", nomi: [] }])}>
              <Plus className="size-4" /> Aggiungi voce
            </Button>
            <Button size="sm" onClick={salva} disabled={salvataggio}><Save className="size-4" /> Salva voci</Button>
          </div>
        </details>

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

                <div className="grid grid-cols-3 gap-3 print:gap-2">
                  <div className="space-y-2">
                    <Figura etichetta="R.L.S." valore={d?.rls} />
                    <Figura etichetta="Medico Competente" valore={d?.medico_competente} />
                  </div>
                  <div className="self-start border-2 border-foreground px-2 py-2 text-center text-sm font-semibold">
                    <span className="block text-[10px] font-normal uppercase">Datore di lavoro</span>
                    {d?.datore_di_lavoro || "—"}
                  </div>
                  <div className="space-y-2">
                    <div className="border border-foreground px-2 py-1 text-[11px]">
                      <p><b>R.S.P.P.</b> {d?.rspp || "—"}</p>
                      <p><b>A.S.P.P.</b> {d?.aspp || "—"}</p>
                    </div>
                    <Riquadro b={b("preposti")} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 print:mt-2 print:gap-2">
                  <div className="space-y-3 print:space-y-2">
                    <Riquadro b={b("primo-soccorso")} />
                    <Riquadro b={b("defibrillatore")} />
                  </div>
                  <div className="space-y-3 print:space-y-2">
                    <Riquadro b={b("evacuazione")} />
                    {voci.filter((v) => v.titolo.trim()).slice(0, Math.ceil(voci.length / 2)).map((v) => <VoceLibera key={v.titolo} v={v} />)}
                  </div>
                  <div className="space-y-3 print:space-y-2">
                    <Riquadro b={b("antincendio")} />
                    <Riquadro b={b("privacy")} />
                    {voci.filter((v) => v.titolo.trim()).slice(Math.ceil(voci.length / 2)).map((v) => <VoceLibera key={v.titolo} v={v} />)}
                  </div>
                </div>

                <p className="mt-3 text-[10px] print:mt-1.5"><b>*</b> da formare (nessun attestato valido per l'incarico)</p>

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
  );
}

function VoceLibera({ v }: { v: VoceOrganigramma }) {
  return (
    <section className="riquadro-a3 border border-foreground p-1.5" style={{ breakInside: "avoid" }}>
      <h3 className="mb-1 text-[11px] font-bold uppercase">{v.titolo}</h3>
      <ul className="text-[10px]">
        {v.nomi.filter((n) => n.trim()).map((n) => <li key={n}>{n}</li>)}
        {!v.nomi.some((n) => n.trim()) && <li className="italic text-muted-foreground">—</li>}
      </ul>
    </section>
  );
}
