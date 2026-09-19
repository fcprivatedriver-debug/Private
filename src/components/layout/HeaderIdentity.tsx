"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeSpacePhoto, uploadSpacePhoto } from "@/actions/profile-photo";
import type { NinaSpace } from "@/actions/household";
import { cn } from "@/lib/utils";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function HeaderIdentity({
  space,
  userName,
  familyName,
  userImage,
  familyImage,
}: {
  space: NinaSpace;
  userName: string;
  familyName?: string;
  userImage?: string | null;
  familyImage?: string | null;
}) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isFamily = space === "family";
  const displayName = isFamily
    ? familyName || "Família"
    : userName.trim().split(/\s+/)[0] || userName;
  const photoUrl = isFamily ? familyImage : userImage;
  const hasPhoto = Boolean(photoUrl);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function submitFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    setOpen(false);
    const fd = new FormData();
    fd.set("space", space);
    fd.set("file", file);
    start(async () => {
      const res = await uploadSpacePhoto(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onRemove() {
    setError(null);
    setOpen(false);
    start(async () => {
      const res = await removeSpacePhoto(space);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="topbar-identity" ref={rootRef}>
      <button
        type="button"
        className={cn("topbar-avatar-btn", pending && "is-pending")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={hasPhoto ? "Alterar fotografia" : "Adicionar fotografia"}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl!} alt="" className="topbar-avatar-img" />
        ) : (
          <span className="topbar-avatar-fallback" aria-hidden>
            {initialsFrom(displayName)}
          </span>
        )}
      </button>

      <p className="topbar-space-name" title={displayName}>
        {displayName}
      </p>

      {open ? (
        <div className="topbar-avatar-menu" id={menuId} role="menu">
          <button
            type="button"
            role="menuitem"
            className="topbar-avatar-menu-item"
            onClick={() => cameraRef.current?.click()}
          >
            Tirar fotografia
          </button>
          <button
            type="button"
            role="menuitem"
            className="topbar-avatar-menu-item"
            onClick={() => galleryRef.current?.click()}
          >
            Escolher da galeria
          </button>
          {hasPhoto ? (
            <button
              type="button"
              role="menuitem"
              className="topbar-avatar-menu-item is-danger"
              onClick={onRemove}
            >
              Remover fotografia
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          submitFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          submitFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error ? (
        <p className="topbar-avatar-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
