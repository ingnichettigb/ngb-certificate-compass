/*
 * File:      calcolo-ciclo.ts
 * Percorso:  src/features/scadenze/calcolo-ciclo.ts
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 12:00): Motore puro: ciclo rigido ancorato al Base, somma ore, decadenza, sanatoria tardiva.
 * - Rev 2 (2026-11-06 14:00): Restituisce cicli ed eventi classificati per la linea temporale.
 * - Rev 3 (2026-11-06 16:00): Guardia su dataCorso mancante/non valida (record storici); parametro dataTaglio
 *   (regime transitorio Preposti: la scadenza non può essere anteriore al taglio).
 *
 * Regole implementate (vedi MODIFICHE_SCADENZE.md):
 * 1. Ancora = data dell'ultimo Corso Base (se nessun attestato è Base, il più vecchio).
 * 2. Cicli rigidi: il ciclo k termina in ancora + k * N anni (sempre calcolato dall'ancora).
 * 3. Le ore degli aggiornamenti si sommano. Raggiunto il monte ore, il ciclo in cui cade
 *    la data dell'ultimo attestato (e tutti i precedenti) risulta coperto: la scadenza è la fine del ciclo successivo.
 * 4. Sanatoria tardiva: un aggiornamento dopo la scadenza vale per il ciclo in cui cade la sua data
 *    e sana i cicli arretrati. Disattivabile con consentiSanatoriaTardiva = false.
 * 5. Decadenza: se dall'ultima evidenza (Base o aggiornamento che ha completato il monte ore)
 *    sono passati più di decadenzaAnni, gli aggiornamenti successivi non contano: serve un nuovo Base.
 * 6. Le ore in eccesso non si riportano al ciclo successivo.
 * 7. Taglio (facoltativo): se la scadenza calcolata cade prima della data di taglio, diventa la data di taglio
 *    (es. Preposti: periodicità biennale con termine unico al 19/05/2026 per le formazioni pregresse).
 */
import type {
  CicloVisuale,
  EventoCiclo,
  MotivoIgnorato,
  PosizioneCiclo,
  StatoCiclo,
  StatoConformita,
} from "./types";

export const DECADENZA_PREDEFINITA_ANNI = 10;

export interface AttestatoCiclo {
  id: string | number;
  /** Data del corso (YYYY-MM-DD). */
  dataCorso: string;
  /** Ore certificate; null se non note. */
  ore: number | null;
  /** true se le ore sono una stima (es. ore minime di legge) e non il dato dichiarato. */
  oreStimate?: boolean;
  /** true se l'attestato è un Corso Base. */
  eBase: boolean;
}

export interface ParametriCiclo {
  attestati: AttestatoCiclo[];
  /** Durata del ciclo in anni; 0 = il corso non scade. */
  durataCicloAnni: number;
  /** Ore di aggiornamento richieste per ciclo; 0 = basta un aggiornamento. */
  oreRichiesteAggiornamento: number;
  /** Anni dall'ultima evidenza oltre i quali si decade; null = nessuna decadenza. */
  decadenzaAnni?: number | null;
  giorniPreavviso?: number;
  consentiSanatoriaTardiva?: boolean;
  /** Data (YYYY-MM-DD) prima della quale la scadenza non può cadere (regime transitorio); null = nessun taglio. */
  dataTaglio?: string | null;
  oggi?: Date;
}

