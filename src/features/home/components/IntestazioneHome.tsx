/*
 * File:      IntestazioneHome.tsx
 * Percorso:  src/features/home/components/IntestazioneHome.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Testata home: logo, titolo, backup e accessi rapidi.
 *   rev 2 — 26/10/2026 17:45 — Bottoni verde tenue a riposo, verde pieno attivo con bordo verde scuro elettrico.
 *   rev 3 — 27/10/2026 21:20 — Aggiunto bottone «Esporta dati in Excel» in fila agli accessi rapidi.
 *   rev 4 — 28/10/2026 09:30 — Rinomina accessi: «Modulo auto invio attestato» e «Inserimento attestati».
 */
import { Link } from "@tanstack/react-router";
import { Bot, Monitor, Smartphone } from "lucide-react";
import { BackupBar } from "@/components/BackupBar";
import { DialogEsportaAttestati } from "@/features/esporta-attestati/DialogEsportaAttestati";
import logoAsset from "@/assets/logo-ngb.jpg.asset.json";

export function IntestazioneHome() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Nichetti Gian Battista"
              className="h-12 w-auto rounded-md bg-card"
            />
            <div>
              <h1 className="text-lg font-semibold">Archivio Attestati Sicurezza</h1>
              <p className="text-xs text-muted-foreground">
                Nichetti Gian Battista · Soresina (CR) · D.Lgs. 81/2008
              </p>
            </div>
          </div>

          <BackupBar />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {[
            { to: "/hr" as const, label: "Cruscotto risorse umane", Icona: Monitor },
            { to: "/carica" as const, label: "Modulo auto invio attestato", Icona: Smartphone },
            { to: "/operatore" as const, label: "Inserimento attestati", Icona: Bot },
          ].map(({ to, label, Icona }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md"
              activeProps={{
                className:
                  "!bg-primary !text-primary-foreground shadow-md ring-2 ring-primary/40",
              }}
            >
              <Icona className="size-4" />
              {label}
            </Link>
          ))}
          <DialogEsportaAttestati />
        </div>
      </div>
    </header>
  );
}
