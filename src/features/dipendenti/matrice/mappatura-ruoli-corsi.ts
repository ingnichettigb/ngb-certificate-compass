/*
 * File:          mappatura-ruoli-corsi.ts
 * Percorso:      src/features/dipendenti/matrice/mappatura-ruoli-corsi.ts
 * Data creazione: 2026-11-02
 * Revisioni:
 *   - Rev 1 (2026-11-02 10:25): Modulo di collegamento logico Ruoli di sicurezza <-> Corsi e gruppi
 *     in funzione del rischio aziendale (D.Lgs. 81/08), con risoluzione automatica e fallback.
 */

import type { TipoCorso, RuoloSicurezza } from "@/lib/api";

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
  const codC = (corso.codice ?? "").toUpperCase().trim();

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
): boolean {
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
