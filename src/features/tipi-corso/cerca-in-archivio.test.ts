import { describe, expect, it } from "vitest";
import type { TipoCorso } from "@/lib/api";
import { cercaInArchivio } from "./cerca-in-archivio";

const c = (codice: string, nome_corso: string) => ({ codice, nome_corso }) as TipoCorso;
const archivio = [c("LAV-PLE-II-831", "Piattaforme di lavoro mobili elevabili (PLE)"), c("SIC-GEN-04", "Formazione generale")];

describe("cercaInArchivio", () => {
  it("trova per parte del nome senza badare a maiuscole", () => {
    expect(cercaInArchivio(archivio, "", "piattaforme").map((x) => x.codice)).toEqual(["LAV-PLE-II-831"]);
  });
  it("trova per codice", () => {
    expect(cercaInArchivio(archivio, "GEN-04", "")).toHaveLength(1);
  });
  it("sotto 3 caratteri non cerca", () => {
    expect(cercaInArchivio(archivio, "", "pi")).toEqual([]);
  });
});
