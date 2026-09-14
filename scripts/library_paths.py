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


def pdf_dir(pub: str) -> Path:
    return PDF_ROOT / pub / "pdf"


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
