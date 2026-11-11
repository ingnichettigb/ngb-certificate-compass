/*
 * File:      incarichi.ts
 * Percorso:  src/lib/api/incarichi.ts
 * Incarichi di sicurezza e stato delle scadenze.
 * - Rev (2026-11-06 18:00): per i Preposti lo stato deriva dal motore dei cicli (regime transitorio 19/05/2026),
 *   non dal vecchio campo data_scadenza_calcolata a 5 anni.
 * - Rev (2026-11-11 10:45): Aggiunto incarico «Addetto all'evacuazione» (EME-EVA-02 base, EME-EAA-02 aggiornamento),
 *   riconosciuto per codice corso perché nel catalogo entrambi hanno livello «Base».
 */
import { applicaScadenzaPreposti } from "@/features/scadenze/preposti";
import type { Attestato } from "./attestati";

export type LivelloKey = "Base" | "Specifico" | "Aggiornamento";

export type Incarico = {
  key: string;
  label: string;
  categoria: string;
  livelli: LivelloKey[];
  /** Se presente, il livello si riconosce dal codice corso invece che da macro-categoria + livello. */
  codiciPerLivello?: Partial<Record<LivelloKey, string[]>>;
};

export const INCARICHI: Incarico[] = [
  {
    key: "lavoratore",
    label: "Sicurezza Lavoratori",
    categoria: "Sicurezza Lavoratori",
    livelli: ["Base", "Specifico", "Aggiornamento"],
  },
  {
    key: "preposto",
    label: "Preposto",
    categoria: "Preposto",
    livelli: ["Specifico", "Aggiornamento"],
  },
  {
    key: "primo-soccorso",
    label: "Primo Soccorso",
    categoria: "Primo Soccorso",
    livelli: ["Base", "Aggiornamento"],
  },
  {
    key: "antincendio",
    label: "Antincendio",
    categoria: "Antincendio",
    livelli: ["Base", "Aggiornamento"],
  },
  {
    key: "defibrillatore",
    label: "Defibrillatore (BLSD)",
    categoria: "Defibrillatore",
    livelli: ["Base", "Aggiornamento"],
  },
  {
    key: "evacuazione",
    label: "Addetto all'evacuazione",
    categoria: "Emergenze",
    livelli: ["Base", "Aggiornamento"],
    codiciPerLivello: { Base: ["EME-EVA-02"], Aggiornamento: ["EME-EAA-02"] },
  },
];

export type StatoScadenza = "valido" | "in-scadenza" | "scaduto" | "mancante";

export type VoceIncarico = {
  livello: LivelloKey;
  attestato: Attestato | null;
  stato: StatoScadenza;
};

export type RiepilogoIncarico = {
  incarico: Incarico;
  voci: VoceIncarico[];
  ricoperto: boolean;
  peggiore: StatoScadenza;
};

export function statoScadenza(d: string | null | undefined): StatoScadenza {
  if (!d) return "valido";
  const oggi = new Date();
  const scad = new Date(d);
  const giorni = Math.floor((scad.getTime() - oggi.getTime()) / 86400000);
  if (giorni < 0) return "scaduto";
  if (giorni <= 90) return "in-scadenza";
  return "valido";
}

export function scadenzaBadgeClass(s: StatoScadenza) {
  if (s === "scaduto") return "bg-destructive/12 text-destructive border-destructive/30";
  if (s === "in-scadenza") return "bg-warning/15 text-warning-foreground border-warning/35";
  if (s === "valido") return "bg-success/12 text-success border-success/30";
  return "bg-muted text-muted-foreground border-border";
}

export function etichettaStato(s: StatoScadenza) {
  if (s === "scaduto") return "Scaduto";
  if (s === "in-scadenza") return "In scadenza";
  if (s === "valido") return "Valido";
  return "Mancante";
}

const ORDINE: StatoScadenza[] = ["scaduto", "in-scadenza", "mancante", "valido"];

export function riepilogoIncarichi(attestatiGrezzi: Attestato[]): RiepilogoIncarico[] {
  const attestati = applicaScadenzaPreposti(attestatiGrezzi);
  return INCARICHI.map((incarico) => {
    const voci: VoceIncarico[] = incarico.livelli.map((livello) => {
      const candidati = attestati
        .filter((a) => {
          const codici = incarico.codiciPerLivello?.[livello];
          if (codici) return codici.includes((a.tipi_corso?.codice ?? "").toUpperCase().trim());
          return (
            a.tipi_corso?.macro_categoria === incarico.categoria &&
            a.tipi_corso?.livello_specifico === livello
          );
        })
        .sort((a, b) => (a.data_corso < b.data_corso ? 1 : -1));
      const attestato = candidati[0] ?? null;
      return {
        livello,
        attestato,
        stato: attestato ? statoScadenza(attestato.data_scadenza_calcolata) : "mancante",
      };
    });
    const ricoperto = voci.some((v) => v.attestato);
    const peggiore = ricoperto
      ? (ORDINE.find((s) => voci.some((v) => v.attestato && v.stato === s)) ?? "valido")
      : "mancante";
    return { incarico, voci, ricoperto, peggiore };
  });
}
