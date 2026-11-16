/*
 * File:      cerca-in-archivio.ts
 * Percorso:  src/features/tipi-corso/cerca-in-archivio.ts
 * Creato:    16/11/2026
 * Revisioni:
 *   rev 1 - 16/11/2026 19:58 - Ricerca corsi simili già in archivio prima di aggiungerne uno nuovo.
 */
import type { TipoCorso } from "@/lib/api";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/** Corsi in archivio il cui codice o nome contiene il testo digitato (min 3 caratteri). */
export function cercaInArchivio(corsi: TipoCorso[], codice: string, nome: string, max = 8): TipoCorso[] {
  const testi = [norm(codice), norm(nome)].filter((t) => t.length >= 3);
  if (testi.length === 0) return [];
  return corsi
    .filter((c) => {
      const cc = norm(c.codice ?? "");
      const nn = norm(c.nome_corso ?? "");
      return testi.some((t) => cc.includes(t) || nn.includes(t));
    })
    .slice(0, max);
}
