"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

export function AuthStatus() {
  const { data, status } = useSession();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") {
    return <span className="size-8 rounded-full bg-paper/8" />;
  }

  if (!data?.user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-paper/15 px-3.5 py-1.5 text-base text-paper transition hover:border-paper/40"
      >
        Sign in
      </Link>
    );
  }

  const name = data.user.name?.trim() || data.user.email?.trim() || "Account";
  const initial = name.slice(0, 1).toUpperCase();
  const image = data.user.image;
  const showImage = Boolean(image) && !imageFailed;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center overflow-hidden rounded-full bg-paper/10 text-xs font-semibold text-paper ring-1 ring-paper/15 transition hover:ring-paper/40"
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image!}
            alt=""
            width={32}
            height={32}
            className="size-8 object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-paper/10 bg-ink-2 py-1 shadow-xl"
        >
          <p className="truncate px-3 py-2 text-sm text-paper-dim" title={name}>
            {name}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm text-paper transition hover:bg-paper/8"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
