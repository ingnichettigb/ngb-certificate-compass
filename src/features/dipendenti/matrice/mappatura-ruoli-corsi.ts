/*
 * File:          mappatura-ruoli-corsi.ts
 * Percorso:      src/features/dipendenti/matrice/mappatura-ruoli-corsi.ts
 * Data creazione: 2026-11-02
 * Revisioni:
 *   - Rev 1 (2026-11-02 10:25): Modulo di collegamento logico Ruoli di sicurezza <-> Corsi e gruppi
 *     in funzione del rischio aziendale (D.Lgs. 81/08), con risoluzione automatica e fallback.
 *   - Rev 2 (2026-11-10): isCorsoObbligatorioPerDipendente non richiede l'aggiornamento Preposto a chi ha un RSPP valido.
 *   - Rev 3 (2026-11-20 16:20): trovaRuoloPerCorso cerca prima il ruolo per CODICE stabile (dal prefisso del codice corso);
 *     i vecchi confronti per nome restano come ripiego finché la tabella ruoli non è bonificata.
 *   - Rev 4 (2026-11-21): Ricerca per codice senza cast (RuoloSicurezza ha ora codice); i corsi delle attrezzature (LAV-…)
 *     vanno solo al loro ruolo OPER_… e, se manca, a nessuno: prima il ripiego «Sicurezza lavoratori» li legava al ruolo
 *     Lavoratore (obbligatorio per tutti). La fonte definitiva sarà la Tabella 02 (Fase 2).
 */

import type { TipoCorso, RuoloSicurezza } from "@/lib/api";
import { codiceRuoloAttrezzatura, normalizzaCodice, trovaRuoloPerCodice } from "@/lib/api/codici-ruoli";
import { eAggiornamentoPreposto, type ValiditaRspp } from "@/features/scadenze/esenzioni-rspp";

/** Prefisso codice corso -> codice stabile del ruolo (ruoli_sicurezza.codice). */
export const RUOLO_PER_PREFISSO_CORSO: [string, string][] = [
  ["BLS-", "ADD_DAE"],
  ["PRP-", "PREPOSTO"],
  ["PSO-", "ADD_PRIMO_SOCCORSO"],
  ["VFF-", "ADD_ANTINCENDIO"],
  ["ANT-", "ADD_ANTINCENDIO"],
  ["EME-", "ADD_EVACUAZIONE"],
  ["RLS-", "RLS"],
  ["SIC-ASPP", "ASPP"],
  ["SIC-RSPP", "RSPP"],
  ["PRIVACY-", "INC_PRIVACY"],
];

/** Ruolo attivo con il codice stabile atteso per il codice del corso, se già presente nel catalogo. */
export function ruoloPerCodiceCorso(
  codiceCorso: string | null | undefined,
  ruoliCatalogo: RuoloSicurezza[],
): RuoloSicurezza | null {
  const cod = normalizzaCodice(codiceCorso);
  if (!cod) return null;
  const voce = RUOLO_PER_PREFISSO_CORSO.find(([pref]) => cod.startsWith(pref));
  if (!voce) return null;
  return trovaRuoloPerCodice(ruoliCatalogo, voce[1]) ?? null;
}

function normalizza(str: string | null | undefined): string {
  return (str ?? "").toLowerCase().trim();
}

/**
 * Individua il ruolo di sicurezza primario da attivare/disattivare quando si interagisce
 * con un corso o una colonna nella matrice dei fabbisogni.
 */
