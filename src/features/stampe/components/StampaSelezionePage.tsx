/*
 * File:      StampaSelezionePage.tsx
 * Percorso:  src/features/stampe/components/StampaSelezionePage.tsx
 * Data creaz: 23/11/2026
 * Revisioni:
 *   rev 1 — 23/11/2026 — Pagina «Stampa selezione»: scelta di uno o più lavoratori (filtri Tutti / In forza / Nuovi arrivati / Cessati,
 *            ricerca, seleziona visibili / nessuno), poi lo stesso fascicolo della Stampa globale ma solo per quelli scelti:
 *            copertina con l'elenco dei nomi, schede e PDF degli attestati, indice finale. Niente organigramma A3.
 *            Se superano il limite di MB il fascicolo si divide in blocchi. Usa il motore di ../globale/genera.
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
import { filtraPerStato, isCessato, type FiltroStato } from "@/features/contratti/contratto";
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

  /** Lavoratori mostrati: filtro di stato + ricerca su cognome e nome, in ordine alfabetico. */
  const visibili = useMemo(() => {
    const base = filtraPerStato(dip.data ?? [], filtro, new Date());
    const q = ricerca.trim().toLowerCase();
    const trovati = q
      ? base.filter((d) => `${d.cognome} ${d.nome}`.toLowerCase().includes(q))
      : base;
    return ordinaLavoratori(trovati);
  }, [dip.data, filtro, ricerca]);

  const opzioni: OpzioniStampaGlobale = {
    // Un lavoratore cessato che hai spuntato va incluso: la scelta è esplicita.
    includiCessati: true,
    soloIds: [...scelti],
    includiOrganigramma: false,
    tipo: "SELEZIONE",
    limiteByte: mbInByte(Math.max(5, limiteMb || LIMITE_PREDEFINITO_MB)),
    indicazioni,
  };

  /** Ogni cambio di scelta rende vecchio il piano già calcolato. */
  const cambiaScelti = (nuovi: Set<string>) => {
    setScelti(nuovi);
    setPiano(null);
    setProblemi([]);
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
        await new Promise((ok) => setTimeout(ok, 700)); // il browser scarica un file alla volta
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
