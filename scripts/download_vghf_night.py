#!/usr/bin/env python3
"""Overnight VGHF downloader for every indexed magazine we do not have yet.

Uses --token (or VGHF_TOKEN). Writes PDFs to H:/cat-library/<pub>/pdf.
Skips catalogs that are already complete. CGW is skipped (already local).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from library_paths import PDF_ROOT, ROOT, SCRIPTS, pdf_dir

LIB = ROOT / "library"
SKIP_PUBS = {"cgw", "news-and-media-magazines-assorted"}
SKIP_HUGE_TRADE = {"games-business", "mcv"}

KNOWN = [
    "electronic-gaming-monthly",
    "nintendo-power",
    "game-informer",
    "official-us-playstation-magazine",
    "official-xbox-magazine",
    "psm",
    "edge",
    "next-generation",
    "tips-and-tricks",
    "game-players",
    "egm2",
    "hyper",
    "play-us",
    "videogames-computer-entertainment",
    "pc-games",
    "playstation-the-official-magazine",
    "official-dreamcast-magazine-us",
    "sega-visions",
    "super-play",
    "diehard-gamefan",
    "electronic-games",
    "xbox-nation",
    "psx",
    "psextreme",
    "mean-machines-sega",
    "megatech",
    "mega",
    "nintendo-newsletters",
    "computer-games-strategy-plus",
    "computer-game-review",
    "computer-player",
    "cd-rom-today",
    "gmr",
    "hardcore-gamer",
    "code-vault",
    "total",
    "video-games-magazine",
    "atari-age",
    "blip",
    "electronic-fun-with-computers-and-games",
    "activisions",
    "arcade-express",
    "pocket-games",
    "q64",
    "odyssey-adventure",
    "vidiot",
    "the-logical-gamer",
    "interaction",
    "incite",
    "internet-underground",
    "develop",
    "e3-show-daily",
    "casual-connect",
    "neopets-magazine",
    "walmart-gamecenter",
    "computer-entertainer",
    "journal-of-computer-game-design",
    "new-earth",
    "gameweek-iemagazine",
    "electronic-gaming-retail-news",
    "future-play",
    "girl-gamer",
    "game-on-usa",
    "imagine-town",
    "surge",
    "digital-diner",
    "soe-worlds",
    "the-cursor",
    "gamesport",
    "game-intelligence-magazine",
    "ngamer-us",
    "ps-max",
    "ign-magazines",
    "3do-club-news",
    "multimedia-world",
    "multimedia-merchandising",
    "newmedia",
    "videogame-advisor",
    "lifestyle-magazines-assorted",
]


def log(msg: str) -> None:
    print(msg, flush=True)


def free_gb(path: Path) -> float:
    return shutil.disk_usage(path).free / (1024**3)


def index_count(pub: str) -> int:
    path = LIB / pub / "vghf_index.json"
    if not path.exists():
        return 0
    return len(json.loads(path.read_text(encoding="utf-8")))


def pdf_count(out: Path) -> int:
    if not out.exists():
        return 0
    return sum(1 for p in out.glob("*.pdf") if p.stat().st_size > 1024)


def queue() -> list[str]:
    seen = set(KNOWN)
    ordered = [p for p in KNOWN if (LIB / p / "vghf_index.json").exists()]
    extras = sorted(
        p.parent.name
        for p in LIB.glob("*/vghf_index.json")
        if p.parent.name not in seen and p.parent.name not in SKIP_PUBS
    )
    return ordered + extras


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", default=os.environ.get("VGHF_TOKEN", ""))
    ap.add_argument("--workers", type=int, default=10)
    ap.add_argument("--min-free-gb", type=float, default=25)
    ap.add_argument("--include-huge-trade", action="store_true")
    args = ap.parse_args()
    token = args.token.strip()
    if not token:
        log("Need --token")
        return 2

    pubs = queue()
    if not args.include_huge_trade:
        pubs = [p for p in pubs if p not in SKIP_HUGE_TRADE]

    log(f"E: {free_gb(Path('E:/')):.1f} GB free   H: {free_gb(Path('H:/')):.1f} GB free")
    log(f"{len(pubs)} catalogs in queue")

    downloaded_pubs = 0
    for i, pub in enumerate(pubs, start=1):
        n = index_count(pub)
        if n == 0:
            continue
        out = pdf_dir(pub)
        have = pdf_count(out)
        if have >= n:
            log(f"[{i}/{len(pubs)}] skip {pub} ({have}/{n})")
            continue
        log(
            f"[{i}/{len(pubs)}] {pub}  {have}/{n}  -> {out}  "
            f"(H free {free_gb(PDF_ROOT):.1f} GB)"
        )
        started = time.time()
        cmd = [
            sys.executable,
            "-X",
            "utf8",
            str(SCRIPTS / "download_vghf.py"),
            "--token",
            token,
            "--index",
            str(LIB / pub / "vghf_index.json"),
            "--out",
            str(out),
            "--workers",
            str(args.workers),
        ]
        before = have
        proc = subprocess.run(cmd)
        elapsed = (time.time() - started) / 60
        have = pdf_count(out)
        log(f"  {pub} done rc={proc.returncode} now {have}/{n} in {elapsed:.1f} min")
        if proc.returncode == 2:
            log("Token missing/rejected; stopping.")
            return 2
        if have <= before and proc.returncode != 0:
            # Empty catalog + no files usually means the token died.
            # A catalog that already has files may just have a few
            # non-PDF / missing index items (HTTP 415/404).
            if before == 0:
                log("No new files this catalog; token is likely dead. Stopping.")
                return 1
            log(f"  {pub} still incomplete ({have}/{n}); leaving remainder.")
            continue
        downloaded_pubs += 1

    log(f"Night run finished. catalogs touched={downloaded_pubs}")
    log(f"E: {free_gb(Path('E:/')):.1f} GB free   H: {free_gb(Path('H:/')):.1f} GB free")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
