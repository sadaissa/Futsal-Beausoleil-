import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Confidentialité" };

/** Politique de confidentialité (page publique, requise par Google pour la connexion OAuth). */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-white/80">
      <PageHeader title="Confidentialité" subtitle="Dernière mise à jour : 27 octobre 2026" />

      <Section title="Qui sommes-nous ?">
        Beausoleil Ultimate Team est une application privée et non commerciale, réservée aux joueurs du foot en salle
        du lundi à Beausoleil. Elle est gérée par l’administrateur du groupe. Pour toute question ou demande concernant
        tes données, contacte-le directement.
      </Section>

      <Section title="Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li>Ton adresse e-mail et ton surnom (création du compte).</li>
          <li>Ton mot de passe, uniquement sous forme chiffrée (bcrypt) : il n’est jamais lisible.</li>
          <li>
            Si tu te connectes avec Google : ton adresse e-mail, ton nom et ta photo Google, transmis par Google. Le
            nom et la photo Google ne sont pas affichés dans l’application.
          </li>
          <li>Ta photo de profil, si tu en ajoutes une.</li>
          <li>Tes participations aux sessions et les résultats agrégés (Team of the Week, distinctions du mois).</li>
          <li>
            Le fait que tu as voté pour une session. <strong>Le contenu de ton vote n’est jamais enregistré</strong> :
            seuls des totaux anonymes par joueur sont conservés, sans lien avec le votant.
          </li>
          <li>Les tentatives de capture d’écran détectées sur les pages de vote (page, raccourci, navigateur).</li>
        </ul>
      </Section>

      <Section title="Utilisation">
        Ces données servent uniquement au fonctionnement de l’application : connexion, vote, Team of the Week et
        distinctions du mois. Elles ne sont ni vendues, ni partagées, ni utilisées à des fins publicitaires.
      </Section>

      <Section title="Hébergement">
        L’application est hébergée par Vercel. La base de données (Neon) et les photos (Vercel Blob) sont stockées dans
        l’Union européenne (Francfort, Allemagne).
      </Section>

      <Section title="Cookies">
        Un seul cookie technique est utilisé, pour garder ta session connectée. Aucun cookie publicitaire ni outil de
        suivi.
      </Section>

      <Section title="Durée de conservation et droits">
        Tes données sont conservées tant que ton compte existe. Tu peux à tout moment demander à l’administrateur
        l’accès, la correction ou la suppression de tes données et de ton compte, conformément au RGPD.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-2">
      <h2 className="heading text-2xl text-white">{title}</h2>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
