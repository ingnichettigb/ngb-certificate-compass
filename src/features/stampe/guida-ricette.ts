/*
 * File:      guida-ricette.ts
 * Percorso:  src/features/stampe/guida-ricette.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Ricette rapide della guida: ogni ricetta spiega i passi e sa impostare i filtri con un clic.
 */
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { conSelezione, FILTRI_INIZIALI, voceDelRuolo, type FiltriStampa, type VoceRuolo } from "./dati-stampa";

export type Ricetta = {
  id: string;
  titolo: string;
  /** A cosa serve, in una frase. */
  scopo: string;
  /** Cosa fare, un passo per riga (il pulsante «Applica questi filtri» fa i primi in automatico). */
  passi: string[];
  /** Cosa aspettarsi nel documento. */
  risultato: string;
  /** I filtri da impostare; null se manca qualcosa (per esempio un ruolo nella Matrice). */
  applica: (ruoli: RuoloSicurezza[]) => FiltriStampa | null;
  /** Spiegazione mostrata quando applica() restituisce null. */
  nonDisponibile?: string;
};

const partenza = FILTRI_INIZIALI;
const ruoloPer = (voce: VoceRuolo, ruoli: RuoloSicurezza[]) => ruoli.find((r) => r.attivo && voceDelRuolo(r) === voce);

export const RICETTE: Ricetta[] = [
  {
    id: "preposti-incarico",
    titolo: "Stampa solo l'elenco dei preposti con incarico assegnato",
    scopo: "L'elenco operativo dei preposti di oggi, senza chi ha fatto il corso ma non ricopre più il ruolo.",
    passi: [
      "Tipo di documento: «Elenco incaricati per gruppo».",
      "Gruppo corsi: «Preposti».",
      "Spunta «Solo incarichi attualmente assegnati».",
      "Premi «Stampa / PDF».",
    ],
    risultato: "Gli attestati dei soli lavoratori che hanno oggi il ruolo Preposto assegnato. Sotto la tabella trovi il totale.",
    applica: () => ({ ...partenza, modello: "gruppo", gruppo: "preposti", soloIncarichi: true }),
  },
  {
    id: "preposti-per-classe",
    titolo: "Preposti con incarico di una certa classe di concorso",
    scopo: "Distinguere un tipo di preposti da un altro (per esempio i docenti di una classe) prima di organizzare il corso.",
    passi: [
      "Il pulsante imposta Elenco incaricati per gruppo, Preposti e «Solo incarichi attualmente assegnati».",
      "Poi scegli la «Classe di concorso» dal menu a sinistra.",
    ],
    risultato: "Solo i preposti con incarico che hanno quella classe di concorso.",
    applica: () => ({ ...partenza, modello: "gruppo", gruppo: "preposti", soloIncarichi: true }),
  },
  {
    id: "incarico-senza-attestato",
    titolo: "Chi ha l'incarico ma gli manca l'attestato",
    scopo: "Trovare i preposti (o gli addetti) nominati che non hanno il corso: sono il vero mancante.",
    passi: [
      "Tipo di documento: «Elenco lavoratori in servizio».",
      "Ruolo di sicurezza: «Preposto» (il pulsante lo imposta).",
      "Nella colonna Preposto cerca le celle «No»; clicca l'intestazione per metterle in ordine.",
    ],
    risultato: "«No» = ha il ruolo ma non l'attestato. Con gli altri ruoli cambia il ruolo scelto e guarda la colonna corrispondente.",
    applica: (ruoli) => {
      const r = ruoloPer("preposto", ruoli);
      return r ? { ...partenza, modello: "lavoratori", ruoloId: r.id } : null;
    },
    nonDisponibile: "Nella Matrice abilitazioni non c'è un ruolo «Preposto» attivo.",
  },
  {
    id: "attestato-senza-incarico",
    titolo: "Chi ha l'attestato ma non l'incarico",
    scopo: "Individuare chi ha fatto il corso ma non risulta nominato (ex incaricati, oppure ruolo non spuntato per dimenticanza).",
    passi: [
      "Tipo di documento: «Elenco lavoratori in servizio» (il pulsante lo imposta).",
      "Nelle colonne Preposto, Antincendio, Primo soccorso e Defibrillatore cerca le date in neretto.",
    ],
    risultato: "Data in neretto = ha l'attestato ma non il ruolo assegnato. Controlla se va assegnato o se è solo storico.",
    applica: () => ({ ...partenza, modello: "lavoratori" }),
  },
  {
    id: "antincendio-incarico",
    titolo: "Addetti antincendio con incarico assegnato",
    scopo: "L'elenco degli addetti antincendio in carica, per il piano di emergenza.",
    passi: [
      "Tipo di documento: «Elenco incaricati per gruppo».",
      "Gruppo corsi: «Antincendio».",
      "Spunta «Solo incarichi attualmente assegnati».",
    ],
    risultato: "Gli attestati antincendio dei soli lavoratori con il ruolo Addetto Antincendio assegnato.",
    applica: () => ({ ...partenza, modello: "gruppo", gruppo: "antincendio", soloIncarichi: true }),
  },
  {
    id: "nuovi-senza-minimi",
    titolo: "Nuovi arrivati senza Corso base o specifico",
    scopo: "Controllare l'avvio della formazione minima dei neo-assunti.",
    passi: [
      "Premi «Nuovi arrivati dell'anno» e scegli il periodo.",
      "Premi «Senza attestati» e scegli «Manca almeno uno dei due».",
    ],
    risultato: "I neo-assunti a cui manca il Corso base o il Corso specifico, con la data dove c'è e «No» dove manca.",
    applica: () => conSelezione(conSelezione(partenza, { arrivi: "scolastico" }), { senzaAttestati: true }),
  },
  {
    id: "anagrafiche-da-completare",
    titolo: "Anagrafiche da completare",
    scopo: "Sapere a chi mancano dati nella scheda (nascita, classe di concorso, fine contratto…).",
    passi: ["Premi «Anagrafica incompleta» (il pulsante lo fa)."],
    risultato: "La colonna «Cosa manca» in rosso per ogni lavoratore. L'email non conta.",
    applica: () => conSelezione(partenza, { incompleta: true }),
  },
  {
    id: "scadenze-90",
    titolo: "Corsi scaduti o in scadenza nei prossimi 90 giorni",
    scopo: "Pianificare i rinnovi del prossimo trimestre.",
    passi: ["Tipo di documento: «Scadenzario corsi».", "Scadenza: «Scaduti + entro 90 giorni»."],
    risultato: "I corsi già scaduti e quelli che scadono entro 90 giorni, dal più urgente.",
    applica: () => ({ ...partenza, modello: "scadenze", finestra: "90" }),
  },
  {
    id: "scheda-lavoratore",
    titolo: "Scheda formativa di un lavoratore",
    scopo: "Consegnare o archiviare il percorso formativo di una persona.",
    passi: ["Il pulsante imposta «Scheda formativa individuale».", "Poi scegli il «Lavoratore» dal menu a sinistra."],
    risultato: "Una scheda con tutti i suoi corsi, date e scadenze.",
    applica: () => ({ ...partenza, modello: "scheda" }),
  },
  {
    id: "report-reparto",
    titolo: "Report di formazione per reparto",
    scopo: "Avere il quadro per reparto in occasione di riunioni o controlli.",
    passi: ["Tipo di documento: «Report formazione per reparto» (il pulsante lo imposta)."],
    risultato: "Le righe raggruppate per reparto, con il totale in fondo.",
    applica: () => ({ ...partenza, modello: "reparto" }),
  },
];
