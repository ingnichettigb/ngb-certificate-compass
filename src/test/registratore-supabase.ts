/*
 * File:      registratore-supabase.ts
 * Percorso:  src/test/registratore-supabase.ts
 * Client Supabase finto per i test di flusso: risponde con dati fissi per tabella e
 * REGISTRA ogni chiamata (tabella, operazione, argomenti) e ogni notifica (toast).
 * Si usa insieme a uno snapshot per verificare che una riorganizzazione del codice non cambi il comportamento.
 */

/** Registro condiviso: lo importa sia il test sia il mock. */
export const registro: unknown[][] = [];

export type DatiFinti = {
  /** Righe restituite da una select su ogni tabella. */
  tabelle?: Record<string, unknown[]>;
  /** Riga restituita da single()/maybeSingle() per tabella. */
  singoli?: Record<string, unknown>;
  /** Tabelle la cui lettura fallisce, con il messaggio d'errore (si può modificare durante il test). */
  errori?: Record<string, string>;
};

const ultimo = (path: string[]) => [...path].reverse().find((p) => p !== "()") ?? "";

export function creaClientFinto({ tabelle = {}, singoli = {}, errori = {} }: DatiFinti = {}) {
  const risposta = (path: string[], tabella: string) => {
    const op = ultimo(path);
    if (path.includes("storage")) {
      if (op === "download") return { data: new Blob(["x"]), error: null };
      if (op === "createSignedUrl") return { data: { signedUrl: "https://firmato/x" }, error: null };
      return { data: null, error: null };
    }
    const scrive = path.some((p) => ["insert", "update", "upsert", "delete"].includes(p));
    if (!scrive && errori[tabella]) return { data: null, error: { message: errori[tabella] } };
    if (op === "single" || op === "maybeSingle") return { data: singoli[tabella] ?? { id: "nuovo-1" }, error: null };
    if (!scrive && tabella in tabelle) return { data: tabelle[tabella], error: null, count: tabelle[tabella]!.length };
    return { data: scrive ? null : [], error: null, count: 1 };
  };
  // La tabella è legata alla singola catena di chiamate, così le query simultanee non si mescolano.
  const crea = (path: string[], tabella: string): any =>
    new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") return (ok: (v: unknown) => unknown) => ok(risposta(path, tabella));
        return crea([...path, String(prop)], tabella);
      },
      apply(_t, _this, args) {
        const tab = path.length === 1 && path[0] === "from" ? String(args[0]) : tabella;
        registro.push(["sb", path.filter((p) => p !== "()").join("."), tab, JSON.stringify(args)]);
        return crea([...path, "()"], tab);
      },
    });
  return crea([], "");
}

/** Sostituto di `sonner`: registra le notifiche. */
export function creaToastFinto(vi: { fn: (f: (...a: any[]) => unknown) => unknown }) {
  const rec = (nome: string) =>
    vi.fn((msg: unknown, opt?: unknown) => {
      registro.push(["toast." + nome, String(msg), opt ? JSON.stringify(opt) : ""]);
      return "toast-id";
    });
  return { success: rec("success"), error: rec("error"), info: rec("info"), loading: rec("loading") };
}
