/*
 * File:      piano-blocchi.ts
 * Percorso:  src/features/stampe/globale/piano-blocchi.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — «Stampa globale»: ordine alfabetico dei lavoratori, divisione in blocchi sotto un limite di dimensione
 *            (un lavoratore non viene mai spezzato), intervallo di lettere «DA A a D» e nome file
 *            «NN-AAMMGGhh-STAMPA GLOBALE-DITTA-DA X a Y.pdf». Solo logica pura, senza interfaccia né rete.
 */

export type VoceStima = { id: string; cognome: string; nome: string; byte: number };

export type Blocco = {
  /** 1, 2, 3… */
  numero: number;
  voci: VoceStima[];
  /** Stima totale del file (copertina, A3 nel primo blocco, schede, allegati, pagina finale). */
  byte: number;
  /** Prima e ultima lettera dei cognomi del blocco. */
  da: string;
  a: string;
  /** true se un solo lavoratore, da solo, supera già il limite (non si può dividere di più). */
  oltreLimite: boolean;
};

export const LIMITE_PREDEFINITO_MB = 100;
/** Pesi fissi stimati (byte): copertina con logo, tavola A3 (solo blocco 1), pagina finale di indice e controllo. */
export const BYTE_COPERTINA = 120_000;
export const BYTE_A3 = 80_000;
export const BYTE_FINALE = 20_000;
export const BYTE_SCHEDA = 25_000;

const MB = 1024 * 1024;
export const mbInByte = (mb: number) => Math.round(mb * MB);
export const byteInMb = (b: number) => b / MB;

/** Cognome e nome in ordine alfabetico italiano, senza distinguere maiuscole e accenti. */
export function ordinaLavoratori<T extends { cognome: string; nome: string }>(
  elenco: readonly T[],
): T[] {
  const conf = (a: string, b: string) => a.localeCompare(b, "it", { sensitivity: "base" });
  return [...elenco].sort(
    (x, y) => conf(x.cognome.trim(), y.cognome.trim()) || conf(x.nome.trim(), y.nome.trim()),
  );
}

/** Iniziale maiuscola del cognome, senza accento («Èbano» → «E»); «#» se non c'è una lettera. */
export function iniziale(cognome: string): string {
  const base = cognome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const m = base.match(/[A-Za-z]/);
  return m ? m[0].toUpperCase() : "#";
}

export function pesoFisso(numero: number): number {
  return BYTE_COPERTINA + BYTE_FINALE + (numero === 1 ? BYTE_A3 : 0);
}

/**
 * Divide in blocchi consecutivi, in ordine alfabetico: il blocco si chiude quando il lavoratore successivo
 * lo porterebbe oltre il limite. Un lavoratore non è mai diviso tra due file.
 */
export function dividiInBlocchi(voci: readonly VoceStima[], limiteByte: number): Blocco[] {
  const ordinate = ordinaLavoratori(voci);
  const blocchi: Blocco[] = [];
  let correnti: VoceStima[] = [];
  let peso = 0;

  const chiudi = () => {
    if (!correnti.length) return;
    const primo = correnti[0];
    const ultimo = correnti[correnti.length - 1];
    if (!primo || !ultimo) return;
    const numero = blocchi.length + 1;
    blocchi.push({
      numero,
      voci: correnti,
      byte: peso,
      da: iniziale(primo.cognome),
      a: iniziale(ultimo.cognome),
      oltreLimite: correnti.length === 1 && peso > limiteByte,
    });
    correnti = [];
    peso = 0;
  };

  for (const v of ordinate) {
    const numeroCorrente = blocchi.length + 1;
    if (!correnti.length) peso = pesoFisso(numeroCorrente);
    if (correnti.length && peso + v.byte > limiteByte) {
      chiudi();
      peso = pesoFisso(blocchi.length + 1);
    }
    correnti.push(v);
    peso += v.byte;
  }
  chiudi();
  return blocchi;
}

/** Timestamp AAMMGGhh (anno a 2 cifre, mese, giorno, ora). */
export function timestampAAMMGGhh(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}`;
}

/** Ragione sociale pulita dai caratteri non ammessi nei nomi file. */
export function nomeDittaPerFile(ditta: string | null | undefined): string {
  const pulita = (ditta ?? "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 60)
    .trim();
  return pulita || "DITTA";
}

export function etichettaIntervallo(da: string, a: string): string {
  return `DA ${da} a ${a}`;
}

/** «01-26111114-STAMPA GLOBALE-ROSSI SRL-DA A a D.pdf» */
export function nomeFileBlocco(o: {
  numero: number;
  data: Date;
  ditta: string | null | undefined;
  da: string;
  a: string;
}): string {
  const n = String(o.numero).padStart(2, "0");
  return `${n}-${timestampAAMMGGhh(o.data)}-STAMPA GLOBALE-${nomeDittaPerFile(o.ditta)}-${etichettaIntervallo(o.da, o.a)}.pdf`;
}
