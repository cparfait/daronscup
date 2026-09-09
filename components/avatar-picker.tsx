"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";

/**
 * Choix de l'avatar depuis la pellicule / le disque.
 *
 * L'image est redimensionnée et recadrée en carré DANS LE NAVIGATEUR avant
 * l'envoi : une photo de téléphone fait 4 Mo, on en garde ~25 Ko. On la stocke
 * ensuite en data URL (cf. app/api/profile/route.ts) — pas de bucket à
 * provisionner, pas de fichier à nettoyer quand un compte est supprimé.
 */
const SIZE = 256; // côté du carré final, en pixels
const QUALITY = 0.82;
/** Marge sous la limite serveur (200 000 caractères), pour la ceinture. */
const MAX_CHARS = 190_000;

export function AvatarPicker({
  name,
  current,
}: {
  name: string;
  current: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (avatar: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setPreview(avatar);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setPreview(current);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisis une image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await squareJpeg(file);
      if (dataUrl.length > MAX_CHARS) throw new Error("Image trop lourde.");
      setPreview(dataUrl); // aperçu immédiat, avant même l'aller-retour réseau
      await send(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image illisible.");
      setPreview(current);
      setBusy(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      {preview ? (
        // Data URL : `next/image` n'a rien à optimiser, et le passage par le
        // loader ferait clignoter l'aperçu à chaque changement.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={name}
          width={72}
          height={72}
          className="size-[72px] rounded-full object-cover ring-2 ring-[var(--color-pitch)]/30"
        />
      ) : (
        <div className="flex size-[72px] items-center justify-center rounded-full bg-[var(--color-pitch)] text-3xl font-bold ring-2 ring-[var(--color-pitch-bright)]/30">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Changer d'avatar"
        title="Changer d'avatar"
        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-[var(--color-pitch)] text-white shadow-lg ring-2 ring-[var(--color-bg)] transition-transform hover:scale-110 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Camera className="size-3.5" />
        )}
      </button>

      {preview && !busy && (
        <button
          type="button"
          onClick={() => send(null)}
          aria-label="Retirer l'avatar"
          title="Retirer l'avatar"
          className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[var(--color-muted)] ring-2 ring-[var(--color-bg)] transition-colors hover:text-[var(--color-danger)]"
        >
          <Trash2 className="size-3" />
        </button>
      )}

      {error && (
        <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Recadre l'image au centre (carré), la réduit à `SIZE`px et la ré-encode en
 * JPEG. Passe par `createImageBitmap` quand il est là — il décode hors du fil
 * principal et gère l'orientation EXIF, que `<img>` ignore sur certains
 * navigateurs mobiles.
 */
async function squareJpeg(file: File): Promise<string> {
  const bitmap = await loadBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image illisible.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  if ("close" in bitmap) bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Repli sur <img> ci-dessous (Safari ancien).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image illisible."));
      img.src = url;
    });
  } finally {
    // Révoqué au tour suivant : l'image est déjà décodée à ce stade.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
