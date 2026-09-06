-- Migration 014: controle exclusivo do Comandante Financeiro
-- Aplique após 013_alter_financeiro_role.sql.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  content_key text not null,
  title text,
  body text not null default '',
  active boolean not null default true,
  sort_order smallint not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(section, content_key)
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_financeiro()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  select exists (select 1 from public.profiles where id=auth.uid() and active=true and role='financeiro'::app_role);
$$;

DROP POLICY IF EXISTS adm_full_acceptances ON public.acceptances;
DROP POLICY IF EXISTS adm_full_child_dues ON public.child_dues;
DROP POLICY IF EXISTS adm_full_children ON public.children;
DROP POLICY IF EXISTS adm_full_cleaning_evaluations ON public.cleaning_evaluations;
DROP POLICY IF EXISTS adm_full_dues ON public.dues;
DROP POLICY IF EXISTS adm_full_event_tasks ON public.event_tasks;
DROP POLICY IF EXISTS adm_full_events ON public.events;
DROP POLICY IF EXISTS adm_full_friday_evaluations ON public.friday_evaluations;
DROP POLICY IF EXISTS adm_full_notices ON public.notices;
DROP POLICY IF EXISTS adm_full_profiles ON public.profiles;
DROP POLICY IF EXISTS adm_full_report_items ON public.report_items;
DROP POLICY IF EXISTS adm_full_reports ON public.reports;
DROP POLICY IF EXISTS adm_full_rule_versions ON public.rule_versions;
DROP POLICY IF EXISTS adm_full_scale_assignments ON public.scale_assignments;
DROP POLICY IF EXISTS adm_full_scales ON public.scales;
DROP POLICY IF EXISTS adm_full_teams ON public.teams;
DROP POLICY IF EXISTS "ADM can delete scale notices" ON public.scale_notices;
DROP POLICY IF EXISTS "ADM can insert scale notices" ON public.scale_notices;
DROP POLICY IF EXISTS "ADM can read scale notices" ON public.scale_notices;
DROP POLICY IF EXISTS "ADM can update scale notices" ON public.scale_notices;

CREATE POLICY financeiro_full_acceptances ON public.acceptances FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_child_dues ON public.child_dues FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_children ON public.children FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_cleaning_evaluations ON public.cleaning_evaluations FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_dues ON public.dues FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_event_tasks ON public.event_tasks FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_events ON public.events FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_friday_evaluations ON public.friday_evaluations FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_notices ON public.notices FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_profiles ON public.profiles FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_public_settings ON public.public_settings FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_report_items ON public.report_items FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_reports ON public.reports FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_rule_versions ON public.rule_versions FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_scale_assignments ON public.scale_assignments FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_scale_notices ON public.scale_notices FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_scales ON public.scales FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_teams ON public.teams FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_audit_logs ON public.audit_logs FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());
CREATE POLICY financeiro_full_site_content ON public.site_content FOR ALL TO public USING (has_financeiro()) WITH CHECK (has_financeiro());

CREATE POLICY dirigente_read_acceptances ON public.acceptances FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_child_dues ON public.child_dues FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_children ON public.children FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_cleaning ON public.cleaning_evaluations FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_dues ON public.dues FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_events ON public.events FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_friday ON public.friday_evaluations FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_notices ON public.notices FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_profiles ON public.profiles FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_reports ON public.reports FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_rules ON public.rule_versions FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_assignments ON public.scale_assignments FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_scales ON public.scales FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_teams ON public.teams FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_scale_notices ON public.scale_notices FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_settings ON public.public_settings FOR SELECT TO public USING (has_role('dirigente'::app_role));
CREATE POLICY dirigente_read_site_content ON public.site_content FOR SELECT TO public USING (has_role('dirigente'::app_role));

CREATE POLICY adm_read_children ON public.children FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_read_profiles ON public.profiles FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_read_scales ON public.scales FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_read_assignments ON public.scale_assignments FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_read_teams ON public.teams FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_read_scale_notices ON public.scale_notices FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_read_notices ON public.notices FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_insert_cleaning ON public.cleaning_evaluations FOR INSERT TO public WITH CHECK (has_role('adm'::app_role) AND evaluated_by=auth.uid());
CREATE POLICY adm_update_cleaning ON public.cleaning_evaluations FOR UPDATE TO public USING (has_role('adm'::app_role) AND evaluated_by=auth.uid()) WITH CHECK (has_role('adm'::app_role) AND evaluated_by=auth.uid());
CREATE POLICY adm_read_cleaning ON public.cleaning_evaluations FOR SELECT TO public USING (has_role('adm'::app_role));
CREATE POLICY adm_insert_friday ON public.friday_evaluations FOR INSERT TO public WITH CHECK (has_role('adm'::app_role) AND evaluated_by=auth.uid());
CREATE POLICY adm_update_friday ON public.friday_evaluations FOR UPDATE TO public USING (has_role('adm'::app_role) AND evaluated_by=auth.uid()) WITH CHECK (has_role('adm'::app_role) AND evaluated_by=auth.uid());
CREATE POLICY adm_read_friday ON public.friday_evaluations FOR SELECT TO public USING (has_role('adm'::app_role));

CREATE POLICY public_read_site_content ON public.site_content FOR SELECT TO anon,authenticated USING (active=true);

REVOKE EXECUTE ON FUNCTION public.has_financeiro() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_financeiro() TO authenticated;
