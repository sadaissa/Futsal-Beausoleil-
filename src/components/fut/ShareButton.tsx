"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Partage natif (mobile) ou copie du lien de la Team of the Week. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* partage annulé */
    }
  }
  return (
    <Button type="button" variant="outline" onClick={share}>
      {copied ? "Lien copié ✓" : "Partager"}
    </Button>
  );
}
