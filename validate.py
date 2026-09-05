#!/usr/bin/env python3
"""Validate everything under library/ against the JSON Schemas in schema/.

Checks schema conformance plus cross-references (provider ids, publication ids,
unique issue ids, contiguous sequence numbers, PDF files present).

Usage: python validate.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:  # pragma: no cover
    sys.exit("pip install jsonschema")

ROOT = Path(__file__).resolve().parent
SCHEMA = ROOT / "schema"
LIBRARY = ROOT / "library"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(instance, schema_file: str, label: str) -> int:
    validator = Draft202012Validator(load(SCHEMA / schema_file), format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    for e in errors:
        where = "/".join(str(p) for p in e.path) or "<root>"
        print(f"  [{label}] {where}: {e.message}")
    return len(errors)


def main() -> int:
    problems = 0

    providers = load(LIBRARY / "providers.json")
    problems += validate(providers, "provider.schema.json", "providers")
    provider_ids = {p["id"] for p in providers}

    pub_dirs = sorted(p for p in LIBRARY.iterdir() if p.is_dir())
    publication_ids = {p.name for p in pub_dirs}

    for pub_dir in pub_dirs:
        pub_file = pub_dir / "publication.json"
        issues_file = pub_dir / "issues.json"
        if not pub_file.exists():
            print(f"  [{pub_dir.name}] missing publication.json")
            problems += 1
            continue
        pub = load(pub_file)
        problems += validate(pub, "publication.schema.json", f"{pub_dir.name}/publication")
        if pub.get("id") != pub_dir.name:
            print(f"  [{pub_dir.name}] id {pub.get('id')!r} does not match folder name")
            problems += 1
        if pub.get("default_provider") not in provider_ids:
            print(f"  [{pub_dir.name}] unknown default_provider {pub.get('default_provider')!r}")
            problems += 1
        for key in ("predecessor", "successor"):
            ref = (pub.get("related") or {}).get(key)
            if ref and ref not in publication_ids:
                print(f"  [{pub_dir.name}] note: related.{key} {ref!r} is not in the library yet")

        if not issues_file.exists():
            print(f"  [{pub_dir.name}] missing issues.json")
            problems += 1
            continue
        issues = load(issues_file)
        problems += validate(issues, "issues.schema.json", f"{pub_dir.name}/issues")

        ids = [i["id"] for i in issues]
        if len(ids) != len(set(ids)):
            dupes = sorted({x for x in ids if ids.count(x) > 1})
            print(f"  [{pub_dir.name}] duplicate issue ids: {dupes}")
            problems += 1
        seqs = [i["sequence"] for i in issues]
        if seqs != list(range(1, len(issues) + 1)):
            print(f"  [{pub_dir.name}] sequence numbers are not 1..{len(issues)} in file order")
            problems += 1
        for issue in issues:
            if issue["publication"] != pub["id"]:
                print(f"  [{pub_dir.name}] {issue['id']}: publication {issue['publication']!r} != {pub['id']!r}")
                problems += 1
            if issue["source"]["provider"] not in provider_ids:
                print(f"  [{pub_dir.name}] {issue['id']}: unknown provider {issue['source']['provider']!r}")
                problems += 1
            if not (ROOT / issue["files"]["pdf"]).exists():
                print(f"  [{pub_dir.name}] {issue['id']}: PDF not found at {issue['files']['pdf']}")
                problems += 1
        if pub.get("cover_issue") and pub["cover_issue"] not in ids:
            print(f"  [{pub_dir.name}] cover_issue {pub['cover_issue']!r} not among issues")
            problems += 1

        with_pages = sum(1 for i in issues if (i.get("assets") or {}).get("pages_rendered"))
        print(f"{pub['id']}: {len(issues)} issues, {sum(i['pages'] for i in issues)} pages, {with_pages} readable")

    print("OK" if problems == 0 else f"{problems} problem(s)")
    return 0 if problems == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
