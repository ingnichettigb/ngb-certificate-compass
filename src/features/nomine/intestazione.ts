/*
 * File:      intestazione.ts
 * Percorso:  src/features/nomine/intestazione.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Righe dell'intestazione della lettera, lette dall'anagrafica ditta (stesso testo in anteprima e PDF).
 *            Cambiando ditta cambiano ragione sociale, recapiti e logo: niente è scritto a mano.
 */
import type { DittaRecord } from "@/lib/api/ditta";
import { indirizzoDitta, nomeDitta } from "@/lib/identita-ditta";

export type RigaIntestazione = { testo: string; grassetto?: boolean };

export function righeIntestazione(
  ditta: Partial<DittaRecord> | null | undefined,
): RigaIntestazione[] {
  const contatti = [
    ditta?.telefono && `Telefono: ${ditta.telefono}`,
    ditta?.email && `e-mail: ${ditta.email}`,
  ]
    .filter(Boolean)
    .join("   ");
  const fiscali = [
    ditta?.pec && `PEC: ${ditta.pec}`,
    ditta?.codice_fiscale && `C.F. ${ditta.codice_fiscale}`,
    ditta?.partita_iva && `P.IVA ${ditta.partita_iva}`,
  ]
    .filter(Boolean)
    .join("   ");
  const righe: RigaIntestazione[] = [{ testo: nomeDitta(ditta), grassetto: true }];
  for (const t of [indirizzoDitta(ditta), contatti, fiscali]) if (t) righe.push({ testo: t });
  return righe;
}
