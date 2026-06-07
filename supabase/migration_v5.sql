-- ══════════════════════════════════════════════════════
-- SALES COMMAND OS v5: CONCURRENCY & DATA MANAGEMENT UPGRADE
-- Adds version tracking to leads for optimistic concurrency.
-- ══════════════════════════════════════════════════════

-- 1. Add version column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;
