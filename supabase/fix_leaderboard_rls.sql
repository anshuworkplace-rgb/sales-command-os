-- ══════════════════════════════════════════════════════
-- FIX LEADERBOARD VISIBILITY (RLS UPDATE)
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- Drop the restrictive select policy
DROP POLICY IF EXISTS "leads_select" ON leads;

-- Create a new policy allowing all authenticated users to view all leads.
-- This is necessary so the Leaderboard can calculate revenue and scores for the whole team.
-- Note: The frontend app (Pipeline, Today) already filters leads so reps only see their own work.
CREATE POLICY "leads_select" ON leads FOR SELECT USING (true);
