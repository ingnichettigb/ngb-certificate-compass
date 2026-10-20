import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Loader2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatData, getAttestati, repartoLeggibile, scaduto } from "@/lib/api";

export const Route = createFileRoute("/scadenze")({
  head: () => ({
    meta: [
      {
        title:
          "Attestati scaduti e in scadenza — Archivio Sicurezza · Nichetti Gian Battista",
      },
      {
        name: "description",
        content:
          "Elenco dei certificati di formazione scaduti e in scadenza a 90 giorni, 6 mesi o 1 anno, con filtro corso e ordinamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Attestati scaduti e in scadenza" },
      {
        property: "og:description",
        content:
          "Chi ha i certificati scaduti e quali corsi vanno rinnovati: elenco filtrabile e ordinato per colonna.",
      },
    ],
  }),
  component: ScadenzePage,
});

type Vista =
  | "Scaduti"
  | "In scadenza (90 gg)"
  | "In scadenza (6 mesi)"
  | "In scadenza (1 anno)"
  | "Tutti con scadenza";

type ColonnaSort =
  | "dipendente"
  | "codice_fiscale"
  | "reparto"
  | "corso"
  | "data_corso"
  | "scadenza";

type DirezioneSort = "asc" | "desc";

const TUTTI = "__tutti__";