export function trovaRuoloPerCorso(
  corso: TipoCorso,
  ruoliCatalogo: RuoloSicurezza[],
): RuoloSicurezza | null {
  const nomeC = normalizza(corso.nome_corso);
  const macroC = normalizza(corso.macro_categoria);
  const codC = normalizzaCodice(corso.codice);

  // 0. Corrispondenza per codice stabile del ruolo
  const perCodice = ruoloPerCodiceCorso(codC, ruoliCatalogo);
  if (perCodice) return perCodice;

  // 0b. Attrezzature (LAV-…): solo il ruolo OPER_… dedicato; se non esiste, nessun ruolo (mai il Lavoratore)
  const codAttrezzatura = codiceRuoloAttrezzatura(codC);
  if (codAttrezzatura) return trovaRuoloPerCodice(ruoliCatalogo, codAttrezzatura) ?? null;

  // 1. Corrispondenza esatta per nome
  const esatto = ruoliCatalogo.find((r) => r.attivo && normalizza(r.nome) === nomeC);
  if (esatto) return esatto;

  // 2. Gruppo Defibrillatore / BLSD
  if (
    macroC.includes("defibrillatore") ||
    codC.startsWith("BLS-") ||
    nomeC.includes("dae") ||
    nomeC.includes("blsd")
  ) {
    const dae = ruoliCatalogo.find(
      (r) =>
        r.attivo &&
        (normalizza(r.macro_categoria).includes("defibrillatore") ||
          normalizza(r.nome).includes("defibrillatore") ||
          normalizza(r.nome).includes("blsd")),
    );
    if (dae) return dae;
  }

  // 3. Gruppo Preposti
  if (macroC.includes("preposto") || codC.startsWith("PRP-") || nomeC.includes("preposto")) {
    const prep = ruoliCatalogo.find(
      (r) =>
        r.attivo &&
        (normalizza(r.nome) === "preposto" || normalizza(r.macro_categoria).includes("preposto")),
    );
    if (prep) return prep;
  }

  // 4. Gruppo Primo Soccorso
  if (
    macroC.includes("primo soccorso") ||
    codC.startsWith("PSO-") ||
    nomeC.includes("primo soccorso")
  ) {
    const psoBase = ruoliCatalogo.find(
      (r) =>
        r.attivo &&
        normalizza(r.nome).includes("primo soccorso") &&
        !normalizza(r.nome).includes("aggiornamento"),
    );
    if (psoBase) return psoBase;
    const pso = ruoliCatalogo.find(
      (r) =>
        r.attivo &&
        (normalizza(r.macro_categoria).includes("primo soccorso") ||
          normalizza(r.nome).includes("primo soccorso")),
    );
    if (pso) return pso;
  }

  // 5. Gruppo Antincendio
  if (
    macroC.includes("antincendio") ||
    codC.startsWith("VFF-") ||
    codC.startsWith("ANT-") ||
    nomeC.includes("antincendio") ||
    nomeC.includes("vvff")
  ) {
    const ant = ruoliCatalogo.find(
      (r) =>
        r.attivo &&
        (normalizza(r.macro_categoria).includes("antincendio") ||
          normalizza(r.nome).includes("antincendio")),
    );
    if (ant) return ant;
  }

  // 6. Gruppo Evacuazione ed Emergenze
  if (
    macroC.includes("emergenz") ||
    macroC.includes("evacuaz") ||
    codC.startsWith("EME-") ||
    nomeC.includes("evacuazione")
  ) {
    const eva = ruoliCatalogo.find(
      (r) =>
        r.attivo &&
        (normalizza(r.nome).includes("evacuazione") ||
          normalizza(r.nome).includes("emergenze") ||
          normalizza(r.macro_categoria).includes("emergenz")),
    );
    if (eva) return eva;
  }

  // 7. Sicurezza Lavoratori
  if (macroC.includes("sicurezza") || codC.startsWith("SIC-")) {
    const parziale = ruoliCatalogo.find(
      (r) => r.attivo && nomeC.includes(normalizza(r.nome)),
    );
    if (parziale) return parziale;
    const lav = ruoliCatalogo.find(
      (r) => r.attivo && (r.obbligatorio_tutti || normalizza(r.nome) === "lavoratore"),
    );
    if (lav) return lav;
  }

  // 8. Fallback per macro-categoria
  return (
    ruoliCatalogo.find(
      (r) => r.attivo && r.macro_categoria && normalizza(r.macro_categoria) === macroC,
    ) ?? null
  );
}

