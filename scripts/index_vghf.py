"""Build a public VGHF folder index (titles, dates, item ids). Link-out only — not a downloader."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

from library_paths import ROOT

UA = {"User-Agent": "pixelpress-catalog/0.1 (+https://github.com; public folder index)"}
FOLDER_RE = re.compile(
    r"https?://archive\.gamehistory\.org/folder/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    re.I,
)
ITEM_RE = re.compile(
    r'\{"id":"([0-9a-f-]{36})","title":"((?:\\.|[^"\\])*)","documentType":"([^"]*)"'
    r'(?:,"formatDisplay":(\[[^\]]*\]))?(?:,"dateDisplay":(\[[^\]]*\]))?'
)
MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def unescape_rsc(html: str) -> str:
    return html.replace('\\"', '"')


def parse_json_list(raw: str) -> list:
    try:
        val = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return val if isinstance(val, list) else [val]


def parse_date_display(text: str) -> dict:
    raw = (text or "").strip()
    out = {"display": raw}
    if not raw:
        return out
    m = re.match(
        r"^(January|February|March|April|May|June|July|August|September|October|November|December)"
        r"(?:/([A-Za-z]+))?\s+(\d{4})$",
        raw,
    )
    if m:
        start = f"{int(m.group(3)):04d}-{MONTHS[m.group(1).lower()]:02d}"
        out["start"] = start
        if m.group(2) and m.group(2).lower() in MONTHS:
            out["end"] = f"{int(m.group(3)):04d}-{MONTHS[m.group(2).lower()]:02d}"
            out["precision"] = "month"
        else:
            out["precision"] = "month"
        return out
    m = re.match(r"^(Winter|Spring|Summer|Fall|Autumn|Holiday)\s+(\d{4})$", raw, re.I)
    if m:
        season = m.group(1).title()
        year = int(m.group(2))
        start_month = {"Winter": 12, "Spring": 3, "Summer": 6, "Fall": 9, "Autumn": 9, "Holiday": 12}[season]
        out["start"] = f"{year:04d}-{start_month:02d}"
        out["precision"] = "season"
        return out
    m = re.match(r"^(\d{4})$", raw)
    if m:
        out["start"] = m.group(1)
        out["precision"] = "year"
    return out


def parse_number(title: str) -> str | None:
    m = re.search(r"Issue\s+(\d+)\b", title, re.I)
    return m.group(1) if m else None


def extract_items(html: str) -> tuple[list[dict], int | None]:
    text = unescape_rsc(html)
    count = None
    m = re.search(r'"folderItemCount":(\d+)', text)
    if m:
        count = int(m.group(1))
    items = []
    for match in ITEM_RE.finditer(text):
        item_id, title, doc_type, formats_raw, dates_raw = match.groups()
        title = title.replace(r"\/", "/")
        title = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), title)
        formats = [str(x).lower() for x in parse_json_list(formats_raw or "[]")]
        dates = [str(x) for x in parse_json_list(dates_raw or "[]")]
        date_display = dates[0] if dates else ""
        kind = "folder" if doc_type == "SO" else "item"
        url_kind = "folder" if kind == "folder" else "item"
        items.append(
            {
                "id": item_id,
                "title": title,
                "kind": kind,
                "document_type": doc_type,
                "formats": formats,
                "date": parse_date_display(date_display),
                "url": f"https://archive.gamehistory.org/{url_kind}/{item_id}",
                "number": parse_number(title),
            }
        )
    return items, count


def index_folder(folder_id: str, pause: float = 0.4) -> dict:
    base = f"https://archive.gamehistory.org/folder/{folder_id}"
    by_id: dict[str, dict] = {}
    expected = None
    page = 0
    empty = 0
    while True:
        html = fetch(f"{base}?page={page}")
        items, count = extract_items(html)
        if expected is None:
            expected = count
        new = 0
        for item in items:
            if item["id"] not in by_id:
                by_id[item["id"]] = item
                new += 1
        print(f"page {page}: {len(items)} rows, {new} new, {len(by_id)} total", flush=True)
        if new == 0:
            empty += 1
            if empty >= 2 or (expected and len(by_id) >= expected):
                break
        else:
            empty = 0
        if expected and len(by_id) >= expected:
            # keep going one more page in case featured items hid a page of new ones
            if page > 0 and new == 0:
                break
            if page >= 20 and len(by_id) >= expected:
                break
        page += 1
        if page > 40:
            break
        time.sleep(pause)

    items = list(by_id.values())

    def sort_key(it: dict):
        title = it["title"]
        regular = title.startswith("GamePro, Issue")
        num = it.get("number")
        start = (it.get("date") or {}).get("start") or "9999"
        return (
            0 if regular else 1,
            int(num) if num and num.isdigit() else 10_000,
            start,
            title,
        )

    items.sort(key=sort_key)
    child_folders = [it for it in items if it["kind"] == "folder"]
    for child in child_folders:
        print(f"indexing child folder {child['title']} ({child['id']})", flush=True)
        child_data = index_folder(child["id"], pause=pause)
        for it in child_data["items"]:
            it.setdefault("parent_id", child["id"])
            by_id.setdefault(it["id"], it)
        items = list(by_id.values())
        items.sort(key=sort_key)
    return {
        "provider": "vghf",
        "folder_id": folder_id,
        "url": base,
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "expected": expected,
        "count": len(items),
        "note": (
            "Public catalog index for matching and link-out only. "
            "VGHF Researcher Agreement restricts the files themselves to research or private study; do not mirror."
        ),
        "items": items,
        "by_title": {it["title"]: it["id"] for it in items},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Index a public VGHF folder (metadata only).")
    parser.add_argument("--folder", required=True, help="Folder UUID or full folder URL")
    parser.add_argument("--pub", required=True, help="Publication id, e.g. gamepro")
    args = parser.parse_args()

    folder = args.folder.strip()
    m = FOLDER_RE.match(folder)
    folder_id = m.group(1) if m else folder
    if not re.fullmatch(r"[0-9a-f-]{36}", folder_id, re.I):
        print("need a folder UUID or archive.gamehistory.org/folder/<uuid> URL", file=sys.stderr)
        return 2

    data = index_folder(folder_id)
    out_dir = ROOT / "library" / args.pub
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "vghf-index.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {data['count']} items (expected {data['expected']}) -> {out}", flush=True)

    pub_path = out_dir / "publication.json"
    if pub_path.exists():
        pub = json.loads(pub_path.read_text(encoding="utf-8"))
        sources = pub.setdefault("known_sources", [])
        url = data["url"]
        existing = next((s for s in sources if s.get("provider") == "vghf"), None)
        row = {
            "provider": "vghf",
            "url": url,
            "items": data["count"],
            "date_range": "May 1989–Winter 2011" if args.pub == "gamepro" else None,
        }
        row = {k: v for k, v in row.items() if v is not None}
        if existing:
            existing.update(row)
        else:
            sources.append(row)
        pub_path.write_text(json.dumps(pub, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"updated {pub_path} known_sources", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
