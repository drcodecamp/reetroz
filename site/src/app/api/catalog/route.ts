import { NextResponse } from "next/server";
import { parseCatalogSearchParams, queryCatalog } from "@/lib/catalogQuery";

export function GET(request: Request) {
  const { search } = new URL(request.url);
  const result = queryCatalog(parseCatalogSearchParams(new URLSearchParams(search)));
  return NextResponse.json(result);
}
