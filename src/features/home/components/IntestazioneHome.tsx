/*
 * File:      IntestazioneHome.tsx
 * Percorso:  src/features/home/components/IntestazioneHome.tsx
 * Intestazione: logo, titolo, backup e collegamenti rapidi alle tre aree.
 */
import { Link } from "@tanstack/react-router";
import { Bot, Monitor, Smartphone } from "lucide-react";
import { BackupBar } from "@/components/BackupBar";
import { Button } from "@/components/ui/button";
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
          <Button asChild variant="outline">
            <Link to="/hr">
              <Monitor className="size-4" />
              Dashboard HR
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link to="/carica">
              <Smartphone className="size-4" />
              Modulo lavoratore
            </Link>
          </Button>

          <Button asChild>
            <Link to="/operatore">
              <Bot className="size-4" />
              Postazione operatore
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
