/*
 * File:      useInvioAttestato.ts
 * Percorso:  src/features/carica/hooks/useInvioAttestato.ts
 * Validazione e invio dell'attestato (dipendente, foto, attestato).
 */
import { useState } from "react";
import { toast } from "sonner";
import { creaAttestato, registraClasseEMateria, upsertDipendente, uploadFoto } from "@/lib/api";
import { erroreModulo } from "../selezione";
import { useDatiCarica } from "./useDatiCarica";
import { useModuloCarica } from "./useModuloCarica";

export function useInvioAttestato({
  dati,
  modulo,
}: {
  dati: ReturnType<typeof useDatiCarica>;
  modulo: ReturnType<typeof useModuloCarica>;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { reparti } = dati;
  const { anagrafica, corsoId, dataCorso, ore, fronte, retro, sottoreparti, chiedeInsegnamento } = modulo;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cf = anagrafica.codice_fiscale.trim().toUpperCase();
    const errore = erroreModulo({
      anagrafica,
      numReparti: reparti.length,
      numSottoreparti: sottoreparti.length,
      chiedeInsegnamento,
      corsoId,
      dataCorso,
      fronte,
    });
    if (errore) {
      toast.error(errore.titolo, errore.descrizione ? { description: errore.descrizione } : undefined);
      return;
    }
    if (!fronte) return; // già garantito da erroreModulo: serve solo a TypeScript
    setBusy(true);
    try {
      const dip = await upsertDipendente({
        codice_fiscale: cf,
        cognome: anagrafica.cognome.trim(),
        nome: anagrafica.nome.trim(),
        email: anagrafica.email.trim() || null,
        reparto: anagrafica.reparto.trim() || null,
        sottoreparto: anagrafica.sottoreparto.trim() || null,
        classe_concorso: chiedeInsegnamento
          ? anagrafica.classe_concorso.trim().toUpperCase() || null
          : null,
        materia: chiedeInsegnamento ? anagrafica.materia.trim() || null : null,
        luogo_nascita: anagrafica.luogo_nascita.trim() || null,
        data_nascita: anagrafica.data_nascita || null,
      });
      // Alimenta il database dei suggerimenti per chi compila dopo.
      if (chiedeInsegnamento) {
        await registraClasseEMateria(anagrafica.classe_concorso, anagrafica.materia);
      }
      const pFronte = await uploadFoto(fronte, cf, "fronte");
      const pRetro = retro ? await uploadFoto(retro, cf, "retro") : null;
      await creaAttestato({
        dipendente_id: dip.id,
        codice_fiscale: cf,
        tipo_corso_id: corsoId,
        data_corso: dataCorso,
        ore_dichiarate: ore ? Number(ore) : null,
        url_foto_fronte: pFronte,
        url_foto_retro: pRetro,
      });
      setDone(true);
    } catch (err) {
      toast.error("Invio non riuscito", { description: String(err) });
    } finally {
      setBusy(false);
    }
  }

  return { busy, done, setDone, submit };
}
