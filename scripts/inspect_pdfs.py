#!/usr/bin/env python3
"""Open downloaded PDFs and fill library/<pub>/issues.json.

Does not render pages. Walks each vghf_index.json, finds the matching PDF on
H:/cat-library, and records page count, dimensions, bytes, and text-layer.

Usage:
  python scripts/inspect_pdfs.py
  python scripts/inspect_pdfs.py --publication gamepro
  python scripts/inspect_pdfs.py --force
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

from download_vghf import safe_filename
from library_paths import ROOT, pdf_dir

LIB = ROOT / "library"
SKIP_PUBS = {"cgw"}  # museum issues.json is already complete (year-folder layout)

MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}
SEASONS = {
    "winter": 12, "spring": 3, "summer": 6, "fall": 9, "autumn": 9,
    "holiday": 12, "christmas": 12,
}

PRESERVE = (
    "special", "cover_headline", "contents", "tags", "notes", "rights", "assets",
)


def log(msg: str) -> None:
    print(msg, flush=True)


def dump_json(path: Path, data, indent: int = 1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=indent, ensure_ascii=False) + "\n", encoding="utf-8")


def parse_cover_date(raw: str) -> dict:
    text = (raw or "").strip()
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("\ufffd", "-")
    display = text or "undated"
    if not text:
        return {"display": display, "start": "9999", "precision": "year"}

    m = re.search(
        r"\b(" + "|".join(MONTHS) + r")\s+(\d{1,2}),\s+(\d{4})\b",
        text,
        re.I,
    )
    if m:
        month, day, year = MONTHS[m.group(1).lower()], int(m.group(2)), int(m.group(3))
        return {
            "display": display,
            "start": f"{year:04d}-{month:02d}-{day:02d}",
            "precision": "day",
        }

    m = re.search(
        r"\b(" + "|".join(MONTHS) + r")(?:\s|/|-)+(\d{4})\s*/\s*("
        + "|".join(MONTHS) + r")(?:\s|/|-)+(\d{4})\b",
        text,
        re.I,
    )
    if m:
        y1, y2 = int(m.group(2)), int(m.group(4))
        start_m, end_m = MONTHS[m.group(1).lower()], MONTHS[m.group(3).lower()]
        out = {
            "display": display,
            "start": f"{y1:04d}-{start_m:02d}",
            "end": f"{y2:04d}-{end_m:02d}",
            "precision": "month",
        }
        return out

    m = re.search(
        r"\b(" + "|".join(MONTHS) + r")(?:/|-)(" + "|".join(MONTHS) + r")\s+(\d{4})\b",
        text,
        re.I,
    )
    if m:
        year = int(m.group(3))
        start_m, end_m = MONTHS[m.group(1).lower()], MONTHS[m.group(2).lower()]
        out = {
            "display": display,
            "start": f"{year:04d}-{start_m:02d}",
            "precision": "month",
        }
        end_year = year if end_m >= start_m else year + 1
        out["end"] = f"{end_year:04d}-{end_m:02d}"
        return out

    m = re.search(r"\b(" + "|".join(MONTHS) + r")\s+(\d{4})\b", text, re.I)
    if m:
        return {
            "display": display,
            "start": f"{int(m.group(2)):04d}-{MONTHS[m.group(1).lower()]:02d}",
            "precision": "month",
        }

    m = re.search(r"\b(" + "|".join(SEASONS) + r")\s+(\d{4})\b", text, re.I)
    if m:
        season = m.group(1).lower()
        year = int(m.group(2))
        return {
            "display": display,
            "start": f"{year:04d}-{SEASONS[season]:02d}",
            "precision": "season",
        }

    years = [int(y) for y in re.findall(r"\b(19\d{2}|20\d{2})\b", text)]
    if years:
        return {"display": display, "start": f"{years[0]:04d}", "precision": "year"}
    return {"display": display, "start": "9999", "precision": "year"}


def printed_number(title: str) -> str | None:
    for pattern in (
        r"\bNumber\s+(\d+(?:\.\d+)?)\b",
        r"\bIssue\s+(\d+(?:\.\d+)?)\b",
        r"\bNo\.?\s+(\d+)\b",
        r"\bVolume\s+(\d+)\b",
    ):
        m = re.search(pattern, title, re.I)
        if m:
            return m.group(1)
    return None


def slug_id(pub: str, number: str | None, title: str, start: str, used: set[str]) -> str:
    if number:
        base = f"{pub}-{number.replace('.', '-')}"
    else:
        extra = re.sub(r"[^a-z0-9]+", "-", title.lower())
        extra = re.sub(rf"^{re.escape(pub)}-", "", extra).strip("-")
        extra = extra[:48].strip("-") or "special"
        date_bit = start.replace("-", "") if start and start != "9999" else ""
        base = f"{pub}-{date_bit}-{extra}" if date_bit else f"{pub}-{extra}"
    base = re.sub(r"[^a-z0-9-]", "", base.lower()).strip("-")
    base = re.sub(r"-{2,}", "-", base)
    candidate = base or f"{pub}-issue"
    n = 2
    while candidate in used:
        candidate = f"{base}-{n}"
        n += 1
    used.add(candidate)
    return candidate


def page_count_from_bytes(path: Path) -> int | None:
    """Last-resort /Count from the page tree when MuPDF cannot open the file."""
    size = path.stat().st_size
    chunks: list[bytes] = []
    with path.open("rb") as fh:
        chunks.append(fh.read(min(size, 1_000_000)))
        if size > 1_000_000:
            fh.seek(max(0, size - 1_000_000))
            chunks.append(fh.read())
    counts = []
    for chunk in chunks:
        counts.extend(int(n) for n in re.findall(rb"/Count\s+(\d+)", chunk))
    return max(counts) if counts else None


def inspect_pdf(path: Path) -> tuple[int, bool, dict | None]:
    try:
        doc = pymupdf.open(path)
    except Exception:
        pages = page_count_from_bytes(path)
        if not pages:
            raise
        return pages, False, None
    try:
        pages = doc.page_count
        if pages < 1:
            pages = page_count_from_bytes(path) or 0
        if pages < 1:
            raise RuntimeError("PDF has no pages")
        has_text = False
        dims = None
        try:
            probe = doc[min(5, pages - 1)]
            has_text = len(probe.get_text().strip()) > 50
            rect = doc[0].rect
            dims = {
                "width_mm": round(rect.width * 25.4 / 72, 1),
                "height_mm": round(rect.height * 25.4 / 72, 1),
            }
        except Exception:
            pass
        return pages, has_text, dims
    finally:
        doc.close()


def load_index(pub: str) -> list[dict]:
    path = LIB / pub / "vghf_index.json"
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "items" in raw:
        items = raw["items"]
        for item in items:
            item.setdefault("vghf_id", item.get("id"))
        return items
    return raw if isinstance(raw, list) else []


def load_existing(pub: str) -> list[dict]:
    path = LIB / pub / "issues.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def sort_key(issue: dict) -> tuple:
    start = issue["date"].get("start") or "9999"
    raw = issue.get("number") or ""
    try:
        num = float(raw)
    except ValueError:
        num = 10_000.0
    return (start, num, issue["id"])


def inspect_pub(pub: str, force: bool) -> dict:
    items = load_index(pub)
    if not items:
        return {"pub": pub, "wrote": 0, "skipped": 0, "missing": 0, "failed": 0}

    existing = load_existing(pub)
    by_ext = {
        i.get("source", {}).get("external_id"): i
        for i in existing
        if i.get("source", {}).get("external_id")
    }
    by_pdf = {i.get("files", {}).get("pdf"): i for i in existing if i.get("files", {}).get("pdf")}

    out_dir = pdf_dir(pub)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    issues: list[dict] = []
    used_ids: set[str] = set()
    missing = skipped = failed = 0
    seen_pdfs: set[str] = set()

    for item in items:
        vghf_id = item.get("vghf_id")
        if not vghf_id:
            continue
        name = safe_filename(item)
        pdf = out_dir / name
        rel = f"library/{pub}/pdf/{name}"
        if rel in seen_pdfs:
            continue
        prev = by_ext.get(vghf_id) or by_pdf.get(rel)
        if not pdf.is_file():
            if prev:
                issues.append(prev)
                used_ids.add(prev["id"])
            else:
                missing += 1
            continue
        seen_pdfs.add(rel)

        bytes_ = pdf.stat().st_size
        reuse = (
            not force
            and prev
            and prev.get("pages")
            and (prev.get("files") or {}).get("bytes") == bytes_
        )
        if reuse:
            issue = dict(prev)
            used_ids.add(issue["id"])
            skipped += 1
        else:
            try:
                pages, has_text, dims = inspect_pdf(pdf)
            except Exception as exc:  # noqa: BLE001
                failed += 1
                log(f"  FAIL {pub}: {name}: {exc}")
                if prev:
                    issues.append(prev)
                    used_ids.add(prev["id"])
                continue
            title = (item.get("title") or "").strip()
            number = printed_number(title)
            date = parse_cover_date(item.get("date_display") or "")
            issue_id = prev["id"] if prev else slug_id(pub, number, title, date["start"], used_ids)
            if prev:
                used_ids.add(issue_id)
            issue = {
                "id": issue_id,
                "publication": pub,
                "sequence": 0,
                "number": number or (prev or {}).get("number") or "special",
                "date": date,
                "pages": pages,
                "source": {
                    "provider": "vghf",
                    "url": f"https://archive.gamehistory.org/item/{vghf_id}",
                    "external_id": vghf_id,
                    "retrieved_at": now,
                },
                "files": {
                    "pdf": rel,
                    "bytes": bytes_,
                    "has_text_layer": has_text,
                },
                "text": {"status": "embedded"} if has_text else {"status": "none"},
                "updated_at": now,
            }
            if dims:
                issue["dimensions"] = dims
            if number and "." in number:
                vol, num = number.split(".", 1)
                if vol.isdigit() and num.isdigit():
                    issue["volume"] = int(vol)
                    issue["issue_in_volume"] = int(num)
            elif number and re.search(r"\bVolume\s+" + re.escape(number) + r"\b", title, re.I):
                if number.isdigit():
                    issue["volume"] = int(number)
            if re.search(r"premiere|premier issue", title, re.I):
                issue["special"] = "Premiere issue"
            if prev:
                for key in PRESERVE:
                    if key in prev:
                        issue[key] = prev[key]
                if prev.get("number") and issue["number"] == "special":
                    issue["number"] = prev["number"]

        issues.append(issue)

    issues.sort(key=sort_key)
    for seq, issue in enumerate(issues, start=1):
        issue["sequence"] = seq

    dump_json(LIB / pub / "issues.json", issues)

    pub_path = LIB / pub / "publication.json"
    if pub_path.exists() and issues:
        pub_data = json.loads(pub_path.read_text(encoding="utf-8"))
        years = [int(i["date"]["start"][:4]) for i in issues if i["date"]["start"] != "9999"]
        pub_data["stats"] = {
            "issues": len(issues),
            "pages": sum(i["pages"] for i in issues),
            "readable": sum(1 for i in issues if (i.get("assets") or {}).get("pages_rendered")),
            "with_text": sum(
                1 for i in issues if (i.get("text") or {}).get("status", "none") != "none"
            ),
            **({"first_year": min(years), "last_year": max(years)} if years else {}),
        }
        pub_data["updated_at"] = now
        dump_json(pub_path, pub_data, indent=2)

    return {
        "pub": pub,
        "wrote": len(issues),
        "skipped": skipped,
        "missing": missing,
        "failed": failed,
    }


def pubs_to_inspect(only: list[str]) -> list[str]:
    if only:
        return only
    found = []
    for path in sorted(LIB.glob("*/vghf_index.json")):
        pub = path.parent.name
        if pub in SKIP_PUBS:
            continue
        found.append(pub)
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description="Inspect local PDFs and fill issues.json")
    ap.add_argument("--publication", action="append", default=[], help="Limit to these publication ids")
    ap.add_argument("--force", action="store_true", help="Re-open PDFs even when bytes already match")
    args = ap.parse_args()

    pubs = pubs_to_inspect(args.publication)
    totals = {"wrote": 0, "skipped": 0, "missing": 0, "failed": 0}
    for i, pub in enumerate(pubs, start=1):
        result = inspect_pub(pub, force=args.force)
        totals["wrote"] += result["wrote"]
        totals["skipped"] += result["skipped"]
        totals["missing"] += result["missing"]
        totals["failed"] += result["failed"]
        log(
            f"[{i}/{len(pubs)}] {pub}: {result['wrote']} issues  "
            f"reuse={result['skipped']} missing={result['missing']} fail={result['failed']}"
        )

    log(
        f"Done. issues={totals['wrote']} reused={totals['skipped']} "
        f"missing_pdf={totals['missing']} failed={totals['failed']}"
    )
    return 1 if totals["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
