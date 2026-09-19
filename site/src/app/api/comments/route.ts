import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, isAuthConfigured } from "@/auth";
import { getIssue } from "@/lib/catalog";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";

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
    const db = getDb();
    const rows = await db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        name: users.name,
        image: users.image,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.issueSlug, slug))
      .orderBy(desc(comments.createdAt));

    const list: IssueCommentDto[] = rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        name: row.name?.trim() || "Reader",
        image: row.image,
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
    const db = getDb();
    const [row] = await db
      .insert(comments)
      .values({ issueSlug: slug, userId, body })
      .returning({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
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
