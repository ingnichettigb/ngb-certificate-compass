/*
 * File:      stampa-pubblico.ts
 * Percorso:  src/features/stampe/stampa-pubblico.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Scelta «Tutti / Solo docenti / Solo ATA» per le stampe di scadenza: filtro e conteggi per reparto.
 */
import type { RigaStampa } from "./stampa-tipi";

export type Pubblico = "tutti" | "docenti" | "ata";

export const ETICHETTA_PUBBLICO: Record<Pubblico, string> = {
  tutti: "Tutti",
  docenti: "Solo docenti",
  ata: "Solo ATA",
};

const reparto = (r: Pick<RigaStampa, "reparto">) => (r.reparto ?? "").trim().toLowerCase();

/** Tiene le righe del pubblico scelto (i reparti diversi da Docente e ATA compaiono solo con «Tutti»). */
export function filtraPerPubblico<T extends Pick<RigaStampa, "reparto">>(righe: T[], p: Pubblico): T[] {
  if (p === "tutti") return righe;
  const voluto = p === "docenti" ? "docente" : "ata";
  return righe.filter((r) => reparto(r) === voluto);
}

/** Lavoratori distinti per pubblico, per i numeri accanto ai pulsanti. */
export function contaPubblico(righe: Pick<RigaStampa, "reparto" | "dipendenteId">[]): Record<Pubblico, number> {
  const conta = (p: Pubblico) => new Set(filtraPerPubblico(righe, p).map((r) => r.dipendenteId)).size;
  return { tutti: conta("tutti"), docenti: conta("docenti"), ata: conta("ata") };
}
