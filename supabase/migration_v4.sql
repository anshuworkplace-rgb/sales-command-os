-- ══════════════════════════════════════════════════════
-- SALES COMMAND OS v4: DATA MANAGEMENT UPGRADE
-- Adds city, capital, follow_up_note, lead_type to match
-- the real Google Sheets workflow.
-- Run this in Supabase SQL Editor AFTER migration_v3.sql
-- ══════════════════════════════════════════════════════

-- 1. Add new columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS capital TEXT;           -- stored as text: "1 cr", "30K", "2 lakh"
ALTER TABLE leads ADD COLUMN IF NOT EXISTS capital_numeric NUMERIC DEFAULT 0;  -- parsed ₹ value for sorting/filtering
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_note TEXT;   -- raw Hinglish text: "kal 5-6 bje"
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'web_lead' CHECK (lead_type IN ('web_lead', 'mass_data'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS competitor TEXT;       -- e.g. "tradetron", "quantiply"
ALTER TABLE leads ADD COLUMN IF NOT EXISTS disposition TEXT;      -- quick tag: "BUSY", "NPC", etc. (for context)

-- 2. Indexes for fast filtering by lead_type and city
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_capital ON leads(capital_numeric DESC) WHERE capital_numeric > 0;

-- 3. Update realtime (already done for leads, just ensuring)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;
END $$;

-- Done!
