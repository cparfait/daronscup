"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";

/** Pseudo éditable en place (page profil). */
export function EditableName({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const value = draft.trim();
    if (value.length < 2) {
      setError("2 caractères minimum.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setName(value);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            maxLength={30}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
                setError(null);
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 font-[family-name:var(--font-display)] text-lg font-bold outline-none focus:border-[var(--color-pitch)]"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            aria-label="Enregistrer"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-pitch)] text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setEditing(false);
              setError(null);
            }}
            aria-label="Annuler"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)]"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h2 className="truncate font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
        {name}
      </h2>
      <button
        type="button"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-cream)]"
        title="Modifier le pseudo"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}
