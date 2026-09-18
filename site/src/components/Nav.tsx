import Link from "next/link";
import { AuthStatus } from "@/components/AuthStatus";
import { startReadingIssue } from "@/lib/catalog";

const links = [
  { href: "/catalog", label: "Catalog" },
  { href: "/#reader", label: "Reader" },
  { href: "/#eras", label: "Eras" },
  { href: "/#picks", label: "Staff picks" },
];

export function Nav({ opaque = false }: { opaque?: boolean }) {
  const start = startReadingIssue();
  const startHref = start ? `/read/${start.slug}?p=1&play=1` : "/catalog";
  return (
    <header className={`fixed inset-x-0 top-0 z-50 ${opaque ? "bg-ink pt-4" : ""}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 ${opaque ? "pb-3" : "mt-4"}`}>
        <nav className={`${opaque ? "border border-paper/10 bg-ink-2" : "glass"} flex w-full items-center justify-between rounded-full px-3 py-2 pl-4`}>
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid size-8 place-items-center overflow-hidden rounded-md bg-amber text-ink">
              <span className="font-display text-sm font-extrabold leading-none tracking-tight">
                PP
              </span>
              <span className="absolute inset-x-0 bottom-0 h-1 bg-ink/20" />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Pixel Press
              <span className="ml-2 hidden font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-paper-dim sm:inline">
                the archive
              </span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-full px-3.5 py-1.5 text-sm text-paper-dim transition hover:bg-paper/5 hover:text-paper"
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
              className="hidden rounded-full border border-paper/15 px-4 py-1.5 text-sm text-paper transition hover:border-paper/40 sm:inline-flex"
            >
              Browse
            </Link>
            <Link
              href={startHref}
              className="inline-flex items-center gap-2 rounded-full bg-amber px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-amber-2"
            >
              Start reading
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
