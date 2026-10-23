/*
 * File:      nome-file.ts
 * Percorso:  src/features/operatore/nome-file.ts
 * Nome standard del file in archivio ed estensione dal tipo MIME.
 * Formato: CODICE - AAAA-MM_COGNOME_NOME_CF_CORSO.pdf
 */
import type { Riga } from "./types";

export const estensioneFile = (mime: string | null | undefined) =>
  mime === "application/pdf" ? "pdf" : mime?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";

export function nomeFileStandard(
  r: Pick<Riga, "data_corso" | "cognome" | "nome" | "codice_fiscale" | "tipo_corso_nome"> & {
    tipo_corso_codice?: string | null | undefined;
  },
) {
  const codice = (r.tipo_corso_codice || "").trim() || "CORSO";
  const dataPrefix = r.data_corso ? r.data_corso.slice(0, 7) : "ANNO-MANCANTE";
  const cf = r.codice_fiscale || "SENZACF";
  const corso = (r.tipo_corso_nome || "CORSO").replace(/[^a-zA-Z0-9]/g, "_");
  return `${codice} - ${dataPrefix}_${r.cognome || "COGNOME"}_${r.nome || "NOME"}_${cf}_${corso}.pdf`;
}
