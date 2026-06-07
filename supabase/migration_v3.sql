-- ══════════════════════════════════════════════════════
-- SALES COMMAND OS v3: EXECUTION-FIRST PIPELINE
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Add Next Step column for explicit follow-up tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_step TEXT;

-- 2. Update lead_status enum to new Execution-First stages
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'new_signals';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'discovery';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'system_demo';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'checkout';
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'deployed';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some enum values may already exist, continuing...';
END $$;

-- 3. Migrate old stages to new high-velocity stages
-- 'enquiry' -> 'new_signals'
UPDATE leads SET status = 'new_signals' WHERE status = 'enquiry';

-- 'called', 'details_sent', 'not_now' -> 'discovery'
UPDATE leads SET status = 'discovery' WHERE status IN ('called', 'details_sent', 'not_now');

-- 'demo_scheduled', 'demo_done' -> 'system_demo'
UPDATE leads SET status = 'system_demo' WHERE status IN ('demo_scheduled', 'demo_done');

-- 'negotiation' -> 'checkout'
UPDATE leads SET status = 'checkout' WHERE status = 'negotiation';

-- 'converted' -> 'deployed'
UPDATE leads SET status = 'deployed' WHERE status = 'converted';

-- 'lost' remains 'lost'

-- 4. Update index if needed (already exists, but good practice)
-- CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Done!
