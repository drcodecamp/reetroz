#!/usr/bin/env python3
"""Upload rendered assets (and optionally PDFs) to the Cloudflare R2 bucket.

Object layout mirrors site/public so the site only needs a base URL swap:
  covers/<issue-id>.jpg
  pages/<issue-id>/manifest.json
  pages/<issue-id>/thumb/NNN.webp
  pages/<issue-id>/read/NNN.webp
  pdf/<issue-id>.pdf

Skips objects that already exist with the same size. Safe to re-run.

Usage:
  python upload_r2.py --covers                 # all covers
  python upload_r2.py --issue cgw-186          # pages + cover (+ --pdf for the PDF)
  python upload_r2.py --issue cgw-186 --pdf
  python upload_r2.py --all-rendered           # every issue that has a manifest
  python upload_r2.py --pdfs cgw               # every PDF of a publication
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import mimetypes
import sys
import time
from pathlib import Path

import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "site" / "public"
LIB = ROOT / "library"

CACHE_IMMUTABLE = "public, max-age=31536000, immutable"
CACHE_SHORT = "public, max-age=300"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def client(env: dict[str, str]):
    return boto3.client(
        "s3",
        endpoint_url=env["R2_ENDPOINT"],
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4", max_pool_connections=32, retries={"max_attempts": 8, "mode": "adaptive"}),
    )


def existing_sizes(s3, bucket: str, prefix: str) -> dict[str, int]:
    sizes: dict[str, int] = {}
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            sizes[obj["Key"]] = obj["Size"]
    return sizes


def content_type(path: Path) -> str:
    if path.suffix == ".webp":
        return "image/webp"
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def plan_issue(issue_id: str, with_pdf: bool) -> list[tuple[Path, str, str]]:
    """Returns (local path, key, cache-control) tuples."""
    jobs: list[tuple[Path, str, str]] = []
    cover = PUBLIC / "covers" / f"{issue_id}.jpg"
    if cover.exists():
        jobs.append((cover, f"covers/{issue_id}.jpg", CACHE_IMMUTABLE))
    pages_dir = PUBLIC / "pages" / issue_id
    if (pages_dir / "manifest.json").exists():
        jobs.append((pages_dir / "manifest.json", f"pages/{issue_id}/manifest.json", CACHE_SHORT))
        for size in ("thumb", "read"):
            for f in sorted((pages_dir / size).glob("*.webp")):
                jobs.append((f, f"pages/{issue_id}/{size}/{f.name}", CACHE_IMMUTABLE))
    if with_pdf:
        pub_id = issue_id.split("-", 1)[0]
        issues = json.loads((LIB / pub_id / "issues.json").read_text(encoding="utf-8"))
        issue = next((i for i in issues if i["id"] == issue_id), None)
        if issue:
            pdf = ROOT / issue["files"]["pdf"]
            if pdf.exists():
                jobs.append((pdf, f"pdf/{issue_id}.pdf", CACHE_IMMUTABLE))
    return jobs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue", action="append", default=[], help="issue id, e.g. cgw-186")
    ap.add_argument("--covers", action="store_true", help="upload every cover")
    ap.add_argument("--all-rendered", action="store_true", help="every issue with a manifest")
    ap.add_argument("--pdf", action="store_true", help="also upload the PDF(s)")
    ap.add_argument("--pdfs", action="append", default=[], metavar="PUBLICATION", help="upload every PDF of a publication, e.g. --pdfs cgw")
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    env = load_env()
    bucket = env["R2_BUCKET"]
    s3 = client(env)

    jobs: list[tuple[Path, str, str]] = []
    if args.covers:
        jobs += [(f, f"covers/{f.name}", CACHE_IMMUTABLE) for f in sorted((PUBLIC / "covers").glob("*.jpg"))]
    issue_ids = list(args.issue)
    if args.all_rendered:
        issue_ids += [p.name for p in (PUBLIC / "pages").iterdir() if (p / "manifest.json").exists()]
    for iid in dict.fromkeys(issue_ids):
        jobs += plan_issue(iid, args.pdf)
    for pub_id in args.pdfs:
        issues = json.loads((LIB / pub_id / "issues.json").read_text(encoding="utf-8"))
        for issue in issues:
            pdf = ROOT / issue["files"]["pdf"]
            if pdf.exists():
                jobs.append((pdf, f"pdf/{issue['id']}.pdf", CACHE_IMMUTABLE))
            else:
                print(f"  missing locally: {pdf}", file=sys.stderr)
    if not jobs:
        ap.error("nothing to upload; pass --covers, --issue, --pdfs or --all-rendered")

    # de-dupe by key and skip objects already present with same size
    unique = {key: (path, cc) for path, key, cc in jobs}
    prefixes = {k.split("/", 1)[0] + "/" for k in unique}
    remote: dict[str, int] = {}
    for prefix in prefixes:
        remote.update(existing_sizes(s3, bucket, prefix))
    todo = [(path, key, cc) for key, (path, cc) in unique.items() if remote.get(key) != path.stat().st_size]
    total_bytes = sum(p.stat().st_size for p, _, _ in todo)
    print(f"{len(unique)} objects planned, {len(unique) - len(todo)} already in bucket, uploading {len(todo)} ({total_bytes / 1e6:.1f} MB)", flush=True)

    def put(job: tuple[Path, str, str]) -> int:
        path, key, cc = job
        s3.upload_file(
            str(path),
            bucket,
            key,
            ExtraArgs={"ContentType": content_type(path), "CacheControl": cc},
        )
        return path.stat().st_size

    done_bytes = 0
    started = time.time()
    failures = 0
    with cf.ThreadPoolExecutor(args.workers) as ex:
        futures = {ex.submit(put, job): job for job in todo}
        for n, fut in enumerate(cf.as_completed(futures), 1):
            job = futures[fut]
            try:
                done_bytes += fut.result()
            except Exception as exc:  # noqa: BLE001
                failures += 1
                print(f"  FAILED {job[1]}: {exc}", file=sys.stderr, flush=True)
            if n % 50 == 0 or n == len(todo):
                elapsed = time.time() - started
                print(f"  {n}/{len(todo)}  {done_bytes / 1e6:.1f} MB  {done_bytes / 1e6 / max(elapsed, 0.1):.1f} MB/s", flush=True)

    print("done" if not failures else f"done with {failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
