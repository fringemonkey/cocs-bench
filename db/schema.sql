CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  submitted_at TEXT,
  source TEXT,
  verified INTEGER DEFAULT 0,

  avg_fps REAL,
  low_5_fps REAL,
  min_fps REAL,
  max_fps REAL,
  total_frames INTEGER,
  duration TEXT,

  upscaler TEXT,
  upscaler_tier TEXT,
  resolution_scale REAL,
  gi_quality TEXT,
  reflection_quality TEXT,
  rt_enabled INTEGER,
  window_mode TEXT,

  ocr_confidence TEXT,
  missing_fields TEXT,
  screenshot_url TEXT,
  artifact_url TEXT,
  notes TEXT
);
