#!/usr/bin/env python3
"""Turn library/ PDFs into web assets for the Next.js site.

Always:
  * renders a cover thumbnail for every issue with a PDF into site/public/covers/<issue-id>.jpg
  * writes site/src/data/catalog.json   (light issue records for the site)
  * writes site/src/data/publications.json (publication records + counts)
  * updates assets/stats back into library/<pub>/issues.json and publication.json

With --issue <issue-id> (repeatable), --publication <id> or --all:
  * extracts every page's embedded scan as-is (no re-render, no upscaling) into
    site/public/pages/<issue-id>/read/NNN.jpg and a 240px thumb into thumb/NNN.webp
  * pages that are not a single embedded image fall back to rendering at the
    scan's native resolution
  * writes site/public/pages/<issue-id>/manifest.json

Usage:
  python build_pages.py                       # covers + catalog only
  python build_pages.py --issue cgw-186
  python build_pages.py --publication cgw
  python build_pages.py --all
"""

from __future__ import annotations

import argparse
import io
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent
LIB = ROOT / "library"
SITE = ROOT / "site"
COVERS_DIR = SITE / "public" / "covers"
PAGES_DIR = SITE / "public" / "pages"
DATA_DIR = SITE / "src" / "data"

THUMB_WIDTH = 240
THUMB_QUALITY = 72
FALLBACK_JPEG_QUALITY = 88  # only used when a page has to be rendered instead of extracted
MAX_FALLBACK_WIDTH = 1600
COVER_HEIGHT = 600


def era_for(year: int) -> str:
    if year <= 1985:
        return "early"
    if year <= 1992:
        return "boom"
    if year <= 1999:
        return "cdrom"
    if year <= 2009:
        return "2000s"
    return "modern"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data, indent: int = 1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=indent, ensure_ascii=False) + "\n", encoding="utf-8")


def pix_to_image(pix: pymupdf.Pixmap) -> Image.Image:
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def average_color(img: Image.Image) -> str:
    r, g, b = img.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    return f"#{r:02x}{g:02x}{b:02x}"


def render_cover(issue: dict, force: bool = False) -> str | None:
    pdf = ROOT / issue["files"]["pdf"]
    if not pdf.exists():
        return None
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    out = COVERS_DIR / f"{issue['id']}.jpg"
    if not out.exists() or force:
        doc = pymupdf.open(pdf)
        page = doc[0]
        zoom = COVER_HEIGHT / page.rect.height
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        pix_to_image(pix).save(out, "JPEG", quality=84, optimize=True)
        doc.close()
    return f"/covers/{out.name}"


def extract_page(doc: pymupdf.Document, page: pymupdf.Page) -> tuple[bytes, str, int, int]:
    """Return (bytes, ext, width, height) for a page.

    Scanned magazines are one JPEG per page: hand that JPEG back untouched.
    Anything else (vector pages, multiple images, non-JPEG codecs, rotated
    scans) is rendered at the scan's native pixel size instead.
    """
    images = page.get_images(full=True)
    if len(images) == 1:
        info = doc.extract_image(images[0][0])
        w, h = info["width"], info["height"]
        page_portrait = page.rect.height >= page.rect.width
        image_portrait = h >= w
        if info["ext"] == "jpeg" and page_portrait == image_portrait and info.get("colorspace", 3) in (1, 3):
            return info["image"], "jpg", w, h
        native_width = w if page_portrait == image_portrait else h
    else:
        native_width = MAX_FALLBACK_WIDTH
    zoom = min(native_width, MAX_FALLBACK_WIDTH) / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    img = pix_to_image(pix)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=FALLBACK_JPEG_QUALITY, optimize=True)
    return buf.getvalue(), "jpg", img.width, img.height


