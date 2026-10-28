/*
 * File:          nome-file-validazione.ts
 * Percorso:      src/features/hr/nome-file-validazione.ts
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 14:15): Generatore nome file per rinomina e archiviazione
 *     secondo la convenzione: CODICE_CORSO-COGNOME-NOME-TIPO_DI_CORSO-ORE-CF.pdf
 *   - Rev 2 (2026-10-28 14:17): Campi reali del catalogo corsi (nome_corso, ore_minime_legge).
 */
import type { Attestato, TipoCorso } from "@/lib/api";

function pulisciStringa(testo: string | null | undefined, fallback: string): string {
  if (!testo || !testo.trim()) return fallback;
  return testo
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[/\\?%*:|"<>]/g, "");
}

export function generaNomeFileRinominato(
  attestato: Attestato,
  corsoSelezionato?: TipoCorso | null,
  oreDichiarate?: string | number | null,
): string {
  const d = attestato.dipendenti;

  // 1. Codice corso (es. SIC-GEN-04)
  const codice = pulisciStringa(corsoSelezionato?.codice, "CORSO");

  // 2. Cognome lavoratore
  const cognome = pulisciStringa(d?.cognome, "COGNOME").toUpperCase();

  // 3. Nome lavoratore
  const nome = pulisciStringa(d?.nome, "NOME").toUpperCase();

  // 4. Tipo di corso / descrizione (es. Formazione_Generale_Lavoratori)
  const tipoCorso = pulisciStringa(
    corsoSelezionato?.nome_corso || attestato.tipi_corso?.nome_corso,
    "TIPO_CORSO",
  );

  // 5. Ore di formazione
  const oreVal =
    oreDichiarate != null && String(oreDichiarate).trim() !== ""
      ? String(oreDichiarate).trim()
      : corsoSelezionato?.ore_minime_legge != null
        ? String(corsoSelezionato.ore_minime_legge)
        : attestato.ore_dichiarate != null
          ? String(attestato.ore_dichiarate)
          : "0";
  const ore = pulisciStringa(oreVal, "0");

  // 6. Codice Fiscale
  const cf = pulisciStringa(d?.codice_fiscale, "SENZACF").toUpperCase();

  return `${codice}-${cognome}-${nome}-${tipoCorso}-${ore}-${cf}.pdf`;
}
