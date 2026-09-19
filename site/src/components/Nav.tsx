import Link from "next/link";
import { AuthStatus } from "@/components/AuthStatus";

const links = [
  { href: "/catalog", label: "Catalog" },
  { href: "/#reader", label: "Reader" },
  { href: "/#eras", label: "Eras" },
  { href: "/#picks", label: "Staff picks" },
];

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-paper/8 bg-ink">
      <div className="flex h-14 items-center justify-between px-4 sm:px-5">
        <nav className="flex w-full items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid size-8 place-items-center overflow-hidden rounded-md bg-amber text-ink">
              <span className="font-display text-sm font-extrabold leading-none tracking-tight">
                PP
              </span>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-ink/20" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Pixel Press
              <span className="ml-2 hidden text-base font-normal text-paper-dim sm:inline">
                the archive
              </span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-full px-3.5 py-1.5 text-base text-paper-dim transition hover:bg-paper/5 hover:text-paper"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <AuthStatus />
            <Link
              href="/catalog"
              className="hidden rounded-full border border-paper/15 px-4 py-1.5 text-base text-paper transition hover:border-paper/40 sm:inline-flex"
            >
              Browse
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
