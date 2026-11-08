/*
 * File:      cartelle-rinomina.ts
 * Percorso:  src/lib/api/cartelle-rinomina.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da cartelle-multiple.ts: rinomina e copia dei file nella cartella di origine. Nessun cambio di comportamento.
 */
import { verificaPermessi } from "./cartella-locale";
import { elencoCartelle } from "./cartelle-archivio";

export type MotivoRinomina = "nessuna_cartella" | "permesso" | "non_trovato" | "scrittura" | "percorso";

export type EsitoRinomina = {
  success: boolean;
  nuovoPercorso?: string;
  errore?: string;
  motivo?: MotivoRinomina;
  cartelleSenzaPermesso?: string[];
};

export async function rinominaFileNelPercorso(
  percorsoVecchio: string,
  nuovoNomeFile: string,
  mantieniOriginale = false,
): Promise<EsitoRinomina> {
  try {
    const percorsoNorm = percorsoVecchio.replace(/\\/g, "/").replace(/^(\.\.\/|\.\/)+/, "").trim();
    const parti = percorsoNorm.split("/").filter(Boolean);
    if (parti.length === 0) return { success: false, motivo: "percorso", errore: "Percorso non specificato" };

    const vecchioNome = parti[parti.length - 1];
    if (!vecchioNome) return { success: false, motivo: "percorso", errore: "Nome file originario non valido" };

    const cartelle = await elencoCartelle();
    if (cartelle.length === 0) {
      return {
        success: false,
        motivo: "nessuna_cartella",
        errore: "Nessuna cartella collegata per la rinomina fisica del file: collegala e riprova.",
      };
    }

    const senzaPermesso: string[] = [];
    const controllate: string[] = [];
    let erroreScrittura: string | null = null;

    for (const c of cartelle) {
      if (!(await verificaPermessi(c.handle, true))) {
        senzaPermesso.push(c.nome);
        continue;
      }
      controllate.push(c.nome);

      let dir: FileSystemDirectoryHandle = c.handle;
      const sottocartelle = parti.slice(0, -1);

      if (sottocartelle.length > 0 && sottocartelle[0]?.toLowerCase() === c.nome.toLowerCase()) {
        sottocartelle.shift();
      }

      let trovata = true;
      for (const sotto of sottocartelle) {
        try {
          dir = await dir.getDirectoryHandle(sotto);
        } catch {
          trovata = false;
          break;
        }
      }

      if (!trovata) continue;

      let fileOrigHandle: FileSystemFileHandle;
      try {
        fileOrigHandle = await dir.getFileHandle(vecchioNome);
      } catch {
        continue;
      }

      try {
        const fileOrig = await fileOrigHandle.getFile();
        const nuovoHandle = await dir.getFileHandle(nuovoNomeFile, { create: true });
        const writable = await nuovoHandle.createWritable();
        await writable.write(fileOrig);
        await writable.close();

        if (!mantieniOriginale) {
          const dirQualsiasi = dir as unknown as { removeEntry?: (n: string) => Promise<void> };
          if (dirQualsiasi.removeEntry) await dirQualsiasi.removeEntry(vecchioNome);
        }

        const percorsoAggiornato = sottocartelle.length > 0
          ? `${sottocartelle.join("/")}/${nuovoNomeFile}`
          : nuovoNomeFile;

        return { success: true, nuovoPercorso: percorsoAggiornato };
      } catch (e) {
        erroreScrittura = (e as Error)?.message || String(e);
      }
    }

    if (erroreScrittura) {
      return { success: false, motivo: "scrittura", errore: `Scrittura non riuscita: ${erroreScrittura}` };
    }
    if (senzaPermesso.length > 0) {
      return {
        success: false,
        motivo: "permesso",
        cartelleSenzaPermesso: senzaPermesso,
        errore: `Manca il permesso di scrittura per: ${senzaPermesso.join(", ")}. Autorizza e riprova.`,
      };
    }
    return {
      success: false,
      motivo: "non_trovato",
      errore: `File «${vecchioNome}» non trovato nelle cartelle collegate.`,
    };
  } catch (e) {
    return { success: false, motivo: "scrittura", errore: String(e) };
  }
}

export async function duplicaFileNelPercorso(
  percorsoVecchio: string,
  nuovoNomeFile: string,
): Promise<EsitoRinomina> {
  return rinominaFileNelPercorso(percorsoVecchio, nuovoNomeFile, true);
}
