#!/usr/bin/env python3
"""Upload rendered assets (and optionally PDFs) to the Cloudflare R2 bucket.

Object layout mirrors site/public so the site only needs a base URL swap:
  covers/<issue-id>.jpg
  pages/<issue-id>/manifest.json
  pages/<issue-id>/thumb/NNN.webp
  pages/<issue-id>/read/NNN.jpg

Original PDFs are deliberately NOT uploaded: readers get pages, not the file.

Skips objects that already exist with the same size. Safe to re-run.

Usage:
  python scripts/upload_r2.py --covers                 # all covers
  python scripts/upload_r2.py --issue cgw-186          # pages + cover
  python scripts/upload_r2.py --all-rendered           # every issue that has a manifest
  python scripts/upload_r2.py --prune                  # delete bucket objects that no longer exist locally
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import mimetypes
import sys
import time
from pathlib import Path

import boto3
from botocore.config import Config

from library_paths import COVERS_ROOT, LOCAL_COVERS, LOCAL_PAGES, PAGES_ROOT, ROOT, cover_path, pages_dir

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


def plan_issue(issue_id: str) -> list[tuple[Path, str, str]]:
    """Returns (local path, key, cache-control) tuples."""
    jobs: list[tuple[Path, str, str]] = []
    cover = cover_path(issue_id)
    if cover.exists():
        jobs.append((cover, f"covers/{issue_id}.jpg", CACHE_IMMUTABLE))
    issue_pages = pages_dir(issue_id)
    if (issue_pages / "manifest.json").exists():
        jobs.append((issue_pages / "manifest.json", f"pages/{issue_id}/manifest.json", CACHE_SHORT))
        for size in ("thumb", "read"):
            folder = issue_pages / size
            if not folder.exists():
                continue
            for f in sorted(f for f in folder.iterdir() if f.suffix in (".jpg", ".webp")):
                jobs.append((f, f"pages/{issue_id}/{size}/{f.name}", CACHE_IMMUTABLE))
    return jobs


def delete_keys(s3, bucket: str, keys: list[str]) -> None:
    for i in range(0, len(keys), 1000):
        s3.delete_objects(Bucket=bucket, Delete={"Objects": [{"Key": k} for k in keys[i : i + 1000]], "Quiet": True})


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue", action="append", default=[], help="issue id, e.g. cgw-186")
    ap.add_argument("--covers", action="store_true", help="upload every cover")
    ap.add_argument("--all-rendered", action="store_true", help="every issue with a manifest")
    ap.add_argument("--prune", action="store_true", help="delete objects in the bucket that have no local counterpart (old formats, PDFs)")
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    env = load_env()
    bucket = env["R2_BUCKET"]
    s3 = client(env)

    jobs: list[tuple[Path, str, str]] = []
    if args.covers:
        jobs += [
            (f, f"covers/{f.name}", CACHE_IMMUTABLE)
            for root in (COVERS_ROOT, LOCAL_COVERS)
            if root.exists()
            for f in sorted(root.glob("*.jpg"))
        ]
    issue_ids = list(args.issue)
    if args.all_rendered:
        for root in (PAGES_ROOT, LOCAL_PAGES):
            if root.exists():
                issue_ids += [p.name for p in root.iterdir() if (p / "manifest.json").exists()]
    for iid in dict.fromkeys(issue_ids):
        jobs += plan_issue(iid)

    if args.prune:
        # Always compare against every local cover + rendered issue.
        # Never prune against just --issue jobs — that would delete the rest of the bucket.
        local = {
            f"covers/{f.name}"
            for root in (COVERS_ROOT, LOCAL_COVERS)
            if root.exists()
            for f in root.glob("*.jpg")
        }
        for root in (PAGES_ROOT, LOCAL_PAGES):
            if not root.exists():
                continue
            for d in root.iterdir():
                if (d / "manifest.json").exists():
                    local |= {key for _, key, _ in plan_issue(d.name)}
        remote_all: dict[str, int] = {}
        for prefix in ("covers/", "pages/", "pdf/"):
            remote_all.update(existing_sizes(s3, bucket, prefix))
        stale = sorted(k for k in remote_all if k not in local)
        print(f"prune: {len(stale)} stale objects ({sum(remote_all[k] for k in stale) / 1e9:.2f} GB) to delete", flush=True)
        delete_keys(s3, bucket, stale)
        if not jobs:
            print("done")
            return 0

    if not jobs:
        ap.error("nothing to upload; pass --covers, --issue, --all-rendered or --prune")

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
