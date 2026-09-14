#!/usr/bin/env python3
"""Index every magazine folder on a VGHF library page.

Walks each page of the parent folder, then indexes each child magazine into
library/<pub>/vghf-index.json (full metadata) and vghf_index.json (compact
vghf_id map used by scripts/download_vghf.py).

Usage:
  python scripts/index_vghf_library.py
  python scripts/index_vghf_library.py --folder 9a193e8c-67e0-45ff-98d2-a33e85721cc4
"""

from __future__ import annotations

import argparse
import json
import re
import time

import index_vghf
from library_paths import ROOT

LIB = ROOT / "library"
DEFAULT_FOLDER = "9a193e8c-67e0-45ff-98d2-a33e85721cc4"

TITLE_ALIASES = {
    "computer gaming world": "cgw",
    "gamefan": "diehard-gamefan",
    "game player's / game players / game buyer": "game-players",
    "ngamer": "ngamer-us",
    "official sega dreamcast magazine": "official-dreamcast-magazine-us",
    "play": "play-us",
    "electronic games / computer entertainment": "electronic-games",
    "electronic games / fusion / intelligent gamer": "electronic-games",
}


def slugify(title: str) -> str:
    text = title.lower().replace("&", " and ").replace("@", "at")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:60] or "untitled"


def date_range(items: list[dict]) -> str | None:
    displays = [
        (it.get("date") or {}).get("display")
        for it in items
        if (it.get("date") or {}).get("display")
    ]
    if not displays:
        return None
    if displays[0] == displays[-1]:
        return displays[0]
    return f"{displays[0]} – {displays[-1]}"


def compact_rows(items: list[dict]) -> list[dict]:
    rows = []
    for it in items:
        if it.get("kind") == "folder":
            continue
        formats = it.get("formats") or []
        rows.append(
            {
                "vghf_id": it["id"],
                "title": it["title"],
                "format": formats[0] if formats else "pdf",
                "date_display": (it.get("date") or {}).get("display") or "",
            }
        )
    return rows


def pub_maps() -> tuple[dict[str, str], dict[str, str]]:
    by_folder: dict[str, str] = {}
    by_title: dict[str, str] = {}
    for pub_file in LIB.glob("*/publication.json"):
        pub = json.loads(pub_file.read_text(encoding="utf-8"))
        pid = pub["id"]
        by_title[pub["title"].lower()] = pid
        if pub.get("short"):
            by_title[pub["short"].lower()] = pid
        for src in pub.get("known_sources", []):
            url = src.get("url") or ""
            m = index_vghf.FOLDER_RE.search(url)
            if m:
                by_folder[m.group(1).lower()] = pid
    return by_folder, by_title


def resolve_pub(folder: dict, by_folder: dict[str, str], by_title: dict[str, str]) -> str:
    fid = folder["id"].lower()
    if fid in by_folder:
        return by_folder[fid]
    title = folder["title"].strip()
    key = title.lower()
    if key in TITLE_ALIASES:
        return TITLE_ALIASES[key]
    if key in by_title:
        return by_title[key]
    return slugify(title)


def list_child_folders(folder_id: str) -> list[dict]:
    base = f"https://archive.gamehistory.org/folder/{folder_id}"
    by_id: dict[str, dict] = {}
    expected = None
    page = 0
    empty = 0
    while page <= 40:
        html = index_vghf.fetch(f"{base}?page={page}")
        items, count = index_vghf.extract_items(html)
        if expected is None:
            expected = count
        new = 0
        for item in items:
            if item["id"] not in by_id:
                by_id[item["id"]] = item
                new += 1
        print(f"library page {page}: {len(items)} rows, {new} new, {len(by_id)}/{expected}", flush=True)
        if new == 0:
            empty += 1
            if empty >= 2 or (expected and len(by_id) >= expected):
                break
        else:
            empty = 0
        if expected and len(by_id) >= expected and page > 0:
            break
        page += 1
        time.sleep(0.3)
    folders = [it for it in by_id.values() if it["kind"] == "folder"]
    folders.sort(key=lambda it: it["title"].lower())
    return folders


def write_indexes(pub_id: str, data: dict) -> None:
    out_dir = LIB / pub_id
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "vghf-index.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    compact = compact_rows(data["items"])
    (out_dir / "vghf_index.json").write_text(
        json.dumps(compact, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    pub_path = out_dir / "publication.json"
    if not pub_path.exists():
        return
    pub = json.loads(pub_path.read_text(encoding="utf-8"))
    sources = pub.setdefault("known_sources", [])
    existing = next((s for s in sources if s.get("provider") == "vghf"), None)
    row = {
        "provider": "vghf",
        "url": data["url"],
        "items": len(compact),
    }
    rng = date_range(data["items"])
    if rng:
        row["date_range"] = rng
    if existing:
        existing.update(row)
    else:
        sources.append(row)
    pub_path.write_text(json.dumps(pub, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Index every magazine on a VGHF library page.")
    parser.add_argument("--folder", default=DEFAULT_FOLDER)
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()

    folder = args.folder.strip()
    m = index_vghf.FOLDER_RE.search(folder)
    folder_id = m.group(1) if m else folder

    by_folder, by_title = pub_maps()
    children = list_child_folders(folder_id)
    print(f"\n{len(children)} magazine folders to index\n", flush=True)

    summary = []
    for n, child in enumerate(children, start=1):
        pub_id = resolve_pub(child, by_folder, by_title)
        compact_path = LIB / pub_id / "vghf_index.json"
        if args.skip_existing and compact_path.exists():
            print(f"[{n}/{len(children)}] skip {child['title']} -> {pub_id}", flush=True)
            continue
        print(f"[{n}/{len(children)}] {child['title']} -> {pub_id}", flush=True)
        data = index_vghf.index_folder(child["id"])
        write_indexes(pub_id, data)
        compact = compact_rows(data["items"])
        summary.append(
            {
                "pub": pub_id,
                "title": child["title"],
                "folder_id": child["id"],
                "items": len(compact),
                "expected": data.get("expected"),
            }
        )
        print(f"  wrote {len(compact)} items (folder said {data.get('expected')})", flush=True)

    (LIB / "vghf-library-index.json").write_text(
        json.dumps(
            {
                "folder_id": folder_id,
                "url": f"https://archive.gamehistory.org/folder/{folder_id}",
                "magazines": summary,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\nDone. {len(summary)} indexes. Manifest: library/vghf-library-index.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
