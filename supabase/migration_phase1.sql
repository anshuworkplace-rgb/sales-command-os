-- ══════════════════════════════════════════════════════
-- GOD MODE UPGRADE: PHASE 1 MIGRATION SCRIPT
-- Run this in the Supabase SQL Editor to apply changes
-- ══════════════════════════════════════════════════════

-- 1. Add 'admin' role if it doesn't exist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Add manager_id to profiles for hierarchy
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Create monthly_targets table
CREATE TABLE IF NOT EXISTS monthly_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_month    DATE NOT NULL,
  revenue_target  NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_month)
);

ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "targets_select" ON monthly_targets;
CREATE POLICY "targets_select" ON monthly_targets FOR SELECT USING (true);

DROP POLICY IF EXISTS "targets_all" ON monthly_targets;
CREATE POLICY "targets_all" ON monthly_targets USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('manager', 'admin'))
);

-- Add to real-time (wrap in DO block to avoid errors if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'monthly_targets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE monthly_targets;
  END IF;
END $$;

-- 4. Overwrite RLS Policies for Hierarchy Support
-- Drops old policies and replaces them with new hierarchy-aware policies.

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('manager', 'admin'))
);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- LEADS
DROP POLICY IF EXISTS "leads_select" ON leads;
DROP POLICY IF EXISTS "leads_insert" ON leads;
DROP POLICY IF EXISTS "leads_update" ON leads;
DROP POLICY IF EXISTS "leads_delete" ON leads;

CREATE POLICY "leads_select" ON leads FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = leads.assigned_to))
);
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin', 'manager'))
);
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = leads.assigned_to))
);
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = leads.assigned_to))
);

-- DEALS
DROP POLICY IF EXISTS "deals_select" ON deals;
DROP POLICY IF EXISTS "deals_insert" ON deals;
DROP POLICY IF EXISTS "deals_update" ON deals;
DROP POLICY IF EXISTS "deals_delete" ON deals;

CREATE POLICY "deals_select" ON deals FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = deals.assigned_to))
);
CREATE POLICY "deals_insert" ON deals FOR INSERT WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin', 'manager'))
);
CREATE POLICY "deals_update" ON deals FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = deals.assigned_to))
);
CREATE POLICY "deals_delete" ON deals FOR DELETE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = deals.assigned_to))
);

-- TASKS
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = tasks.assigned_to))
);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin', 'manager'))
);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = tasks.assigned_to))
);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = tasks.assigned_to))
);

-- ACTIVITIES
DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;

CREATE POLICY "activities_select" ON activities FOR SELECT USING (
  performed_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin')
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'manager' AND id = (SELECT manager_id FROM profiles p WHERE p.id = activities.performed_by))
);
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (
  performed_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin', 'manager'))
);
