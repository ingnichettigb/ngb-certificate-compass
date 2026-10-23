/*
 * File:      Info.tsx
 * Percorso:  src/features/hr/components/Info.tsx
 * Coppia etichetta/valore nella scheda anagrafica.
 */


export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
