import { NextResponse, type NextRequest } from "next/server";

/** Keep issue page 1 on the canonical URL so ?p=1 is not a duplicate. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.get("p") !== "1") return NextResponse.next();
  const url = request.nextUrl.clone();
  url.searchParams.delete("p");
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/issue/:slug"],
};
