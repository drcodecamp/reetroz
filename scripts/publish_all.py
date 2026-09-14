#!/usr/bin/env python3
"""Render + upload every issue of a publication that is not yet readable.

Defaults to one worker. WebP encoding used to emit garbage under parallel
workers (valid RIFF headers, corrupt VP8 payloads); keep --workers 1 unless
you have a reason to go faster. Each worker writes pages under
H:/cat-library/pages/<id>/ (or E: for older issues) and optionally uploads
to R2. Finishes by rebuilding the site catalog.

Usage:
  python scripts/publish_all.py --publication gamepro --webp-read --no-upload
  python scripts/publish_all.py --publication gamepro --force --webp-read --no-upload
  python scripts/publish_all.py --publication cgw --workers 8
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from library_paths import ROOT, SCRIPTS, pages_dir, resolve_pdf

LIB = ROOT / "library"


def work(issue: dict, upload: bool, force: bool) -> tuple[str, int, float, str | None]:
    """Runs in a worker process. Returns (id, pages, seconds, error)."""
    started = time.time()
    try:
        import build_pages  # noqa: PLC0415
        import upload_r2  # noqa: PLC0415

        quality = os.environ.get("CAT_WEBP_QUALITY")
        if quality:
            build_pages.WEBP_READ = int(quality)
        scale = os.environ.get("CAT_READ_SCALE")
        if scale:
            build_pages.READ_SCALE = float(scale)
        manifest = build_pages.render_issue(issue, force=force)
        build_pages.render_cover(issue)
        if upload:
            env = upload_r2.load_env()
            s3 = upload_r2.client(env)
            jobs = upload_r2.plan_issue(issue["id"])

            def put(job):
                path, key, cc = job
                s3.upload_file(str(path), env["R2_BUCKET"], key,
                               ExtraArgs={"ContentType": upload_r2.content_type(path), "CacheControl": cc})

            with cf.ThreadPoolExecutor(8) as pool:
                list(pool.map(put, jobs))
        return issue["id"], manifest["pages"], time.time() - started, None
    except Exception as exc:  # noqa: BLE001
        return issue["id"], 0, time.time() - started, repr(exc)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--publication", required=True)
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--force", action="store_true", help="re-encode existing pages")
    ap.add_argument("--limit", type=int, default=0, help="only do the first N pending issues")
    ap.add_argument("--webp-read", action="store_true", help="Write read-tier pages as WebP")
    ap.add_argument("--webp-quality", type=int, default=70)
    ap.add_argument("--read-scale", type=float, default=1.0, help="shrink read-tier pages, e.g. 0.7")
    args = ap.parse_args()

    if args.webp_read:
        os.environ["CAT_WEBP_QUALITY"] = str(args.webp_quality)
    os.environ["CAT_READ_SCALE"] = str(args.read_scale)

    issues = json.loads((LIB / args.publication / "issues.json").read_text(encoding="utf-8"))
    want_encoder = (
        f"webp-checked-v1-s{int(round(args.read_scale * 100))}-q{args.webp_quality}"
        if args.webp_read
        else "jpeg-native"
    )

    def needs_render(issue: dict) -> bool:
        if not resolve_pdf(issue["files"]["pdf"]).exists():
            return False
        man = pages_dir(issue["id"]) / "manifest.json"
        if not man.exists():
            return True
        if not args.force:
            return False
        try:
            return json.loads(man.read_text(encoding="utf-8")).get("encoder") != want_encoder
        except Exception:  # noqa: BLE001
            return True

    pending = [i for i in issues if needs_render(i)]
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

    def consume(n: int, result: tuple[str, int, float, str | None]) -> None:
        nonlocal done_pages
        iid, pages, secs, err = result
        if err:
            failures.append((iid, err))
            print(f"  FAILED {iid}: {err}", file=sys.stderr, flush=True)
            return
        done_pages += pages
        elapsed = time.time() - started
        rate = done_pages / max(elapsed, 1)
        eta = (total_pages - done_pages) / max(rate, 0.01)
        print(
            f"  [{n}/{len(pending)}] {iid}: {pages} pages in {secs:.0f}s | "
            f"{done_pages}/{total_pages} pages, {rate:.1f} p/s, ETA {eta / 60:.0f} min",
            flush=True,
        )

    if args.workers <= 1:
        for n, issue in enumerate(pending, 1):
            consume(n, work(issue, not args.no_upload, args.force))
    else:
        with cf.ProcessPoolExecutor(args.workers) as ex:
            futures = [ex.submit(work, i, not args.no_upload, args.force) for i in pending]
            for n, fut in enumerate(cf.as_completed(futures), 1):
                consume(n, fut.result())

    print("Rebuilding site catalog...", flush=True)
    subprocess.run([sys.executable, "-X", "utf8", str(SCRIPTS / "build_pages.py")], check=False)
    if failures:
        print(f"{len(failures)} issue(s) failed: {', '.join(i for i, _ in failures)}")
        return 1
    print(f"all done in {(time.time() - started) / 60:.0f} min")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
