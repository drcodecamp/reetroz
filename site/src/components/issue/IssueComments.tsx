"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { IssueCommentDto } from "@/app/api/comments/route";

type Flags = {
  authEnabled: boolean;
  commentsEnabled: boolean;
};

type CommentsPage = {
  comments?: IssueCommentDto[];
  total?: number;
  nextCursor?: string | null;
  authEnabled?: boolean;
  commentsEnabled?: boolean;
};

const PAGE_SIZE = 20;

export function IssueComments({ slug }: { slug: string }) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<IssueCommentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [flags, setFlags] = useState<Flags>({ authEnabled: false, commentsEnabled: false });
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setComments([]);
    setNextCursor(null);
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}&limit=${PAGE_SIZE}`)
      .then(async (res) => {
        const data = (await res.json()) as CommentsPage;
        if (cancelled) return;
        setComments(data.comments ?? []);
        setTotal(data.total ?? data.comments?.length ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setFlags({
          authEnabled: Boolean(data.authEnabled),
          commentsEnabled: Boolean(data.commentsEnabled),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setComments([]);
          setTotal(0);
          setNextCursor(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/comments?slug=${encodeURIComponent(slug)}&limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`,
      );
      const data = (await res.json()) as CommentsPage;
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...(data.comments ?? []).filter((c) => !seen.has(c.id))];
      });
      if (typeof data.total === "number") setTotal(data.total);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // Keep the comments we already have.
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body: text }),
      });
      const data = (await res.json()) as { comment?: IssueCommentDto; error?: string };
      if (!res.ok || !data.comment) {
        setError(data.error ?? "Could not post the comment");
        return;
      }
      setComments((prev) => [data.comment!, ...prev]);
      setTotal((n) => n + 1);
      setBody("");
    } catch {
      setError("Could not post the comment");
    } finally {
      setSubmitting(false);
    }
  }

  const signedIn = Boolean(session?.user);
  const canPost = signedIn && flags.commentsEnabled;

  return (
    <section className="border-t border-paper/8 pt-8">
      <h2 className="text-xl font-semibold">
        {loading ? "Comments" : `${total.toLocaleString()} Comments`}
      </h2>

      <div className="mt-5">
        {status === "loading" ? (
          <div className="h-20 rounded-xl border border-paper/8 bg-ink-2/60" />
        ) : !flags.authEnabled ? (
          <p className="text-base text-paper-dim">Sign in is not configured yet, so comments stay closed.</p>
        ) : !signedIn ? (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper/10 text-base text-paper-dim">
              +
            </span>
            <Link
              href={`/login?next=/issue/${slug}`}
              className="flex-1 rounded-full border border-paper/10 px-4 py-3 text-base text-paper-dim transition hover:border-paper/30 hover:text-paper"
            >
              Sign in to comment
            </Link>
          </div>
        ) : !flags.commentsEnabled ? (
          <p className="text-base text-paper-dim">
            You are signed in, but comments are not stored in this environment yet.
          </p>
        ) : (
          <form onSubmit={submit} className="flex gap-3">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full"
              />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper/10 text-base">
                {(session?.user?.name ?? "R").slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Add a comment..."
                className="w-full resize-y rounded-none border-0 border-b border-paper/15 bg-transparent px-0 py-2 text-base text-paper outline-none placeholder:text-paper-dim focus:border-paper/50"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                {error && <p className="mr-auto text-base text-amber-2">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
                  className="rounded-full bg-amber px-4 py-1.5 text-base font-semibold text-ink transition hover:bg-amber-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Posting..." : "Comment"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <ul className="mt-8 space-y-6">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3">
            {comment.author.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={comment.author.image}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full"
              />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper/10 text-base">
                {comment.author.name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-base">
                <span className="font-medium">{comment.author.name}</span>
                <span className="ml-2 text-paper-dim">{timeAgo(comment.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{comment.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-full border border-paper/15 px-4 py-2 text-base transition hover:border-paper/40 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {!loading && total === 0 && canPost && (
        <p className="mt-6 text-base text-paper-dim">Be the first to comment.</p>
      )}
    </section>
  );
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
