(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const data = window.ALDEIA_DATA || {};
  let event = data.events?.[0];

  const toast = (message) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  };
  window.toast = toast;

  const modal = $("#modal");
  const content = $("#content");

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };
  window.fechar = closeModal;

  const openModal = (html) => {
    if (!modal || !content) return;
    content.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $(".x", modal)?.focus();
  };

  const normalizeWhatsApp = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("55") ? digits : "55" + digits;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  };

  function downloadICS(text, filename) {
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Arquivo de agenda criado.");
  }

  window.convite = () => {
    if (!event) { toast("Nenhum evento cadastrado."); return; }
    const shareText = [
      "🎉 " + event.title,
      "📅 " + event.date + (event.time ? " • " + event.time : ""),
      "📍 " + event.address + " • " + event.city,
      "",
      "Aldeia Tupinambá"
    ].join("\n");
    const parts=String(event.date||"").split("/");
    const icsDate=parts.length===3 ? parts[2]+parts[1]+parts[0] : "";
    const time=String(event.time||"").replace(/\D/g,"");
    const hh=(time.slice(0,2)||"19").padStart(2,"0"), mm=(time.slice(2,4)||"00").padStart(2,"0");
    const ics = icsDate ? [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aldeia Tupinamba//Portal//PT-BR","CALSCALE:GREGORIAN","BEGIN:VEVENT",
      "UID:" + event.id + "@aldeia.tupinamba","DTSTAMP:" + new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"),
      "DTSTART:"+icsDate+"T"+hh+mm+"00","DTEND:"+icsDate+"T"+hh+mm+"00",
      "SUMMARY:" + event.title,"LOCATION:" + event.address + " - " + event.city,
      "DESCRIPTION:Aldeia Tupinamba","END:VEVENT","END:VCALENDAR"
    ].join("\r\n") : "";
    openModal(
      "<span class='eyebrow'>CONVITE INTERATIVO</span>" +
      "<h2>🎉 " + escapeHtml(event.title) + "</h2>" +
      "<p><strong>📅 " + escapeHtml(event.date) + (event.time ? " • " + escapeHtml(event.time) : "") + "</strong></p>" +
      "<p>📍 " + escapeHtml(event.address) + " • " + escapeHtml(event.city) + "</p>" +
      "<div class='invite-note'><b>Você é nosso convidado!</b><br>Venha participar com respeito, fé e alegria.</div>" +
      "<div class='modal-actions'>" +
      (ics ? "<button class='btn gold' id='icsBtn' type='button'>📅 Adicionar à agenda</button>" : "") +
      "<button class='btn outline' id='shareBtn' type='button'>📤 Compartilhar convite</button>" +
      "<button class='btn outline' id='eventWaBtn' type='button'>📲 Confirmar pelo WhatsApp</button>" +
      "</div>"
    );
    $( "#icsBtn" )?.addEventListener("click", () => downloadICS(ics, "convite-"+String(event.id||"evento")+".ics"));
    $( "#shareBtn" )?.addEventListener("click", async () => {
      if (navigator.share) await navigator.share({title:event.title,text:shareText}).catch(()=>{});
      else toast((await copyText(shareText)) ? "Convite copiado." : "Não foi possível copiar o convite.");
    });
    $( "#eventWaBtn" )?.addEventListener("click", () => {
      const target = normalizeWhatsApp(data.contact?.whatsapp);
      const msg = "Olá! Gostaria de confirmar minha participação no evento " + event.title + " da Aldeia Tupinambá em " + event.date + (event.time ? " às " + event.time : "") + ".";
      if (target) location.href = "https://wa.me/" + target + "?text=" + encodeURIComponent(msg);
    });
  };
  window.login = (kind) => {
    location.href = kind === "ADM" ? "login-adm.html" : "filhos.html";
  };

  window.copyDonation = async () => {
    const key = data.donation?.pixKey;
    if (!key) {
      toast("A chave PIX ainda não foi cadastrada pela administração.");
      return;
    }
    const ok = await copyText(key);
    toast(ok ? "Chave PIX copiada." : "Não foi possível copiar automaticamente.");
  };

  window.donationWhatsApp = (form) => {
    const value = form?.querySelector("[name='donationValue']")?.value.trim() || "";
    const purpose = form?.querySelector("[name='donationPurpose']")?.value.trim() || "";
    const note = form?.querySelector("[name='donationNote']")?.value.trim() || "";

    if (!purpose) {
      toast("Escolha a finalidade da doação.");
      form?.querySelector("[name='donationPurpose']")?.focus();
      return;
    }

    const body = [
      "Olá! Gostaria de realizar uma doação para a Aldeia Tupinambá.",
      value ? "Valor: R$ " + value : "Valor: R$ ____",
      "Finalidade: " + purpose,
      note ? "Observação: " + note : ""
    ].filter(Boolean).join("\n");

    const target = normalizeWhatsApp(data.contact?.whatsapp);
    if (!target) {
      copyText(body);
      toast("Mensagem de doação copiada.");
      return;
    }

    location.href = "https://wa.me/" + target + "?text=" + encodeURIComponent(body);
  };

  window.sendContact = (form) => {
    const name = form.name.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const message = form.message.value.trim();
    const body = "Nome: " + name + "\nWhatsApp: " + whatsapp + "\n\n" + message;
    const target = normalizeWhatsApp(data.contact?.whatsapp);

    if (target) {
      location.href = "https://wa.me/" + target + "?text=" + encodeURIComponent(body);
    } else {
      copyText(body);
      toast("Mensagem copiada.");
      form.reset();
    }
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  document.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();

    if (e.target.closest("[data-copy-message]")) {
      const msg = data.contact?.message || "Olá! Gostaria de obter informações.";
      copyText(msg);
      toast("Mensagem copiada.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  const menu = $("#menu");
  const nav = $("#nav");

  menu?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });

  nav?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });

  async function trackPortalVisit(){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client) return;
      const key='aldeia_visit_session';
      let session=sessionStorage.getItem(key);
      if(!session){session=crypto?.randomUUID?.()||String(Date.now())+Math.random();sessionStorage.setItem(key,session)}
      const last=sessionStorage.getItem('aldeia_visit_sent');
      if(last) return;
      sessionStorage.setItem('aldeia_visit_sent','1');
      const ua=navigator.userAgent||'';
      const device=/Mobi|Android|iPhone|iPad/i.test(ua)?'mobile':'desktop';
      await client.from('portal_visits').insert({session_id:session,page:location.pathname||'/',referrer:document.referrer||null,device_type:device});
    }catch(e){console.warn('Analytics do portal indisponível',e)}
  }

  async function loadDonationCampaigns(){
    try{
      const client=window.ALDEIA_SUPABASE,box=document.querySelector('#donationCampaigns');
      if(!client||!box)return;
      const {data,error}=await client.from('donation_campaigns').select('id,name,description,goal_amount').eq('active',true).eq('public_visible',true).order('created_at',{ascending:false});
      if(error)throw error;
      if(!data?.length){box.innerHTML='<div class="notice"><b>🤲 Doações</b><span>Em breve a casa disponibilizará novas caixinhas de apoio.</span></div>';return}
      const ids=data.map(x=>x.id);
      const {data:donations}=await client.from('donations').select('campaign_id,amount,status').in('campaign_id',ids).eq('status','recebida');
      const totals={};(donations||[]).forEach(x=>totals[x.campaign_id]=(totals[x.campaign_id]||0)+Number(x.amount||0));
      box.innerHTML=data.map(x=>{
        const goal=Number(x.goal_amount||0),got=totals[x.id]||0,pct=goal?Math.min(100,(got/goal)*100):0;
        return '<article class="card donation-campaign-card"><div class="campaign-icon">🤲</div><h3>'+escapeHtml(x.name)+'</h3><p>'+escapeHtml(x.description||'Ajude a Aldeia nesta finalidade.')+'</p><div class="campaign-values"><b>R$ '+got.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</b><span>meta R$ '+goal.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</span></div><div class="campaign-progress"><span style="width:'+pct.toFixed(1)+'%"></span></div><strong>'+pct.toFixed(0)+'% da meta</strong><button class="btn gold small" type="button" data-campaign-id="'+x.id+'">🤲 Quero ajudar</button></article>'
      }).join('');
      box.querySelectorAll('[data-campaign-id]').forEach(btn=>btn.addEventListener('click',()=>{
        const campaign=data.find(x=>x.id===btn.dataset.campaignId);
        const sel=document.querySelector('[name="donationPurpose"]');
        if(sel&&campaign){
          let opt=[...sel.options].find(o=>o.dataset.campaignId===campaign.id);
          if(!opt){opt=document.createElement('option');opt.value=campaign.id;opt.dataset.campaignId=campaign.id;opt.textContent=campaign.name;sel.appendChild(opt)}
          sel.value=campaign.id;
        }
        document.querySelector('#donationForm')?.scrollIntoView({behavior:'smooth',block:'center'});
      }));
    }catch(e){console.warn('Campanhas de doação indisponíveis',e)}
  }

  async function registerDonationRequest(form){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client)return;
      const value=Number(String(form.donationValue.value||'').replace('.','').replace(',','.'));
      const campaignId=form.donationPurpose.value;
      if(!value||value<=0||!campaignId)return;
      const phone=(form.whatsapp?.value||'').replace(/\D/g,'')||null;
      const note=form.donationNote?.value||null;
      const {data,error}=await client.from('donations').insert({
        donor_name:'Aguardando identificação',
        amount:value,campaign_id:campaignId,payment_method:'pix',
        status:'pendente',whatsapp_phone:phone,notes:note,auto_identified:false
      }).select('id').single();
      if(error)throw error;
      form.dataset.donationId=data.id;
    }catch(e){console.warn('Não foi possível registrar a intenção de doação',e)}
  }

  async function syncEvents(){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client)return;
      const {data:events}=await client.from('events').select('id,title,event_date,start_time,description').eq('active',true).order('event_date',{ascending:true}).limit(20);
      if(events?.length){
        event={id:events[0].id,title:events[0].title,date:new Date(events[0].event_date+'T12:00:00').toLocaleDateString('pt-BR'),time:events[0].start_time?String(events[0].start_time).slice(0,5):'',address:window.ALDEIA_DATA.site?.address||'',city:window.ALDEIA_DATA.site?.city||''};
        window.ALDEIA_EVENTS=events;
      }else event=null;
    }catch(e){console.warn('Eventos públicos indisponíveis',e)}
  }

  async function syncPortalMedia(){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client)return;
      const {data:media}=await client.from('portal_media').select('id,section,title,public_url,media_type').eq('active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
      const gallery=document.querySelector('#galeria .gallery-grid');
      if(gallery){
        const items=(media||[]).filter(m=>m.section==='galeria');
        gallery.innerHTML=items.length?items.map(m=>m.media_type==='video'
          ? '<article class="card"><video src="'+escapeHtml(m.public_url)+'" controls playsinline style="width:100%;border-radius:14px"></video><h3>'+escapeHtml(m.title||'Vídeo')+'</h3></article>'
          : '<article class="card"><img src="'+escapeHtml(m.public_url)+'" alt="'+escapeHtml(m.title||'Imagem da Aldeia')+'" loading="lazy" style="width:100%;border-radius:14px;aspect-ratio:4/3;object-fit:cover"><h3>'+escapeHtml(m.title||'Imagem da Aldeia')+'</h3></article>').join('')
          : '<div class="notice"><b>Galeria</b><span>As imagens e vídeos da Aldeia aparecerão aqui quando forem publicados pela administração.</span></div>';
      }
      const find=s=>media?.find(m=>m.section===s);
      window.ALDEIA_MEDIA=media||[];
      window.ALDEIA_MEDIA_BY_SECTION={};
      ['capa','fundo','logo'].forEach(s=>{const m=find(s);if(m)window.ALDEIA_MEDIA_BY_SECTION[s]=m.public_url});
    }catch(e){console.warn('Mídias públicas indisponíveis',e)}
  }

  function applyCmsContent(rows){
    const map={};
    (rows||[]).forEach(r=>{map[r.section+':'+r.content_key]=r});
    const val=(section,key,fallback='')=>map[section+':'+key]?.body??map[section+':'+key]?.title??fallback;
    const text=(sel,value)=>{const el=document.querySelector(sel);if(el&&value!==undefined&&value!=='')el.textContent=value};
    const html=(sel,value)=>{const el=document.querySelector(sel);if(el&&value!==undefined&&value!=='')el.innerHTML=escapeHtml(value).replace(/\\n/g,'<br>')};
    const sectionData=[
      ['#aldeia','aldeia'],['#atendimentos','atendimentos'],['#consultas','consultas'],
      ['#doutrina','doutrina'],['#galeria','galeria'],['#regras','regras'],['#contato','contato'],
      ['.access','access']
    ];
    sectionData.forEach(([sel,s])=>{
      text(sel+' .eyebrow',val(s,'eyebrow'));
      text(sel+' h2',val(s,'title'));
      text(sel+' .lead',val(s,'lead'));
    });
    text('#inicio .eyebrow',val('inicio','eyebrow'));
    text('#inicio h1',val('inicio','title'));
    text('#inicio .hero-copy>p',val('inicio','lead'));
    const q=val('inicio','quote'),cite=val('inicio','cite');
    if(q||cite){const b=document.querySelector('#inicio blockquote');if(b)b.innerHTML=(q?escapeHtml(q).replace(/\\n/g,'<br>'):'')+(cite?'<br><cite>— '+escapeHtml(cite)+'</cite>':'');}
    const pills=(window.__ALDEIA_SETTINGS?.aldeia_pills||'').split(/\\n|,/).map(x=>x.trim()).filter(Boolean);
    if(pills.length){document.querySelectorAll('#inicio .pills,#aldeia .pills').forEach(box=>{box.innerHTML=pills.map(x=>'<span>'+escapeHtml(x)+'</span>').join('')})}
    const highlights=[
      ['.home-highlights article:nth-child(1)','destaque1'],
      ['.home-highlights article:nth-child(2)','destaque2'],
      ['.home-highlights article:nth-child(3)','destaque3']
    ];
    highlights.forEach(([sel,s])=>{
      text(sel+' h3',val(s,'title'));
      html(sel+' b',val(s,'highlight'));
      html(sel+' p',val(s,'body'));
    });
    const cards=[
      ['#atendimentos .hours-card','atendimento1'],
      ['#atendimentos .friday-card','atendimento2'],
      ['#atendimentos .grid3 .card:nth-child(3)','atendimento3']
    ];
    cards.forEach(([sel,s])=>{text(sel+' h3',val(s,'title'));html(sel+' p',val(s,'body'))});
    const doctrine=[
      ['#doutrina .grid3 .card:nth-child(1)','doutrina_fe'],
      ['#doutrina .grid3 .card:nth-child(2)','doutrina_caridade'],
      ['#doutrina .grid3 .card:nth-child(3)','doutrina_respeito']
    ];
    doctrine.forEach(([sel,s])=>{text(sel+' h3',val(s,'title'));html(sel+' p',val(s,'body'))});
    text('#consultas .notice b',val('consultas_notice','title'));
    html('#consultas .notice span',val('consultas_notice','body'));
    text('#access .btn',window.__ALDEIA_SETTINGS?.access_adm_label||'Entrar como ADM');
    const accessButtons=document.querySelectorAll('.access .hero-actions .btn');
    if(accessButtons[1])accessButtons[1].textContent=window.__ALDEIA_SETTINGS?.access_filhos_label||'Área dos Filhos';
    const buttons=document.querySelectorAll('#inicio .hero-actions .btn');
    if(buttons[0]&&window.__ALDEIA_SETTINGS?.hero_button1)buttons[0].textContent=window.__ALDEIA_SETTINGS.hero_button1;
    if(buttons[1]&&window.__ALDEIA_SETTINGS?.hero_button2)buttons[1].textContent=window.__ALDEIA_SETTINGS.hero_button2;
    const motto=document.querySelector('.hero-motto');
    if(motto&&window.__ALDEIA_SETTINGS?.hero_motto)motto.innerHTML=escapeHtml(window.__ALDEIA_SETTINGS.hero_motto).replace(/\\n/g,'<br>');
    const rulesLead=val('regras','lead');
    if(rulesLead)text('#regras .lead',rulesLead);
    const donationSection=document.querySelector('#doacoes');
    if(donationSection){text('#doacoes h2',val('doacoes','title'));text('#doacoes .eyebrow',val('doacoes','eyebrow'));text('#doacoes>.lead',val('doacoes','lead'));}
  }

  function applyPortalOrganization(settings){
    const sectionMap={aldeia:'#aldeia',atendimentos:'#atendimentos',consultas:'#consultas',doutrina:'#doutrina',galeria:'#galeria',regras:'#regras',convites:'#convites',doacoes:'#doacoes',avisos:'#avisos',contato:'#contato',access:'.access'};
    Object.entries(sectionMap).forEach(([key,selector])=>{
      const visible=settings['section_'+key+'_visible']!=='false';
      const el=document.querySelector(selector);
      if(el)el.style.display=visible?'':'none';
      const navLink=document.querySelector('#nav a[href="#'+key+'"]');
      if(navLink)navLink.style.display=visible?'':'none';
    });
    const labels={inicio:'nav_inicio',aldeia:'nav_aldeia',doutrina:'nav_doutrina',regras:'nav_regras',atendimentos:'nav_atendimentos',convites:'nav_eventos',doacoes:'nav_doacoes',contato:'nav_contato'};
    Object.entries(labels).forEach(([id,key])=>{const a=document.querySelector('#nav a[href="#'+id+'"]');if(a&&settings[key])a.textContent=settings[key]});
    const filhosLink=document.querySelector('#nav a[href="filhos.html"]');
    const admLink=document.querySelector('#nav a[href="adm/"]');
    if(filhosLink&&settings.nav_filhos)filhosLink.textContent=settings.nav_filhos;
    if(admLink&&settings.nav_adm)admLink.textContent=settings.nav_adm;
  }

  async function syncPublicScales(){
    try{
      const client=window.ALDEIA_SUPABASE;if(!client)return;
      const {data,error}=await client.from('scales').select('id,scale_date,weekday,start_time,end_time,notes,scale_type,teams(name)').not('published_at','is',null).order('scale_date',{ascending:true}).limit(100);
      const box=document.getElementById('publicScales');if(!box)return;
      if(error||!data?.length){box.innerHTML='<div class="notice"><b>Escala</b><span>A escala publicada será disponibilizada aqui pelo Comando Geral.</span></div>';return}
      const groups={};data.forEach(s=>{const key=s.scale_date||'sem-data';(groups[key]??=[]).push(s)});
      box.innerHTML=Object.entries(groups).map(([date,list])=>{
        const s=list[0];const when=(s.start_time?String(s.start_time).slice(0,5):'')+(s.end_time?'–'+String(s.end_time).slice(0,5):'');
        return '<article class="public-scale-card"><div class="public-scale-date"><b>'+escapeHtml(new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}))+'</b><span>'+escapeHtml(s.weekday||'')+'</span></div><div><strong>'+escapeHtml(s.scale_type||s.teams?.name||'Escala da Casa')+'</strong><p>'+escapeHtml(when||'Sem horário definido')+'</p><p class="mini">'+escapeHtml(s.notes||'')+'</p></div></article>';
      }).join('');
    }catch(e){console.warn('Escala pública indisponível',e)}
  }

  async function syncPortalContent(){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client) return;
      const [{data:notices},{data:rules},{data:cms}]=await Promise.all([
        client.from("notices").select("title,body,created_at").eq("published",true).eq("audience","todos").order("created_at",{ascending:false}).limit(8),
        client.from("rule_versions").select("title,body,version").eq("active",true).order("published_at",{ascending:false}).limit(1),
        client.from("site_content").select("section,content_key,title,body").eq("active",true).order("sort_order",{ascending:true})
      ]);
      applyCmsContent(cms);
      const noticeBox=document.querySelector("#avisos .notice");
      if(noticeBox){
        noticeBox.innerHTML=notices?.length
          ? notices.map(n=>"<b>"+escapeHtml(n.title)+"</b><span>"+escapeHtml(n.body).replace(/\\n/g,"<br>")+"</span>").join("<hr>")
          : "<b>Portal oficial</b><span>Horários, orientações, eventos e comunicados serão publicados aqui.</span>";
      }
      const rulesBox=document.querySelector("#regras .rules");
      if(rulesBox && rules?.[0]){
        const raw=String(rules[0].body||"").replace(/\\r/g,"");
        const blocks=raw.split(/\\n\\s*\\n/).map(s=>s.trim()).filter(Boolean);
        rulesBox.innerHTML=blocks.map(block=>{
          const parts=block.split(/\\n/);
          const title=parts.shift()||"";
          const body=parts.join(" ").trim();
          return '<article class="rule-item"><b class="rule-number">'+escapeHtml(title)+'</b><span>'+escapeHtml(body)+'</span></article>';
        }).join("");
      }
    }catch(e){ console.warn("Conteúdo público do Supabase indisponível",e); }
  }

  async function syncPublicSettings(){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client)return;
      const [{data:settings},{data:contentRows}]=await Promise.all([
        client.from('public_settings').select('key,value'),
        client.from('site_content').select('section,content_key,title,body').eq('active',true)
      ]);
      const map={};(settings||[]).forEach(x=>map[x.key]=x.value);
      window.__ALDEIA_SETTINGS=map;
      applyPublicSettings(map);
      applyCmsContent(contentRows||[]);
    }catch(e){console.warn('Configurações públicas indisponíveis',e)}
  }

  function applyPublicSettings(settings){
    const root=document.documentElement;
    const setVar=(name,key)=>{if(settings[key])root.style.setProperty(name,settings[key])};
    if(settings.color_primary)root.style.setProperty('--gold',settings.color_primary); else if(settings.accent_color)root.style.setProperty('--gold',settings.accent_color); if(settings.color_accent)root.style.setProperty('--gold2',settings.color_accent); else if(settings.accent_color)root.style.setProperty('--gold2',settings.accent_color); setVar('--green','color_secondary'); setVar('--green2','color_secondary_dark');
    if(settings.font_family){document.body.style.fontFamily=settings.font_family+',Arial,Helvetica,sans-serif'}
    if(settings.body_background||settings.background_image){
      document.body.style.backgroundImage='linear-gradient(rgba(5,3,1,.74),rgba(5,3,1,.82)),url("'+String(settings.body_background||settings.background_image).replace(/"/g,'&quot;')+'")';
      document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center top';document.body.style.backgroundAttachment='fixed';
    }
    if(settings.hero_background||settings.hero_image){
      const hero=document.querySelector('.hero');if(hero)hero.style.backgroundImage='linear-gradient(90deg,rgba(5,3,1,.72),rgba(5,3,1,.30) 55%,rgba(5,3,1,.15)),url("'+String(settings.hero_background||settings.hero_image).replace(/"/g,'&quot;')+'")';
    }
    document.querySelectorAll('[data-logo-image]').forEach(el=>{if(settings.logo_image){el.src=settings.logo_image;el.style.display='block'}});
    document.querySelectorAll('[data-site-name]').forEach(el=>el.textContent=settings.site_name||data.site.name);
    document.querySelectorAll('[data-site-subtitle]').forEach(el=>el.textContent=settings.site_subtitle||data.site.subtitle);
    document.querySelectorAll('[data-footer-name]').forEach(el=>el.textContent=settings.footer_name||settings.site_name||data.site.name);
    document.querySelectorAll('[data-site-footer]').forEach(el=>el.textContent=settings.footer_text||'Terreiro de Umbanda • Axé, paz e luz');
    if(settings.footer_copyright){
      const y=document.querySelector('[data-year]');if(y)y.textContent=settings.footer_copyright.replace('{ano}',new Date().getFullYear());
    }
    document.querySelectorAll('[data-whatsapp]').forEach(el=>{
      const digits=normalizeWhatsApp(settings.whatsapp||data.contact?.whatsapp);
      if(digits){el.href='https://wa.me/'+digits}
      if(el.querySelector('span'))el.querySelector('span').textContent='Fale Conosco';
    });
    document.querySelectorAll('[data-instagram]').forEach(el=>{if(settings.instagram){el.href=settings.instagram;el.style.display='inline-flex'}else el.style.display='none'});
    document.querySelectorAll('[data-facebook]').forEach(el=>{if(settings.facebook){el.href=settings.facebook;el.style.display='inline-flex'}else el.style.display='none'});
    document.querySelectorAll('[data-pix-key]').forEach(el=>el.textContent=settings.pix_key||data.donation?.pixKey||'PIX não cadastrado');
    document.querySelectorAll('[data-private-hours]').forEach(el=>el.innerHTML=escapeHtml(settings.private_hours||data.schedule?.[0]?.text||'').replace(/\n/g,'<br>'));
    document.querySelectorAll('[data-friday-hours]').forEach(el=>el.innerHTML=escapeHtml(settings.friday_hours||data.schedule?.[1]?.text||'').replace(/\n/g,'<br>'));
    const note=document.querySelector('[data-donation-note]');if(note)note.textContent=settings.donation_note||data.donation?.note||'';
    if(settings.footer_instagram||settings.footer_facebook){
      document.querySelectorAll('[data-instagram]').forEach(el=>{if(settings.footer_instagram)el.href=settings.footer_instagram});
      document.querySelectorAll('[data-facebook]').forEach(el=>{if(settings.footer_facebook)el.href=settings.footer_facebook});
    }
    const maintenance=String(settings.maintenance_mode)==='true';
    if(maintenance){
      const main=document.querySelector('main');
      if(main&&!document.querySelector('.maintenance-overlay')){
        const d=document.createElement('div');d.className='maintenance-overlay';d.innerHTML='<div><span class="eyebrow">PORTAL TEMPORARIAMENTE FECHADO</span><h2>Estamos preparando novidades</h2><p>Volte em breve. A administração está atualizando o portal.</p></div>';
        document.body.appendChild(d);
      }
    }
    if(String(settings.show_donation_button)==='false')document.querySelectorAll('a[href="#doacoes"]').forEach(el=>el.style.display='none');
    if(String(settings.show_admin_access)==='false')document.querySelectorAll('.access .btn').forEach(el=>{if(el.textContent.includes('ADM'))el.style.display='none'});
    if(String(settings.show_children_access)==='false')document.querySelectorAll('.access .btn').forEach(el=>{if(el.textContent.includes('Filhos'))el.style.display='none'});
    applyPortalOrganization(settings);
  }


  document.addEventListener("DOMContentLoaded", async () => {
    await syncPublicSettings();
    await syncPortalContent();
    await syncEvents();
    await syncPortalMedia();
    await trackPortalVisit();
    await loadDonationCampaigns();
    const year = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = year;
    });

    if (event) {
      document.querySelectorAll("[data-event-title]").forEach((el) => {
        el.textContent = event.title;
      });
      document.querySelectorAll("[data-event-date]").forEach((el) => {
        el.textContent = event.date + " • " + event.time;
      });
      document.querySelectorAll("[data-event-address]").forEach((el) => {
        el.textContent = event.address + " • " + event.city;
      });
    }

    // Conteúdo e configurações públicos já foram aplicados pelo Supabase/CMS.
  });
})();