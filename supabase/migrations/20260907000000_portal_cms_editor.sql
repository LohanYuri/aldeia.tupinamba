-- Portal CMS: conteúdo, visual e biblioteca de mídias editáveis pelo Comandante
alter table public.site_content
  add constraint site_content_section_key_unique unique (section, content_key);

create table if not exists public.portal_media (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text,
  storage_path text not null unique,
  public_url text not null,
  media_type text not null default 'image',
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.portal_media enable row level security;

drop policy if exists portal_media_public_read on public.portal_media;
create policy portal_media_public_read on public.portal_media for select to anon, authenticated using (active = true);

drop policy if exists portal_media_financeiro_all on public.portal_media;
create policy portal_media_financeiro_all on public.portal_media for all to public using (has_financeiro()) with check (has_financeiro());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portal-media','portal-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','video/mp4'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists portal_media_storage_public_read on storage.objects;
create policy portal_media_storage_public_read on storage.objects for select to public using (bucket_id='portal-media');

drop policy if exists portal_media_storage_financeiro_insert on storage.objects;
create policy portal_media_storage_financeiro_insert on storage.objects for insert to authenticated with check (bucket_id='portal-media' and has_financeiro());

drop policy if exists portal_media_storage_financeiro_update on storage.objects;
create policy portal_media_storage_financeiro_update on storage.objects for update to authenticated using (bucket_id='portal-media' and has_financeiro()) with check (bucket_id='portal-media' and has_financeiro());

drop policy if exists portal_media_storage_financeiro_delete on storage.objects;
create policy portal_media_storage_financeiro_delete on storage.objects for delete to authenticated using (bucket_id='portal-media' and has_financeiro());

insert into public.public_settings(key,value) values
('site_name','Aldeia Cacique Tupinambá'),('site_subtitle','Terreiro de Umbanda'),('site_city','Campo Grande/MS'),('site_address','Rua Marques de Herval, 3500'),
('private_hours','Das 8h às 21h, somente com horário marcado.'),('friday_hours','A partir das 19h30.'),('whatsapp','556799342405'),('whatsapp_display','+55 (67) 99342-405'),
('instagram','https://instagram.com/aldeiatupinamba'),('facebook','https://facebook.com/'),('pix_key','04118932113'),('hero_image',''),('logo_image',''),('background_image',''),('background_color','#f7f3ea'),
('site_footer','Terreiro de Umbanda • Axé, paz e luz')
on conflict (key) do nothing;

insert into public.site_content(section,content_key,title,body,active,sort_order) values
('inicio','eyebrow','Texto superior','ALDEIA CACIQUE TUPINAMBÁ',true,10),
('inicio','title','Título da capa','Aldeia Tupinambá',true,20),
('inicio','lead','Texto da capa','Terreiro de Umbanda • Campo Grande/MS',true,30),
('aldeia','title','Título','Nossa Aldeia',true,10),('aldeia','body','Apresentação','Um espaço de fé, caridade, respeito, acolhimento e compromisso com a espiritualidade.',true,20),
('doutrina','title','Título','Doutrina e fundamentos',true,10),('doutrina','body','Texto','Fé, caridade e respeito orientam nosso caminho.',true,20),
('consultas','title','Título','Consultas e trabalhos particulares',true,10),('consultas','body','Texto','Os trabalhos particulares acontecem de segunda a quinta-feira, das 8h às 21h, somente com horário marcado.',true,20),
('avisos','title','Título','Avisos e novidades',true,10),('avisos','body','Texto padrão','Horários, orientações, eventos e comunicados serão publicados aqui.',true,20),
('contato','title','Título','Entre em contato',true,10),('contato','body','Texto','Fale diretamente com a administração da casa.',true,20),
('regras','title','Título','Regras da casa para consulentes e visitantes',true,10)
on conflict (section,content_key) do nothing;