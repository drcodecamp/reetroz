/**
 * TypeScript mirror of the JSON Schemas in /schema.
 * Keep in sync with provider.schema.json, publication.schema.json, issues.schema.json.
 */

export type IsoDate = string; // YYYY | YYYY-MM | YYYY-MM-DD

export type RightsStatus =
  | "authorized"
  | "community-scan"
  | "link-only"
  | "public-domain";

export type Provider = {
  id: string;
  name: string;
  url: string;
  kind: "museum" | "archive" | "library" | "community" | "publisher" | "other";
  rights_default: Exclude<RightsStatus, "public-domain">;
  adapter?: string;
  api?: string;
  credit?: string;
  notes?: string;
};

export type PublicationType =
  | "consumer"
  | "official"
  | "trade"
  | "newsletter"
  | "fanzine"
  | "strategy"
  | "developer"
  | "other";

export type Platform =
  | "pc" | "mac" | "amiga" | "atari-st" | "atari-8bit" | "atari-2600" | "c64" | "zx-spectrum"
  | "amstrad-cpc" | "msx" | "apple-ii" | "nintendo" | "sega" | "playstation"
  | "xbox" | "3do" | "neo-geo" | "arcade" | "handheld" | "mobile" | "multi" | "other";

export type Publication = {
  id: string;
  title: string;
  short?: string;
  metadata_status: "stub" | "verified";
  known_sources?: { provider: string; url: string; items?: number; date_range?: string }[];
  sort_title?: string;
  aliases?: { title: string; from?: IsoDate; to?: IsoDate }[];
  publishers?: { name: string; from?: IsoDate; to?: IsoDate }[];
  country: string;
  language: string;
  issn?: string;
  first_issue?: { number?: string; date: IsoDate };
  last_issue?: { number?: string; date: IsoDate };
  status: "ceased" | "active" | "unknown";
  frequency?: "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "irregular" | "varied";
  categories: { type: PublicationType; platforms: Platform[]; genres?: string[] };
  description?: string;
  links?: { wikipedia?: string; official?: string; other?: string[] };
  related?: { predecessor?: string; successor?: string; sibling_editions?: string[] };
  numbering: { scheme: "sequential" | "volume-issue" | "mixed" | "date-only"; notes?: string };
  default_provider: string;
  rights: { status: RightsStatus; holder?: string; note?: string };
  cover_issue?: string;
  stats?: {
    issues?: number;
    pages?: number;
    readable?: number;
    with_text?: number;
    first_year?: number;
    last_year?: number;
  };
  updated_at?: string;
};

export type IssueDate = {
  display: string;
  start: IsoDate;
  end?: IsoDate;
  precision: "day" | "month" | "season" | "year";
};

export type ContentsEntry = {
  title: string;
  page: number;
  kind?: "review" | "preview" | "feature" | "column" | "news" | "letters" | "strategy" | "ad" | "other";
  games?: string[];
  score?: string;
};

export type Issue = {
  id: string;
  publication: string;
  sequence: number;
  number: string;
  volume?: number;
  issue_in_volume?: number;
  date: IssueDate;
  special?: string;
  cover_headline?: string;
  pages: number;
  dimensions?: { width_mm?: number; height_mm?: number };
  source: {
    provider: string;
    url: string;
    external_id?: string;
    retrieved_at?: string;
    scan_credit?: string;
  };
  files: { pdf: string; bytes?: number; sha256?: string; has_text_layer?: boolean };
  assets?: {
    cover?: string;
    pages_rendered?: boolean;
    manifest?: string;
  };
  text?: {
    status: "none" | "embedded" | "ocr" | "external";
    engine?: string;
    path?: string;
    languages?: string[];
  };
  contents?: ContentsEntry[];
  tags?: string[];
  rights?: { status: RightsStatus | "removed"; note?: string };
  notes?: string;
  updated_at?: string;
};
