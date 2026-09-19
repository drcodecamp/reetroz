#!/usr/bin/env python3
"""Turn library/ PDFs into web assets for the Next.js site.

Always:
  * renders a cover thumbnail for every issue with a PDF into
    H:/cat-library/covers/<issue-id>.jpg
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
  python scripts/build_pages.py                       # covers + catalog only
  python scripts/build_pages.py --issue cgw-186
  python scripts/build_pages.py --publication cgw
  python scripts/build_pages.py --all
"""

from __future__ import annotations

import argparse
import io
import json
import time
import os
from datetime import datetime, timezone
from pathlib import Path

import pymupdf
from PIL import Image

from library_paths import COVERS_ROOT, ROOT, cover_path, pages_dir, resolve_pdf

LIB = ROOT / "library"
SITE = ROOT / "site"
DATA_DIR = SITE / "src" / "data"

THUMB_WIDTH = 240
THUMB_QUALITY = 72
FALLBACK_JPEG_QUALITY = 88  # only used when a page has to be rendered instead of extracted
# Read-tier WebP. Set via --webp-read / --webp-quality, or CAT_WEBP_QUALITY (workers).
WEBP_READ: int | None = int(os.environ["CAT_WEBP_QUALITY"]) if os.environ.get("CAT_WEBP_QUALITY") else None
READ_SCALE: float = float(os.environ.get("CAT_READ_SCALE", "1"))
MAX_FALLBACK_WIDTH = 1600
COVER_HEIGHT = 600


def encoder_id() -> str:
    if not WEBP_READ:
        return "jpeg-native"
    return f"webp-checked-v1-s{int(round(READ_SCALE * 100))}-q{WEBP_READ}"


WEBP_MAX_DIM = 16383
THUMB_MAX_HEIGHT = THUMB_WIDTH * 2


def _even_size(w: int, h: int) -> tuple[int, int]:
    return max(2, int(w)) & ~1, max(2, int(h)) & ~1


def shrink_read(img: Image.Image) -> Image.Image:
    """Downscale read-tier pages. Even sides keep WebP 4:2:0 chroma aligned."""
    w, h = img.size
    scale = READ_SCALE if READ_SCALE < 0.999 else 1.0
    if max(w, h) * scale > WEBP_MAX_DIM:
        scale = WEBP_MAX_DIM / max(w, h)
    nw, nh = _even_size(round(w * scale), round(h * scale))
    if (nw, nh) == (w, h):
        return img
    return img.resize((nw, nh), Image.Resampling.LANCZOS)


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
    pdf = resolve_pdf(issue["files"]["pdf"])
    if not pdf.exists():
        return None
    COVERS_ROOT.mkdir(parents=True, exist_ok=True)
    out = cover_path(issue["id"])
    if not out.exists() or force:
        try:
            doc = pymupdf.open(pdf)
            page = doc[0]
            zoom = COVER_HEIGHT / page.rect.height
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
            pix_to_image(pix).save(out, "JPEG", quality=84, optimize=True)
            doc.close()
        except Exception:
            return None
    return f"/covers/{out.name}"


MIN_SCAN_EDGE = 800
MIN_PAGE_COVER = 0.80


def _largest_image_cover(page: pymupdf.Page) -> float:
    """How much of the page the biggest placed image covers (0–1)."""
    page_area = abs(page.rect)
    if page_area <= 0:
        return 0.0
    best = 0.0
    for inf in page.get_image_info():
        bbox = inf.get("bbox")
        if not bbox:
            continue
        best = max(best, abs(pymupdf.Rect(bbox)) / page_area)
    return best


def extract_page(doc: pymupdf.Document, page: pymupdf.Page) -> tuple[bytes, str, int, int]:
    """Return (bytes, ext, width, height) for a page.

    Scanned magazines are one full-bleed JPEG: hand that JPEG back untouched.
    Born-digital issues (MCV, etc.) often have a single small photo plus
    vector type — extracting that photo used to become the whole page.
    Anything that is not a full-page scan is rendered instead.
    """
    images = page.get_images(full=True)
    if len(images) == 1 and _largest_image_cover(page) >= MIN_PAGE_COVER:
        try:
            info = doc.extract_image(images[0][0])
            w, h = info["width"], info["height"]
            page_portrait = page.rect.height >= page.rect.width
            image_portrait = h >= w
            if (
                info["ext"] == "jpeg"
                and page_portrait == image_portrait
                and info.get("colorspace", 3) in (1, 3)
                and min(w, h) >= MIN_SCAN_EDGE
                and max(w, h) >= MAX_FALLBACK_WIDTH
            ):
                return info["image"], "jpg", w, h
        except Exception:
            pass
    zoom = MAX_FALLBACK_WIDTH / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    img = pix_to_image(pix)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=FALLBACK_JPEG_QUALITY, optimize=True)
    return buf.getvalue(), "jpg", img.width, img.height


