import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  Bot,
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
      const [dip, attesa, scaduti, tot] = await Promise.all([
        supabase.from("dipendenti").select("id", { count: "exact", head: true }),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .eq("stato_validazione", "In attesa"),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true })
          .lt("data_scadenza_calcolata", new Date().toISOString().slice(0, 10)),
        supabase
          .from("attestati_caricati")
          .select("id", { count: "exact", head: true }),
      ]);

      return {
        dipendenti: dip.count ?? 0,
        attesa: attesa.count ?? 0,
        scaduti: scaduti.count ?? 0,
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Gestisci attestati, dipendenti, verifiche e scadenze dalla postazione
              amministrativa.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>• Verifica, approva o respingi gli attestati</li>
              <li>• Modifica dati, corsi e ore dichiarate</li>
              <li>• Consulta lo storico dei dipendenti</li>
              <li>• Controlla attestati scaduti e in scadenza</li>
            </ul>

            <Button asChild className="mt-6">
              <Link to="/hr">
                Apri la dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </article>

          <article className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Sparkles className="size-5" />
            </span>

            <h2 className="mt-4 text-xl font-semibold">Postazione operatore</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Carica i documenti, usa la lettura automatica AI, verifica i dati e
              archivia gli attestati nell&apos;archivio aziendale.
            </p>

            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>• Caricamento di PDF e immagini degli attestati</li>
              <li>• Lettura automatica e compilazione guidata</li>
              <li>• Correzione manuale e cattura OCR dei campi</li>
              <li>• Coda di lavoro, archiviazione ed email di esito</li>
            </ul>

            <Button asChild className="mt-6">
              <Link to="/operatore">
                Apri la postazione
                <ArrowRight className="size-4" />
              </Link>
            </Button>
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
  tone,
  to,
}: {
  label: string;
  value?: number;
  icon: typeof ShieldCheck;
  tone?: "warning" | "destructive";
  to: "/dipendenti" | "/scadenze" | "/hr";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning-foreground"
      : tone === "destructive"
        ? "text-destructive"
        : "text-primary";

  return (
    <Link
      to={to}
      className="block rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 hover:bg-muted/40"
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
