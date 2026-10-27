"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="heading text-5xl text-red-300">Carton rouge</div>
      <p className="mt-2 text-white/60">Une erreur inattendue est survenue.</p>
      <Button className="mt-6" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