def render_issue(issue: dict, force: bool = False) -> dict:
    iid = issue["id"]
    out_dir = PAGES_DIR / iid
    (out_dir / "read").mkdir(parents=True, exist_ok=True)
    (out_dir / "thumb").mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(ROOT / issue["files"]["pdf"])
    pages_meta = []
    fallbacks = 0
    started = time.time()
    for index, page in enumerate(doc, start=1):
        read_path = out_dir / "read" / f"{index:03d}.jpg"
        thumb_path = out_dir / "thumb" / f"{index:03d}.webp"

        if not force and read_path.exists() and thumb_path.exists():
            with Image.open(read_path) as img:
                w, h = img.size
            with Image.open(thumb_path) as thumb:
                color = average_color(thumb.convert("RGB"))
            pages_meta.append({"n": index, "w": w, "h": h, "color": color})
            continue

        data, _ext, w, h = extract_page(doc, page)
        if len(page.get_images()) != 1:
            fallbacks += 1
        read_path.write_bytes(data)
        with Image.open(io.BytesIO(data)) as img:
            img = img.convert("RGB")
            thumb = img.resize((THUMB_WIDTH, round(THUMB_WIDTH * h / w)), Image.Resampling.LANCZOS)
            thumb.save(thumb_path, "WEBP", quality=THUMB_QUALITY, method=4)
            color = average_color(thumb)
        pages_meta.append({"n": index, "w": w, "h": h, "color": color})
        if index % 50 == 0 or index == doc.page_count:
            print(f"  {iid}: page {index}/{doc.page_count}  ({time.time() - started:.0f}s)", flush=True)

    manifest = {
        "id": iid,
        "slug": iid,
        "publication": issue["publication"],
        "number": issue["number"],
        "date": issue["date"]["display"],
        "pages": doc.page_count,
        "format": {"read": "jpg", "thumb": "webp"},
        "thumbWidth": THUMB_WIDTH,
        "pageList": pages_meta,
    }
    doc.close()
    dump_json(out_dir / "manifest.json", manifest, indent=None)
    if fallbacks:
        print(f"  {iid}: {fallbacks} page(s) rendered instead of extracted", flush=True)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue", action="append", default=[], help="issue id, e.g. cgw-186")
    parser.add_argument("--publication", action="append", default=[], help="render every issue of a publication")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--force", action="store_true", help="re-render existing files")
    args = parser.parse_args()

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    providers = load_json(LIB / "providers.json")
    publications: list[dict] = []
    site_issues: list[dict] = []
    site_publications: list[dict] = []
    for pub_dir in sorted(p for p in LIB.iterdir() if p.is_dir()):
        pub = load_json(pub_dir / "publication.json")
        issues = load_json(pub_dir / "issues.json")
        publications.append(pub)

        wanted = args.all or pub["id"] in args.publication
        for issue in issues:
            if wanted or issue["id"] in args.issue:
                print(f"Rendering {issue['id']} ({issue['date']['display']})...", flush=True)
                manifest = render_issue(issue, force=args.force)
                print(f"  done: {manifest['pages']} pages", flush=True)

            cover = render_cover(issue)
            manifest_path = PAGES_DIR / issue["id"] / "manifest.json"
            assets = issue.setdefault("assets", {})
            if cover:
                assets["cover"] = f"site/public/covers/{issue['id']}.jpg"
            assets["pages_rendered"] = manifest_path.exists()
            if manifest_path.exists():
                assets["manifest"] = f"site/public/pages/{issue['id']}/manifest.json"
            assets.pop("sizes", None)
            assets.pop("pdf_hosted", None)
            year = int(issue["date"]["start"][:4])
            site_issues.append(
                {
                    "id": issue["id"],
                    "slug": issue["id"],
                    "publication": pub["id"],
                    "number": issue["number"],
                    "year": year,
                    "date": issue["date"]["display"],
                    "pages": issue["pages"],
                    "cover": cover or "",
                    "era": era_for(year),
                    "readable": assets["pages_rendered"],
                    "hasText": (issue.get("text") or {}).get("status", "none") != "none",
                    "special": issue.get("special"),
                }
            )

        years = [int(i["date"]["start"][:4]) for i in issues]
        pub["stats"] = {
            "issues": len(issues),
            "pages": sum(i["pages"] for i in issues),
            "readable": sum(1 for i in issues if i["assets"].get("pages_rendered")),
            "with_text": sum(1 for i in issues if (i.get("text") or {}).get("status", "none") != "none"),
            **({"first_year": min(years), "last_year": max(years)} if years else {}),
        }
        pub["updated_at"] = now
        dump_json(pub_dir / "issues.json", issues)
        dump_json(pub_dir / "publication.json", pub, indent=2)

        provider = next((p for p in providers if p["id"] == pub["default_provider"]), None)
        site_publications.append(
            {
                "id": pub["id"],
                "title": pub["title"],
                "short": pub.get("short") or pub["title"],
                "country": pub["country"],
                "type": pub["categories"]["type"],
                "platforms": pub["categories"]["platforms"],
                "status": pub["status"],
                "firstYear": int(pub["first_issue"]["date"][:4]) if pub.get("first_issue") else None,
                "lastYear": int(pub["last_issue"]["date"][:4]) if pub.get("last_issue") else None,
                "publisher": ", ".join(p["name"] for p in pub.get("publishers", [])[:2]) or None,
                "description": pub.get("description"),
                "metadataStatus": pub["metadata_status"],
                "rights": pub["rights"]["status"],
                "provider": provider["name"] if provider else pub["default_provider"],
                "knownSources": [{"provider": s["provider"], "url": s["url"], "items": s.get("items")} for s in pub.get("known_sources", [])],
                "issues": pub["stats"]["issues"],
                "pages": pub["stats"]["pages"],
                "readable": pub["stats"]["readable"],
                "coverIssue": pub.get("cover_issue"),
            }
        )

    site_issues.sort(key=lambda i: (i["year"], i["date"], i["publication"]))
    dump_json(DATA_DIR / "catalog.json", site_issues)
    dump_json(DATA_DIR / "publications.json", site_publications)
    readable = sum(1 for i in site_issues if i["readable"])
    print(
        f"Catalog: {len(site_issues)} issues across {len(site_publications)} publications, "
        f"{readable} readable -> {DATA_DIR}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
