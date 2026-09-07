-- Donation automatic identification foundation
alter table public.donations add column if not exists identification_status text not null default 'aguardando' check(identification_status in ('aguardando','provavel','confirmada','manual','divergente'));
alter table public.donations add column if not exists identification_score integer not null default 0;
alter table public.donations add column if not exists identification_notes text;
create index if not exists donations_identification_idx on public.donations(identification_status,whatsapp_phone,status);

create or replace function public.match_pending_donation(p_phone text,p_amount numeric,p_campaign_id uuid default null,p_txid text default null)
returns table(donation_id uuid,score integer,reason text) language plpgsql security definer set search_path=public as $$
declare d record; s integer; r text;
begin
 for d in select * from public.donations where status='pendente'
 and (p_phone is null or whatsapp_phone is null or regexp_replace(coalesce(whatsapp_phone,''),'\D','','g')=regexp_replace(p_phone,'\D','','g'))
 and (p_amount is null or amount=p_amount)
 and (p_campaign_id is null or campaign_id=p_campaign_id)
 order by created_at desc limit 10 loop
  s:=0;r:='';
  if p_amount is not null and d.amount=p_amount then s:=s+50;r:=r||'valor; '; end if;
  if p_phone is not null and regexp_replace(coalesce(d.whatsapp_phone,''),'\D','','g')=regexp_replace(p_phone,'\D','','g') then s:=s+30;r:=r||'WhatsApp; '; end if;
  if p_campaign_id is not null and d.campaign_id=p_campaign_id then s:=s+20;r:=r||'campanha; '; end if;
  if p_txid is not null and d.pix_txid=p_txid then s:=s+100;r:=r||'TXID; '; end if;
  return query select d.id,s,r;
 end loop;
end $$;