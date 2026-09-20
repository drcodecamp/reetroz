import { NextResponse } from "next/server";
import { auth, isAuthConfigured } from "@/auth";
import { getIssue } from "@/lib/catalog";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

const MAX_BODY = 2000;
const PAGE_SIZE = 20;
const MAX_PAGE = 50;

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
    return NextResponse.json({
      comments: [] as IssueCommentDto[],
      total: 0,
      nextCursor: null,
      ...flags(),
    });
  }

  const params = new URL(request.url).searchParams;
  const limit = Math.min(
    MAX_PAGE,
    Math.max(1, Number(params.get("limit")) || PAGE_SIZE),
  );
  const cursor = params.get("cursor")?.trim() || undefined;

  try {
    const prisma = getPrisma();
    const [total, rows] = await Promise.all([
      prisma.comment.count({ where: { issueSlug: slug } }),
      prisma.comment.findMany({
        where: { issueSlug: slug },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
        },
      }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const list: IssueCommentDto[] = page.map((row: (typeof page)[number]) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        name: row.user.name?.trim() || "Reader",
        image: row.user.image,
      },
    }));

    return NextResponse.json({
      comments: list,
      total,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      ...flags(),
    });
  } catch {
    return NextResponse.json({
      comments: [] as IssueCommentDto[],
      total: 0,
      nextCursor: null,
      ...flags(),
    });
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
