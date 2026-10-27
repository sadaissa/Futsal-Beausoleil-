"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/Button";

/** Bouton d'action sensible qui demande une confirmation avant l'envoi du formulaire. */
export function ConfirmButton({
  confirm,
  children,
  ...props
}: ComponentProps<typeof Button> & { confirm: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
      {...props}
    >
      {pending ? "Patiente…" : children}
    </Button>
  );
}
