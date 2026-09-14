"""Where magazine PDFs live.

Metadata stays in the git repo under library/<pub>/. The actual PDFs live on
an external drive so the project folder stays small.

Override with CAT_PDF_ROOT if the library is mounted somewhere else.
"""

from __future__ import annotations

import os
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
PDF_ROOT = Path(os.environ.get("CAT_PDF_ROOT", "H:/cat-library"))
PAGES_ROOT = Path(os.environ.get("CAT_PAGES_ROOT", "H:/cat-library/pages"))
COVERS_ROOT = Path(os.environ.get("CAT_COVERS_ROOT", "H:/cat-library/covers"))
LOCAL_PAGES = ROOT / "site" / "public" / "pages"
LOCAL_COVERS = ROOT / "site" / "public" / "covers"


def pdf_dir(pub: str) -> Path:
    return PDF_ROOT / pub / "pdf"


def cover_path(issue_id: str) -> Path:
    """Cover JPEG: new work on H:, fall back to a leftover file in site/public."""
    external = COVERS_ROOT / f"{issue_id}.jpg"
    if external.exists():
        return external
    local = LOCAL_COVERS / f"{issue_id}.jpg"
    if local.exists():
        return local
    return external


def pages_dir(issue_id: str) -> Path:
    """Rendered pages: new work on H:, fall back to the original E: tree."""
    external = PAGES_ROOT / issue_id
    if (external / "manifest.json").exists():
        return external
    local = LOCAL_PAGES / issue_id
    if (local / "manifest.json").exists():
        return local
    return external


def resolve_pdf(rel: str | Path) -> Path:
    """Map an issues.json files.pdf value to the file on disk."""
    rel = Path(rel)
    if rel.is_absolute():
        return rel

    parts = rel.parts
    preferred: list[Path] = []
    if len(parts) >= 3 and parts[0] == "library" and parts[2] == "pdf":
        preferred.append(PDF_ROOT / parts[1] / "pdf" / Path(*parts[3:]))
    if parts and parts[0].upper() == "CGW":
        preferred.append(PDF_ROOT / "CGW" / Path(*parts[1:]))
    preferred.extend((PDF_ROOT / rel, ROOT / rel))

    for candidate in preferred:
        if candidate.exists():
            return candidate
    return preferred[0]
