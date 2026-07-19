PRAGMA foreign_keys = ON;

CREATE TABLE advisor_domains (
  domain_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  seq_label TEXT NOT NULL,
  display_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE advisors (
  card_id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain_id TEXT NOT NULL REFERENCES advisor_domains(domain_id),
  title TEXT NOT NULL,
  era TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  bundle_status TEXT NOT NULL,
  source_status TEXT NOT NULL,
  knowledge_qc_status TEXT NOT NULL CHECK (knowledge_qc_status IN ('pass', 'pending')),
  living_status TEXT NOT NULL,
  material_type TEXT NOT NULL,
  insight TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  portrait_url TEXT NOT NULL,
  strategy_card_expected INTEGER NOT NULL DEFAULT 5,
  strategy_card_available INTEGER NOT NULL DEFAULT 0,
  profile_json TEXT NOT NULL CHECK (json_valid(profile_json)),
  content_sha256 TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE INDEX idx_advisors_domain_order ON advisors(domain_id, display_order);
CREATE INDEX idx_advisors_name ON advisors(name);
CREATE INDEX idx_advisors_source_status ON advisors(source_status);

CREATE TABLE advisor_cases (
  case_id TEXT PRIMARY KEY,
  advisor_id TEXT NOT NULL REFERENCES advisors(card_id) ON DELETE CASCADE,
  title_period TEXT NOT NULL,
  dilemma_constraints TEXT NOT NULL,
  key_judgment TEXT NOT NULL,
  outcome TEXT NOT NULL,
  transferable_lesson TEXT NOT NULL,
  source_tier TEXT NOT NULL,
  historicity TEXT NOT NULL,
  status TEXT NOT NULL,
  case_json TEXT NOT NULL CHECK (json_valid(case_json)),
  content_sha256 TEXT NOT NULL
);

CREATE INDEX idx_advisor_cases_advisor ON advisor_cases(advisor_id);
CREATE INDEX idx_advisor_cases_source ON advisor_cases(source_tier, historicity);

CREATE TABLE advisor_assets (
  asset_key TEXT PRIMARY KEY,
  advisor_id TEXT NOT NULL REFERENCES advisors(card_id) ON DELETE CASCADE,
  person_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('thumb', 'portrait', 'strategy_card')),
  model_name TEXT,
  asset_url TEXT,
  expected_path TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'derived_from_portrait', 'missing')),
  checksum_sha256 TEXT,
  width INTEGER,
  height INTEGER
);

CREATE INDEX idx_advisor_assets_advisor_role ON advisor_assets(advisor_id, role);
CREATE INDEX idx_advisor_assets_availability ON advisor_assets(role, availability);

