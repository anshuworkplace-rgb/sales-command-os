-- ══════════════════════════════════════════════════════
-- SALES COMMAND OS v2: ALGO TRADING PIPELINE MIGRATION
-- Run this in Supabase SQL Editor AFTER migration_phase1.sql
-- ══════════════════════════════════════════════════════

-- 1. Update lead_status enum to new algo trading stages
-- First, add all new values (IF NOT EXISTS makes this safe to re-run)
DO $$
BEGIN
  -- New stages
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'enquiry';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'called';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'details_sent';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'demo_scheduled';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'demo_done';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'negotiation';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'converted';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'not_now';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'lost';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some enum values may already exist, continuing...';
END $$;

-- 2. Add new algo-trading-specific columns to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS plan_interest TEXT DEFAULT 'undecided';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS broker TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS trading_experience TEXT DEFAULT 'beginner';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_link TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS wa_count INTEGER DEFAULT 0;

-- 3. Migrate old stages to new ones
UPDATE leads SET status = 'enquiry' WHERE status = 'new';
UPDATE leads SET status = 'called' WHERE status = 'contacted';
UPDATE leads SET status = 'demo_done' WHERE status = 'interested';
UPDATE leads SET status = 'converted' WHERE status = 'payment_done';
UPDATE leads SET status = 'converted' WHERE status = 'upgrade';
UPDATE leads SET status = 'converted' WHERE status = 'closed_won';
UPDATE leads SET status = 'lost' WHERE status = 'closed_lost';

-- 4. Create index for faster pipeline queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status ON leads(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_follow_up) WHERE next_follow_up IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_demo_date ON leads(demo_date) WHERE demo_date IS NOT NULL;

-- 5. Function to auto-increment call_count when stage moves to 'called'
CREATE OR REPLACE FUNCTION increment_call_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'called' AND (OLD.status IS DISTINCT FROM 'called') THEN
    NEW.call_count = COALESCE(OLD.call_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_call_count ON leads;
CREATE TRIGGER trigger_increment_call_count
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION increment_call_count();

-- Done!
-- NOTE: Old enum values (new, contacted, interested, etc.) still exist in the type
-- but are no longer used. PostgreSQL doesn't support removing enum values.
