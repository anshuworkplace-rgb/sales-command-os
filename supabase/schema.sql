-- ══════════════════════════════════════════════════════
-- SALES COMMAND OS — DATABASE SCHEMA v1.0
-- PostgreSQL (Supabase)
-- Run this in Supabase SQL Editor → New Query
-- ══════════════════════════════════════════════════════

-- ═══ ENUMS ═══

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'interested',
  'payment_done', 'upgrade',
  'closed_won', 'closed_lost'
);

CREATE TYPE deal_stage AS ENUM (
  'qualification', 'proposal', 'negotiation',
  'closed_won', 'closed_lost'
);

CREATE TYPE task_type AS ENUM (
  'follow_up', 'call', 'whatsapp',
  'payment', 're_engage', 'custom'
);

CREATE TYPE task_priority AS ENUM (
  'critical', 'high', 'medium', 'low'
);

CREATE TYPE task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'skipped'
);

CREATE TYPE activity_type AS ENUM (
  'lead_created', 'status_change',
  'task_created', 'task_completed',
  'note_added', 'payment',
  'deal_created', 'deal_stage_change',
  'follow_up_scheduled'
);

CREATE TYPE user_role AS ENUM ('sales', 'manager', 'admin');


-- ═══ TABLE: profiles ═══
-- Mirrors auth.users with app-specific fields.
-- Auto-populated by trigger on signup.

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        user_role NOT NULL DEFAULT 'sales',
  manager_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar      TEXT DEFAULT '👤',
  color       TEXT DEFAULT '#00e5ff',
  monthly_target NUMERIC DEFAULT 150000,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══ TABLE: monthly_targets ═══
CREATE TABLE monthly_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_month    DATE NOT NULL,
  revenue_target  NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_month)
);

-- ═══ TABLE: leads ═══

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  source          TEXT DEFAULT 'manual',
  status          lead_status NOT NULL DEFAULT 'new',
  lead_score      INT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  assigned_to     UUID NOT NULL REFERENCES profiles(id),
  notes           TEXT,
  revenue         NUMERIC DEFAULT 0,
  first_contact_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  next_follow_up  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_assigned ON leads(assigned_to, status);
CREATE INDEX idx_leads_follow_up ON leads(next_follow_up) WHERE next_follow_up IS NOT NULL;
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_activity ON leads(last_activity_at);


-- ═══ TABLE: deals ═══

CREATE TABLE deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  value           NUMERIC NOT NULL DEFAULT 0,
  stage           deal_stage NOT NULL DEFAULT 'qualification',
  probability     INT DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  assigned_to     UUID NOT NULL REFERENCES profiles(id),
  expected_close  DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_assigned ON deals(assigned_to, stage);
CREATE INDEX idx_deals_lead ON deals(lead_id);


-- ═══ TABLE: tasks ═══

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  deal_id           UUID REFERENCES deals(id) ON DELETE SET NULL,
  assigned_to       UUID NOT NULL REFERENCES profiles(id),
  title             TEXT NOT NULL,
  description       TEXT,
  type              task_type NOT NULL DEFAULT 'follow_up',
  priority          task_priority NOT NULL DEFAULT 'medium',
  status            task_status NOT NULL DEFAULT 'pending',
  priority_score    INT DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  is_auto_generated BOOLEAN DEFAULT false,
  auto_rule         TEXT,
  due_at            TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status, due_at);
CREATE INDEX idx_tasks_priority ON tasks(priority_score DESC) WHERE status = 'pending';
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE status = 'pending';
CREATE INDEX idx_tasks_lead ON tasks(lead_id);


-- ═══ TABLE: activities ═══

CREATE TABLE activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_id       UUID REFERENCES deals(id) ON DELETE SET NULL,
  task_id       UUID REFERENCES tasks(id) ON DELETE SET NULL,
  performed_by  UUID NOT NULL REFERENCES profiles(id),
  type          activity_type NOT NULL,
  description   TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_lead ON activities(lead_id, created_at DESC);
CREATE INDEX idx_activities_user ON activities(performed_by, created_at DESC);
CREATE INDEX idx_activities_type ON activities(type, created_at DESC);


-- ══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ═══ Profiles: users can read all (for team display), update own ═══
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ═══ Monthly Targets: ═══
CREATE POLICY "targets_select" ON monthly_targets FOR SELECT USING (true);
CREATE POLICY "targets_all" ON monthly_targets USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);

-- ═══ Leads: admin sees all, manager sees own + direct reports, sales sees own ═══
CREATE POLICY "leads_select" ON leads FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = leads.assigned_to))
);
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = leads.assigned_to))
);
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = leads.assigned_to))
);

