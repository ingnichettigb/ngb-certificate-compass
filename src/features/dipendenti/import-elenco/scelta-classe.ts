/*
 * File:      scelta-classe.ts
 * Percorso:  src/features/dipendenti/import-elenco/scelta-classe.ts
 * Creato:    12/11/2026
 * Scelta guidata di classe di concorso / profilo ATA nell'importazione «Solo nuovi»: quando la colonna manca o contiene
 * un codice che in archivio non esiste (o è troppo diverso), il programma propone le classi più simili e chiede cosa fare:
 * sceglierne una, lasciare vuoto (si completa dalla scheda) oppure crearla. Se la classe c'è, come materia si usa il nome
 * che è già in archivio. Logica pura, senza database.
 * Revisioni:
 *   rev 1 — 12/11/2026 — Prima stesura.
 */
import { PROFILI_ATA, type ProfiloAta, type RigaNuovo } from "./analisi-elenco";

export type ClasseArchivio = { codice: string; denominazione: string | null };

/** Decisione presa dall'utente per una riga. */
export type SceltaRiga =
  | { tipo: "classe"; codice: string }
  | { tipo: "profilo"; profilo: ProfiloAta }
  | { tipo: "nuova"; codice: string }
  | { tipo: "vuoto" };

const compatta = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, "");

function distanza(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[a.length]![b.length]!;
}

/** Le classi più simili al testo scritto nel file (codice quasi uguale o stessa materia), dalla più vicina. Massimo 5. */
export function suggerisciClassi(testo: string, classi: ClasseArchivio[]): ClasseArchivio[] {
  const t = compatta(testo);
  if (!t) return [];
  const parole = testo.toLowerCase().split(/[^a-zàèéìòù]+/).filter((p) => p.length >= 4);
  return classi
    .map((c) => {
      const cod = compatta(c.codice);
      let punti = distanza(t, cod);
      if (cod.startsWith(t) || t.startsWith(cod)) punti = Math.min(punti, 1);
      const nome = (c.denominazione ?? "").toLowerCase();
      if (parole.some((p) => nome.includes(p))) punti = Math.min(punti, 1.5);
      return { c, punti };
    })
    .filter((x) => x.punti <= 2)
    .sort((a, b) => a.punti - b.punti || a.c.codice.localeCompare(b.c.codice))
    .slice(0, 5)
    .map((x) => x.c);
}

/** Il testo scritto nel file somiglia a un codice di classe (es. «A27», «AB-24», «IRC») e quindi si può proporre di crearla. */
export function sembraCodiceClasse(testo: string): boolean {
  return /^[A-Za-z]{1,3}[\s-]?\d{0,3}[A-Za-z]{0,2}$/.test(testo.trim()) && compatta(testo).length >= 2;
}

/** Su questa riga bisogna chiedere cosa fare: lavoratore nuovo, Docente senza classe o ATA senza profilo. */
export function serveDecisione(r: RigaNuovo): boolean {
  if (r.categoria !== "nuovo") return false;
  return r.reparto === "Docente" ? !r.classe : !r.sottorepartoAta;
}

/** Nome della classe come è scritto in archivio (null se non c'è). */
export function nomeClasseArchivio(codice: string | null, classi: ClasseArchivio[]): string | null {
  if (!codice) return null;
  return classi.find((c) => c.codice.toUpperCase() === codice.toUpperCase())?.denominazione?.trim() || null;
}

/** Applica a una riga la decisione dell'utente e il nome della classe preso dall'archivio. */
export function applicaSceltaRiga(r: RigaNuovo, scelta: SceltaRiga | undefined, classi: ClasseArchivio[]): RigaNuovo {
  let out = r;
  if (scelta?.tipo === "classe") out = { ...r, reparto: "Docente", classe: scelta.codice, sottorepartoAta: null };
  else if (scelta?.tipo === "nuova") out = { ...r, reparto: "Docente", classe: scelta.codice.trim().toUpperCase(), sottorepartoAta: null };
  else if (scelta?.tipo === "profilo") out = { ...r, reparto: "ATA", sottorepartoAta: scelta.profilo, classe: null, materia: null };
  const nome = nomeClasseArchivio(out.classe, classi);
  if (nome) out = { ...out, materia: nome };
  return out;
}

/** Valore testuale per la tendina → decisione, e viceversa. */
export function sceltaDaValore(v: string): SceltaRiga | undefined {
  if (v === "__vuoto") return { tipo: "vuoto" };
  if (v.startsWith("c:")) return { tipo: "classe", codice: v.slice(2) };
  if (v.startsWith("n:")) return { tipo: "nuova", codice: v.slice(2) };
  if (v.startsWith("p:")) {
    const nome = v.slice(2);
    const p = PROFILI_ATA.find((x) => x.nome === nome);
    return p ? { tipo: "profilo", profilo: p.nome } : undefined;
  }
  return undefined;
}

export function valoreDaScelta(s: SceltaRiga | undefined): string {
  if (!s) return "";
  if (s.tipo === "vuoto") return "__vuoto";
  if (s.tipo === "classe") return `c:${s.codice}`;
  if (s.tipo === "nuova") return `n:${s.codice}`;
  return `p:${s.profilo}`;
}
