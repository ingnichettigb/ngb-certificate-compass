/*
 * File:          chiavi-ruoli.test.ts
 * Percorso:      src/lib/api/chiavi-ruoli.test.ts
 * Data creazione: 2026-10-31
 * Revisioni:
 *   - Rev 1 (2026-10-31 11:00): Impedisce di tornare a chiavi di cache diverse per i ruoli tra Matrice e Scheda dipendente
 *     (causa della spunta non aggiornata nell'altra schermata).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CHIAVE_ASSEGNAZIONI_RUOLI, CHIAVE_RUOLI } from "@/lib/api/ruoli";

function fileSorgente(dir: string, out: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) fileSorgente(p, out);
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\./.test(nome)) out.push(p);
  }
  return out;
}

describe("chiavi di cache dei ruoli", () => {
  it("sono due chiavi distinte e stabili", () => {
    expect(CHIAVE_RUOLI).toEqual(["ruoli-sicurezza"]);
    expect(CHIAVE_ASSEGNAZIONI_RUOLI).toEqual(["dipendenti-ruoli"]);
  });

  it("nessuna schermata scrive a mano una chiave dei ruoli: tutte usano le costanti condivise", () => {
    const vietate = [/\[\s*["']ruoli[-_]sicurezza["']\s*\]/, /\[\s*["']dipendenti[-_]ruoli["']\s*\]/, /\[\s*["']assegnazioni[-_]ruoli["']\s*\]/];
    const colpevoli: string[] = [];
    for (const f of fileSorgente(join(process.cwd(), "src"))) {
      if (f.endsWith(join("lib", "api", "ruoli.ts"))) continue;
      const testo = readFileSync(f, "utf-8");
      if (vietate.some((r) => r.test(testo))) colpevoli.push(f);
    }
    expect(colpevoli).toEqual([]);
  });
});
