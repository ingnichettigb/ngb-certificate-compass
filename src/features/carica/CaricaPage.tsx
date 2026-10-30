/*
 * File:      CaricaPage.tsx
 * Percorso:  src/features/carica/CaricaPage.tsx
 * Data creazione: 2026-09-19
 * Revisioni:
 *   - Rev 2 (2026-10-30 20:25): Passaggio onCambiaClasseConcorso a SezioneDati.
 * Pagina «Carica il tuo attestato»: compone sezioni e hook.
 */
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntestazioneCarica } from "./components/IntestazioneCarica";
import { CaricaCompletato } from "./components/CaricaCompletato";
import { SezioneDati } from "./components/SezioneDati";
import { SezioneCorso } from "./components/SezioneCorso";
import { SezioneFoto } from "./components/SezioneFoto";
import { useDatiCarica } from "./hooks/useDatiCarica";
import { useModuloCarica } from "./hooks/useModuloCarica";
import { useInvioAttestato } from "./hooks/useInvioAttestato";

export function CaricaPage() {
  const dati = useDatiCarica();
  const modulo = useModuloCarica(dati);
  const { busy, done, setDone, submit } = useInvioAttestato({ dati, modulo });

  if (done) {
    return (
      <CaricaCompletato
        onAltro={() => {
          setDone(false);
          modulo.azzeraCorso();
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <IntestazioneCarica />

      <form onSubmit={submit} className="mx-auto max-w-md space-y-8 px-5 py-6">
        <SezioneDati
          anagrafica={modulo.anagrafica}
          set={modulo.set}
          onCambiaReparto={modulo.cambiaReparto}
          onCambiaClasseConcorso={modulo.cambiaClasseConcorso}
          reparti={dati.reparti}
          sottoreparti={modulo.sottoreparti}
          chiedeInsegnamento={modulo.chiedeInsegnamento}
          suggerimentiClassi={modulo.suggerimentiClassiElenco}
          suggerimentiMaterie={modulo.suggerimentiMaterieElenco}
        />

        <SezioneCorso
          macro={modulo.macro}
          macros={modulo.macros}
          livello={modulo.livello}
          livelli={modulo.livelli}
          corsoId={modulo.corsoId}
          corsiFiltrati={modulo.corsiFiltrati}
          corsoSelezionato={modulo.corsoSelezionato}
          dataCorso={modulo.dataCorso}
          setDataCorso={modulo.setDataCorso}
          ore={modulo.ore}
          setOre={modulo.setOre}
          onCambiaMacro={modulo.cambiaMacro}
          onCambiaLivello={modulo.cambiaLivello}
          onScegliCorso={modulo.scegliCorso}
        />

        <SezioneFoto fronte={modulo.fronte} setFronte={modulo.setFronte} retro={modulo.retro} setRetro={modulo.setRetro} />

        <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" />}
          Invia attestato
        </Button>
      </form>
    </main>
  );
}
