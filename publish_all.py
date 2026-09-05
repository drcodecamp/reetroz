#!/usr/bin/env python3
"""Render + upload every issue of a publication that is not yet readable.

Runs N issues in parallel (separate processes; PyMuPDF and WebP encoding are
CPU-bound). Each worker renders one issue to site/public/pages/<id>/ and
immediately uploads it to R2, so issues become readable progressively.
Finishes by rebuilding the site catalog (build_pages.py) so the flags update.

Usage:
  python publish_all.py --publication cgw            # everything not rendered yet
  python publish_all.py --publication cgw --workers 8
  python publish_all.py --publication cgw --no-upload
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LIB = ROOT / "library"
PAGES_DIR = ROOT / "site" / "public" / "pages"


def work(issue: dict, upload: bool) -> tuple[str, int, float, str | None]:
    """Runs in a worker process. Returns (id, pages, seconds, error)."""
    started = time.time()
    try:
        import build_pages  # noqa: PLC0415
        import upload_r2  # noqa: PLC0415

        manifest = build_pages.render_issue(issue)
        build_pages.render_cover(issue)
        if upload:
            env = upload_r2.load_env()
            s3 = upload_r2.client(env)
            jobs = upload_r2.plan_issue(issue["id"], with_pdf=False)
            for path, key, cc in jobs:
                s3.upload_file(str(path), env["R2_BUCKET"], key,
                               ExtraArgs={"ContentType": upload_r2.content_type(path), "CacheControl": cc})
        return issue["id"], manifest["pages"], time.time() - started, None
    except Exception as exc:  # noqa: BLE001
        return issue["id"], 0, time.time() - started, repr(exc)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--publication", required=True)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="only do the first N pending issues")
    args = ap.parse_args()

    issues = json.loads((LIB / args.publication / "issues.json").read_text(encoding="utf-8"))
    pending = [i for i in issues if not (PAGES_DIR / i["id"] / "manifest.json").exists() and (ROOT / i["files"]["pdf"]).exists()]
    # most recent first: those are the issues people are most likely to open
    pending.sort(key=lambda i: i["date"]["start"], reverse=True)
    if args.limit:
        pending = pending[: args.limit]
    total_pages = sum(i["pages"] for i in pending)
    print(f"{len(pending)} issues / {total_pages} pages to render with {args.workers} workers", flush=True)
    if not pending:
        return 0

    started = time.time()
    done_pages = 0
    failures: list[tuple[str, str]] = []
    with cf.ProcessPoolExecutor(args.workers) as ex:
        futures = [ex.submit(work, i, not args.no_upload) for i in pending]
        for n, fut in enumerate(cf.as_completed(futures), 1):
            iid, pages, secs, err = fut.result()
            if err:
                failures.append((iid, err))
                print(f"  FAILED {iid}: {err}", file=sys.stderr, flush=True)
                continue
            done_pages += pages
            elapsed = time.time() - started
            rate = done_pages / max(elapsed, 1)
            eta = (total_pages - done_pages) / max(rate, 0.01)
            print(f"  [{n}/{len(pending)}] {iid}: {pages} pages in {secs:.0f}s | {done_pages}/{total_pages} pages, {rate:.1f} p/s, ETA {eta / 60:.0f} min", flush=True)

    print("Rebuilding site catalog...", flush=True)
    subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "build_pages.py")], check=False)
    if failures:
        print(f"{len(failures)} issue(s) failed: {', '.join(i for i, _ in failures)}")
        return 1
    print(f"all done in {(time.time() - started) / 60:.0f} min")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
