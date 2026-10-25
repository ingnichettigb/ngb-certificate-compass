/*
 * File:      CardModuloLavoratore.tsx
 * Percorso:  src/features/home/components/CardModuloLavoratore.tsx
 * Scheda «Modulo lavoratore»: descrizione, QR code, link e pulsante «Copia link».
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CardModuloLavoratore({
  qr,
  link,
  copied,
  onCopia,
}: {
  qr: string;
  link: string;
  copied: boolean;
  onCopia: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
      <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Smartphone className="size-5" />
      </span>

      <h2 className="mt-4 text-xl font-semibold">Modulo lavoratore</h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Il lavoratore compila i propri dati, sceglie il corso e allega la
        foto dell&apos;attestato direttamente dal telefono.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {qr && (
          <img
            src={qr}
            alt="QR code per il modulo lavoratore"
            className="size-32 rounded-lg border border-border bg-card p-1"
          />
        )}

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs break-all text-muted-foreground">
            {link}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/carica">
                Apri il modulo
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button
              variant="outline"
              onClick={onCopia}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiato" : "Copia link"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
