/*
 * File:      useInvioEmail.ts
 * Percorso:  src/features/operatore/hooks/useInvioEmail.ts
 * Anteprima e invio dell'email di esito con Resend.
 */
import { useState } from "react";
import { toast } from "sonner";
import { leggiDatiAzienda } from "@/lib/dati-azienda";
import { inviaEmailConResend } from "@/lib/email-resend.functions";
import { costruisciBozzaEmail } from "../bozza-email";
import type { CodaRiga, StatoModaleEmail } from "../types";
import { supabase as sb } from "@/integrations/supabase/client";

export function useInvioEmail(ricarica: () => unknown) {
  const db = sb as any;
  const [inviandoEmail, setInviandoEmail] = useState(false);
  const [modaleEmail, setModaleEmail] = useState<StatoModaleEmail>({
    aperta: false,
    righe: [],
    destinatari: "",
    oggetto: "",
    testoCorpo: "",
  });

  // Apre la finestra di anteprima e compilazione email prima dell'invio effettivo
  function preparaInvioEmail(righe: CodaRiga[]) {
    if (!righe.length) return;
    const { destinatari, oggetto, testoCorpo } = costruisciBozzaEmail(righe);
    setModaleEmail({ aperta: true, righe, destinatari, oggetto, testoCorpo });
  }

  // Invio effettivo tramite Resend dalla finestra di anteprima
  async function confermaEInviaEmail() {
    const destinatariList = modaleEmail.destinatari
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"));

    if (!destinatariList.length) {
      return void toast.error("Inserisci almeno un indirizzo email valido nel campo Destinatari");
    }

    const datiAzienda = leggiDatiAzienda();
    setInviandoEmail(true);
    const toastId = toast.loading(`Invio email a ${destinatariList.join(", ")}...`);

    try {
      const res = await inviaEmailConResend({
        data: {
          destinatari: destinatariList,
          oggetto: modaleEmail.oggetto,
          testoCorpo: modaleEmail.testoCorpo,
          datiAzienda,
        },
      });

      if (!res.ok) {
        toast.error(res.messaggio || "Errore durante l'invio dell'email", { id: toastId });
        return;
      }

      toast.success("Email inviata con successo tramite Resend!", { id: toastId });

      // Salva l'email inserita nei record di coda (se prima era vuota) per ricordarla
      const primoIndirizzo = destinatariList[0];
      for (const r of modaleEmail.righe) {
        await db
          .from("coda_valutazioni")
          .update({
            inviato: true,
            ...(!r.email ? { email: primoIndirizzo } : {}),
          })
          .eq("id", r.id);
      }

      setModaleEmail((m) => ({ ...m, aperta: false }));
      ricarica();
    } catch (e) {
      toast.error(`Errore: ${(e as Error).message}`, { id: toastId });
    } finally {
      setInviandoEmail(false);
    }
  }

  return { modaleEmail, setModaleEmail, inviandoEmail, preparaInvioEmail, confermaEInviaEmail };
}
