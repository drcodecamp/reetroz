#!/usr/bin/env python3
"""One-off: convert the original CGW/catalog.json into the library/ schema.

Produces library/cgw/publication.json and library/cgw/issues.json.
Page counts and text-layer detection come from the PDFs themselves.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "CGW" / "catalog.json"
OUT = ROOT / "library" / "cgw"
SITE_PAGES = ROOT / "site" / "public" / "pages"
SITE_COVERS = ROOT / "site" / "public" / "covers"

MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}


def parse_date(display: str) -> dict:
    """'Nov-Dec 1981' -> start 1981-11, end 1981-12; 'Jan 2000' -> 2000-01."""
    parts = display.replace("/", "-").split()
    year = int(parts[-1])
    months = parts[0].split("-") if len(parts) > 1 else []
    if not months or months[0] not in MONTHS:
        return {"display": display, "start": str(year), "precision": "year"}
    start = f"{year}-{MONTHS[months[0]]:02d}"
    out = {"display": display, "start": start, "precision": "month"}
    if len(months) == 2 and months[1] in MONTHS:
        end_month = MONTHS[months[1]]
        end_year = year if end_month >= MONTHS[months[0]] else year + 1
        out["end"] = f"{end_year}-{end_month:02d}"
    return out


def slug(number: str) -> str:
    return number.replace(".", "-")


def inspect_pdf(path: Path) -> tuple[int, bool, dict]:
    doc = pymupdf.open(path)
    pages = doc.page_count
    probe = doc[min(5, pages - 1)]
    has_text = len(probe.get_text().strip()) > 50
    rect = doc[0].rect
    dims = {"width_mm": round(rect.width * 25.4 / 72, 1), "height_mm": round(rect.height * 25.4 / 72, 1)}
    doc.close()
    return pages, has_text, dims


def main() -> int:
    src = json.loads(SRC.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    issues = []
    for seq, item in enumerate(src, start=1):
        number = item["number"]
        s = slug(number)
        pdf_rel = f"CGW/{item['year']}/{item['filename']}"
        pdf = ROOT / pdf_rel
        pages, has_text, dims = inspect_pdf(pdf)

        issue = {
            "id": f"cgw-{s}",
            "publication": "cgw",
            "sequence": seq,
            "number": number,
            "date": parse_date(item["date"]),
            "pages": pages,
            "dimensions": dims,
            "source": {
                "provider": "cgwmuseum",
                "url": f"https://www.cgwmuseum.org/galleries/issues/{item['filename']}",
                "external_id": item["filename"].removesuffix(".pdf"),
            },
            "files": {"pdf": pdf_rel, "bytes": pdf.stat().st_size, "has_text_layer": has_text},
            "text": {"status": "embedded", "languages": ["en"]} if has_text else {"status": "none"},
            "updated_at": now,
        }
        if "." in number:
            vol, num = number.split(".")
            issue["volume"] = int(vol)
            issue["issue_in_volume"] = int(num)

        cover = SITE_COVERS / f"cgw_{s}.jpg"
        manifest = SITE_PAGES / s / "manifest.json"
        assets = {}
        if cover.exists():
            assets["cover"] = f"site/public/covers/{cover.name}"
        if manifest.exists():
            m = json.loads(manifest.read_text())
            assets.update({"pages_rendered": True, "manifest": f"site/public/pages/{s}/manifest.json", "sizes": m["sizes"]})
        else:
            assets["pages_rendered"] = False
        issue["assets"] = assets

        if number == "1.1":
            issue["special"] = "Premiere issue"
        if number == "100":
            issue["special"] = "100th issue"
        if number == "268":
            issue["special"] = "Final issue"
        issues.append(issue)
        if seq % 40 == 0:
            print(f"  {seq}/{len(src)}", flush=True)

    years = [int(i["date"]["start"][:4]) for i in issues]
    publication = {
        "id": "cgw",
        "title": "Computer Gaming World",
        "aliases": [{"title": "CGW"}],
        "publishers": [
            {"name": "Golden Empire Publications", "from": "1981-11", "to": "1993-06"},
            {"name": "Ziff Davis", "from": "1993-07", "to": "2006-11"},
        ],
        "country": "US",
        "language": "en",
        "issn": "0744-6667",
        "first_issue": {"number": "1.1", "date": "1981-11"},
        "last_issue": {"number": "268", "date": "2006-11"},
        "status": "ceased",
        "frequency": "varied",
        "categories": {"type": "consumer", "platforms": ["pc", "apple-ii", "c64", "atari-8bit", "amiga", "mac"], "genres": ["strategy", "wargames", "rpg", "simulation", "adventure"]},
        "description": "The longest-running American computer game magazine. Started as a bimonthly wargaming-focused newsletter in 1981, became the paper of record for PC gaming under Ziff Davis, and closed with issue 268 in November 2006 before relaunching as Games for Windows: The Official Magazine.",
        "links": {"wikipedia": "https://en.wikipedia.org/wiki/Computer_Gaming_World", "other": ["https://www.cgwmuseum.org"]},
        "related": {"successor": "games-for-windows"},
        "numbering": {"scheme": "mixed", "notes": "Volume.issue (1.1 - 6.5) until 1986; sequential from issue 25 (Feb 1986) onward. Some early volumes skip numbers."},
        "default_provider": "cgwmuseum",
        "rights": {"status": "authorized", "holder": "Ziff Davis", "note": "Scans hosted openly by the CGW Museum since 2004."},
        "cover_issue": "cgw-186",
        "stats": {
            "issues": len(issues),
            "pages": sum(i["pages"] for i in issues),
            "readable": sum(1 for i in issues if i["assets"].get("pages_rendered")),
            "with_text": sum(1 for i in issues if i["text"]["status"] != "none"),
            "first_year": min(years),
            "last_year": max(years),
        },
        "updated_at": now,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "publication.json").write_text(json.dumps(publication, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (OUT / "issues.json").write_text(json.dumps(issues, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT / 'publication.json'} and {len(issues)} issues; {publication['stats']['with_text']} have a text layer")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
