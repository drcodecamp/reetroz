import { Suspense } from "react";
import { NavChrome, NavFallback } from "@/components/NavChrome";

/** Server wrapper — useSearchParams must sit under a Server Component Suspense. */
export function Nav() {
  return (
    <Suspense fallback={<NavFallback />}>
      <NavChrome />
    </Suspense>
  );
}
