/*
 * File:      HomePage.tsx
 * Percorso:  src/features/home/HomePage.tsx
 * Pagina iniziale: compone intestazione, contatori e schede.
 */
import { IntestazioneHome } from "./components/IntestazioneHome";
import { ContatoriHome } from "./components/ContatoriHome";
import { CardModuloLavoratore } from "./components/CardModuloLavoratore";
import { CardDashboardHr } from "./components/CardDashboardHr";
import { CardPostazioneOperatore } from "./components/CardPostazioneOperatore";
import { useStatistiche } from "./hooks/useStatistiche";
import { useLinkModulo } from "./hooks/useLinkModulo";

export function HomePage() {
  const stats = useStatistiche();
  const { qr, link, copied, copiaLink } = useLinkModulo();

  return (
    <main className="min-h-screen bg-background">
      <IntestazioneHome />

      <section className="mx-auto max-w-6xl px-5 py-10">
        <ContatoriHome stats={stats} />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <CardModuloLavoratore qr={qr} link={link} copied={copied} onCopia={copiaLink} />
          <CardDashboardHr />
          <CardPostazioneOperatore />
        </div>
      </section>
    </main>
  );
}
