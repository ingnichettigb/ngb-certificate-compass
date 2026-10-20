/*
 * File:      dati-azienda.ts
 * Percorso:  src/lib/dati-azienda.ts
 * Dati anagrafici ditta/studio per le firme e l'intestazione delle email con Resend.
 */
import { useEffect, useState } from "react";

export interface DatiAzienda {
  nomeAzienda: string;
  referente: string;
  email: string;
  telefono: string;
  via: string;
  cap: string;
  comune: string;
  provincia: string;
  /** Indirizzo del mittente autorizzato su Resend (es. onboarding@resend.dev oppure notifiche@tuodominio.it) */
  emailMittenteResend: string;
}

const STORAGE_KEY = "archivio_attestati_dati_azienda_v1";
const EVENTO_CAMBIO = "archivio_attestati_dati_azienda_cambiati";

export const DATI_AZIENDA_DEFAULT: DatiAzienda = {
  nomeAzienda: "Nichetti Gian Battista",
  referente: "Gian Battista Nichetti",
  email: "",
  telefono: "",
  via: "",
  cap: "26015",
  comune: "Soresina",
  provincia: "CR",
  emailMittenteResend: "onboarding@resend.dev",
};

export function leggiDatiAzienda(): DatiAzienda {
  if (typeof window === "undefined") return DATI_AZIENDA_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DATI_AZIENDA_DEFAULT;
    return { ...DATI_AZIENDA_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DATI_AZIENDA_DEFAULT;
  }
}

export function salvaDatiAzienda(dati: DatiAzienda): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dati));
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  } catch (e) {
    console.error("Impossibile salvare i dati azienda", e);
  }
}

export function useDatiAzienda(): [DatiAzienda, (d: DatiAzienda) => void] {
  const [dati, setDati] = useState<DatiAzienda>(leggiDatiAzienda);

  useEffect(() => {
    const aggiorna = () => setDati(leggiDatiAzienda());
    window.addEventListener(EVENTO_CAMBIO, aggiorna);
    window.addEventListener("storage", aggiorna);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, aggiorna);
      window.removeEventListener("storage", aggiorna);
    };
  }, []);

  return [dati, (nuovi) => { salvaDatiAzienda(nuovi); setDati(nuovi); }];
}
