-- ══════════════════════════════════════════════════════
-- SALES COMMAND OS v6: 10X SYNC & DATA MANAGEMENT UPGRADE
-- Adds version tracking, enquiry_date, objections_logged, last_feedback, and feedback_sentiment to the leads table.
-- Updates lead scoring and task priority calculations to incorporate trader profiling.
-- ══════════════════════════════════════════════════════

-- 1. Add version column to leads table (optimistic locking)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- 2. Add enquiry_date column (original sheet context date)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enquiry_date TIMESTAMPTZ;

-- 3. Add structured trader profile objections
ALTER TABLE leads ADD COLUMN IF NOT EXISTS objections_logged JSONB DEFAULT '[]'::jsonb;

-- 4. Add latest feedback logs and sentiment mapping
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_feedback TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS feedback_sentiment TEXT;

-- 5. Add index on enquiry_date and lead status for date aging
CREATE INDEX IF NOT EXISTS idx_leads_enquiry_date ON leads(enquiry_date, status);


-- 6. Update lead score calculator to factor in Trader Profile details (Capital, Experience, etc.)
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INT AS $$
DECLARE
  l RECORD;
  score INT := 20;
  activity_count INT;
  hours_since_last FLOAT;
BEGIN
  SELECT * INTO l FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO activity_count FROM activities WHERE lead_id = p_lead_id;

  -- Factor 1: Stage progression (0-30)
  CASE l.status
    WHEN 'new'          THEN score := score + 5;
    WHEN 'contacted'    THEN score := score + 10;
    WHEN 'interested'   THEN score := score + 25;
    WHEN 'payment_done' THEN score := score + 30;
    WHEN 'upgrade'      THEN score := score + 30;
    ELSE score := score + 0;
  END CASE;

  -- Factor 2: Activity volume (0-20)
  score := score + LEAST(20, activity_count * 3);

  -- Factor 3: Revenue (0-20)
  IF l.revenue > 0 THEN
    score := score + LEAST(20, (l.revenue / 2500)::INT);
  END IF;

  -- Factor 4: Trader Profile Capital Bonus (0-20)
  IF l.capital_numeric IS NOT NULL THEN
    IF l.capital_numeric >= 500000 THEN
      score := score + 20;  -- 5L+ capital = High Tier
    ELSIF l.capital_numeric >= 100000 THEN
      score := score + 10;  -- 1L-5L capital = Mid Tier
    ELSIF l.capital_numeric > 0 THEN
      score := score + 5;   -- Low Tier
    END IF;
  END IF;

  -- Factor 5: Trading Experience Bonus (0-10)
  IF l.trading_experience IS NOT NULL THEN
    IF l.trading_experience IN ('option_trader', 'algo_user') THEN
      score := score + 10;  -- High value fit
    ELSIF l.trading_experience IN ('intermediate', 'manual_trader') THEN
      score := score + 5;
    END IF;
  END IF;

  -- Factor 6: Recency penalty (0 to -15) - check last_activity_at vs enquiry_date/created_at
  hours_since_last := EXTRACT(EPOCH FROM (now() - COALESCE(l.last_activity_at, l.enquiry_date, l.created_at))) / 3600;
  IF hours_since_last > 72 THEN score := score - 15;
  ELSIF hours_since_last > 48 THEN score := score - 10;
  ELSIF hours_since_last > 24 THEN score := score - 5;
  END IF;

  -- Cap between 0 and 100
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Update task priority calculation to include Trader Profile values
CREATE OR REPLACE FUNCTION calculate_task_priority(p_task_id UUID)
RETURNS INT AS $$
DECLARE
  t RECORD;
  l RECORD;
  score INT := 50;
  hours_until_due FLOAT;
  hours_inactive FLOAT;
BEGIN
  SELECT * INTO t FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF t.status != 'pending' THEN RETURN 0; END IF;

  SELECT * INTO l FROM leads WHERE id = t.lead_id;

  -- Factor 1: Due date proximity (0-35 points)
  hours_until_due := EXTRACT(EPOCH FROM (t.due_at - now())) / 3600;
  IF hours_until_due < 0 THEN
    score := score + 35;  -- Overdue = max urgency
  ELSIF hours_until_due < 2 THEN
    score := score + 30;
  ELSIF hours_until_due < 6 THEN
    score := score + 25;
  ELSIF hours_until_due < 24 THEN
    score := score + 15;
  ELSIF hours_until_due < 48 THEN
    score := score + 5;
  END IF;

  -- Factor 2: Lead score (0-20 points)
  IF l.lead_score IS NOT NULL THEN
    score := score + (l.lead_score / 5);
  END IF;

  -- Factor 3: Deal value (0-20 points)
  IF EXISTS (SELECT 1 FROM deals WHERE lead_id = l.id AND stage NOT IN ('closed_won', 'closed_lost')) THEN
    score := score + LEAST(20, (SELECT COALESCE(MAX(value), 0) / 5000 FROM deals WHERE lead_id = l.id)::INT);
  END IF;

  -- Factor 4: Inactivity (0-15 points)
  hours_inactive := EXTRACT(EPOCH FROM (now() - COALESCE(l.last_activity_at, l.enquiry_date, l.created_at))) / 3600;
  IF hours_inactive > 72 THEN score := score + 15;
  ELSIF hours_inactive > 48 THEN score := score + 10;
  ELSIF hours_inactive > 24 THEN score := score + 5;
  END IF;

  -- Factor 5: Hot lead stages (0-10 bonus)
  IF l.status = 'interested' THEN score := score + 10;
  ELSIF l.status = 'payment_done' THEN score := score + 8;
  END IF;

  -- Factor 6: Trader Profile Capital & Fit Bonus (0-15 bonus)
  IF l.capital_numeric IS NOT NULL THEN
    IF l.capital_numeric >= 500000 THEN
      score := score + 10;
    ELSIF l.capital_numeric >= 100000 THEN
      score := score + 5;
    END IF;
  END IF;

  IF l.trading_experience IS NOT NULL AND l.trading_experience IN ('option_trader', 'algo_user') THEN
    score := score + 5;
  END IF;

  -- Cap at 100
  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
