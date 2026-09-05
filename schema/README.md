# Library schema

Three entities, three JSON Schema files (draft 2020-12). TypeScript mirror in
`site/src/lib/schema.ts`. Validate with `python validate.py`.

```
library/
  providers.json                 -> provider.schema.json   (array)
  <publication-id>/
    publication.json             -> publication.schema.json
    issues.json                  -> issues.schema.json     (array, chronological)
```

## Vocabulary

- **Provider** – where scans come from (CGW Museum, Internet Archive, VGHF).
  Carries a `rights_default` so every issue inherits a hosting policy.
- **Publication** – one magazine title (schema.org `Periodical`). *Publisher*
  is just a field on it (`publishers[]`, with date ranges, because titles
  change hands).
- **Issue** – one scanned issue (schema.org `PublicationIssue`).

## Identifiers

- `publication.id`: short slug, used in folders and URLs: `cgw`, `gamesmaster`, `pc-zone`.
  Regional editions get their own publication: `pc-gamer-us`, `pc-gamer-uk`.
- `issue.id`: `<publication>-<number>` with `.` replaced by `-`: `cgw-186`, `cgw-1-1`.
  For date-only numbering use the date: `edge-1993-10`.
- `issue.sequence`: 1-based chronological position. This, not `number`, drives
  sorting and prev/next, because printed numbers are unreliable (restarts,
  skips, "Holiday" issues).

## Dates

`date.display` is what the cover says. `date.start` / `date.end` are ISO
(`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`) with `precision` saying how much to trust.
Bimonthly and seasonal issues set `end`.

## Rights

Every publication has `rights.status`; an issue may override it (e.g. one issue
removed after a takedown -> `removed`). Values:

| status | meaning | may host pages? |
|---|---|---|
| `authorized` | publisher / museum blessed | yes |
| `public-domain` | out of copyright | yes |
| `community-scan` | grey-area scan (Internet Archive) | yes, with takedown policy |
| `link-only` | terms forbid mirroring (VGHF) | no – catalog entry + link |
| `removed` | pulled after request | no |

## Paths

`files.pdf`, `assets.*`, `text.path` are relative to the repository root with
forward slashes. PDFs live wherever the adapter put them; assets always live
under `site/public/`.

## What tooling owns

Hand-edited: `providers.json`, `publication.json` (except `stats`), and the
descriptive issue fields (`special`, `cover_headline`, `contents`, `tags`).
Generated: `sequence`, `pages`, `dimensions`, `files`, `assets`, `text`,
`stats`, `updated_at`. Adapters create issues; `build_pages.py` fills `assets`;
the OCR step fills `text`.

## Adding a publication

1. Write an adapter that discovers issues at the provider and downloads PDFs.
   It must emit `issues.json` with at least the required fields.
2. Write `publication.json` by hand (Wikipedia + the provider's own listing).
3. `python validate.py`
4. `python build_pages.py --publication <id> --issue <n>` to render pages.
