"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Trash2, Loader2 } from "lucide-react";

/** Bouton de suppression définitive de son propre compte. */
export function DeleteAccountButton() {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (
      !confirm(
        "Supprimer définitivement ton compte ? Tes pronos, points et badges seront effacés. Cette action est irréversible."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        setBusy(false);
        alert("La suppression a échoué. Réessaie.");
      }
    } catch {
      setBusy(false);
      alert("Erreur réseau. Réessaie.");
    }
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer mon compte
    </button>
  );
}
