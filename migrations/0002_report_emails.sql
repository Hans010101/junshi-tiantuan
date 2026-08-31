CREATE TABLE IF NOT EXISTS report_emails (
  report_id TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  resend_id TEXT,
  sent_at TEXT NOT NULL,
  PRIMARY KEY (report_id, recipient_hash)
);

CREATE INDEX IF NOT EXISTS idx_report_emails_report_id ON report_emails(report_id);
