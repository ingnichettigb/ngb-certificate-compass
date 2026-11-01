/*
 * File:          regole-ditta.ts
 * Percorso:      src/features/ditta/regole-ditta.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:00): Regole sui dati della ditta: fasce dalle soglie del database, controllo dei codici ATECO,
 *     suggerimento del rischio, anno scolastico e avvisi quando i dati dichiarati non sono più allineati alla realtà.
 */

export type AmbitoSoglia = "rls" | "primo_soccorso" | "antincendio_presenze" | "idoneita_tecnica_presenze";

export type Soglia = {
  id: string;
  ambito: string;
  da: number;
  a: number | null;
  etichetta: string;
  esito: string;
  note?: string | null;
  attiva: boolean;
};

export type LivelloRischio = "basso" | "medio" | "alto";

export type CodiceAteco = {
  codice: string;
  descrizione?: string | null;
  rischio?: LivelloRischio | null;
  principale?: boolean;
};

/** Trova la fascia (riga di soglie_ditta) che contiene il numero. */
export function trovaSoglia(soglie: Soglia[], ambito: AmbitoSoglia, n: number | null | undefined): Soglia | null {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  return (
    soglie.find((s) => s.attiva && s.ambito === ambito && n >= s.da && (s.a === null || n <= s.a)) ?? null
  );
}

/**
 * Normalizza un codice ATECO 2007 e lo controlla. Accetta «85», «85.31», «85.31.2», «85.31.20» o le sole cifre
 * («853120»). Restituisce null se il formato non è valido.
 */
export function normalizzaAteco(testo: string): string | null {
  const t = testo.trim().replace(/\s+/g, "");
  if (/^\d{6}$/.test(t)) return `${t.slice(0, 2)}.${t.slice(2, 4)}.${t.slice(4)}`;
  if (/^\d{4}$/.test(t)) return `${t.slice(0, 2)}.${t.slice(2)}`;
  if (/^\d{2}(\.\d{1,2}){0,2}$/.test(t)) return t;
  return null;
}

/**
 * Suggerimento della classe di rischio dal codice ATECO. Per ora solo l'Istruzione (divisione 85), classificata a rischio
 * medio dall'Accordo Stato-Regioni del 17/4/2025: la tabella completa dell'Allegato IV non è ancora caricata.
 * È solo un suggerimento: per legge conta la valutazione dei rischi.
 */
export function suggerisciRischioAteco(codice: string): LivelloRischio | null {
  return codice.startsWith("85") ? "medio" : null;
}

/** Primo settembre dell'anno scolastico in corso (da settembre a dicembre è quello dell'anno, poi quello precedente). */
export function inizioAnnoScolastico(oggi: Date): string {
  const anno = oggi.getMonth() >= 8 ? oggi.getFullYear() : oggi.getFullYear() - 1;
  return `${anno}-09-01`;
}

export type DatiPerAvvisi = {
  n_lavoratori_dichiarato?: number | null;
  e_scuola?: boolean | null;
  presenze_contemporanee_max?: number | null;
  presenze_data_aggiornamento?: string | null;
};

export type AvvisoDitta = { chiave: string; testo: string; dettaglio?: string };

/**
 * Avvisi sui dati ditta: numero lavoratori mancante o non più coerente con quelli in forza nel programma,
 * presenze della scuola mancanti o non aggiornate per l'anno scolastico in corso.
 */
export function calcolaAvvisi(
  ditta: DatiPerAvvisi | null,
  soglie: Soglia[],
  inForza: number | null,
  oggi: Date = new Date(),
): AvvisoDitta[] {
  if (!ditta) return [];
  const avvisi: AvvisoDitta[] = [];
  const dichiarati = ditta.n_lavoratori_dichiarato ?? null;

  if (dichiarati === null) {
    avvisi.push({
      chiave: "lavoratori-mancanti",
      testo: "Numero dei lavoratori non dichiarato",
      dettaglio: "Serve per stabilire RLS e gruppo di Primo Soccorso. Compilalo in Impostazioni generali > Ditta.",
    });
  } else if (inForza !== null) {
    const diversi: string[] = [];
    for (const ambito of ["rls", "primo_soccorso"] as const) {
      const dich = trovaSoglia(soglie, ambito, dichiarati);
      const reale = trovaSoglia(soglie, ambito, inForza);
      if (dich && reale && dich.id !== reale.id) {
        diversi.push(`${ambito === "rls" ? "RLS" : "Primo Soccorso"}: dichiarata «${dich.etichetta}», reale «${reale.etichetta}»`);
      }
    }
    if (diversi.length > 0) {
      avvisi.push({
        chiave: "lavoratori-fascia",
        testo: `Lavoratori in forza (${inForza}) non più in linea con la fascia dichiarata (${dichiarati})`,
        dettaglio: `${diversi.join(". ")}. Aggiorna il numero in Impostazioni generali > Ditta.`,
      });
    }
  }

  if (ditta.e_scuola) {
    const presenze = ditta.presenze_contemporanee_max ?? null;
    if (presenze === null) {
      avvisi.push({
        chiave: "presenze-mancanti",
        testo: "Presenze contemporanee della scuola non indicate",
        dettaglio: "Servono per il livello antincendio. Compilale in Impostazioni generali > Ditta.",
      });
    } else if (!ditta.presenze_data_aggiornamento || ditta.presenze_data_aggiornamento < inizioAnnoScolastico(oggi)) {
      avvisi.push({
        chiave: "presenze-vecchie",
        testo: "Presenze della scuola da aggiornare per l'anno scolastico in corso",
        dettaglio: "Alunni + personale presenti contemporaneamente: controlla il numero e salvalo di nuovo.",
      });
    }
  }
  return avvisi;
}
