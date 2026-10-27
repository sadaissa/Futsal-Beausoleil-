import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="heading text-8xl text-gold-gradient">404</div>
      <p className="mt-2 text-white/60">Hors-jeu ! Cette page n’existe pas.</p>
      <ButtonLink href="/" className="mt-6">
        Retour à l’accueil
      </ButtonLink>
    </div>
  );
}
