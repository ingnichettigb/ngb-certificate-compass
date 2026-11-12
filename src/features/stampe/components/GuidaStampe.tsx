/*
 * File:      GuidaStampe.tsx
 * Percorso:  src/features/stampe/components/GuidaStampe.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Pulsante «Guida» (i) con le istruzioni di Stampe & Report: differenza tra attestato e incarico, selezioni,
 *                        documenti, filtri, opzioni, legenda delle colonne e ricette rapide con «Applica questi filtri».
 *   rev 2 — 11/11/2026 17:30 — Voce «Stato lavoratore» (In forza / Solo cessati / Tutti) al posto di «Includi lavoratori cessati».
 */
import { useState } from "react";
import { ArrowUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { TITOLI_MODELLO, type FiltriStampa, type Modello } from "../dati-stampa";
import { RICETTE } from "../guida-ricette";
import { SUGGERIMENTI, SUGGERIMENTI_MODELLO } from "../suggerimenti";

type Props = {
  ruoli: RuoloSicurezza[];
  /** Imposta i filtri della ricetta scelta. */
  onApplica: (filtri: FiltriStampa, titolo: string) => void;
};

const SEZIONI = [
  { id: "attestato-incarico", titolo: "Attestato o incarico?" },
  { id: "selezione", titolo: "Selezione rapida" },
  { id: "documenti", titolo: "Tipi di documento" },
  { id: "filtri", titolo: "Filtri" },
  { id: "opzioni", titolo: "Opzioni" },
  { id: "colonne", titolo: "Come leggere le colonne" },
] as const;

const ATT = "font-semibold text-sky-700 dark:text-sky-300";
const INC = "font-semibold text-amber-700 dark:text-amber-300";

function vai(id: string) {
  document.getElementById(`guida-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function Link({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => vai(id)} className="text-left text-primary underline underline-offset-2 hover:opacity-80">
      {children}
    </button>
  );
}

function Sezione({ id, titolo, children }: { id: string; titolo: string; children: React.ReactNode }) {
  return (
    <section id={`guida-${id}`} className="scroll-mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
        <h3 className="text-base font-bold">{titolo}</h3>
        <button type="button" onClick={() => vai("indice")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowUp className="size-3" /> Indice
        </button>
      </div>
      {children}
    </section>
  );
}

function Voce({ nome, children }: { nome: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="leading-snug">
      <b>{nome}</b> — {children}
    </li>
  );
}

export function GuidaStampe({ ruoli, onApplica }: Props) {
  const [aperto, setAperto] = useState(false);

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="ml-auto gap-1.5" aria-label="Guida a Stampe e Report">
          <Info className="size-4" /> Guida
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guida a Stampe &amp; Report</DialogTitle>
          <DialogDescription>Come scegliere cosa stampare, senza confondere l'attestato con l'incarico.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <nav id="guida-indice" aria-label="Indice della guida" className="grid gap-4 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold">Vai subito a</p>
              <ul className="space-y-1">
                {SEZIONI.map((s) => (
                  <li key={s.id}><Link id={s.id}>{s.titolo}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-semibold">Ricette rapide</p>
              <ul className="space-y-1">
                {RICETTE.map((r) => (
                  <li key={r.id}><Link id={`ricetta-${r.id}`}>{r.titolo}</Link></li>
                ))}
              </ul>
            </div>
          </nav>

          <Sezione id="attestato-incarico" titolo="Attestato o incarico?">
            <p>Per cercare «i preposti» (o gli addetti antincendio, primo soccorso…) ci sono <b>due strade diverse</b> e danno elenchi diversi:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3">
                <p className={ATT}>Attestato (storico) — «Gruppo corsi»</p>
                <p className="mt-1">Chi ha <b>fatto il corso</b>, anche anni fa, anche se <b>oggi non ha più l'incarico</b>.</p>
                <p className="mt-1 text-xs text-muted-foreground">Guarda l'archivio degli attestati approvati.</p>
              </div>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className={INC}>Incarico (oggi) — «Ruolo di sicurezza»</p>
                <p className="mt-1">Chi ha <b>oggi la nomina</b> nella scheda o nella Matrice abilitazioni, <b>con o senza attestato</b>.</p>
                <p className="mt-1 text-xs text-muted-foreground">Guarda l'organigramma attuale.</p>
              </div>
            </div>
            <p>
              Per avere l'elenco operativo, cioè chi ha <b>sia l'attestato sia l'incarico</b>, scegli il Gruppo corsi e spunta{" "}
              <b>«Solo incarichi attualmente assegnati»</b>: toglie chi ha l'attestato ma non ricopre più il ruolo (per esempio gli ex preposti).
              Vale per ogni gruppo che abbia un ruolo collegato nella Matrice; se non c'è, la spunta resta spenta e spiega come crearlo.
            </p>
            <p className="text-xs text-muted-foreground">Nella striscia «Filtri attivi» vedi sempre come è stato fatto l'elenco: «Per attestato: …» oppure «Per incarico: …».</p>
          </Sezione>

          <Sezione id="selezione" titolo="Selezione rapida">
            <ul className="space-y-2">
              <Voce nome="Nuovi arrivati dell'anno">{SUGGERIMENTI.arrivi}</Voce>
              <Voce nome="Anagrafica incompleta">{SUGGERIMENTI.incompleta}</Voce>
              <Voce nome="Senza attestati">
                {SUGGERIMENTI.senzaAttestati} Scegli <b>«Manca almeno uno dei due»</b> oppure <b>«Nessuno dei due»</b> (né base né specifico).
              </Voce>
            </ul>
            <p className="text-xs text-muted-foreground">Le selezioni si combinano tra loro e con i filtri; accese, mostrano l'elenco dei lavoratori.</p>
          </Sezione>

          <Sezione id="documenti" titolo="Tipi di documento">
            <ul className="space-y-2">
              {(Object.keys(TITOLI_MODELLO) as Modello[]).map((m) => (
                <Voce key={m} nome={TITOLI_MODELLO[m]}>{SUGGERIMENTI_MODELLO[m]}</Voce>
              ))}
            </ul>
          </Sezione>

          <Sezione id="filtri" titolo="Filtri">
            <ul className="space-y-2">
              <Voce nome={<span className={ATT}>Gruppo corsi</span>}>{SUGGERIMENTI.gruppo}</Voce>
              <Voce nome={<span className={ATT}>Solo incarichi attualmente assegnati</span>}>{SUGGERIMENTI.soloIncarichi}</Voce>
              <Voce nome={<span className={INC}>Ruolo di sicurezza</span>}>{SUGGERIMENTI.ruolo}</Voce>
              <Voce nome="Reparto">{SUGGERIMENTI.reparto}</Voce>
              <Voce nome="Categoria / Profilo ATA">{SUGGERIMENTI.categoria}</Voce>
              <Voce nome="Classe di concorso">{SUGGERIMENTI.classe}</Voce>
              <Voce nome="Lavoratore">{SUGGERIMENTI.lavoratore}</Voce>
              <Voce nome="Scadenza">{SUGGERIMENTI.scadenza}</Voce>
            </ul>
          </Sezione>

          <Sezione id="opzioni" titolo="Opzioni">
            <ul className="space-y-2">
              <Voce nome="Solo l'attestato più recente per corso">{SUGGERIMENTI.soloUltimo}</Voce>
              <Voce nome="Stato lavoratore">{SUGGERIMENTI.statoLavoratori}</Voce>
              <Voce nome="Spazio firme in fondo">{SUGGERIMENTI.mostraFirme}</Voce>
              <Voce nome="Univoco">{SUGGERIMENTI.univoco} Non è disponibile nell'elenco lavoratori e nelle schede, che hanno già una persona per riga.</Voce>
            </ul>
            <p className="text-xs text-muted-foreground">Clicca il titolo di una colonna per ordinarla, ✕ per toglierla prima di stampare o esportare. In fondo al documento trovi il totale.</p>
          </Sezione>

          <Sezione id="colonne" titolo="Come leggere le colonne">
            <p><b>Corso base e Corso specifico</b> valgono per tutti:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>Sì – data</b> = data dell'ultimo corso approvato.</li>
              <li><b className="text-destructive">Scaduto – data</b> = corso da rifare.</li>
              <li><b>No</b> = nessun attestato approvato in archivio.</li>
            </ul>
            <p className="pt-1"><b>Preposto, Antincendio, Primo soccorso, Defibrillatore</b> dipendono dall'incarico:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><b>Sì – data</b> = ha il ruolo e l'attestato.</li>
              <li><b className="text-destructive">No</b> = ha il ruolo ma <b>manca l'attestato</b>.</li>
              <li><span className="font-semibold text-muted-foreground">NA</span> = il ruolo non è assegnato (non applicabile).</li>
              <li><b className="underline decoration-amber-500 decoration-2">Data in neretto</b> = ha l'attestato ma <b>non il ruolo</b> assegnato: verifica se va assegnato.</li>
            </ul>
            <p className="text-xs text-muted-foreground">Il neretto è visibile in anteprima e nel PDF; in CSV ed Excel resta solo il testo.</p>
          </Sezione>

          <section id="guida-ricette" className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
              <h3 className="text-base font-bold">Ricette rapide</h3>
              <button type="button" onClick={() => vai("indice")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowUp className="size-3" /> Indice
              </button>
            </div>
            {RICETTE.map((r) => {
              const filtri = r.applica(ruoli);
              return (
                <article key={r.id} id={`guida-ricetta-${r.id}`} className="scroll-mt-2 space-y-1.5 rounded-lg border border-border p-3">
                  <h4 className="font-semibold">{r.titolo}</h4>
                  <p className="text-muted-foreground">{r.scopo}</p>
                  <ol className="list-decimal space-y-0.5 pl-5">
                    {r.passi.map((p) => <li key={p}>{p}</li>)}
                  </ol>
                  <p><b className="text-emerald-700 dark:text-emerald-300">Cosa ottieni:</b> {r.risultato}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!filtri}
                      onClick={() => {
                        if (!filtri) return;
                        onApplica(filtri, r.titolo);
                        setAperto(false);
                      }}
                    >
                      Applica questi filtri
                    </Button>
                    {!filtri && r.nonDisponibile && <span className="text-xs text-destructive">{r.nonDisponibile}</span>}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
