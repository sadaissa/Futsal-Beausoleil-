export function StatTile({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
      <div className={`heading text-4xl ${accent ? "text-gold-gradient" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}
