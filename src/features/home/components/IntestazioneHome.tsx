/*
 * File:      IntestazioneHome.tsx
 * Percorso:  src/features/home/components/IntestazioneHome.tsx
 * Testata della home: logo, titolo, barra di backup e pulsanti di accesso rapido.
 */
import { Link } from "@tanstack/react-router";
import { Bot, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackupBar } from "@/components/BackupBar";
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
            { to: "/carica" as const, label: "Modulo lavoratore", Icona: Smartphone },
            { to: "/operatore" as const, label: "Postazione operatore", Icona: Bot },
          ].map(({ to, label, Icona }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md"
              activeProps={{
                className:
                  "!bg-primary !text-primary-foreground bg-gradient-to-b from-primary/80 to-primary shadow-md ring-2 ring-primary/30",
              }}
            >
              <Icona className="size-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
