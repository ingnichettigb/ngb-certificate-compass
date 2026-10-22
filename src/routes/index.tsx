import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Check,
  Clock,
  Copy,
  FileCheck2,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackupBar } from "@/components/BackupBar";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-ngb.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Archivio Attestati Sicurezza — Nichetti Gian Battista" },
      {
        name: "description",
        content:
          "Archivio digitale degli attestati di formazione sulla sicurezza: caricamento da cellulare, validazione HR e scadenze calcolate in automatico.",
      },
      {
        property: "og:title",
        content: "Archivio Attestati Sicurezza — Nichetti Gian Battista",
      },
      {
        property: "og:description",
        content:
          "Carica gli attestati dal telefono, valida dalla dashboard HR e tieni sotto controllo tutte le scadenze.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [qr, setQr] = useState<string>("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/carica`;
    setLink(url);
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setQr);
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const in6m = new Date();
      in6m.setMonth(in6m.getMonth() + 6);
      const in6mStr = in6m.toISOString().slice(0, 10);

      const [dip, attesa, scaduti, inScadenza6m, tot] = await Promise.all([
        supabase.from("dipendenti").select("id", { count: "exact", head: true }),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .eq("stato_validazione", "In attesa"),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .lt("data_scadenza_calcolata", todayStr),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .gte("data_scadenza_calcolata", todayStr)
          .lte("data_scadenza_calcolata", in6mStr),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true }),
      ]);

      return {
        dipendenti: dip.count ?? 0,
        attesa: attesa.count ?? 0,
        scaduti: scaduti.count ?? 0,
        inScadenza6m: inScadenza6m.count ?? 0,
        attestati: tot.count ?? 0,
      };
    },
  });

  return (
    <main className="min-h-screen bg-background">
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

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Dipendenti"
            value={stats?.dipendenti}
            icon={ShieldCheck}
            to="/dipendenti"
          />
          <StatCard
            label="Attestati"
            value={stats?.attestati}
            icon={FileCheck2}
            to="/hr"
          />
          <StatCard
            label="In attesa di validazione"
            value={stats?.attesa}
            icon={Clock}
            tone="warning"
            to="/hr"
          />
          <StatCard
            label="In scadenza (6 mesi)"
            value={stats?.inScadenza6m}
            icon={CalendarClock}
            tone="warning"
            to="/scadenze"
          />
          <StatCard
            label="Scaduti"
            value={stats?.scaduti}
            icon={AlertTriangle}
            tone="destructive"
            to="/scadenze"
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
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
                    onClick={() => {
                      navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copiato" : "Copia link"}
                  </Button>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Monitor className="size-5" />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Dashboard HR</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Elenco degli attestati caricati: visualizza l&apos;immagine,
              correggi i dati letti dal documento e valida o respingi l&apos;attestato.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/hr">
                  Apri dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link to="/dipendenti">Elenco dipendenti</Link>
              </Button>

              <Button asChild variant="outline">
                <Link to="/scadenze">Scaduti</Link>
              </Button>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Bot className="size-5" />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Postazione operatore</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Carica foto e PDF da cartella o scanner, esegui la lettura automatica
              con intelligenza artificiale, archivia i documenti e compila i registri.
            </p>

            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Lettura automatica con AI
              </div>
              <p className="mt-1">
                Estrae nominativo, codice fiscale, data del corso ed ente
                formatore direttamente dal file.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/operatore">
                  Apri postazione
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  to,
}: {
  label: string;
  value?: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "destructive";
  to: string;
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-primary";

  return (
    <Link
      to={to}
      className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${toneClass}`} />
      </div>

      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        {value ?? "—"}
      </p>
    </Link>
  );
}