/* ---------- Utilità sulle date ISO (YYYY-MM-DD), senza fusi orari ---------- */

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function parti(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) throw new Error(`Data non valida: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function giorniNelMese(anno: number, mese: number): number {
  return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
}

/** Somma anni; il 29 febbraio in un anno non bisestile diventa 28 febbraio. */
export function aggiungiAnni(dataIso: string, anni: number): string {
  const [y, m, d] = parti(dataIso);
  const ny = y + anni;
  return `${pad(ny, 4)}-${pad(m)}-${pad(Math.min(d, giorniNelMese(ny, m)))}`;
}

/** Giorni da `da` ad `a` (negativo se `a` precede `da`). */
export function giorniTra(da: string, a: string): number {
  const [y1, m1, d1] = parti(da);
  const [y2, m2, d2] = parti(a);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Data di oggi nel fuso locale (non UTC), formato YYYY-MM-DD. */
export function oggiIso(oggi: Date = new Date()): string {
  return `${pad(oggi.getFullYear(), 4)}-${pad(oggi.getMonth() + 1)}-${pad(oggi.getDate())}`;
}

/** Anni interi trascorsi tra due date. */
export function anniCompleti(da: string, a: string): number {
  if (a <= da) return 0;
  let n = parti(a)[0] - parti(da)[0];
  if (aggiungiAnni(da, n) > a) n -= 1;
  return Math.max(0, n);
}

/* ---------- Motore ---------- */

export function valutaCicloFormativo(p: ParametriCiclo): PosizioneCiclo {
  const {
    oreRichiesteAggiornamento,
    decadenzaAnni = DECADENZA_PREDEFINITA_ANNI,
    giorniPreavviso = 90,
    consentiSanatoriaTardiva = true,
    dataTaglio = null,
  } = p;
  const oggi = oggiIso(p.oggi);
  const N = Math.round(p.durataCicloAnni);

  // Record storici senza data (o con data illeggibile) non possono entrare nel calcolo: si scartano.
  const ordinati = p.attestati
    .map((a) => ({ ...a, dataCorso: (a.dataCorso ?? "").slice(0, 10) }))
    .filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.dataCorso))
    .sort(
      (a, b) => a.dataCorso.localeCompare(b.dataCorso) || String(a.id).localeCompare(String(b.id)),
    );

  // Nessuna evidenza formativa: occorre il Corso Base.
  if (ordinati.length === 0) {
    return {
      dataAncora: null,
      scadenzaEffettiva: null,
      oreRichieste: oreRichiesteAggiornamento,
      oreAccumulate: 0,
      stato: "decaduto",
      giorniAllaScadenza: null,
      anniDallUltimoCorso: 0,
      richiedeNuovoCorsoBase: true,
      dataUltimaEvidenza: null,
      oreDaVerificare: false,
      aggiornamentiIgnorati: 0,
      durataCicloAnni: N >= 1 ? N : 0,
      dataValutazione: oggi,
      dataTaglio: null,
      scadenzaPortataAlTaglio: false,
      cicli: [],
      eventi: [],
    };
  }

  // 1. Ancora: ultimo Corso Base (altrimenti il più vecchio attestato).
  const basi = ordinati.filter((a) => a.eBase);
  const ancora = (basi.length > 0 ? basi[basi.length - 1] : ordinati[0])!;
  const dataAncora = ancora.dataCorso;

  // Corso senza scadenza.
  if (!(N >= 1)) {
    const ultimo = ordinati[ordinati.length - 1]!.dataCorso;
    return {
      dataAncora,
      scadenzaEffettiva: null,
      oreRichieste: 0,
      oreAccumulate: 0,
      stato: "senza_scadenza",
      giorniAllaScadenza: null,
      anniDallUltimoCorso: anniCompleti(ultimo, oggi),
      richiedeNuovoCorsoBase: false,
      dataUltimaEvidenza: ultimo,
      oreDaVerificare: false,
      aggiornamentiIgnorati: 0,
      durataCicloAnni: 0,
      dataValutazione: oggi,
      dataTaglio: null,
      scadenzaPortataAlTaglio: false,
      cicli: [],
      eventi: [],
    };
  }

  // 2. Cicli rigidi, sempre calcolati dall'ancora (nessun errore cumulato sul 29 febbraio).
  const fineCiclo = (k: number) => aggiungiAnni(dataAncora, k * N);
  const cicloDi = (data: string) => {
    let k = 1;
    while (data > fineCiclo(k)) k++;
    return k;
  };

  const soglia = oreRichiesteAggiornamento > 0 ? oreRichiesteAggiornamento : null;
  let ultimaEvidenza = dataAncora;
  let copertoFino = 0; // ultimo ciclo coperto da un completamento
  let pool = 0; // ore parziali non ancora sufficienti
  let nPool = 0;
  let ignorati = 0;
  let oreDaVerificare = false;
  const eventi: EventoCiclo[] = [
    { id: ancora.id, data: dataAncora, ore: ancora.ore, tipo: "base" },
  ];

  // 3-6. Aggiornamenti in ordine cronologico.
  for (const u of ordinati) {
    if (u === ancora || u.eBase) continue;
    if (u.dataCorso < dataAncora) continue; // precedente al Base corrente: irrilevante
    const ignora = (motivo: MotivoIgnorato) => {
      ignorati++;
      eventi.push({ id: u.id, data: u.dataCorso, ore: u.ore, tipo: "ignorato", motivo });
    };
    if (u.dataCorso > oggi) {
      ignora("futuro");
      continue;
    }
    if (decadenzaAnni !== null && u.dataCorso > aggiungiAnni(ultimaEvidenza, decadenzaAnni)) {
      ignora("decaduto"); // l'abilitazione era già decaduta
      continue;
    }
    const k = cicloDi(u.dataCorso);
    if (k <= copertoFino) {
      ignora("in_eccesso"); // ciclo già coperto: ore in eccesso, non si riportano
      continue;
    }
    if (k > copertoFino + 1 && !consentiSanatoriaTardiva) {
      ignora("tardivo_non_ammesso");
      continue;
    }
    if (u.ore === null || u.oreStimate) oreDaVerificare = true;
    pool += u.ore ?? 0;
    nPool++;
    const completo = soglia === null ? nPool > 0 : pool >= soglia;
    eventi.push({
      id: u.id,
      data: u.dataCorso,
      ore: u.ore,
      tipo: completo ? "completo" : "parziale",
    });
    if (completo) {
      copertoFino = k;
      ultimaEvidenza = u.dataCorso;
      pool = 0;
      nPool = 0;
    }
  }

  // 7. Taglio: la scadenza non può precedere la data di taglio (regime transitorio).
  const scadenzaRigida = fineCiclo(copertoFino + 1);
  const scadenzaPortataAlTaglio = dataTaglio !== null && scadenzaRigida < dataTaglio;
  const scadenzaEffettiva = scadenzaPortataAlTaglio ? (dataTaglio as string) : scadenzaRigida;
  const giorniAllaScadenza = giorniTra(oggi, scadenzaEffettiva);
  const decaduto = decadenzaAnni !== null && oggi > aggiungiAnni(ultimaEvidenza, decadenzaAnni);

  let stato: StatoConformita;
  if (decaduto) stato = "decaduto";
  else if (scadenzaEffettiva < oggi) stato = "scaduto_sanabile";
  else if (pool > 0) stato = "incompleto_ore";
  else if (giorniAllaScadenza <= giorniPreavviso) stato = "in_scadenza";
  else stato = "valido";

  // Cicli per la linea temporale: dal primo al ciclo di oggi, più il successivo non attivo.
  const dataDecadenza = decadenzaAnni !== null ? aggiungiAnni(ultimaEvidenza, decadenzaAnni) : null;
  const kMax = Math.max(cicloDi(oggi), copertoFino);
  const cicli: CicloVisuale[] = [];
  for (let k = 1; k <= kMax; k++) {
    const inizio = k === 1 ? dataAncora : fineCiclo(k - 1);
    const fine = fineCiclo(k);
    const attivo = k === copertoFino + 1;
    let statoCiclo: StatoCiclo;
    if (k <= copertoFino) statoCiclo = "completato";
    else if (decaduto && dataDecadenza !== null && fine > dataDecadenza) statoCiclo = "decaduto";
    else if (inizio > oggi) statoCiclo = "futuro";
    else if (fine < oggi) statoCiclo = "scaduto";
    else statoCiclo = "da_completare";
    cicli.push({
      indice: k,
      inizio,
      fine,
      stato: statoCiclo,
      oreAccumulate: attivo ? pool : 0,
      oreRichieste: oreRichiesteAggiornamento,
      attivo,
    });
  }
  if (!decaduto) {
    const k = kMax + 1;
    cicli.push({
      indice: k,
      inizio: fineCiclo(k - 1),
      fine: fineCiclo(k),
      stato: "futuro",
      oreAccumulate: 0,
      oreRichieste: oreRichiesteAggiornamento,
      attivo: k === copertoFino + 1,
    });
  }

  return {
    dataAncora,
    scadenzaEffettiva,
    oreRichieste: oreRichiesteAggiornamento,
    oreAccumulate: pool,
    stato,
    giorniAllaScadenza,
    anniDallUltimoCorso: anniCompleti(ultimaEvidenza, oggi),
    richiedeNuovoCorsoBase: decaduto,
    dataUltimaEvidenza: ultimaEvidenza,
    oreDaVerificare,
    aggiornamentiIgnorati: ignorati,
    durataCicloAnni: N,
    dataValutazione: oggi,
    dataTaglio,
    scadenzaPortataAlTaglio,
    cicli,
    eventi,
  };
}
