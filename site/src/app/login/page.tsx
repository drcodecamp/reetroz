import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, isAuthConfigured, signIn } from "@/auth";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const callbackUrl = next?.startsWith("/") ? next : "/catalog";

  if (isAuthConfigured()) {
    const session = await auth();
    if (session?.user) redirect(callbackUrl);
  }

  return (
    <>
      <Nav />
      <main className="grid min-h-screen place-items-center px-4 pb-24 pt-32">
        <div className="w-full max-w-md rounded-3xl border border-paper/10 bg-ink-2/80 p-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber">Account</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-3 text-sm leading-relaxed text-paper-dim">
            Optional for now. The archive stays open. An account lets us remember you later.
          </p>

          {isAuthConfigured() ? (
            <form
              className="mt-8"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber px-5 py-3 text-sm font-semibold text-ink transition hover:bg-amber-2"
              >
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed border-paper/15 px-4 py-4 text-sm text-paper-dim">
              Google login is not configured on this server yet. Set{" "}
              <code className="font-mono text-paper">AUTH_SECRET</code>,{" "}
              <code className="font-mono text-paper">AUTH_GOOGLE_ID</code>, and{" "}
              <code className="font-mono text-paper">AUTH_GOOGLE_SECRET</code>.
            </p>
          )}

          <Link href="/catalog" className="mt-6 inline-block text-sm text-amber hover:text-amber-2">
            Back to catalog
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