function ScadenzePage() {
  const [vista, setVista] = useState<Vista>("Scaduti");
  const [q, setQ] = useState("");
  const [reparto, setReparto] = useState(TUTTI);
  const [corsoSelezionato, setCorsoSelezionato] = useState(TUTTI);
  const [sortCol, setSortCol] = useState<ColonnaSort>("scadenza");
  const [sortDir, setSortDir] = useState<DirezioneSort>("asc");

  const { data: attestati = [], isLoading } = useQuery({
    queryKey: ["attestati", "Tutti"],
    queryFn: () => getAttestati("Tutti"),
  });

  const reparti = useMemo(() => {
    const set = new Map<string, string>();
    for (const a of attestati) {
      const r = a.dipendenti?.reparto;
      if (repartoLeggibile(r) && !set.has(r.trim().toLowerCase())) {
        set.set(r.trim().toLowerCase(), r.trim());
      }
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "it"));
  }, [attestati]);

  const corsi = useMemo(() => {
    const set = new Map<string, string>();
    for (const a of attestati) {
      const nome = a.tipi_corso?.nome_corso?.trim();
      if (nome && !set.has(nome.toLowerCase())) {
        set.set(nome.toLowerCase(), nome);
      }
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "it"));
  }, [attestati]);

  function cambiaOrdinamento(colonna: ColonnaSort) {
    if (sortCol === colonna) {
      setSortDir((prec) => (prec === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colonna);
      setSortDir("asc");
    }
  }

  const righe = useMemo(() => {
    const oggi = new Date();
    const oggiStr = oggi.toISOString().slice(0, 10);

    const d90 = new Date(oggi);
    d90.setDate(d90.getDate() + 90);
    const d90Str = d90.toISOString().slice(0, 10);

    const d6m = new Date(oggi);
    d6m.setMonth(d6m.getMonth() + 6);
    const d6mStr = d6m.toISOString().slice(0, 10);

    const d1y = new Date(oggi);
    d1y.setFullYear(d1y.getFullYear() + 1);
    const d1yStr = d1y.toISOString().slice(0, 10);

    const base = attestati.filter((a) => {
      if (!a.data_scadenza_calcolata) return false;

      if (
        reparto !== TUTTI &&
        (a.dipendenti?.reparto ?? "").trim().toLowerCase() !==
          reparto.toLowerCase()
      ) {
        return false;
      }

      if (
        corsoSelezionato !== TUTTI &&
        (a.tipi_corso?.nome_corso ?? "").trim().toLowerCase() !==
          corsoSelezionato.toLowerCase()
      ) {
        return false;
      }

      return true;
    });

    const filtrate = base.filter((a) => {
      const sc = a.data_scadenza_calcolata as string;
      if (vista === "Scaduti") return sc < oggiStr;
      if (vista === "In scadenza (90 gg)") return sc >= oggiStr && sc <= d90Str;
      if (vista === "In scadenza (6 mesi)") return sc >= oggiStr && sc <= d6mStr;
      if (vista === "In scadenza (1 anno)") return sc >= oggiStr && sc <= d1yStr;
      return true;
    });

    const t = q.trim().toLowerCase();
    const cercate = t
      ? filtrate.filter((a) =>
          `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""} ${a.codice_fiscale} ${
            a.tipi_corso?.nome_corso ?? ""
          }`
            .toLowerCase()
            .includes(t),
        )
      : filtrate;

    return [...cercate].sort((a, b) => {
      let valA = "";
      let valB = "";

      switch (sortCol) {
        case "dipendente":
          valA = `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""}`.trim();
          valB = `${b.dipendenti?.cognome ?? ""} ${b.dipendenti?.nome ?? ""}`.trim();
          break;
        case "codice_fiscale":
          valA = a.codice_fiscale ?? "";
          valB = b.codice_fiscale ?? "";
          break;
        case "reparto":
          valA = a.dipendenti?.reparto ?? "";
          valB = b.dipendenti?.reparto ?? "";
          break;
        case "corso":
          valA = a.tipi_corso?.nome_corso ?? "";
          valB = b.tipi_corso?.nome_corso ?? "";
          break;
        case "data_corso":
          valA = a.data_corso ?? "";
          valB = b.data_corso ?? "";
          break;
        case "scadenza":
          valA = a.data_scadenza_calcolata ?? "";
          valB = b.data_scadenza_calcolata ?? "";
          break;
      }

      const cmp = valA.localeCompare(valB, "it", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [attestati, vista, q, reparto, corsoSelezionato, sortCol, sortDir]);

  function IntestazioneOrdinabile({
    colonna,
    titolo,
  }: {
    colonna: ColonnaSort;
    titolo: string;
  }) {
    const attiva = sortCol === colonna;
    return (
      <th className="px-3 py-2">
        <button
          type="button"
          onClick={() => cambiaOrdinamento(colonna)}
          className="inline-flex items-center gap-1 font-semibold hover:text-foreground transition-colors"
          title={`Ordina per ${titolo}`}
        >
          <span>{titolo}</span>
          {attiva ? (
            sortDir === "asc" ? (
              <ArrowUp className="size-3.5 text-primary" />
            ) : (
              <ArrowDown className="size-3.5 text-primary" />
            )
          ) : (
            <ArrowUpDown className="size-3 text-muted-foreground/50 opacity-60 hover:opacity-100" />
          )}
        </button>
      </th>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-4">
          <Link to="/" aria-label="Torna alla home">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <span className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Scadenze attestati</h1>
            <p className="text-xs text-muted-foreground">
              {righe.length} risultati · {vista}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-5 py-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Menù a tendina periodo temporale */}
          <div className="flex items-center gap-1.5">
            <CalendarClock className="size-4 text-muted-foreground" />
            <Select
              value={vista}
              onValueChange={(v) => setVista(v as Vista)}
            >
              <SelectTrigger className="w-[210px]">
                <SelectValue placeholder="Periodo di scadenza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scaduti">Scaduti</SelectItem>
                <SelectItem value="In scadenza (90 gg)">
                  In scadenza (90 gg)
                </SelectItem>
                <SelectItem value="In scadenza (6 mesi)">
                  In scadenza (6 mesi)
                </SelectItem>
                <SelectItem value="In scadenza (1 anno)">
                  In scadenza (1 anno)
                </SelectItem>
                <SelectItem value="Tutti con scadenza">
                  Tutti con scadenza
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Menù a tendina corsi */}
          <Select
            value={corsoSelezionato}
            onValueChange={setCorsoSelezionato}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tutti i corsi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TUTTI}>Tutti i corsi</SelectItem>
              {corsi.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Menù a tendina reparti */}
          <Select value={reparto} onValueChange={setReparto}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti i reparti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TUTTI}>Tutti i reparti</SelectItem>
              {reparti.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ricerca per testo */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca dipendente, CF o corso"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Caricamento…
          </div>
        ) : (
          /* Contenitore vincolato alla finestra: scrollbar orizzontale SEMPRE a vista */
          <div className="mt-4 max-h-[calc(100vh-220px)] min-h-[320px] overflow-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-left text-xs text-muted-foreground shadow-xs">
                <tr>
                  <IntestazioneOrdinabile
                    colonna="dipendente"
                    titolo="Dipendente"
                  />
                  <IntestazioneOrdinabile
                    colonna="codice_fiscale"
                    titolo="Codice fiscale"
                  />
                  <IntestazioneOrdinabile
                    colonna="reparto"
                    titolo="Reparto"
                  />
                  <IntestazioneOrdinabile
                    colonna="corso"
                    titolo="Corso"
                  />
                  <IntestazioneOrdinabile
                    colonna="data_corso"
                    titolo="Data corso"
                  />
                  <IntestazioneOrdinabile
                    colonna="scadenza"
                    titolo="Scadenza"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {righe.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">
                      {a.dipendenti?.cognome} {a.dipendenti?.nome}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.codice_fiscale}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.dipendenti?.reparto ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {a.tipi_corso?.nome_corso ?? "—"}
                    </td>
                    <td className="px-3 py-2">{formatData(a.data_corso)}</td>
                    <td
                      className={`px-3 py-2 ${
                        scaduto(a.data_scadenza_calcolata)
                          ? "font-semibold text-destructive"
                          : "text-warning-foreground"
                      }`}
                    >
                      {formatData(a.data_scadenza_calcolata)}
                    </td>
                  </tr>
                ))}
                {!righe.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      Nessun attestato in questa vista
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
