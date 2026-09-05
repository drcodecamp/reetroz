#!/usr/bin/env python3
"""Seed library/<id>/publication.json stubs for every magazine we know about.

Sources of the list: the VGHF Magazine Library (vghf_magazines.json), the
Internet Archive survey (ia_magazines.json) and the CGW Museum.  Every record
is written with metadata_status = "stub" and an empty issues.json, unless the
publication folder already has issues (e.g. cgw), in which case only missing
fields are added.

Usage: python seed_publications.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LIB = ROOT / "library"
VGHF = json.loads((ROOT / "vghf_magazines.json").read_text(encoding="utf-8")) if (ROOT / "vghf_magazines.json").exists() else []
IA = json.loads((ROOT / "ia_magazines.json").read_text(encoding="utf-8")) if (ROOT / "ia_magazines.json").exists() else []
VGHF_BY_TITLE = {v["title"].replace("\\u0026", "&"): v for v in VGHF}
IA_BY_ID = {c["identifier"]: c for c in IA}

# id, title, short, country, publishers, from, to, status, type, platforms, vghf title, ia collection id, notes
# fmt: off
ROWS: list[tuple] = [
    # --- CGW Museum family -------------------------------------------------------------------------------------
    ("softline", "Softline", None, "US", ["Softalk Publishing"], "1981-09", "1984", "ceased", "consumer", ["apple-ii", "atari-8bit"], None, None, "Softalk's games spin-off. Hosted by the CGW Museum."),
    ("computer-game-forum", "Computer Game Forum", "CGF", "US", ["Golden Empire Publications"], "1987", "1987", "ceased", "consumer", ["pc", "apple-ii", "c64"], None, None, "Short-lived CGW sister title. Hosted by the CGW Museum."),
    ("games-for-windows", "Games for Windows: The Official Magazine", "GFW", "US", ["Ziff Davis"], "2006-12", "2008-04", "ceased", "official", ["pc"], None, None, "Direct successor to Computer Gaming World; hosted by the CGW Museum."),
    # --- US PC ------------------------------------------------------------------------------------------------
    ("computer-games-strategy-plus", "Computer Games Strategy Plus", "CGSP", "US", ["Strategy Plus Inc.", "theGlobe.com"], "1990-10", "2007-04", "ceased", "consumer", ["pc"], "Computer Games Strategy Plus", None, "Later titled Computer Games Magazine."),
    ("computer-game-review", "Computer Game Review", "CGR", "US", ["Sendai Publishing"], "1990-06", "1996-06", "ceased", "consumer", ["pc"], "Computer Game Review", None, None),
    ("computer-player", "Computer Player", None, "US", ["LFP Inc."], "1994-06", "1998-03", "ceased", "consumer", ["pc"], "Computer Player", None, None),
    ("computer-game-entertainment", "Computer Game Entertainment", None, "US", [], "1997", "1998", "ceased", "consumer", ["pc"], "Computer Game Entertainment", None, None),
    ("pc-gamer-us", "PC Gamer (US)", "PCG", "US", ["Imagine Media", "Future US"], "1994-05", None, "active", "consumer", ["pc"], "PC Gamer (US)", None, None),
    ("pc-games", "PC Games / Electronic Entertainment", None, "US", ["Infotainment World", "IDG"], "1988", "1999-04", "ceased", "consumer", ["pc"], "PC Games / Electronic Entertainment", None, None),
    ("cd-rom-today", "CD-ROM Today", None, "US", ["GP Publications", "Imagine Publishing"], "1993", "1996-07", "ceased", "consumer", ["pc", "mac"], "CD-ROM Today", None, None),
    ("multimedia-world", "Multimedia World", None, "US", ["PC World Communications"], "1993-12", "1996", "ceased", "consumer", ["pc"], "Multimedia World", None, None),
    ("digital-diner", "Digital Diner", None, "US", [], "1996", "1997-07", "ceased", "consumer", ["pc"], "Digital Diner", None, None),
    ("incite", "Incite Video Gaming / Incite PC Gaming", None, "US", ["Ziff Davis"], "1999-07", "2000-08", "ceased", "consumer", ["multi", "pc"], "Incite Video Gaming / Incite PC Gaming", None, None),
    ("internet-underground", "Internet Underground", None, "US", ["Ziff Davis"], "1995-12", "1997-06", "ceased", "consumer", ["pc"], "Internet Underground", None, None),
    ("interaction", "InterAction / Sierra News Magazine", None, "US", ["Sierra On-Line"], "1987", "1999", "ceased", "newsletter", ["pc"], "InterAction / Sierra News Magazine", None, "Sierra's customer magazine."),
    ("soe-worlds", "SOE Worlds: The Official Magazine", None, "US", ["Sony Online Entertainment"], "2004", "2005", "ceased", "official", ["pc"], "SOE Worlds: The Official Magazine", None, None),
    ("journal-of-computer-game-design", "The Journal of Computer Game Design", "JCGD", "US", ["Chris Crawford"], "1987-06", "1996-08", "ceased", "developer", ["pc"], "The Journal of Computer Game Design", None, None),
    ("the-cursor", "The Cursor: Game Developer Life", None, "US", [], "1997", "1998", "ceased", "developer", ["multi"], "The Cursor: Game Developer Life", None, None),
    # --- US multi-platform / console --------------------------------------------------------------------------
    ("electronic-gaming-monthly", "Electronic Gaming Monthly", "EGM", "US", ["Sendai Publishing", "Ziff Davis", "EGM Media"], "1989", "2009-01", "ceased", "consumer", ["multi"], None, "electronic-gaming-monthly", "Revived briefly 2009-2014."),
    ("egm2", "EGM2 / Expert Gamer / GameNOW", "EGM2", "US", ["Sendai Publishing", "Ziff Davis"], "1994-07", "2004-01", "ceased", "consumer", ["multi"], "EGM2 / Expert Gamer / GameNOW", None, None),
    ("gamepro", "GamePro", None, "US", ["IDG"], "1989-05", "2011-12", "ceased", "consumer", ["multi"], None, "gamepromagazine", None),
    ("game-informer", "Game Informer", "GI", "US", ["Funco", "GameStop", "Gunzilla Games"], "1991-08", None, "active", "consumer", ["multi"], None, "gameinformer", "Closed Aug 2024, relaunched 2025."),
    ("next-generation", "Next Generation / NextGen", "NextGen", "US", ["Imagine Media"], "1995-01", "2002-01", "ceased", "consumer", ["multi"], "Next Generation / NextGen", None, "US edition of Edge."),
    ("videogames-computer-entertainment", "VideoGames & Computer Entertainment / VideoGames: The Ultimate Gaming Magazine", "VG&CE", "US", ["LFP Inc."], "1988-12", "1996-09", "ceased", "consumer", ["multi"], "VideoGames & Computer Entertainment / VideoGames: The Ultimate Gaming Magazine", None, None),
    ("tips-and-tricks", "Tips & Tricks", None, "US", ["LFP Inc."], "1994", "2011-02", "ceased", "consumer", ["multi"], "Tips & Tricks", None, None),
    ("code-vault", "Code Vault", None, "US", ["Future US"], "2001-09", "2007", "ceased", "consumer", ["multi"], "Code Vault", None, None),
    ("play-us", "Play (US)", None, "US", ["Fusion Publishing"], "2001-12", "2010-01", "ceased", "consumer", ["multi"], "Play", None, None),
    ("atgamer", "@Gamer", None, "US", ["Future US"], "2010-07", "2014-12", "ceased", "consumer", ["multi"], "@Gamer", "atgamer-magazine", "Sold through Best Buy."),
    ("surge", "Surge", None, "US", [], "2004", "2004", "ceased", "consumer", ["multi"], "Surge", None, None),
    ("ign-magazines", "IGN magazines", None, "US", ["IGN Entertainment"], "1998", "2001", "ceased", "consumer", ["multi"], "IGN magazines", None, None),
    ("pocket-games", "Pocket Games", None, "US", ["Ziff Davis"], "1999", "2006", "ceased", "consumer", ["handheld"], "Pocket Games", None, None),
    ("game-players", "Game Players", None, "US", ["Signal Research", "GP Publications", "Imagine Media"], "1989", "1998", "ceased", "consumer", ["multi"], None, None, "Later Ultra Game Players."),
    ("diehard-gamefan", "DieHard GameFan", "GameFan", "US", ["DieHard Gamers Club", "Shinno Media"], "1992-09", "2000-12", "ceased", "consumer", ["multi"], None, None, None),
    # --- US official / platform ----------------------------------------------------------------------------
    ("nintendo-power", "Nintendo Power", "NP", "US", ["Nintendo of America", "Future US"], "1988-07", "2012-12", "ceased", "official", ["nintendo"], "Nintendo Power", None, None),
    ("nintendo-newsletters", "Nintendo newsletters", None, "US", ["Nintendo of America"], "1988", "1993", "ceased", "newsletter", ["nintendo"], "Nintendo newsletters", None, "Nintendo Fun Club News etc."),
    ("q64", "Q64", None, "US", [], "1997", "2000", "ceased", "consumer", ["nintendo"], "Q64", None, None),
    ("sega-visions", "Sega Visions", None, "US", ["Sega of America"], "1990", "1995", "ceased", "official", ["sega"], "Sega Visions", None, None),
    ("official-dreamcast-magazine-us", "Official Sega Dreamcast Magazine (US)", "ODCM", "US", ["Imagine Media"], "1999-06", "2001-04", "ceased", "official", ["sega"], "Official Sega Dreamcast Magazine", None, None),
    ("official-us-playstation-magazine", "Official U.S. PlayStation Magazine", "OPM", "US", ["Ziff Davis"], "1997-10", "2007-01", "ceased", "official", ["playstation"], "Official U.S. PlayStation Magazine", None, None),
    ("playstation-the-official-magazine", "PlayStation: The Official Magazine", "PTOM", "US", ["Future US"], "2007", "2012", "ceased", "official", ["playstation"], "PlayStation: The Official Magazine", None, None),
    ("psm", "PSM", None, "US", ["Imagine Media", "Future US"], "1997-09", "2007-12", "ceased", "consumer", ["playstation"], "PSM", None, None),
    ("psx", "P.S.X.", None, "US", ["Dimension Publishing"], "1995", "1997-09", "ceased", "consumer", ["playstation"], "P.S.X.", None, None),
    ("psextreme", "PSExtreme / Dimension PS-X / PSE2", None, "US", ["Dimension Publishing"], "1995-12", "2006-05", "ceased", "consumer", ["playstation"], "PSExtreme / Dimension PS-X / PSE2", None, None),
    ("ps-max", "PS Max", None, "US", [], "1999", "1999", "ceased", "consumer", ["playstation"], "PS Max", None, None),
    ("official-xbox-magazine", "Official Xbox Magazine", "OXM", "US", ["Future US"], "2001-11", "2020-05", "ceased", "official", ["xbox"], "Official Xbox Magazine", None, None),
    ("xbox-nation", "Xbox Nation", "XBN", "US", ["Ziff Davis"], "2002-01", "2005-02", "ceased", "consumer", ["xbox"], "Xbox Nation", None, None),
    ("3do-club-news", "3DO Club News", None, "US", ["The 3DO Company"], "1993", "1995", "ceased", "newsletter", ["3do"], "3DO Club News", None, None),
    ("neopets-magazine", "Neopets The Official Magazine", None, "US", ["Beckett Media"], "2003-09", "2008-02", "ceased", "official", ["other"], "Neopets The Official Magazine", None, None),
    ("imagine-town", "Imagine Town Magazine / Game Candy", None, "US", [], "2008", "2009", "ceased", "consumer", ["other"], "Imagine Town Magazine / Game Candy", None, None),
    ("ngamer-us", "NGamer (US)", None, "US", [], "1999-12", "2000-01", "ceased", "consumer", ["nintendo"], "NGamer", None, "Single issue."),
    # --- US first wave 1981-85 -----------------------------------------------------------------------------
    ("electronic-games", "Electronic Games", "EG", "US", ["Reese Communications", "Decker Publications"], "1981-10", "1995", "ceased", "consumer", ["multi"], None, None, "The first video game magazine (1981-85); revived 1992-95."),
    ("arcade-express", "Arcade Express / Electronic Games Hotline", None, "US", ["Reese Communications"], "1982-08", "1984-08", "ceased", "newsletter", ["multi"], "Arcade Express / Electronic Games Hotline", None, None),
    ("video-games-magazine", "Video Games", None, "US", ["Pumpkin Press"], "1982-08", "1984", "ceased", "consumer", ["multi"], "Video Games", None, None),
    ("videogaming-illustrated", "Videogaming & Computergaming Illustrated", None, "US", ["Ion International"], "1982-08", "1984-03", "ceased", "consumer", ["multi"], "Videogaming & Computergaming Illustrated", None, None),
    ("vidiot", "Vidiot", None, "US", ["Creem Magazine"], "1982-09", "1983-09", "ceased", "consumer", ["multi"], "Vidiot", None, None),
    ("blip", "Blip", None, "US", ["Marvel Comics"], "1983-02", "1983-08", "ceased", "consumer", ["multi"], "Blip", "blip-magazine", None),
    ("activisions", "Activisions", None, "US", ["Activision"], "1981", "1984", "ceased", "newsletter", ["atari-2600"], "Activisions", "activisions", None),
    ("atari-age", "Atari Age", None, "US", ["Atari Club"], "1982-05", "1984-04", "ceased", "newsletter", ["atari-2600", "atari-8bit"], "Atari Age", None, None),
    ("odyssey-adventure", "Odyssey Adventure", None, "US", ["Magnavox"], "1982", "1983", "ceased", "newsletter", ["other"], "Odyssey Adventure", None, "Odyssey2 owners' magazine."),
    ("computer-entertainer", "Computer Entertainer", None, "US", [], "1982", "1990", "ceased", "newsletter", ["multi"], "Computer Entertainer", None, "Formerly The Video Game Update."),
    ("the-logical-gamer", "The Logical Gamer", None, "US", [], "1982-08", "1983-12", "ceased", "newsletter", ["multi"], "The Logical Gamer", None, None),
    # --- Trade -------------------------------------------------------------------------------------------------
    ("mcv", "MCV", None, "GB", ["Intent Media", "NewBay Media", "Biz Media"], "1998-09", None, "active", "trade", ["multi"], "MCV", None, None),
    ("develop", "Develop", None, "GB", ["Intent Media", "NewBay Media"], "1996-08", "2017-12", "ceased", "developer", ["multi"], "Develop", None, None),
    ("e3-show-daily", "E3 Show Daily", None, "US", [], "1995", "2016", "ceased", "trade", ["multi"], "E3 Show Daily", None, None),
    ("casual-connect", "Casual Connect", None, "US", ["Casual Games Association"], "2006", "2015", "ceased", "trade", ["pc", "mobile"], "Casual Connect", "casualconnectmagazine", None),
    ("newmedia", "NewMedia", None, "US", ["HyperMedia Communications"], "1991", "1999", "ceased", "trade", ["pc"], "NewMedia", None, None),
    ("multimedia-merchandising", "MultiMedia Merchandising", None, "US", [], "1994", "1996", "ceased", "trade", ["pc"], "MultiMedia Merchandising", None, None),
    ("videogame-advisor", "Videogame Advisor", None, "US", [], "1995", "1997", "ceased", "trade", ["multi"], "Videogame Advisor", None, None),
    ("walmart-gamecenter", "Walmart GameCenter", None, "US", ["Walmart"], "2012-01", "2024-01", "ceased", "other", ["multi"], "Walmart GameCenter", None, "Retail giveaway magazine."),
    # --- UK ------------------------------------------------------------------------------------------------------
    ("gamesmaster", "GamesMaster", "GM", "GB", ["Future Publishing"], "1993-01", "2018-12", "ceased", "consumer", ["multi"], None, None, "Tie-in to the Channel 4 TV show. Internet Archive scans live in the misc bucket (gamesmaster-001, Games_Master_Issue_0xx...)."),
    ("edge", "Edge", None, "GB", ["Future Publishing"], "1993-10", None, "active", "consumer", ["multi"], "Edge", None, None),
    ("cvg", "Computer and Video Games", "CVG", "GB", ["EMAP", "Dennis Publishing", "Future Publishing"], "1981-11", "2004-10", "ceased", "consumer", ["multi"], None, "cvg-magazine", "Britain's first games magazine."),
    ("pc-zone", "PC Zone", None, "GB", ["Dennis Publishing", "Future Publishing"], "1993-04", "2010-09", "ceased", "consumer", ["pc"], None, "pczonemagazine", None),
    ("pc-gamer-uk", "PC Gamer (UK)", "PCG UK", "GB", ["Future Publishing"], "1993-11", None, "active", "consumer", ["pc"], None, None, None),
    ("ace", "ACE", None, "GB", ["Future Publishing", "EMAP"], "1987-10", "1992-04", "ceased", "consumer", ["multi"], None, "ace-magazine", "Advanced Computer Entertainment."),
    ("the-games-machine", "The Games Machine", "TGM", "GB", ["Newsfield"], "1987-10", "1990-09", "ceased", "consumer", ["multi"], None, None, None),
    ("zero", "Zero", None, "GB", ["Dennis Publishing"], "1989-11", "1992-08", "ceased", "consumer", ["multi", "amiga", "atari-st"], None, None, None),
    ("mean-machines", "Mean Machines", None, "GB", ["EMAP"], "1990-10", "1992-09", "ceased", "consumer", ["multi"], None, None, "Split into Mean Machines Sega and Nintendo Magazine System."),
    ("mean-machines-sega", "Mean Machines Sega", "MMS", "GB", ["EMAP"], "1992-10", "1997-03", "ceased", "consumer", ["sega"], "Mean Machines Sega", None, None),
    ("mega", "Mega", None, "GB", ["Future Publishing"], "1992-10", "1995-10", "ceased", "consumer", ["sega"], "Mega", None, None),
    ("megatech", "MegaTech", None, "GB", ["EMAP"], "1991-12", "1995-07", "ceased", "consumer", ["sega"], "MegaTech", None, None),
    ("sega-pro", "Sega Pro", None, "GB", ["Paragon Publishing"], "1991-11", "1996", "ceased", "consumer", ["sega"], None, None, None),
    ("official-sega-saturn-magazine", "Official Sega Saturn Magazine", "OSSM", "GB", ["EMAP"], "1995-11", "1998-10", "ceased", "official", ["sega"], None, None, None),
    ("dreamcast-magazine-uk", "Dreamcast Magazine (UK)", None, "GB", ["Paragon Publishing"], "1999-09", "2001-07", "ceased", "consumer", ["sega"], None, None, None),
    ("super-play", "Super Play", None, "GB", ["Future Publishing"], "1992-11", "1996-09", "ceased", "consumer", ["nintendo"], "Super Play", None, None),
    ("total", "Total!", None, "GB", ["Future Publishing"], "1992-01", "1996-10", "ceased", "consumer", ["nintendo"], "Total!", None, None),
    ("nintendo-magazine-system", "Nintendo Magazine System / Official Nintendo Magazine", "NMS", "GB", ["EMAP", "Future Publishing"], "1992-10", "2014-10", "ceased", "official", ["nintendo"], None, None, None),
    ("official-uk-playstation-magazine", "Official UK PlayStation Magazine", "OPM UK", "GB", ["Future Publishing"], "1995-11", "2004-03", "ceased", "official", ["playstation"], None, None, None),
    ("zzap64", "Zzap!64", None, "GB", ["Newsfield", "Europress Impact"], "1985-05", "1992-11", "ceased", "consumer", ["c64"], None, "zzap64-magazine", None),
    ("crash", "Crash", None, "GB", ["Newsfield", "Europress Impact"], "1984-02", "1992-04", "ceased", "consumer", ["zx-spectrum"], None, "crash-magazine", None),
    ("your-sinclair", "Your Sinclair", "YS", "GB", ["Dennis Publishing", "Future Publishing"], "1986-01", "1993-09", "ceased", "consumer", ["zx-spectrum"], None, None, None),
    ("sinclair-user", "Sinclair User", "SU", "GB", ["ECC Publications", "EMAP"], "1982-04", "1993-04", "ceased", "consumer", ["zx-spectrum"], None, None, None),
    ("amstrad-action", "Amstrad Action", "AA", "GB", ["Future Publishing"], "1985-10", "1995-06", "ceased", "consumer", ["amstrad-cpc"], None, None, "Future Publishing's first magazine."),
    ("commodore-format", "Commodore Format", "CF", "GB", ["Future Publishing"], "1990-10", "1995-10", "ceased", "consumer", ["c64"], None, None, None),
    ("amiga-power", "Amiga Power", "AP", "GB", ["Future Publishing"], "1991-05", "1996-09", "ceased", "consumer", ["amiga"], None, None, None),
    ("the-one", "The One", None, "GB", ["EMAP"], "1988-10", "1996-11", "ceased", "consumer", ["amiga", "atari-st", "pc"], None, None, "Later The One Amiga."),
    ("retro-gamer", "Retro Gamer", None, "GB", ["Live Publishing", "Imagine Publishing", "Future Publishing"], "2004-01", None, "active", "consumer", ["multi"], None, None, None),
    # --- Australia -------------------------------------------------------------------------------------------
    ("hyper", "Hyper", None, "AU", ["Next Media", "Future Australia"], "1993-12", "2018", "ceased", "consumer", ["multi"], "Hyper", None, None),
    ("pc-powerplay", "PC PowerPlay", "PCPP", "AU", ["Next Media", "Future Australia"], "1996-05", None, "active", "consumer", ["pc"], None, None, None),
]
# fmt: on

VGHF_URL_BASE = "https://archive.gamehistory.org/folder/"


def find_vghf(title: str | None):
    if not title:
        return None
    return VGHF_BY_TITLE.get(title)


def main() -> int:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    created = updated = 0
    for row in ROWS:
        (pid, title, short, country, publishers, start, end, status, ptype, platforms, vghf_title, ia_id, notes) = row
        folder = LIB / pid
        pub_file = folder / "publication.json"
        issues_file = folder / "issues.json"

        sources = []
        vghf = find_vghf(vghf_title)
        if vghf:
            sources.append({"provider": "vghf", "url": vghf["url"], "date_range": vghf["dates"]})
        if ia_id and ia_id in IA_BY_ID:
            c = IA_BY_ID[ia_id]
            src = {"provider": "internet-archive", "url": c["url"], "items": c.get("items", 0)}
            if c.get("first") and c.get("last"):
                src["date_range"] = f"{c['first'][:4]}–{c['last'][:4]}"
            sources.append(src)
        if pid in ("softline", "computer-game-forum", "games-for-windows"):
            sources.append({"provider": "cgwmuseum", "url": "https://www.cgwmuseum.org/galleries/index.php"})

        if sources:
            default_provider = sources[0]["provider"]
            rights = {"authorized": "authorized", "community-scan": "community-scan", "link-only": "link-only"}[
                {"vghf": "link-only", "internet-archive": "community-scan", "cgwmuseum": "authorized"}[default_provider]
            ]
        else:
            default_provider, rights = "internet-archive", "community-scan"

        record = {
            "id": pid,
            "title": title,
            **({"short": short} if short else {}),
            "metadata_status": "stub",
            "publishers": [{"name": p} for p in publishers],
            "country": country,
            "language": "en",
            "first_issue": {"date": start},
            **({"last_issue": {"date": end}} if end else {}),
            "status": status,
            "categories": {"type": ptype, "platforms": platforms},
            "numbering": {"scheme": "sequential", "notes": "unverified"},
            "default_provider": default_provider,
            "rights": {"status": rights, "note": "Inherited from default provider; review before hosting."},
            "known_sources": sources,
            **({"notes": notes} if notes else {}),
            "stats": {"issues": 0, "pages": 0, "readable": 0, "with_text": 0},
            "updated_at": now,
        }
        if notes:
            record["description"] = notes
            del record["notes"]

        folder.mkdir(parents=True, exist_ok=True)
        if pub_file.exists():
            existing = json.loads(pub_file.read_text(encoding="utf-8"))
            for k, v in record.items():
                existing.setdefault(k, v)
            pub_file.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            updated += 1
        else:
            pub_file.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            created += 1
        if not issues_file.exists():
            issues_file.write_text("[]\n", encoding="utf-8")

    # make sure cgw has the new required fields too
    cgw = LIB / "cgw" / "publication.json"
    if cgw.exists():
        data = json.loads(cgw.read_text(encoding="utf-8"))
        data.setdefault("short", "CGW")
        data.setdefault("metadata_status", "verified")
        data.setdefault("known_sources", [
            {"provider": "cgwmuseum", "url": "https://www.cgwmuseum.org/galleries/index.php?year=1981&pub=2", "items": 268, "date_range": "1981–2006"},
            {"provider": "internet-archive", "url": "https://archive.org/details/computergamingworld", "items": IA_BY_ID.get("computergamingworld", {}).get("items", 0)},
            {"provider": "vghf", "url": VGHF_BY_TITLE.get("Computer Gaming World", {}).get("url", "https://archive.gamehistory.org"), "date_range": "November 1981 – April 2008"},
        ])
        cgw.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"created {created}, updated {updated} publications -> {LIB}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
