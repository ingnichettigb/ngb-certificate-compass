/*
 * Test delle date usate dai contatori della pagina iniziale.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { intervalliStatistiche } from "./statistiche";

describe("intervalliStatistiche", () => {
  it("oggi e oggi + 6 mesi, in formato AAAA-MM-GG", () => {
    expect(intervalliStatistiche(new Date("2026-10-20T12:00:00Z"))).toEqual({ oggiStr: "2026-10-20", tra6MesiStr: "2027-04-20" });
  });
  it("a cavallo dell'anno", () => {
    expect(intervalliStatistiche(new Date("2026-12-15T10:00:00Z"))).toEqual({ oggiStr: "2026-12-15", tra6MesiStr: "2027-06-15" });
  });
  it("a fine mese il calendario scivola al mese dopo (31 agosto + 6 mesi = 3 marzo)", () => {
    expect(intervalliStatistiche(new Date("2026-08-31T12:00:00Z")).tra6MesiStr).toBe("2027-03-03");
  });
  it("non modifica la data ricevuta", () => {
    const oggi = new Date("2026-10-20T12:00:00Z");
    intervalliStatistiche(oggi);
    expect(oggi.toISOString()).toBe("2026-10-20T12:00:00.000Z");
  });
  it("senza argomenti usa la data di oggi", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-31T08:00:00Z"));
    expect(intervalliStatistiche()).toEqual({ oggiStr: "2026-01-31", tra6MesiStr: "2026-07-31" });
    vi.useRealTimers();
  });
});
