CREATE TABLE IF NOT EXISTS complaint_reports (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  body_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  client_hash TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS complaint_reports_time ON complaint_reports(created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS complaint_reports_client ON complaint_reports(client_hash, created_at);
