"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthStatus() {
  const { data, status } = useSession();
  if (status === "loading") {
    return <span className="hidden h-8 w-16 sm:block" />;
  }

  if (!data?.user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-paper/15 px-3.5 py-1.5 text-sm text-paper transition hover:border-paper/40"
      >
        Sign in
      </Link>
    );
  }

  const name = data.user.name?.split(" ")[0] ?? "Account";
  const image = data.user.image;

  return (
    <div className="flex items-center gap-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={28} height={28} className="size-7 rounded-full" />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-paper/10 font-mono text-[10px]">
          {name.slice(0, 1)}
        </span>
      )}
      <button
        type="button"
        onClick={() => signOut()}
        className="hidden rounded-full px-2 py-1 text-sm text-paper-dim transition hover:text-paper sm:inline"
      >
        Sign out
      </button>
    </div>
  );
}
