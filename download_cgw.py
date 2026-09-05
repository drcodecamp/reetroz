#!/usr/bin/env python3
"""Download Computer Gaming World issues from cgwmuseum.org into year folders.

The museum publishes every CGW issue for free:
  first = cgw_1.1.pdf  (Nov-Dec 1981)
  last  = cgw_268.pdf  (Nov 2006)

Early issues use volume.issue names (cgw_1.1.pdf ... cgw_5.5.pdf).
From issue 25 onward the filename is cgw_25.pdf ... cgw_268.pdf.
cgw_269.pdf and cgw_399.pdf do not exist (HTTP 404).

Usage:
  python download_cgw.py
  python download_cgw.py --from-year 2000 --to-year 2006
  python download_cgw.py --catalog-only
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def log(message: str) -> None:
    print(message, flush=True)

BASE = "https://www.cgwmuseum.org/galleries"
PDF_BASE = f"{BASE}/issues"
USER_AGENT = (
    "CGW-Personal-Archive/1.0 "
    "(offline reading of publicly offered museum PDFs; +https://www.cgwmuseum.org/)"
)
ISSUE_LINK_RE = re.compile(
    r"index\.php\?year=(\d{4})&pub=2&id=(\d+)", re.IGNORECASE
)
PDF_HREF_RE = re.compile(
    r"href\s*=\s*issues/(cgw_[0-9.]+\.pdf)", re.IGNORECASE
)
ISSUE_META_RE = re.compile(
    r"Issue Number:\s*</[^>]+>\s*([^<]+).*?Date:\s*</[^>]+>\s*([^<]+)",
    re.IGNORECASE | re.DOTALL,
)
SKIP_IDS = {0, 500}


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
        raise
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


class RangeNotSatisfiable(Exception):
    pass


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


def fetch_text(url: str, retries: int = 4) -> str:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            raw = request(url)
            assert raw is not None
            return raw.decode("utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001 - network can fail in many ways
            last_error = exc
            wait = min(20, 2**attempt) + random.uniform(0.2, 0.8)
            log(f"  retry {attempt}/{retries} after error: {exc}")
            time.sleep(wait)
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def polite_pause(seconds: float) -> None:
    time.sleep(seconds + random.uniform(0.15, 0.55))


def discover_year(year: int) -> list[tuple[int, int]]:
    html = fetch_text(f"{BASE}/index.php?year={year}&pub=2&id=500")
    found: list[tuple[int, int]] = []
    seen: set[int] = set()
    for match in ISSUE_LINK_RE.finditer(html):
        link_year = int(match.group(1))
        issue_id = int(match.group(2))
        if link_year != year or issue_id in SKIP_IDS or issue_id in seen:
            continue
        seen.add(issue_id)
        found.append((year, issue_id))
    found.sort(key=lambda item: item[1])
    return found


def parse_issue_page(year: int, issue_id: int) -> dict:
    html = fetch_text(f"{BASE}/index.php?year={year}&pub=2&id={issue_id}")
    pdf_match = PDF_HREF_RE.search(html)
    if not pdf_match:
        raise RuntimeError(f"No PDF link on issue page year={year} id={issue_id}")
    filename = pdf_match.group(1)
    number = filename.removeprefix("cgw_").removesuffix(".pdf")
    date = ""
    meta = ISSUE_META_RE.search(html)
    if meta:
        number = meta.group(1).strip() or number
        date = meta.group(2).strip()
    return {
        "year": year,
        "id": issue_id,
        "number": number,
        "date": date,
        "filename": filename,
        "url": f"{PDF_BASE}/{filename}",
    }


def file_looks_like_pdf(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 1024:
        return False
    with path.open("rb") as fh:
        return fh.read(5).startswith(b"%PDF")


def remote_size(url: str) -> int | None:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            length = resp.headers.get("Content-Length")
            return int(length) if length else None
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def download_pdf(item: dict, dest_dir: Path, retries: int = 6) -> str:
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / item["filename"]
    part = dest.with_suffix(dest.suffix + ".part")
    expected = remote_size(item["url"])

    if dest.exists():
        size = dest.stat().st_size
        if file_looks_like_pdf(dest) and (expected is None or size == expected):
            part.unlink(missing_ok=True)
            return "skipped"

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resume_from = part.stat().st_size if part.exists() else 0
            if expected is not None and resume_from > expected:
                part.unlink(missing_ok=True)
                resume_from = 0
            request(item["url"], dest=part, resume_from=resume_from)
            if not file_looks_like_pdf(part):
                part.unlink(missing_ok=True)
                raise RuntimeError("downloaded file is not a PDF")
            if expected is not None and part.stat().st_size != expected:
                part.unlink(missing_ok=True)
                raise RuntimeError(
                    f"size mismatch: got {part.stat().st_size}, expected {expected}"
                )
            replace_with_retries(part, dest)
            return "downloaded"
        except RangeNotSatisfiable as exc:
            last_error = exc
            part.unlink(missing_ok=True)
            log(f"    download retry {attempt}/{retries}: stale partial, restarting")
            time.sleep(1.5 + random.uniform(0.2, 0.8))
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            wait = min(40, 2**attempt) + random.uniform(0.4, 1.2)
            log(f"    download retry {attempt}/{retries}: {exc}")
            time.sleep(wait)
    raise RuntimeError(f"Failed to download {item['url']}: {last_error}")


def build_catalog(
    from_year: int,
    to_year: int,
    pause: float,
    catalog_path: Path,
    existing: list[dict] | None = None,
) -> list[dict]:
    catalog: list[dict] = []
    known = {
        (item["year"], item["id"]): item
        for item in (existing or [])
        if from_year <= int(item["year"]) <= to_year
    }
    for year in range(from_year, to_year + 1):
        log(f"Scanning {year}...")
        issues = discover_year(year)
        polite_pause(pause)
        if not issues:
            log(f"  no issues listed for {year}")
            continue
        for year_num, issue_id in issues:
            cached = known.get((year_num, issue_id))
            if cached:
                catalog.append(cached)
                log(
                    f"  {cached['filename']:16}  issue {cached['number']:6}  "
                    f"{cached['date']}  (cached)"
                )
                continue
            item = parse_issue_page(year_num, issue_id)
            catalog.append(item)
            catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
            log(
                f"  {item['filename']:16}  issue {item['number']:6}  {item['date']}"
            )
            polite_pause(pause)
    return catalog


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download CGW Museum PDFs into year folders."
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parent / "CGW"),
        help="Destination folder (default: ./CGW)",
    )
    parser.add_argument("--from-year", type=int, default=1981)
    parser.add_argument("--to-year", type=int, default=2006)
    parser.add_argument(
        "--delay",
        type=float,
        default=1.6,
        help="Seconds to wait between museum requests",
    )
    parser.add_argument(
        "--catalog-only",
        action="store_true",
        help="Only list issues, do not download PDFs",
    )
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="Reuse catalog.json and download only files that are not already saved",
    )
    args = parser.parse_args()

    if args.from_year > args.to_year:
        log("--from-year must be <= --to-year")
        return 2

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)
    catalog_path = out_root / "catalog.json"
    existing: list[dict] = []
    if catalog_path.exists():
        existing = json.loads(catalog_path.read_text(encoding="utf-8"))

    if args.only_missing:
        catalog = [
            item
            for item in existing
            if args.from_year <= int(item["year"]) <= args.to_year
        ]
        if not catalog:
            log("catalog.json is empty or missing; run without --only-missing first.")
            return 1
    else:
        catalog = build_catalog(
            args.from_year, args.to_year, args.delay, catalog_path, existing
        )
        catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")

    if not catalog:
        log("No issues found.")
        return 1

    first = catalog[0]
    last = catalog[-1]
    log("")
    log(f"Found {len(catalog)} issues.")
    log(f"First: {first['filename']}  ({first['date'] or first['year']})")
    log(f"Last:  {last['filename']}  ({last['date'] or last['year']})")
    log(f"Catalog saved to {catalog_path}")

    if args.catalog_only:
        return 0

    downloaded = skipped = failed = 0
    failures: list[str] = []
    for index, item in enumerate(catalog, start=1):
        dest_dir = out_root / str(item["year"])
        log(f"[{index}/{len(catalog)}] {item['year']}/{item['filename']} ...")
        try:
            status = download_pdf(item, dest_dir)
            if status == "skipped":
                skipped += 1
                log("  already have it")
            else:
                downloaded += 1
                size_mb = (dest_dir / item["filename"]).stat().st_size / (1024 * 1024)
                log(f"  saved ({size_mb:.1f} MB)")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            failures.append(f"{item['filename']}: {exc}")
            log(f"  FAILED: {exc}")
        polite_pause(args.delay)

    log("")
    log(
        f"Done. downloaded={downloaded} skipped={skipped} failed={failed} "
        f"total={len(catalog)}"
    )
    log(f"Files are in {out_root}\\<year>\\")
    if failures:
        log("Failures:")
        for line in failures:
            log(f"  {line}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
