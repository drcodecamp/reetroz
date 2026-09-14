#!/usr/bin/env python3
"""Download VGHF PDFs listed in a vghf_index.json file.

Each entry's vghf_id is fetched from:
  https://pdf.gamehistory.workers.dev/{vghf_id}?token=TOKEN

TOKEN comes from --token or the VGHF_TOKEN environment variable.

Usage:
  set VGHF_TOKEN=your-token
  python scripts/download_vghf.py

  python scripts/download_vghf.py --token your-token --workers 50
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


from library_paths import ROOT, pdf_dir

DEFAULT_INDEX = ROOT / "library" / "gamepro" / "vghf_index.json"
DEFAULT_OUT = pdf_dir("gamepro")
PDF_BASE = "https://pdf.gamehistory.workers.dev"
USER_AGENT = "pixelpress-vghf-download/1.0"
WIN_BAD = re.compile(r'[<>:"/\\|?*]')
_LOG_LOCK = threading.Lock()


def log(message: str) -> None:
    with _LOG_LOCK:
        print(message, flush=True)


def pdf_url(vghf_id: str, token: str) -> str:
    return f"{PDF_BASE}/{urllib.parse.quote(vghf_id)}?token={urllib.parse.quote(token)}"


def safe_filename(item: dict) -> str:
    title = (item.get("title") or item["vghf_id"]).strip()
    date = (item.get("date_display") or "").strip()
    name = f"{title} ({date})" if date else title
    name = WIN_BAD.sub("-", name)
    name = re.sub(r"\s+", " ", name).strip(" .")
    return f"{name}.pdf"


def file_looks_like_pdf(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 1024:
        return False
    with path.open("rb") as fh:
        return fh.read(5).startswith(b"%PDF")


class RangeNotSatisfiable(Exception):
    pass


def request(url: str, dest: Path | None = None, resume_from: int = 0) -> bytes | None:
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if resume_from > 0:
        headers["Range"] = f"bytes={resume_from}-"
    req = urllib.request.Request(url, headers=headers)
    try:
        resp_cm = urllib.request.urlopen(req, timeout=180)
    except urllib.error.HTTPError as exc:
        if resume_from > 0 and exc.code == 416:
            raise RangeNotSatisfiable from exc
        body = exc.read(400).decode("utf-8", "replace") if exc.fp else ""
        err = RuntimeError(f"HTTP {exc.code} {exc.reason}: {body[:200]}")
        if exc.code in {401, 403}:
            err.auth_failed = True  # type: ignore[attr-defined]
        if exc.code in {404, 415}:
            err.fatal = True  # type: ignore[attr-defined]
        raise err from exc
    with resp_cm as resp:
        if dest is None:
            return resp.read()
        dest.parent.mkdir(parents=True, exist_ok=True)
        mode = "ab" if resume_from else "wb"
        with dest.open(mode) as fh:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                fh.write(chunk)
        return None


def replace_with_retries(src: Path, dest: Path, attempts: int = 8) -> None:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            dest.unlink(missing_ok=True)
            src.replace(dest)
            return
        except OSError as exc:
            last_error = exc
            time.sleep(min(12, 0.6 * attempt) + random.uniform(0.2, 0.7))
    raise RuntimeError(f"Could not move {src.name} into place: {last_error}")


def download_pdf(url: str, dest: Path, retries: int = 6) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(dest.suffix + ".part")

    if dest.exists() and file_looks_like_pdf(dest):
        part.unlink(missing_ok=True)
        return "skipped"

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resume_from = part.stat().st_size if part.exists() else 0
            request(url, dest=part, resume_from=resume_from)
            if not file_looks_like_pdf(part):
                preview = part.read_bytes()[:180].decode("utf-8", "replace")
                part.unlink(missing_ok=True)
                raise RuntimeError(f"downloaded file is not a PDF: {preview}")
            replace_with_retries(part, dest)
            return "downloaded"
        except RangeNotSatisfiable as exc:
            last_error = exc
            part.unlink(missing_ok=True)
            log(f"    {dest.name}: retry {attempt}/{retries}: stale partial, restarting")
            time.sleep(1.5 + random.uniform(0.2, 0.8))
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if getattr(exc, "auth_failed", False) or "HTTP 401" in str(exc) or "HTTP 403" in str(exc):
                raise RuntimeError(f"Failed to download {dest.name}: {exc}") from exc
            if getattr(exc, "fatal", False) or "HTTP 415" in str(exc) or "HTTP 404" in str(exc):
                raise RuntimeError(f"Failed to download {dest.name}: {exc}") from exc
            wait = min(40, 2**attempt) + random.uniform(0.4, 1.2)
            log(f"    {dest.name}: retry {attempt}/{retries}: {exc}")
            time.sleep(wait)
    raise RuntimeError(f"Failed to download {dest.name}: {last_error}")


def load_index(path: Path) -> list[dict]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "items" in raw:
        items = raw["items"]
        for item in items:
            item.setdefault("vghf_id", item.get("id"))
        return items
    if not isinstance(raw, list):
        raise RuntimeError(f"Unexpected index shape in {path}")
    return raw


def main() -> int:
    parser = argparse.ArgumentParser(description="Download VGHF PDFs by vghf_id.")
    parser.add_argument(
        "--token",
        default=os.environ.get("VGHF_TOKEN", ""),
        help="Access token (or set VGHF_TOKEN)",
    )
    parser.add_argument(
        "--index",
        default=str(DEFAULT_INDEX),
        help="Path to vghf_index.json",
    )
    parser.add_argument(
        "--out",
        default=str(DEFAULT_OUT),
        help="Destination folder (default: H:/cat-library/gamepro/pdf)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=10,
        help="How many files to download at once (default: 10)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Download at most N files (0 = all)",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="Skip the first N index entries",
    )
    args = parser.parse_args()

    token = (args.token or "").strip()
    if not token:
        log("Set --token or the VGHF_TOKEN environment variable.")
        return 2

    index_path = Path(args.index)
    if not index_path.is_file():
        log(f"Index not found: {index_path}")
        return 2

    items = [item for item in load_index(index_path) if item.get("vghf_id")]
    if args.start:
        items = items[args.start :]
    if args.limit:
        items = items[: args.limit]
    if not items:
        log("No vghf_id entries to download.")
        return 1

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    workers = max(1, args.workers)
    log(f"Index: {index_path}")
    log(f"Output: {out_root}")
    log(f"Files: {len(items)}")
    log(f"Workers: {workers}")
    log("")

    def fetch_one(index: int, item: dict) -> tuple[str, Path]:
        dest = out_root / safe_filename(item)
        log(f"[{index}/{len(items)}] start  {dest.name}")
        status = download_pdf(pdf_url(item["vghf_id"], token), dest)
        return status, dest

    downloaded = skipped = failed = 0
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(fetch_one, index, item): item
            for index, item in enumerate(items, start=1)
        }
        for future in as_completed(futures):
            item = futures[future]
            label = safe_filename(item)
            try:
                status, dest = future.result()
                if status == "skipped":
                    skipped += 1
                    log(f"  already have it  {label}")
                else:
                    downloaded += 1
                    size_mb = dest.stat().st_size / (1024 * 1024)
                    log(f"  saved ({size_mb:.1f} MB)  {label}")
            except Exception as exc:  # noqa: BLE001
                failed += 1
                failures.append(f"{label}: {exc}")
                log(f"  FAILED  {label}: {exc}")

    log("")
    log(
        f"Done. downloaded={downloaded} skipped={skipped} failed={failed} "
        f"total={len(items)}"
    )
    if failures:
        log("Failures:")
        for line in failures:
            log(f"  {line}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
