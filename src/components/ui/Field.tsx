import type { ComponentProps } from "react";

/** Champ de formulaire avec libellé et message d'erreur accessibles. */
export function Field({
  label,
  name,
  error,
  hint,
  ...props
}: ComponentProps<"input"> & { label: string; name: string; error?: string; hint?: string }) {
  const id = props.id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="input"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-white/40">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
