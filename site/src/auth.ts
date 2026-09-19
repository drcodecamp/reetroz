import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

export function isAuthConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

const useDb = isDatabaseConfigured();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: useDb
    ? DrizzleAdapter(getDb(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: useDb ? "database" : "jwt" },
  providers: process.env.AUTH_GOOGLE_ID ? [Google] : [],
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id ?? token.sub ?? "";
      }
      return session;
    },
  },
});
