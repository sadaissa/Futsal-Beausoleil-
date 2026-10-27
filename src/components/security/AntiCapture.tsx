"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Trigger = "PrintScreen" | "Cmd+Shift+3" | "Cmd+Shift+4" | "Cmd+Shift+5" | "Win+Shift+S" | "Ctrl+P" | "Copie";

/**
 * Protection "raisonnable" des pages sensibles (vote et résultats) :
 * - désactive la sélection de texte, le clic droit, la copie et l'impression ;
 * - détecte les raccourcis de capture courants et affiche un avertissement ;
 * - floute le contenu quand la fenêtre perd le focus (outils de capture) ;
 * - journalise chaque tentative détectée côté serveur.
 * Aucune page web ne peut empêcher à 100 % une capture d'écran (voir README).
 */
export function AntiCapture({ children }: { children: ReactNode }) {
  const [warning, setWarning] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastLog = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flag = useCallback((trigger: Trigger) => {
    setWarning(true);
    setHidden(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setWarning(false);
      setHidden(false);
    }, 4000);
    // Tente de vider le presse-papiers (capture copiée par PrintScreen).
    navigator.clipboard?.writeText?.("").catch(() => {});
    // Un journal toutes les 3 secondes au maximum.
    const now = Date.now();
    if (now - lastLog.current < 3000) return;
    lastLog.current = now;
    fetch("/api/security/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, trigger }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if (e.key === "PrintScreen" || e.code === "PrintScreen") return flag("PrintScreen");
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(key)) {
        e.preventDefault();
        return flag(`Cmd+Shift+${key}` as Trigger);
      }
      // Sur Windows, la touche Windows est exposée en metaKey.
      if (e.metaKey && e.shiftKey && key === "s") return flag("Win+Shift+S");
      if ((e.ctrlKey || e.metaKey) && key === "p") {
        e.preventDefault();
        return flag("Ctrl+P");
      }
    };
    const block = (e: Event) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      flag("Copie");
    };
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);
    const onVisibility = () => setHidden(document.visibilityState !== "visible");

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true); // PrintScreen n'émet souvent que keyup
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timer.current);
    };
  }, [flag]);

  return (
    <div className="no-select no-print relative">
      <p className="mb-4 rounded-xl border border-boulet/40 bg-boulet/10 px-4 py-2 text-center text-xs font-semibold text-red-200">
        Les captures d’écran des votes et résultats sont interdites.
      </p>
      <div className={hidden ? "sensitive-blur" : undefined}>{children}</div>
      {warning && (
        <div role="alert" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur">
          <div className="max-w-sm rounded-2xl border border-boulet/60 bg-ink-800 p-6 text-center shadow-boulet">
            <div className="heading text-3xl text-red-400">Capture détectée</div>
            <p className="mt-2 text-white/80">
              Les captures d’écran des votes et résultats sont interdites. Cette tentative a été enregistrée.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
