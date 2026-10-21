/*
 * File:      CardProviderAi.tsx
 * Percorso:  src/features/ai/components/CardProviderAi.tsx
 * Scheda di un fornitore AI: stato, chiave, modello e pulsanti (usa, modifica, chiave, testa, elimina).
 */
import { AlertTriangle, CheckCircle2, Key, Loader2, Pencil, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type AIProvider } from "@/lib/ai-providers";

export function CardProviderAi({
  p,
  activeId,
  testando,
  onAttiva,
  onModifica,
  onChiave,
  onTesta,
  onElimina,
}: {
  p: AIProvider;
  activeId: string;
  testando: string | null;
  onAttiva: (id: string) => void;
  onModifica: (p: AIProvider) => void;
  onChiave: (p: AIProvider) => void;
  onTesta: (p: AIProvider) => void;
  onElimina: (p: AIProvider) => void;
}) {
  const isActive = p.id === activeId;
  const hasKey = p.kind === "default" || Boolean(p.apiKey.trim());
  return (
      <div
       
        className={`rounded-lg border p-4 ${isActive ? "border-primary bg-primary/5" : "bg-card"}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{p.name}</span>
              {p.isCustom && (
                <Badge variant="secondary" className="text-[10px]">
                  Personalizzata
                </Badge>
              )}
              {isActive ? (
                <Badge>In uso</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onAttiva(p.id)}
                  disabled={!hasKey}
                >
                  Usa questa
                </Button>
              )}
              {p.kind !== "default" &&
                (hasKey ? (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    <CheckCircle2 className="size-3" /> Chiave inserita
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    <AlertTriangle className="size-3" /> Chiave mancante
                  </Badge>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">{p.note}</p>
            <p className="text-[11px] text-muted-foreground">
              Modello: <code className="rounded bg-muted px-1">{p.model}</code>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {p.kind !== "default" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onModifica(p)}
                  title="Modifica nome, modello, URL o chiave"
                  className="gap-1"
                >
                  <Pencil className="size-3.5 text-muted-foreground" />
                  <span>Modifica</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChiave(p)}
                  title="Modifica rapida chiave"
                >
                  <Key className="size-3.5" />
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" disabled={testando === p.id} onClick={() => onTesta(p)}>
              {testando === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
              {testando === p.id ? "Provo..." : "Testa"}
            </Button>
            {p.isCustom && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onElimina(p)}
                title="Elimina questa AI"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
  );
}
