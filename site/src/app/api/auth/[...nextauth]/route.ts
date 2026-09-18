import { handlers, isAuthConfigured } from "@/auth";

async function empty() {
  return Response.json(null);
}

export const GET = isAuthConfigured() ? handlers.GET : empty;
export const POST = isAuthConfigured() ? handlers.POST : empty;
