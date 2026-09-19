import { NextResponse } from "next/server";
import { auth, isAuthConfigured } from "@/auth";
import { getIssue } from "@/lib/catalog";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

const MAX_BODY = 2000;

export type IssueCommentDto = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; image: string | null };
};

function flags() {
  return {
    authEnabled: isAuthConfigured(),
    commentsEnabled: isDatabaseConfigured(),
  };
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug || !getIssue(slug)) {
    return NextResponse.json({ error: "Unknown issue" }, { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ comments: [] as IssueCommentDto[], ...flags() });
  }

  try {
    const rows = await getPrisma().comment.findMany({
      where: { issueSlug: slug },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    });

    const list: IssueCommentDto[] = rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        name: row.user.name?.trim() || "Reader",
        image: row.user.image,
      },
    }));

    return NextResponse.json({ comments: list, ...flags() });
  } catch {
    return NextResponse.json({ comments: [] as IssueCommentDto[], ...flags() });
  }
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "Sign in is not configured" }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Comments are not stored in this environment" }, { status: 503 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug =
    typeof payload === "object" && payload && "slug" in payload
      ? String((payload as { slug?: unknown }).slug ?? "").trim()
      : "";
  const body =
    typeof payload === "object" && payload && "body" in payload
      ? String((payload as { body?: unknown }).body ?? "").trim()
      : "";

  if (!slug || !getIssue(slug)) {
    return NextResponse.json({ error: "Unknown issue" }, { status: 404 });
  }
  if (!body) {
    return NextResponse.json({ error: "Write a comment first" }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json({ error: `Keep comments under ${MAX_BODY} characters` }, { status: 400 });
  }

  try {
    const row = await getPrisma().comment.create({
      data: { issueSlug: slug, userId, body },
      select: { id: true, body: true, createdAt: true },
    });

    const comment: IssueCommentDto = {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        name: session.user?.name?.trim() || "Reader",
        image: session.user?.image ?? null,
      },
    };

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save the comment" }, { status: 500 });
  }
}
