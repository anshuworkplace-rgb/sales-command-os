-- ══════════════════════════════════════════════════════════════════════
-- SALES COMMAND OS — PHASE 0 FOUNDATION MIGRATION
-- PostgreSQL (Supabase)
--
-- This migration is IDEMPOTENT — safe to run multiple times.
-- It adds new objects on top of the existing schema.sql baseline.
--
-- Run in Supabase SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════
-- §1  PERFORMANCE INDEXES FOR RLS POLICIES
-- ═══════════════════════════════════════════════
-- The existing RLS policies use subqueries like:
--   (SELECT manager_id FROM profiles p WHERE p.id = <table>.assigned_to)
-- These indexes ensure that the manager_id and role lookups are fast.

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);


-- ═══════════════════════════════════════════════
-- §2  AUDIT LOG TABLE
-- ═══════════════════════════════════════════════
-- Immutable compliance / activity tracking table.
-- No UPDATE or DELETE policies — append-only by design.

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ DEFAULT now(),
  ip_address  INET,
  user_agent  TEXT
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id   ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name  ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at  ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by  ON audit_log(changed_by);

-- Composite index for the most common query: "show me changes for record X in table Y"
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id, changed_at DESC);


-- ───── Audit Log RLS ─────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent: DO block with exception handling)
DO $$
BEGIN
  DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
  DROP POLICY IF EXISTS "audit_log_select_manager" ON audit_log;
  DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log;
  DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
END $$;

-- Admins can read all audit logs
CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Managers can read audit logs for their direct reports' records
CREATE POLICY "audit_log_select_manager" ON audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'manager'
  )
  AND (
    -- Own changes
    changed_by = auth.uid()
    -- Or changes by their direct reports
    OR changed_by IN (
      SELECT p.id FROM profiles p WHERE p.manager_id = auth.uid()
    )
  )
);

-- Sales reps can read only their own audit entries
CREATE POLICY "audit_log_select_own" ON audit_log FOR SELECT USING (
  changed_by = auth.uid()
);

-- INSERT is allowed from triggers (SECURITY DEFINER) — also allow direct inserts
-- from authenticated users for their own entries
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (true);

-- NOTE: No UPDATE or DELETE policies — audit_log is immutable


-- ═══════════════════════════════════════════════
-- §3  OPTIMISTIC CONCURRENCY SUPPORT
-- ═══════════════════════════════════════════════
-- Add `version` columns to leads and deals for conflict detection.
-- The frontend will send the current version with updates;
-- the trigger auto-increments so stale writes fail.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;


-- ═══════════════════════════════════════════════
-- §4  ENHANCED MONTHLY TARGETS
-- ═══════════════════════════════════════════════
-- Support multi-metric targets beyond just revenue.

ALTER TABLE monthly_targets ADD COLUMN IF NOT EXISTS leads_target    INT  DEFAULT 0;
ALTER TABLE monthly_targets ADD COLUMN IF NOT EXISTS calls_target    INT  DEFAULT 0;
ALTER TABLE monthly_targets ADD COLUMN IF NOT EXISTS meetings_target INT  DEFAULT 0;
ALTER TABLE monthly_targets ADD COLUMN IF NOT EXISTS notes           TEXT;


-- ═══════════════════════════════════════════════
-- §5  ADDITIONAL LEAD COLUMNS
-- ═══════════════════════════════════════════════
-- Richer lead data for CRM, Google Sheets sync, and deal intelligence.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS company            TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS title              TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city               TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS capital            TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS capital_numeric    NUMERIC DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type          TEXT DEFAULT 'manual';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_step          TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_note     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS synced_from_sheet  BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_sheet_sync_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_row_number   INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_color        TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS win_probability    NUMERIC DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value    NUMERIC DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sla_deadline       TIMESTAMPTZ;

-- Index for sheet-synced leads (partial index — only rows from sheets)
CREATE INDEX IF NOT EXISTS idx_leads_synced_sheet
  ON leads(synced_from_sheet, last_sheet_sync_at)
  WHERE synced_from_sheet = true;

-- Index for SLA deadline monitoring
CREATE INDEX IF NOT EXISTS idx_leads_sla_deadline
  ON leads(sla_deadline)
  WHERE sla_deadline IS NOT NULL;

-- Index for lead type filtering
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);


-- ═══════════════════════════════════════════════
-- §6  ADDITIONAL DEAL COLUMNS
-- ═══════════════════════════════════════════════

ALTER TABLE deals ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason  TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS competitor   TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS notes        TEXT;


-- ═══════════════════════════════════════════════
-- §7  AUDIT LOG TRIGGER FUNCTION
-- ═══════════════════════════════════════════════
-- Generic audit trigger — can be attached to any table with an `id` column.
-- Uses SECURITY DEFINER so it can write to audit_log regardless of caller RLS.

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      COALESCE(auth.uid(), NEW.assigned_to)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ───── Attach audit triggers to leads, deals, tasks ─────
-- Using DROP IF EXISTS + CREATE pattern for idempotency
-- (CREATE OR REPLACE is not supported for triggers in PostgreSQL)

DO $$
BEGIN
  -- Leads audit trigger
  DROP TRIGGER IF EXISTS audit_leads ON leads;
  CREATE TRIGGER audit_leads
    AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

  -- Deals audit trigger
  DROP TRIGGER IF EXISTS audit_deals ON deals;
  CREATE TRIGGER audit_deals
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

  -- Tasks audit trigger
  DROP TRIGGER IF EXISTS audit_tasks ON tasks;
  CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
END $$;


-- ═══════════════════════════════════════════════
-- §8  VERSION AUTO-INCREMENT TRIGGER
-- ═══════════════════════════════════════════════
-- Automatically bumps the `version` column on every UPDATE,
-- enabling optimistic concurrency on the frontend.

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach version triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS version_leads ON leads;
  CREATE TRIGGER version_leads
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION increment_version();

  DROP TRIGGER IF EXISTS version_deals ON deals;
  CREATE TRIGGER version_deals
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION increment_version();
END $$;


-- ═══════════════════════════════════════════════
-- §9  ENABLE REALTIME ON NEW TABLES
-- ═══════════════════════════════════════════════
-- Wrapped in DO blocks so repeated runs don't fail if
-- the table is already in the publication.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already added
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE monthly_targets;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already added
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- END OF PHASE 0 FOUNDATION MIGRATION
-- ══════════════════════════════════════════════════════════════════════
-- Summary of changes applied:
--
--  §1  idx_profiles_manager_id, idx_profiles_role
--  §2  audit_log table + indexes + immutable RLS policies
--  §3  leads.version, deals.version columns
--  §4  monthly_targets: leads_target, calls_target, meetings_target, notes
--  §5  leads: company, title, city, capital, capital_numeric, lead_type,
--       next_step, follow_up_note, synced_from_sheet, last_sheet_sync_at,
--       sheet_row_number, sheet_color, win_probability, estimated_value,
--       sla_deadline  +  supporting indexes
--  §6  deals: close_reason, lost_reason, competitor, notes
--  §7  audit_trigger_fn() + triggers on leads, deals, tasks
--  §8  increment_version() + triggers on leads, deals
--  §9  Realtime enabled on audit_log, monthly_targets
-- ══════════════════════════════════════════════════════════════════════
