#!/usr/bin/env python3
"""Survey the Internet Archive's video game magazine collections.

Writes ia_magazines.json (one entry per magazine collection with item count,
first/last date, publisher) and prints a ranked table.

Usage: python survey_ia.py
"""

from __future__ import annotations

import concurrent.futures as cf
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT_COLLECTIONS = ["videogamemagazines", "computermagazines"]
OUT = Path(__file__).resolve().parent / "ia_magazines.json"
UA = {"User-Agent": "Mozilla/5.0 (magazine-survey)"}


def search(q: str, fields: tuple[str, ...], rows: int = 1000, sort: str = "date asc", page: int = 1) -> dict:
    params = {"q": q, "rows": rows, "page": page, "output": "json", "sort[]": sort}
    url = (
        "https://archive.org/advancedsearch.php?"
        + urllib.parse.urlencode(params, doseq=True)
        + "".join(f"&fl[]={f}" for f in fields)
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return json.load(r)["response"]
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
            print(f"  retry ({exc})", file=sys.stderr)
    raise RuntimeError("unreachable")


def subcollections(root: str) -> list[dict]:
    out: list[dict] = []
    page = 1
    while True:
        r = search(f"collection:{root} AND mediatype:collection", ("identifier", "title", "publisher", "description"), page=page)
        out.extend(r["docs"])
        if len(out) >= r["numFound"] or not r["docs"]:
            break
        page += 1
    return out


def stats(identifier: str) -> dict:
    q = f"collection:{identifier} AND mediatype:texts"
    first = search(q, ("date",), rows=1, sort="date asc")
    if first["numFound"] == 0:
        return {"items": 0}
    last = search(q, ("date",), rows=1, sort="date desc")
    return {
        "items": first["numFound"],
        "first": (first["docs"][0].get("date") or "")[:10],
        "last": (last["docs"][0].get("date") or "")[:10],
    }


def main() -> int:
    seen: dict[str, dict] = {}
    for root in ROOT_COLLECTIONS:
        cols = subcollections(root)
        print(f"{root}: {len(cols)} sub-collections", flush=True)
        for c in cols:
            seen.setdefault(c["identifier"], {"identifier": c["identifier"], "title": c.get("title"), "publisher": c.get("publisher"), "roots": []})
            seen[c["identifier"]]["roots"].append(root)

    print(f"Fetching stats for {len(seen)} collections...", flush=True)
    with cf.ThreadPoolExecutor(8) as ex:
        futures = {ex.submit(stats, ident): ident for ident in seen}
        for i, fut in enumerate(cf.as_completed(futures), 1):
            ident = futures[fut]
            try:
                seen[ident].update(fut.result())
            except Exception as exc:  # noqa: BLE001
                seen[ident].update({"items": 0, "error": str(exc)})
            seen[ident]["url"] = f"https://archive.org/details/{ident}"
            if i % 50 == 0:
                print(f"  {i}/{len(seen)}", flush=True)

    rows = sorted(seen.values(), key=lambda e: -e.get("items", 0))
    OUT.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")

    print(f"\n{'items':>6}  {'first':10} {'last':10}  title")
    for e in rows:
        if e.get("items", 0) == 0:
            continue
        print(f"{e['items']:>6}  {e.get('first', ''):10} {e.get('last', ''):10}  {e['title']}  [{e['identifier']}]")
    total = sum(e.get("items", 0) for e in rows)
    print(f"\n{len(rows)} collections, {total} items total -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
