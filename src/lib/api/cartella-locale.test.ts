/*
 * File:          cartella-locale.test.ts
 * Percorso:      src/lib/api/cartella-locale.test.ts
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 10:10): Prima stesura: verifica che i nomi usati dalle schermate
 *     (scegliCartellaLocale, dimenticaCartellaLocale, verificaPermessi) siano davvero esportati.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import * as locale from "@/lib/api/cartella-locale";
import * as multiple from "@/lib/api/cartelle-multiple";

describe("nomi esportati del modulo cartella locale", () => {
  it("scegliCartellaLocale è la funzionecanonical scegliCartellaArchivio", () => {
    expect(typeof locale.scegliCartellaLocale).toBe("function");
    expect(locale.scegliCartellaLocale).toBe(locale.scegliCartellaArchivio);
  });

  it("dimenticaCartellaLocale è la funzione canonical disconnettiCartellaArchivio", () => {
    expect(typeof locale.dimenticaCartellaLocale).toBe("function");
    expect(locale.dimenticaCartellaLocale).toBe(locale.disconnettiCartellaArchivio);
  });

  it("verificaPermessi è esportata sia dal modulo locale sia da quello multi-cartella", () => {
    expect(typeof locale.verificaPermessi).toBe("function");
    expect(typeof multiple.verificaPermessi).toBe("function");
    expect(multiple.verificaPermessi).toBe(locale.verificaPermessi);
  });
});