-- ═══ Deals: same pattern ═══
CREATE POLICY "deals_select" ON deals FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = deals.assigned_to))
);
CREATE POLICY "deals_insert" ON deals FOR INSERT WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "deals_update" ON deals FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = deals.assigned_to))
);
CREATE POLICY "deals_delete" ON deals FOR DELETE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = deals.assigned_to))
);

-- ═══ Tasks: same pattern ═══
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = tasks.assigned_to))
);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = tasks.assigned_to))
);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = tasks.assigned_to))
);

-- ═══ Activities: same pattern ═══
CREATE POLICY "activities_select" ON activities FOR SELECT USING (
  performed_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = activities.performed_by))
);
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (
  performed_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);


-- ══════════════════════════════════════════════════════
-- TRIGGER FUNCTIONS (Workflow Engine Foundation)
-- ══════════════════════════════════════════════════════

-- ═══ 1. Auto-create profile on signup ═══
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ═══ 2. Auto-create follow-up task when lead is created ═══
CREATE OR REPLACE FUNCTION handle_lead_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create follow-up task due in 24 hours
  INSERT INTO tasks (lead_id, assigned_to, title, description, type, priority, due_at, is_auto_generated, auto_rule)
  VALUES (
    NEW.id,
    NEW.assigned_to,
    'Follow up with ' || NEW.name,
    'Auto-generated: Initial follow-up for new lead from ' || COALESCE(NEW.source, 'unknown'),
    'follow_up',
    'high',
    now() + INTERVAL '24 hours',
    true,
    'lead_created_auto_followup'
  );

  -- Set next_follow_up on the lead
  UPDATE leads SET next_follow_up = now() + INTERVAL '24 hours' WHERE id = NEW.id;

  -- Log activity
  INSERT INTO activities (lead_id, performed_by, type, description, metadata)
  VALUES (
    NEW.id,
    NEW.assigned_to,
    'lead_created',
    'Lead created from ' || COALESCE(NEW.source, 'manual'),
    jsonb_build_object('source', NEW.source, 'phone', NEW.phone)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lead_created
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_lead_created();


-- ═══ 3. Handle lead status changes ═══
CREATE OR REPLACE FUNCTION handle_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  next_task_title TEXT;
  next_task_type task_type;
  next_due INTERVAL;
BEGIN
  -- Only fire on actual status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Update timestamp
  NEW.updated_at = now();
  NEW.last_activity_at = now();

  -- Log the status change
  INSERT INTO activities (lead_id, performed_by, type, description, metadata)
  VALUES (
    NEW.id,
    NEW.assigned_to,
    'status_change',
    'Status changed: ' || OLD.status || ' → ' || NEW.status,
    jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text)
  );

  -- Determine next task based on new status
  CASE NEW.status
    WHEN 'contacted' THEN
      next_task_title := 'Check interest level with ' || NEW.name;
      next_task_type := 'whatsapp';
      next_due := INTERVAL '48 hours';
    WHEN 'interested' THEN
      next_task_title := 'Share pricing & close ' || NEW.name;
      next_task_type := 'follow_up';
      next_due := INTERVAL '24 hours';
    WHEN 'payment_done' THEN
      next_task_title := 'Discuss upgrade with ' || NEW.name;
      next_task_type := 'follow_up';
      next_due := INTERVAL '72 hours';
    ELSE
      next_task_title := NULL;
  END CASE;

  -- Create next task if applicable
  IF next_task_title IS NOT NULL THEN
    INSERT INTO tasks (lead_id, assigned_to, title, type, priority, due_at, is_auto_generated, auto_rule)
    VALUES (
      NEW.id, NEW.assigned_to, next_task_title, next_task_type,
      CASE WHEN NEW.status = 'interested' THEN 'critical'::task_priority ELSE 'high'::task_priority END,
      now() + next_due, true, 'status_change_auto_task'
    );
    NEW.next_follow_up = now() + next_due;
  END IF;

  -- Auto-create deal when lead becomes interested
  IF NEW.status = 'interested' AND OLD.status != 'interested' THEN
    INSERT INTO deals (lead_id, title, assigned_to, stage, probability, expected_close)
    VALUES (
      NEW.id,
      'Deal: ' || NEW.name,
      NEW.assigned_to,
      'qualification',
      30,
      CURRENT_DATE + 14
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lead_status_changed
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_lead_status_change();


-- ═══ 4. Handle deal stage changes ═══
CREATE OR REPLACE FUNCTION handle_deal_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  prob INT;
BEGIN
  IF OLD.stage = NEW.stage THEN RETURN NEW; END IF;

  NEW.updated_at = now();

  -- Auto-set probability by stage
  CASE NEW.stage
    WHEN 'qualification' THEN prob := 20;
    WHEN 'proposal'      THEN prob := 50;
    WHEN 'negotiation'   THEN prob := 75;
    WHEN 'closed_won'    THEN prob := 100;
    WHEN 'closed_lost'   THEN prob := 0;
  END CASE;
  NEW.probability = prob;

  -- Log activity
  INSERT INTO activities (lead_id, deal_id, performed_by, type, description, metadata)
  VALUES (
    NEW.lead_id, NEW.id, NEW.assigned_to, 'deal_stage_change',
    'Deal stage: ' || OLD.stage || ' → ' || NEW.stage,
    jsonb_build_object('from', OLD.stage::text, 'to', NEW.stage::text, 'value', NEW.value)
  );

  -- If closed_won, update lead
  IF NEW.stage = 'closed_won' THEN
    UPDATE leads SET status = 'closed_won', revenue = revenue + NEW.value WHERE id = NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_deal_stage_changed
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION handle_deal_stage_change();


-- ═══ 5. Handle task completion ═══
CREATE OR REPLACE FUNCTION handle_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NEW.status = 'completed' THEN
    NEW.completed_at = now();

    -- Update lead last activity
    UPDATE leads SET last_activity_at = now() WHERE id = NEW.lead_id;

    -- Log activity
    INSERT INTO activities (lead_id, deal_id, task_id, performed_by, type, description, metadata)
    VALUES (
      NEW.lead_id, NEW.deal_id, NEW.id, NEW.assigned_to,
      'task_completed',
      'Completed: ' || NEW.title,
      jsonb_build_object('task_type', NEW.type::text, 'was_auto', NEW.is_auto_generated)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completed
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_completed();


-- ═══ 6. Auto-update updated_at ═══
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ══════════════════════════════════════════════════════
-- PRIORITY ENGINE (Database Functions)
-- ══════════════════════════════════════════════════════

-- ═══ Calculate priority score for a task ═══
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
  hours_inactive := EXTRACT(EPOCH FROM (now() - COALESCE(l.last_activity_at, l.created_at))) / 3600;
  IF hours_inactive > 72 THEN score := score + 15;
  ELSIF hours_inactive > 48 THEN score := score + 10;
  ELSIF hours_inactive > 24 THEN score := score + 5;
  END IF;

  -- Factor 5: Hot lead stages (0-10 bonus)
  IF l.status = 'interested' THEN score := score + 10;
  ELSIF l.status = 'payment_done' THEN score := score + 8;
  END IF;

  -- Cap at 100
  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ Batch-update all pending task priorities ═══
CREATE OR REPLACE FUNCTION refresh_task_priorities()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET priority_score = calculate_task_priority(id)
  WHERE status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ Get prioritized task queue for a user ═══
CREATE OR REPLACE FUNCTION get_priority_queue(p_user_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  task_type task_type,
  task_priority task_priority,
  priority_score INT,
  due_at TIMESTAMPTZ,
  is_overdue BOOLEAN,
  lead_id UUID,
  lead_name TEXT,
  lead_phone TEXT,
  lead_status lead_status,
  lead_score INT,
  deal_value NUMERIC,
  next_best_action TEXT
) AS $$
BEGIN
  -- Refresh priorities first
  PERFORM refresh_task_priorities();

  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.type,
    t.priority,
    t.priority_score,
    t.due_at,
    (t.due_at < now()) AS is_overdue,
    l.id,
    l.name,
    l.phone,
    l.status,
    l.lead_score,
    COALESCE(d.value, 0),
    -- Next Best Action logic
    CASE
      WHEN t.due_at < now() THEN '⚠️ OVERDUE — Take action immediately'
      WHEN l.status = 'new' THEN '📱 Send intro message on WhatsApp'
      WHEN l.status = 'contacted' THEN '🎯 Check interest & share value prop'
      WHEN l.status = 'interested' THEN '💰 Share pricing & close the deal'
      WHEN l.status = 'payment_done' THEN '🚀 Discuss premium upgrade options'
      ELSE '📋 Follow up and maintain relationship'
    END
  FROM tasks t
  JOIN leads l ON t.lead_id = l.id
  LEFT JOIN deals d ON t.deal_id = d.id
  WHERE t.assigned_to = p_user_id
    AND t.status = 'pending'
  ORDER BY t.priority_score DESC, t.due_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ Inactivity checker (call via cron or Edge Function) ═══
CREATE OR REPLACE FUNCTION check_inactive_leads()
RETURNS INT AS $$
DECLARE
  inactive_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, name, assigned_to
    FROM leads
    WHERE status NOT IN ('closed_won', 'closed_lost')
      AND last_activity_at < now() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM tasks
        WHERE lead_id = leads.id
          AND status = 'pending'
          AND auto_rule = 'inactivity_re_engage'
      )
  LOOP
    INSERT INTO tasks (lead_id, assigned_to, title, type, priority, due_at, is_auto_generated, auto_rule)
    VALUES (
      r.id, r.assigned_to,
      '🔴 Re-engage ' || r.name || ' (48h+ inactive)',
      're_engage', 'critical',
      now() + INTERVAL '2 hours',
      true, 'inactivity_re_engage'
    );
    inactive_count := inactive_count + 1;
  END LOOP;

  RETURN inactive_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ Lead score calculator ═══
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

  -- Stage progression (0-30)
  CASE l.status
    WHEN 'new'          THEN score := score + 5;
    WHEN 'contacted'    THEN score := score + 10;
    WHEN 'interested'   THEN score := score + 25;
    WHEN 'payment_done' THEN score := score + 30;
    WHEN 'upgrade'      THEN score := score + 30;
    ELSE score := score + 0;
  END CASE;

  -- Activity volume (0-20)
  score := score + LEAST(20, activity_count * 3);

  -- Revenue (0-20)
  IF l.revenue > 0 THEN
    score := score + LEAST(20, (l.revenue / 2500)::INT);
  END IF;

  -- Recency penalty (0 to -15)
  hours_since_last := EXTRACT(EPOCH FROM (now() - COALESCE(l.last_activity_at, l.created_at))) / 3600;
  IF hours_since_last > 72 THEN score := score - 15;
  ELSIF hours_since_last > 48 THEN score := score - 10;
  ELSIF hours_since_last > 24 THEN score := score - 5;
  END IF;

  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ Manager dashboard aggregation ═══
CREATE OR REPLACE FUNCTION get_team_stats()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_leads BIGINT,
  total_revenue NUMERIC,
  conversion_rate NUMERIC,
  overdue_tasks BIGINT,
  pending_tasks BIGINT,
  completed_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    COUNT(DISTINCT l.id),
    COALESCE(SUM(l.revenue), 0),
    CASE WHEN COUNT(l.id) > 0 THEN
      ROUND(COUNT(CASE WHEN l.status IN ('payment_done', 'upgrade', 'closed_won') THEN 1 END)::NUMERIC / COUNT(l.id) * 100, 1)
    ELSE 0 END,
    (SELECT COUNT(*) FROM tasks WHERE assigned_to = p.id AND status = 'pending' AND due_at < now()),
    (SELECT COUNT(*) FROM tasks WHERE assigned_to = p.id AND status = 'pending'),
    (SELECT COUNT(*) FROM tasks WHERE assigned_to = p.id AND status = 'completed' AND completed_at::date = CURRENT_DATE)
  FROM profiles p
  LEFT JOIN leads l ON l.assigned_to = p.id
  WHERE p.role = 'sales'
  GROUP BY p.id, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ══════════════════════════════════════════════════════
-- ENABLE REALTIME
-- ══════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;


-- ══════════════════════════════════════════════════════
-- AUTO LEAD SCORE RECALCULATION
-- Recalculates lead_score whenever a status changes or activity is logged
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET lead_score = calculate_lead_score(NEW.id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate score on lead update
CREATE TRIGGER on_lead_score_refresh
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.revenue IS DISTINCT FROM NEW.revenue)
  EXECUTE FUNCTION auto_update_lead_score();

-- Recalculate score when new activities are logged for a lead
CREATE OR REPLACE FUNCTION auto_update_lead_score_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE leads
    SET lead_score = calculate_lead_score(NEW.lead_id)
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_activity_lead_score_refresh
  AFTER INSERT ON activities
  FOR EACH ROW EXECUTE FUNCTION auto_update_lead_score_on_activity();


-- ══════════════════════════════════════════════════════
-- CRON: Inactivity Checker (run every 2 hours)
-- Enable pg_cron extension in Supabase Dashboard first:
--   ALTER EXTENSION pg_cron SCHEMA extensions;
-- Then run:
--   SELECT cron.schedule(
--     'check-inactive-leads',
--     '0 */2 * * *',
--     $$SELECT check_inactive_leads()$$
--   );
-- ══════════════════════════════════════════════════════