def _mean_abs_err(src: Image.Image, other: Image.Image, size: tuple[int, int] = (64, 64)) -> float:
    a = src.resize(size, Image.Resampling.BOX).convert("RGB")
    b = other.resize(size, Image.Resampling.BOX).convert("RGB")
    total = 0
    n = 0
    for p, q in zip(a.getdata(), b.getdata()):
        total += abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2])
        n += 1
    return total / (n * 3)


def _crop_frac(img: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    w, h = img.size
    x0, y0, x1, y1 = box
    return img.crop((int(w * x0), int(h * y0), max(int(w * x0) + 1, int(w * x1)), max(int(h * y0) + 1, int(h * y1))))


def _webp_mismatch(src: Image.Image, other: Image.Image) -> float:
    """Full-frame plus edge bands — a 64×64 shrink misses bottom-strip garbage."""
    scores = [_mean_abs_err(src, other)]
    if min(src.size) >= 64:
        scores.append(_mean_abs_err(src, other, (256, 256) if min(src.size) >= 256 else (128, 128)))
        for band in ((0.0, 0.0, 1.0, 0.28), (0.0, 0.72, 1.0, 1.0)):
            a, b = _crop_frac(src, band), _crop_frac(other, band)
            tw = 128 if min(a.size) >= 128 else max(16, min(a.size))
            th = max(16, int(tw * a.size[1] / max(a.size[0], 1)))
            scores.append(_mean_abs_err(a, b, (tw, th)))
    return max(scores)


def save_webp_checked(img: Image.Image, dest: Path, quality: int, *, compare: bool = True) -> None:
    """Encode WebP in memory, decode it, reject garbage, then write."""
    rgb = img.convert("RGB")
    last_error: Exception | None = None
    # method=4/6 can emit well-formed but psychedelic WebPs under load; 0 is
    # cheaper and retries usually clear the bad frames.
    for method in (0, 0, 4, 0, 6, 0):
        buf = io.BytesIO()
        rgb.save(buf, "WEBP", quality=quality, method=method)
        data = buf.getvalue()
        try:
            with Image.open(io.BytesIO(data)) as check:
                check.load()
                decoded = check.convert("RGB")
                if decoded.size != rgb.size:
                    raise ValueError(f"size {decoded.size} != {rgb.size}")
                if compare and min(rgb.size) >= 16:
                    err = _webp_mismatch(rgb, decoded)
                    if err > 18:
                        raise ValueError(f"decoded WebP does not match source ({err:.1f})")
            tmp = dest.with_name(dest.name + ".tmp")
            tmp.write_bytes(data)
            if dest.exists():
                dest.unlink()
            tmp.replace(dest)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"WebP encode failed for {dest.name}: {last_error}")


def render_issue(issue: dict, force: bool = False) -> dict:
    iid = issue["id"]
    out_dir = pages_dir(iid)
    (out_dir / "read").mkdir(parents=True, exist_ok=True)
    (out_dir / "thumb").mkdir(parents=True, exist_ok=True)
    read_ext = "webp" if WEBP_READ else "jpg"

    doc = pymupdf.open(resolve_pdf(issue["files"]["pdf"]))
    pages_meta = []
    fallbacks = 0
    started = time.time()
    for index, page in enumerate(doc, start=1):
        read_path = out_dir / "read" / f"{index:03d}.{read_ext}"
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
        with Image.open(io.BytesIO(data)) as img:
            img.load()
            img = shrink_read(img.convert("RGB"))
            w, h = img.size
            if WEBP_READ:
                save_webp_checked(img, read_path, WEBP_READ)
            else:
                read_path.write_bytes(data)
            tw, th = THUMB_WIDTH, max(1, round(THUMB_WIDTH * h / w))
            if th > THUMB_MAX_HEIGHT:
                tw, th = _even_size(round(w * THUMB_MAX_HEIGHT / h), THUMB_MAX_HEIGHT)
            thumb = img.resize((tw, th), Image.Resampling.LANCZOS)
            save_webp_checked(thumb, thumb_path, THUMB_QUALITY, compare=False)
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
        "format": {"read": read_ext, "thumb": "webp"},
        "encoder": encoder_id(),
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
    parser.add_argument("--webp-read", action="store_true", help="store read-size pages as WebP instead of the source JPEG")
    parser.add_argument("--webp-quality", type=int, default=70)
    parser.add_argument("--read-scale", type=float, default=1.0, help="shrink read-tier pages, e.g. 0.7")
    args = parser.parse_args()

    global WEBP_READ, READ_SCALE
    if args.webp_read:
        WEBP_READ = args.webp_quality
    READ_SCALE = args.read_scale

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    providers = load_json(LIB / "providers.json")
    publications: list[dict] = []
    site_issues: list[dict] = []
    site_publications: list[dict] = []
    for pub_dir in sorted(p for p in LIB.iterdir() if p.is_dir()):
        if not (pub_dir / "publication.json").exists() or not (pub_dir / "issues.json").exists():
            continue
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
            manifest_path = pages_dir(issue["id"]) / "manifest.json"
            assets = issue.setdefault("assets", {})
            if cover:
                assets["cover"] = f"covers/{issue['id']}.jpg"
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
