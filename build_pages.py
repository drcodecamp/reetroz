#!/usr/bin/env python3
"""Turn library/ PDFs into web assets for the Next.js site.

Always:
  * renders a cover thumbnail for every issue with a PDF into site/public/covers/<issue-id>.jpg
  * writes site/src/data/catalog.json   (light issue records for the site)
  * writes site/src/data/publications.json (publication records + counts)
  * updates assets/stats back into library/<pub>/issues.json and publication.json

With --issue <issue-id> (repeatable), --publication <id> or --all:
  * renders every page in two sizes into site/public/pages/<issue-id>/{thumb,read}/NNN.webp
  * writes site/public/pages/<issue-id>/manifest.json

Usage:
  python build_pages.py                       # covers + catalog only
  python build_pages.py --issue cgw-186
  python build_pages.py --publication cgw
  python build_pages.py --all
"""

from __future__ import annotations

import argparse
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

SIZES = {"thumb": 240, "read": 1600}  # widths in px
QUALITY = {"thumb": 72, "read": 80}
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


def render_issue(issue: dict, force: bool = False) -> dict:
    iid = issue["id"]
    out_dir = PAGES_DIR / iid
    for size in SIZES:
        (out_dir / size).mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(ROOT / issue["files"]["pdf"])
    pages_meta = []
    started = time.time()
    for index, page in enumerate(doc, start=1):
        name = f"{index:03d}.webp"
        targets = {size: out_dir / size / name for size in SIZES}
        rect = page.rect
        aspect = rect.height / rect.width
        meta = {"n": index, "w": SIZES["read"], "h": round(SIZES["read"] * aspect)}

        if not force and all(p.exists() for p in targets.values()):
            with Image.open(targets["thumb"]) as thumb:
                meta["color"] = average_color(thumb.convert("RGB"))
            pages_meta.append(meta)
            continue

        zoom = SIZES["read"] / rect.width
        full = pix_to_image(page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False))
        meta["color"] = average_color(full)
        for size, width in SIZES.items():
            img = full if width >= full.width else full.resize((width, round(width * aspect)), Image.Resampling.LANCZOS)
            img.save(targets[size], "WEBP", quality=QUALITY[size], method=4)
        pages_meta.append(meta)
        if index % 10 == 0 or index == doc.page_count:
            print(f"  {iid}: page {index}/{doc.page_count}  ({time.time() - started:.0f}s)", flush=True)

    manifest = {
        "id": iid,
        "slug": iid,
        "publication": issue["publication"],
        "number": issue["number"],
        "date": issue["date"]["display"],
        "pages": doc.page_count,
        "sizes": SIZES,
        "pageList": pages_meta,
    }
    doc.close()
    dump_json(out_dir / "manifest.json", manifest, indent=None)
    return manifest


def hosted_objects() -> dict[str, int] | None:
    """Keys under pdf/ and pages/*/manifest.json currently in the R2 bucket, or None if not configured."""
    env_file = ROOT / ".env"
    if not env_file.exists():
        return None
    try:
        import boto3  # noqa: PLC0415
        from botocore.config import Config  # noqa: PLC0415

        env = dict(
            line.strip().split("=", 1)
            for line in env_file.read_text(encoding="utf-8").splitlines()
            if "=" in line and not line.startswith("#")
        )
        s3 = boto3.client(
            "s3",
            endpoint_url=env["R2_ENDPOINT"],
            aws_access_key_id=env["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
        found: dict[str, int] = {}
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=env["R2_BUCKET"], Prefix="pdf/"):
            for obj in page.get("Contents", []):
                found[obj["Key"]] = obj["Size"]
        return found
    except Exception as exc:  # noqa: BLE001
        print(f"  (could not list R2 bucket: {exc}; assuming nothing hosted)", flush=True)
        return None


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
    hosted = hosted_objects()
    if hosted is not None:
        print(f"R2: {len(hosted)} PDFs hosted", flush=True)

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
                assets["sizes"] = SIZES
            if hosted is not None:
                pdf_key = f"pdf/{issue['id']}.pdf"
                local_pdf = ROOT / issue["files"]["pdf"]
                # hosted only counts if the object is complete (same size as the local file)
                assets["pdf_hosted"] = hosted.get(pdf_key) == (local_pdf.stat().st_size if local_pdf.exists() else -1)
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
                    "file": Path(issue["files"]["pdf"]).name,
                    "sourceUrl": issue["source"]["url"],
                    "era": era_for(year),
                    "readable": assets["pages_rendered"],
                    "pdfHosted": bool(assets.get("pdf_hosted")),
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
