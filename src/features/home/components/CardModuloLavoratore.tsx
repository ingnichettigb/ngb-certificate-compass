/*
 * File:      CardModuloLavoratore.tsx
 * Percorso:  src/features/home/components/CardModuloLavoratore.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Scheda modulo lavoratore con QR code e copia link.
 *   rev 2 — 28/10/2026 09:30 — Rinomina titolo in «Modulo auto invio attestato».
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQrModuloLavoratore } from "../hooks/useQrModuloLavoratore";

export function CardModuloLavoratore() {
  const { qr, link, copied, copiaLink } = useQrModuloLavoratore();

  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Smartphone className="size-5" />
        </span>
        <Button asChild>
          <Link to="/carica">
            Apri il modulo
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <h2 className="mt-4 text-xl font-semibold">Modulo auto invio attestato</h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Il lavoratore compila i propri dati, sceglie il corso e allega la foto dell&apos;attestato
        direttamente dal telefono.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {qr && (
          <img
            src={qr}
            alt="QR code per il modulo auto invio attestato"
            className="size-32 rounded-lg border border-border bg-card p-1"
          />
        )}

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs break-all text-muted-foreground">
            {link}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copiaLink}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiato" : "Copia link"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
