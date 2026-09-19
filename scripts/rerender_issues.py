#!/usr/bin/env python3
"""Force re-render + upload a list of issue ids.

Ignores the encoder stamp so already-WebP issues get a real rebuild.
Usage:
  python -u -X utf8 scripts/rerender_issues.py --ids-file /tmp/broken.txt --workers 4
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

from library_paths import ROOT, SCRIPTS, resolve_pdf
from publish_all import work

LIB = ROOT / "library"


def load_issues_by_id() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for path in LIB.glob("*/issues.json"):
        for issue in json.loads(path.read_text(encoding="utf-8")):
            out[issue["id"]] = issue
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids-file", required=True)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--no-catalog", action="store_true")
    ap.add_argument("--webp-quality", type=int, default=80)
    ap.add_argument("--read-scale", type=float, default=0.7)
    args = ap.parse_args()

    os.environ["CAT_WEBP_QUALITY"] = str(args.webp_quality)
    os.environ["CAT_READ_SCALE"] = str(args.read_scale)

    ids = [
        line.strip()
        for line in Path(args.ids_file).read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    by_id = load_issues_by_id()
    pending = []
    missing = []
    for iid in ids:
        issue = by_id.get(iid)
        if not issue:
            missing.append(iid)
            continue
        if not resolve_pdf(issue["files"]["pdf"]).exists():
            missing.append(iid)
            continue
        pending.append(issue)
    pending.sort(key=lambda i: (i["publication"], i["date"]["start"]), reverse=True)

    if missing:
        print(f"skip {len(missing)} unknown/no-pdf ids", flush=True)
    total_pages = sum(i["pages"] for i in pending)
    print(
        f"{len(pending)} issues / {total_pages} pages, {args.workers} workers, "
        f"webp q{args.webp_quality} scale {args.read_scale}",
        flush=True,
    )
    if not pending:
        return 1

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
            consume(n, work(issue, not args.no_upload, True))
    else:
        with cf.ProcessPoolExecutor(args.workers) as ex:
            futures = [ex.submit(work, i, not args.no_upload, True) for i in pending]
            for n, fut in enumerate(cf.as_completed(futures), 1):
                consume(n, fut.result())

    if not args.no_catalog:
        print("Rebuilding site catalog...", flush=True)
        subprocess.run([sys.executable, "-X", "utf8", str(SCRIPTS / "build_pages.py")], check=False)

    if failures:
        fail_path = Path(args.ids_file).with_suffix(".failed.txt")
        fail_path.write_text("\n".join(i for i, _ in failures) + "\n", encoding="utf-8")
        print(f"{len(failures)} issue(s) failed -> {fail_path}")
        return 1
    print(f"all done in {(time.time() - started) / 60:.0f} min")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
