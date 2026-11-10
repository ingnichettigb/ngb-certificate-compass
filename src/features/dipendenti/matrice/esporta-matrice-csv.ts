/*
 * File:      esporta-matrice-csv.ts
 * Percorso:  src/features/dipendenti/matrice/esporta-matrice-csv.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: esportazione CSV del piano fabbisogno formativo.
 *            Nessun cambio di comportamento.
 */
import { toast } from "sonner";
import type { Dipendente, TipoCorso } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { ruoliSicurezzaAssegnati } from "./mappatura-ruoli-corsi";

export interface ParametriCsv {
  corsiVisibili: TipoCorso[];
  lavoratori: Dipendente[];
  ruoli: RuoloSicurezza[];
  mappaAssegnazioni: Set<string>;
  haObbligoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
  haAttestatoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
  /** Motivo per cui il corso non è dovuto (es. RSPP valido), oppure null. */
  motivoEsenzione?: (dipendenteId: string, corso: TipoCorso) => string | null;
}

export function esportaMatriceCsv(p: ParametriCsv) {
  const { corsiVisibili, lavoratori, ruoli, mappaAssegnazioni, haObbligoCorso, haAttestatoCorso, motivoEsenzione } =
    p;
  const sep = ";";
  const intestazioni = [
    "Nominativo",
    "Codice Fiscale",
    "Funzione / Reparto",
    "Ruolo di Sicurezza",
    ...corsiVisibili.map((c) => `"${(c.codice ? `[${c.codice}] ` : "") + c.nome_corso}"`),
  ];

  const righe = lavoratori.map((d) => {
    const fn =
      [d.reparto, d.sottoreparto, d.classe_concorso, d.materia].filter(Boolean).join(" - ") || "";
    const ruoliTxt =
      ruoliSicurezzaAssegnati(d.id, ruoli, mappaAssegnazioni)
        .map((r) => r.nome)
        .join("; ") ||
      d.classe_concorso ||
      "Lavoratore";
    const corsiVal = corsiVisibili.map((c) => {
      const ob = haObbligoCorso(d.id, c);
      const fatto = haAttestatoCorso(d.id, c);
      if (!ob) return motivoEsenzione?.(d.id, c) ? '"Esente (RSPP/ASPP valido)"' : '"Non previsto"';
      return fatto ? '"In regola"' : '"Da svolgere"';
    });
    return [
      `"${d.cognome || ""} ${d.nome || ""}"`,
      `"${d.codice_fiscale || ""}"`,
      `"${fn.replace(/"/g, '""')}"`,
      `"${ruoliTxt.replace(/"/g, '""')}"`,
      ...corsiVal,
    ].join(sep);
  });

  const csvContent = "\uFEFF" + [intestazioni.join(sep), ...righe].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const now = new Date();
  const dataFmt = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  a.download = `030ArchAttestati_PianoFabbisognoCorsi_${dataFmt}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Esportazione completata");
}
