#!/usr/bin/python3
"""Render + retry + catalog + upload a list of publications.

Prints live progress to stdout. Safe to re-run: already-stamped issues are skipped.

Usage:
  python -u -X utf8 scripts/encode_pubs.py video-games-magazine diehard-gamefan
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time

PY = [sys.executable, "-u", "-X", "utf8"]
FLAGS = [
    "--no-upload",
    "--no-catalog",
    "--webp-read",
    "--webp-quality",
    "80",
    "--read-scale",
    "0.7",
]


def log(msg: str) -> None:
    print(msg, flush=True)


def run(title: str, args: list[str]) -> int:
    cmd = PY + args
    log(f"\n=== {title} ===\n{' '.join(cmd)}")
    started = time.time()
    rc = subprocess.run(cmd).returncode
    log(f"=== {title} rc={rc} in {(time.time() - started) / 60:.1f} min ===")
    return rc


def run_parallel(jobs: list[tuple[str, list[str]]]) -> list[int]:
    procs = []
    for title, args in jobs:
        cmd = PY + args
        log(f"\n=== start {title} ===\n{' '.join(cmd)}")
        procs.append((title, time.time(), subprocess.Popen(cmd)))
    rcs = []
    for title, started, proc in procs:
        rc = proc.wait()
        log(f"=== {title} rc={rc} in {(time.time() - started) / 60:.1f} min ===")
        rcs.append(rc)
    return rcs


def pub_args(pub: str, workers: int, extra: list[str] | None = None) -> list[str]:
    args = ["scripts/publish_all.py", "--publication", pub, "--workers", str(workers), *FLAGS]
    if extra:
        args.extend(extra)
    return args


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("publications", nargs="+")
    ap.add_argument("--render-workers", type=int, default=4)
    ap.add_argument("--upload-workers", type=int, default=16)
    args = ap.parse_args()
    pubs = args.publications

    log(f"{len(pubs)} titles: {', '.join(pubs)}")
    run_parallel([(f"render {p}", pub_args(p, args.render_workers)) for p in pubs])
    run_parallel([(f"retry {p}", pub_args(p, 1, ["--force"])) for p in pubs])
    run("rebuild catalog", ["scripts/build_pages.py"])
    for pub in pubs:
        run(f"upload {pub}", ["scripts/upload_r2.py", "--publication", pub, "--workers", str(args.upload_workers)])
    log("BATCH DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