/**
 * Individua il ruolo primario associato a una macro-chiave di gruppo
 * (es. "defibrillatore" -> Addetto BLSD / Defibrillatore).
 */
export function trovaRuoloPerChiaveGruppo(
  chiaveGruppo: string,
  ruoliCatalogo: RuoloSicurezza[],
): RuoloSicurezza | null {
  const chiave = normalizza(chiaveGruppo);
  if (chiave.includes("defibrillatore")) {
    return (
      ruoliCatalogo.find(
        (r) =>
          r.attivo &&
          (normalizza(r.nome).includes("defibrillatore") ||
            normalizza(r.nome).includes("blsd") ||
            normalizza(r.macro_categoria).includes("defibrillatore")),
      ) ?? null
    );
  }
  if (chiave.includes("antincendio")) {
    return (
      ruoliCatalogo.find(
        (r) =>
          r.attivo &&
          (normalizza(r.macro_categoria).includes("antincendio") ||
            normalizza(r.nome).includes("antincendio")),
      ) ?? null
    );
  }
  if (chiave.includes("primo-soccorso")) {
    return (
      ruoliCatalogo.find(
        (r) =>
          r.attivo &&
          normalizza(r.nome).includes("primo soccorso") &&
          !normalizza(r.nome).includes("aggiornamento"),
      ) ??
      ruoliCatalogo.find((r) => r.attivo && normalizza(r.nome).includes("primo soccorso")) ??
      null
    );
  }
  if (chiave.includes("preposti")) {
    return (
      ruoliCatalogo.find(
        (r) =>
          r.attivo &&
          (normalizza(r.nome) === "preposto" ||
            normalizza(r.macro_categoria).includes("preposto")),
      ) ?? null
    );
  }
  if (chiave.includes("evacuazione")) {
    return (
      ruoliCatalogo.find(
        (r) =>
          r.attivo &&
          (normalizza(r.nome).includes("evacuazione") ||
            normalizza(r.nome).includes("emergenze") ||
            normalizza(r.macro_categoria).includes("emergenz")),
      ) ?? null
    );
  }
  if (chiave.includes("sicurezza-lavoratori")) {
    return (
      ruoliCatalogo.find(
        (r) => r.attivo && (r.obbligatorio_tutti || normalizza(r.nome) === "lavoratore"),
      ) ?? null
    );
  }
  return null;
}

/**
 * Determina se un corso è obbligatorio per un dato dipendente in base
 * ai ruoli di sicurezza attualmente assegnati (o obbligatori per tutti).
 */
export function isCorsoObbligatorioPerDipendente(
  dipendenteId: string,
  corso: TipoCorso,
  ruoliCatalogo: RuoloSicurezza[],
  mappaAssegnazioni: Set<string>,
  /** RSPP valido del lavoratore (se c'è): esonera dall'aggiornamento Preposto, non dal corso base. */
  rspp: ValiditaRspp | null = null,
): boolean {
  if (rspp && eAggiornamentoPreposto(corso)) return false;
  const ruolo = trovaRuoloPerCorso(corso, ruoliCatalogo);
  if (!ruolo) return false;
  if (ruolo.obbligatorio_tutti) return true;
  return mappaAssegnazioni.has(`${dipendenteId}_${ruolo.id}`);
}

/**
 * Elenco dei ruoli di sicurezza attivi assegnati al dipendente
 * (compresi quelli obbligatori per legge per tutti i lavoratori).
 */
export function ruoliSicurezzaAssegnati(
  dipendenteId: string,
  ruoliCatalogo: RuoloSicurezza[],
  mappaAssegnazioni: Set<string>,
): RuoloSicurezza[] {
  return ruoliCatalogo.filter(
    (r) => r.attivo && (r.obbligatorio_tutti || mappaAssegnazioni.has(`${dipendenteId}_${r.id}`)),
  );
}
