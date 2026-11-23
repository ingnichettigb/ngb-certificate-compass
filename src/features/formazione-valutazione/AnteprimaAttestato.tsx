/*
 * File:          AnteprimaAttestato.tsx
 * Percorso:      src/features/formazione-valutazione/AnteprimaAttestato.tsx
 * Data creazione: 2026-11-23
 * Anteprima del documento dell'attestato dentro la finestra «Formazione da valutare», per poter decidere guardando il corso.
 * Il file si trova sul database (Archivio/Coda) oppure in una delle cartelle collegate al browser: al clic si chiede il permesso di
 * lettura delle cartelle (serve un gesto dell'utente), poi si usa la risoluzione già in uso nel resto dell'app.
 * Revisioni:
 *   - Rev 1 (2026-11-23): Prima stesura.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { elencoCartelle } from "@/lib/api/cartelle-archivio";
import { verificaPermessi } from "@/lib/api/cartella-locale";
import { risolviDocumentoAttestato, type RisoluzioneDocumento } from "@/lib/api/cartelle-risoluzione";

type Lato = "fronte" | "retro";
type Stato = { fase: "chiuso" } | { fase: "carico" } | { fase: "ok"; doc: RisoluzioneDocumento } | { fase: "mancante"; percorso: string };

/** Chiede (al clic) il permesso di lettura delle cartelle collegate, così il file locale si può leggere. Non blocca mai. */
async function concediLetturaCartelle(): Promise<void> {
  try {
    for (const c of await elencoCartelle()) await verificaPermessi(c.handle, true, "read");
  } catch {
    /* senza cartelle collegate si prosegue: il file può essere sul database */
  }
}

function PannelloDocumento({ percorso, etichetta }: { percorso: string; etichetta: string }) {
  const [stato, setStato] = useState<Stato>({ fase: "chiuso" });
  const urlBlob = useRef<string | null>(null);

  const rilascia = useCallback(() => {
    if (urlBlob.current) URL.revokeObjectURL(urlBlob.current);
    urlBlob.current = null;
  }, []);
  useEffect(() => rilascia, [rilascia]);

  async function apri() {
    setStato({ fase: "carico" });
    await concediLetturaCartelle();
    try {
      const doc = await risolviDocumentoAttestato(percorso);
      if (!doc.url) {
        setStato({ fase: "mancante", percorso: doc.nomeFile || percorso });
        return;
      }
      rilascia();
      if (doc.tipo === "locale") urlBlob.current = doc.url;
      setStato({ fase: "ok", doc });
    } catch {
      setStato({ fase: "mancante", percorso: percorso });
    }
  }

  function chiudi() {
    rilascia();
    setStato({ fase: "chiuso" });
  }

  const aperto = stato.fase === "ok";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={stato.fase === "carico"} onClick={() => (aperto ? chiudi() : void apri())}>
          {stato.fase === "carico" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          {aperto ? `Nascondi ${etichetta}` : `Mostra ${etichetta}`}
        </Button>
        {stato.fase === "ok" && (
          <Button type="button" size="sm" variant="ghost" onClick={() => window.open(stato.doc.url ?? "", "_blank", "noopener")}>
            <ExternalLink className="size-4" /> Apri in una nuova scheda
          </Button>
        )}
      </div>

      {stato.fase === "mancante" && (
        <p role="alert" className="rounded-lg border border-border bg-muted p-2 text-xs">
          File non trovato: «{stato.percorso}». Controlla che la cartella degli attestati sia collegata (e il permesso concesso), oppure riaggancia il
          file dalla scheda del lavoratore.
        </p>
      )}

      {stato.fase === "ok" &&
        (stato.doc.isPdf ? (
          <iframe title={`Attestato – ${stato.doc.nomeFile}`} src={stato.doc.url ?? undefined} className="h-[70vh] w-full rounded-lg border border-border bg-white" />
        ) : (
          <img src={stato.doc.url ?? undefined} alt={`Attestato – ${stato.doc.nomeFile}`} className="max-h-[70vh] w-full rounded-lg border border-border bg-white object-contain" />
        ))}
    </div>
  );
}

export function AnteprimaAttestato({ fronte, retro }: { fronte: string | null | undefined; retro?: string | null }) {
  const percorsi: { lato: Lato; percorso: string }[] = [];
  if (fronte?.trim()) percorsi.push({ lato: "fronte", percorso: fronte.trim() });
  if (retro?.trim()) percorsi.push({ lato: "retro", percorso: retro.trim() });

  if (percorsi.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-muted p-2 text-xs">
        Nessun file collegato a questo attestato: collegalo dalla scheda del lavoratore prima di decidere.
      </p>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      {percorsi.map((p) => (
        <PannelloDocumento key={p.lato} percorso={p.percorso} etichetta={p.lato === "fronte" ? "attestato" : "retro"} />
      ))}
    </div>
  );
}
