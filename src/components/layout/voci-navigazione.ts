/*
 * File:      voci-navigazione.ts
 * Percorso:  src/components/layout/voci-navigazione.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Elenco unico delle voci della barra di navigazione, raggruppate per fase di lavoro,
 *            con la descrizione mostrata al passaggio del mouse.
 *   rev 2 — 07/11/2026 — Etichette su due righe («\n» = a capo) per accorciare i bottoni.
 */
import {
  Calendar,
  CheckCircle2,
  FolderInput,
  Home,
  Pencil,
  Printer,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

export type RottaNav =
  | "/"
  | "/carica"
  | "/operatore"
  | "/massivo"
  | "/hr"
  | "/dipendenti"
  | "/scadenze"
  | "/stampe";

export interface VoceNav {
  to: RottaNav;
  /** Testo breve mostrato nel bottone; «\n» manda a capo (etichetta su due righe). */
  label: string;
  /** Spiegazione mostrata al passaggio del mouse. */
  descrizione: string;
  Icona: LucideIcon;
  /** Solo icona (es. Home): il testo resta come etichetta per lo screen reader. */
  soloIcona?: boolean;
  /** La pagina si apre in una nuova scheda (modulo pubblico dei lavoratori). */
  nuovaScheda?: boolean;
}

/** Gruppi separati da una linea verticale: Home | Inserimento | Verifica | Archivio | Controllo. */
export const GRUPPI_NAV: VoceNav[][] = [
  [
    {
      to: "/",
      label: "Home",
      descrizione: "Contatori generali e accesso rapido a tutte le sezioni.",
      Icona: Home,
      soloIcona: true,
    },
  ],
  [
    {
      to: "/carica",
      label: "Modulo\nauto invio",
      descrizione:
        "Pagina pubblica da telefono: il lavoratore invia da solo il proprio attestato. Si apre in una nuova scheda.",
      Icona: Smartphone,
      nuovaScheda: true,
    },
    {
      to: "/operatore",
      label: "Inserimento\nsingolo",
      descrizione: "Carichi un attestato alla volta: l'AI legge nome, codice fiscale e data del corso.",
      Icona: Pencil,
    },
    {
      to: "/massivo",
      label: "Inserimento\nmassivo",
      descrizione:
        "Per l'avvio a regime e per gli arrivi in blocco dopo un corso: importi da cartella e agganci molti file al database.",
      Icona: FolderInput,
    },
  ],
  [
    {
      to: "/hr",
      label: "Validazione\nHR",
      descrizione: "Controlli e approvi o respingi gli attestati inviati dal modulo.",
      Icona: CheckCircle2,
    },
  ],
  [
    {
      to: "/dipendenti",
      label: "Dipendenti",
      descrizione: "Anagrafica, ruoli e attestati di ogni lavoratore.",
      Icona: Users,
    },
  ],
  [
    {
      to: "/scadenze",
      label: "Scadenze",
      descrizione: "Cosa è scaduto o sta per scadere e chi va formato (piano corsi).",
      Icona: Calendar,
    },
    {
      to: "/stampe",
      label: "Stampe",
      descrizione: "Elenchi, schede e scadenzari da stampare o esportare in PDF, Excel e CSV.",
      Icona: Printer,
    },
  ],
];

/** Pagine pubbliche: niente barra del gestionale. */
const ROTTE_SENZA_BARRA = ["/carica"];

export function mostraBarra(percorso: string): boolean {
  return !ROTTE_SENZA_BARRA.some((r) => percorso === r || percorso.startsWith(`${r}/`));
}
