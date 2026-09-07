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
      "📅 " + event.date + " • " + event.time,
      "📍 " + event.address + " • " + event.city,
      "",
      "Doações: doces, refrigerantes, cachorro-quente, balas e pirulitos.",
      "Aldeia Tupinambá"
    ].join("\n");
    const ics = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aldeia Tupinamba//Portal//PT-BR","CALSCALE:GREGORIAN","BEGIN:VEVENT",
      "UID:" + event.id + "@aldeia.tupinamba","DTSTAMP:20260905T120000Z","DTSTART:20260926T220000Z","DTEND:20260927T010000Z",
      "SUMMARY:" + event.title,"LOCATION:" + event.address + " - " + event.city,
      "DESCRIPTION:Doacoes: doces, refrigerantes, cachorro-quente, balas e pirulitos.",
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
    openModal(
      "<span class='eyebrow'>CONVITE INTERATIVO</span>" +
      "<h2>🎉 " + escapeHtml(event.title) + "</h2>" +
      "<p><strong>📅 " + escapeHtml(event.date) + " • " + escapeHtml(event.time) + "</strong></p>" +
      "<p>📍 " + escapeHtml(event.address) + " • " + escapeHtml(event.city) + "</p>" +
      "<div class='invite-note'><b>Você é nosso convidado!</b><br>Venha participar com respeito, fé e alegria.</div>" +
      "<p><small>Doações para a festa: doces, refrigerantes, cachorro-quente, balas e pirulitos.</small></p>" +
      "<div class='modal-actions'>" +
      "<button class='btn gold' id='icsBtn' type='button'>📅 Adicionar à agenda</button>" +
      "<button class='btn outline' id='shareBtn' type='button'>📤 Compartilhar convite</button>" +
      "<button class='btn outline' id='eventWaBtn' type='button'>📲 Confirmar pelo WhatsApp</button>" +
      "</div>"
    );
    $("#icsBtn")?.addEventListener("click", () => downloadICS(ics, "convite-cosme-e-damiao-2026.ics"));
    $("#shareBtn")?.addEventListener("click", async () => {
      if (navigator.share) await navigator.share({title:event.title,text:shareText}).catch(()=>{});
      else toast((await copyText(shareText)) ? "Convite copiado." : "Não foi possível copiar o convite.");
    });
    $("#eventWaBtn")?.addEventListener("click", () => {
      const target = normalizeWhatsApp(data.contact?.whatsapp);
      const msg = "Olá! Gostaria de confirmar minha participação na Festa de São Cosme e São Damião da Aldeia Tupinambá em " + event.date + " às " + event.time + ".";
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
    (rows||[]).forEach(r=>map[r.section+':'+r.content_key]=r);
    const set=(sel,value)=>{const el=document.querySelector(sel);if(el&&value!==undefined)el.textContent=value};
    set('#inicio .eyebrow',map['inicio:eyebrow']?.body||map['inicio:eyebrow']?.title);
    set('#inicio h1',map['inicio:title']?.body||map['inicio:title']?.title);
    set('#inicio .hero-copy>p',map['inicio:lead']?.body||map['inicio:lead']?.title);
    set('#aldeia h2',map['aldeia:title']?.body||map['aldeia:title']?.title);
    set('#aldeia>div>p',map['aldeia:body']?.body);
    set('#consultas h2',map['consultas:title']?.body||map['consultas:title']?.title);
    set('#consultas .lead',map['consultas:body']?.body);
    set('#doutrina h2',map['doutrina:title']?.body||map['doutrina:title']?.title);
    set('#doutrina .cms-body',map['doutrina:body']?.body);
    set('#avisos h2',map['avisos:title']?.body||map['avisos:title']?.title);
    set('#contato h2',map['contato:title']?.body||map['contato:title']?.title);
    set('#contato .lead',map['contato:body']?.body);
    set('#regras h2',map['regras:title']?.body||map['regras:title']?.title);
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
        rulesBox.innerHTML="<p><b>"+escapeHtml(rules[0].version)+"</b> — "+escapeHtml(rules[0].title)+"</p><p>"+escapeHtml(rules[0].body).replace(/\\n/g,"</p><p>")+"</p>";
      }
    }catch(e){ console.warn("Conteúdo público do Supabase indisponível",e); }
  }

  async function syncPublicSettings(){
    try{
      const client=window.ALDEIA_SUPABASE;
      if(!client) return;
      const {data,error}=await client.from("public_settings").select("key,value");
      if(error||!data) return;
      const settings=Object.fromEntries(data.map(x=>[x.key,x.value]));
      window.ALDEIA_DATA.site=window.ALDEIA_DATA.site||{};
      if(settings.site_name)window.ALDEIA_DATA.site.name=settings.site_name;
      if(settings.site_subtitle)window.ALDEIA_DATA.site.subtitle=settings.site_subtitle;
      if(settings.site_city)window.ALDEIA_DATA.site.city=settings.site_city;
      if(settings.site_address)window.ALDEIA_DATA.site.address=settings.site_address;
      if(settings.whatsapp){
        window.ALDEIA_DATA.contact=window.ALDEIA_DATA.contact||{};
        window.ALDEIA_DATA.contact.whatsapp=settings.whatsapp;
        window.ALDEIA_DATA.contact.whatsappDisplay=settings.whatsapp_display||settings.whatsapp;
      }
      document.title=(settings.site_name||window.ALDEIA_DATA.site.name||'Aldeia Tupinambá')+' | Portal Oficial';
      const root=document.documentElement;
      if(settings.background_color)document.body.style.backgroundColor=settings.background_color;
      if(settings.background_image)document.body.style.backgroundImage='linear-gradient(rgba(0,0,0,.16),rgba(0,0,0,.16)),url("'+String(settings.background_image).replace(/"/g,'')+'")';
      if(settings.hero_image){const hero=document.querySelector('#inicio');if(hero)hero.style.backgroundImage='linear-gradient(rgba(0,0,0,.22),rgba(0,0,0,.22)),url("'+String(settings.hero_image).replace(/"/g,'')+'")'}
      const logo=document.querySelector('.brand-mark');
      if(settings.logo_image&&logo){logo.textContent='';logo.style.backgroundImage='url("'+String(settings.logo_image).replace(/"/g,'')+'")';logo.style.backgroundSize='cover';logo.style.backgroundPosition='center';logo.style.width='42px';logo.style.height='42px';logo.style.borderRadius='50%';}
      if(settings.pix_key){
        window.ALDEIA_DATA.donation=window.ALDEIA_DATA.donation||{};
        window.ALDEIA_DATA.donation.pixKey=settings.pix_key;
      }
      if(settings.private_hours) window.ALDEIA_DATA.schedule[0].text=settings.private_hours;
      if(settings.friday_hours) window.ALDEIA_DATA.schedule[1].text=settings.friday_hours;
      document.querySelectorAll('[data-site-name]').forEach(el=>el.textContent=settings.site_name||window.ALDEIA_DATA.site.name);
      document.querySelectorAll('[data-site-subtitle]').forEach(el=>el.textContent=settings.site_subtitle||window.ALDEIA_DATA.site.subtitle);
      document.querySelectorAll('[data-footer-name]').forEach(el=>el.textContent=settings.site_name||window.ALDEIA_DATA.site.name);
      document.querySelectorAll('[data-site-footer]').forEach(el=>el.textContent=settings.site_footer||'Terreiro de Umbanda • Axé, paz e luz');
      document.querySelectorAll('[data-private-hours]').forEach(el=>el.innerHTML=escapeHtml(settings.private_hours||'') .replace(/\\n/g,'<br>'));
      document.querySelectorAll('[data-friday-hours]').forEach(el=>el.innerHTML=escapeHtml(settings.friday_hours||'') .replace(/\\n/g,'<br>'));
      document.querySelectorAll('[data-instagram]').forEach(el=>{if(settings.instagram){el.href=settings.instagram;el.style.display='inline-flex'}else el.style.display='none'});
      document.querySelectorAll('[data-facebook]').forEach(el=>{if(settings.facebook){el.href=settings.facebook;el.style.display='inline-flex'}else el.style.display='none'});
      document.querySelectorAll("[data-whatsapp]").forEach(el=>{
        const digits=normalizeWhatsApp(settings.whatsapp||window.ALDEIA_DATA.contact.whatsapp);
        if(digits) el.href="https://wa.me/"+digits;
      });
      document.querySelectorAll("[data-pix-key]").forEach(el=>el.textContent=settings.pix_key||window.ALDEIA_DATA.donation.pixKey);
    }catch(e){ console.warn("Supabase público indisponível",e); }
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

    document.querySelectorAll("[data-whatsapp]").forEach((el) => {
      const digits = normalizeWhatsApp(data.contact?.whatsapp);
      if (digits) {
        el.href = "https://wa.me/" + digits;
        el.textContent = "WhatsApp oficial: (67) 99342-405";
      }
    });

    document.querySelectorAll("[data-pix-key]").forEach((el) => {
      el.textContent = data.donation?.pixKey || "PIX não cadastrado";
    });

    const note = $("[data-donation-note]");
    if (note) note.textContent = data.donation?.note || "";
  });
})();