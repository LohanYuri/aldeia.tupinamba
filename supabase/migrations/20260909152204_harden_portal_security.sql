-- Portal security hardening applied to production Supabase.
-- Keep this migration in source control so the production security posture
-- can be reproduced on a fresh environment.

create policy "deny_public_access_reset_requests"
on public.access_reset_requests for all to anon, authenticated
using (false) with check (false);

create policy "deny_public_portal_acceptance_requirements"
on public.portal_acceptance_requirements for all to anon, authenticated
using (false) with check (false);

create policy "deny_public_portal_access_events"
on public.portal_access_events for all to anon, authenticated
using (false) with check (false);

create policy "deny_public_portal_presence"
on public.portal_presence for all to anon, authenticated
using (false) with check (false);

revoke execute on function public.has_financeiro() from public, anon;
revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.match_pending_donation(text,numeric,uuid,text) from public, anon, authenticated;
revoke execute on function public.notify_three_warnings() from public, anon, authenticated;

grant execute on function public.has_financeiro() to authenticated;
grant execute on function public.has_role(public.app_role) to authenticated;

revoke execute on function public.commander_dashboard_summary(date) from public;
revoke execute on function public.generate_configured_scale(uuid,uuid) from public;
revoke execute on function public.generate_monthly_finance_report(date,uuid) from public;
revoke execute on function public.recalculate_child_accountability(uuid) from public;

grant execute on function public.commander_dashboard_summary(date) to authenticated;
grant execute on function public.generate_configured_scale(uuid,uuid) to authenticated;
grant execute on function public.generate_monthly_finance_report(date,uuid) to authenticated;
grant execute on function public.recalculate_child_accountability(uuid) to authenticated;
