/*
 * File:      StampaGlobalePage.tsx
 * Percorso:  src/features/stampe/components/StampaGlobalePage.tsx
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Pagina «Stampa globale»: scelta del limite per blocco, stima di dimensione e blocchi, generazione e scarico
 *            dei PDF «NN-AAMMGGhh-STAMPA GLOBALE-DITTA-DA X a Y.pdf» uno alla volta, con avanzamento e annullamento.
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
} from "@/lib/api/ruoli";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import {
  INDICAZIONI_PREDEFINITE,
  generaBlocco,
  stimaPiano,
  type DatiStampaGlobale,
  type PianoStampa,
} from "../globale/genera";
import {
  byteInMb,
  etichettaIntervallo,
  LIMITE_PREDEFINITO_MB,
  mbInByte,
} from "../globale/piano-blocchi";
import type { Problema } from "../globale/pagine-fisse";

const mb = (b: number) => `${byteInMb(b).toFixed(1)} MB`;

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

export function StampaGlobalePage() {
  const att = useQuery({
    queryKey: ["stampe-attestati"],
    queryFn: () => getAttestati("Approvato"),
  });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });
  const ruoli = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const ass = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli });

  const [limiteMb, setLimiteMb] = useState(LIMITE_PREDEFINITO_MB);
  const [includiCessati, setIncludiCessati] = useState(false);
  const [indicazioni, setIndicazioni] = useState(INDICAZIONI_PREDEFINITE);
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
  const opzioni = {
    includiCessati,
    limiteByte: mbInByte(Math.max(5, limiteMb || LIMITE_PREDEFINITO_MB)),
    indicazioni,
  };

  const annulla = () => controllo.current?.abort();

  const calcola = async () => {
    if (!dati) return;
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
        await new Promise((ok) => setTimeout(ok, 700)); // il browser scarica un file alla volta
      }
      setProblemi(tuttiProblemi);
      toast.success(`Generati ${piano.blocchi.length} file`);
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
          <h1 className="text-lg font-semibold">Stampa globale – fascicolo completo</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        <p className="text-sm text-muted-foreground">
          Copertina, organigramma A3 (solo nel primo file), poi ogni lavoratore in ordine alfabetico
          con la sua scheda e i PDF degli attestati. Il fascicolo è diviso in file sotto il limite
          scelto; un lavoratore non viene mai spezzato.
        </p>

        <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Limite di dimensione per file (MB)</span>
            <Input
              type="number"
              min={5}
              step={5}
              value={limiteMb}
              onChange={(e) => setLimiteMb(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={includiCessati}
              onChange={(e) => setIncludiCessati(e.target.checked)}
            />
            Includi anche i lavoratori cessati
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
          <Button onClick={calcola} disabled={!dati || caricamento || occupato !== null}>
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
              <b>{piano.lavoratori.length}</b> lavoratori · dimensione stimata{" "}
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
