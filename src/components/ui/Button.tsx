import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "gold" | "pitch" | "ghost" | "danger" | "outline";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wide transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  gold: "bg-gradient-to-b from-gold-light to-gold text-ink shadow-gold hover:brightness-110",
  pitch: "bg-pitch text-white hover:bg-pitch-light",
  ghost: "bg-white/5 text-white hover:bg-white/10",
  danger: "bg-boulet text-white hover:bg-red-600",
  outline: "border border-white/20 text-white hover:border-gold/70 hover:text-gold-light",
};

export function buttonClass(variant: Variant = "gold", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "gold", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "gold",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
