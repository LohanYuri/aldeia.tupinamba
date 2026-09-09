(() => {
  'use strict';

  const NETWORKS = [
    {name:'Assaí', url:'https://www.assai.com.br/'},
    {name:'Atacadão', url:'https://www.atacadao.com.br/'},
    {name:'Fort Atacadista', url:'https://www.fortatacadista.com.br/ofertas/'},
    {name:'Carrefour', url:'https://www.carrefour.com.br/'},
    {name:'Comper', url:'https://www.comper.com.br/'},
    {name:'Pão de Açúcar', url:'https://www.paodeacucar.com/'},
    {name:'Mercado local', url:''}
  ];

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = v => 'R$ '+Number(v||0).toFixed(2).replace('.',',');
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const today = () => new Date().toISOString().slice(0,10);

  function sb(){ return window.ALDEIA_SUPABASE || null; }
  async function userId(){
    try {
      const s=sb(); if(!s?.auth) return null;
      const r=await s.auth.getSession();
      return r?.data?.session?.user?.id || null;
    } catch(_) { return null; }
  }

  function notify(message, ok=false){
    const title=ok?'Cotação salva':'Atenção';
    if(typeof window.msg==='function' && !ok) { window.msg(message); return; }
    alert(title+'\n\n'+message);
  }

  async function compressPhoto(file){
    if(!file) return null;
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image();
        img.onerror=reject;
        img.onload=()=>{
          const max=1200, scale=Math.min(1,max/Math.max(img.width,img.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',.68));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function addStyles(){
    if(document.getElementById('marketQuoteStyles')) return;
    const s=document.createElement('style'); s.id='marketQuoteStyles';
    s.textContent=`
      .mq-launch{display:inline-flex!important;align-items:center;gap:7px}
      .mq-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}
      .mq-modal{width:min(1040px,100%);max-height:94vh;overflow:auto;background:#12100c;color:#f8f1e4;border:1px solid #c99b22;border-radius:20px;padding:20px;box-shadow:0 25px 70px #000}
      .mq-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.mq-head h2{margin:0;font-family:Georgia,serif;color:#fff;font-size:clamp(25px,5vw,42px)}
      .mq-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:15px}.mq-form label{display:grid;gap:5px;font-weight:800}.mq-form .full{grid-column:1/-1}
      .mq-form input,.mq-form select,.mq-form textarea{padding:11px;border-radius:10px;border:1px solid #bda45f;background:#fff;color:#171717;font:inherit}
      .mq-photo{border:1px dashed #c99b22;border-radius:13px;padding:12px;background:#1d1810}.mq-photo img{display:none;max-width:260px;max-height:180px;margin-top:8px;border-radius:10px}
      .mq-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.mq-btn{border:1px solid #b98d27;border-radius:10px;padding:10px 13px;font-weight:900;cursor:pointer}.mq-gold{background:linear-gradient(135deg,#c8941d,#efc24b);color:#15110a}.mq-blue{background:#24384f;color:#fff;border-color:#52779d}.mq-dark{background:#222;color:#f7d56e}.mq-red{background:#7d2020;color:#fff}
      .mq-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:14px}.mq-card{background:#1c2020;border:1px solid #66501f;border-radius:13px;padding:12px}.mq-card.best{border:2px solid #e0ae2e;background:#292317}.mq-card h4{margin:0 0 5px}.mq-price{font-size:22px;font-weight:900}.mq-best{color:#ffd45e;font-weight:900}.mq-muted{color:#cfc8bb;font-size:12px}.mq-photo-thumb{max-width:100%;max-height:140px;border-radius:8px;margin-top:8px}
      .mq-status{padding:11px;border-radius:11px;background:#211b12;border:1px solid #4a3b1b;margin-top:10px}.mq-status.good{background:#103d2a;border-color:#2e9d67}.mq-status.warn{background:#302612;border-color:#c99a24}
      @media(max-width:700px){.mq-form{grid-template-columns:1fr}.mq-modal{padding:15px}.mq-actions .mq-btn{flex:1;min-width:145px}}
    `;
    document.head.appendChild(s);
  }

  async function openQuote(itemId=''){
    addStyles();
    const s=sb(); if(!s){notify('A conexão do portal ainda não terminou de carregar.');return;}
    const uid=await userId(); if(!uid){notify('Sua sessão não está disponível. Entre novamente no Comando.');return;}

    let items=[];
    try{
      const q=await s.from('finance_budget_items').select('id,item_name,quantity,unit,status,quoted_price,total_price,market_name').order('created_at',{ascending:false});
      if(q.error) throw q.error; items=q.data||[];
    }catch(e){notify('Não consegui carregar a lista de compras: '+(e.message||e));return;}

    const selected=items.find(x=>x.id===itemId);
    const options='<option value="">Selecione o item da lista</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.item_name)+' • '+num(x.quantity)+' '+esc(x.unit||'')+'</option>').join('');
    const networks=NETWORKS.map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+'</option>').join('');

    const back=document.createElement('div'); back.className='mq-backdrop'; back.id='mqBackdrop';
    back.innerHTML=`
      <div class="mq-modal" role="dialog" aria-modal="true">
        <div class="mq-head"><div><div class="eyebrow">COMPRAS • COTAÇÃO DE CAMPO</div><h2>📷 Cotar no mercado</h2><p class="mq-muted">Chegou no mercado? Informe a rede, o produto e o preço. Tire uma foto do preço e o portal compara automaticamente com as outras cotações.</p></div><button class="mq-btn mq-dark" id="mqClose">✕ Fechar</button></div>
        <form id="mqForm" class="mq-form">
          <label class="full">Item da lista
            <select name="budget_item_id" required>${options}</select>
          </label>
          <label>Rede / estabelecimento
            <select name="network_name" id="mqNetwork" required>${networks}<option value="__custom">Outra rede…</option></select>
          </label>
          <label>Nome da rede (se for outra)
            <input name="custom_network" placeholder="Ex.: Supermercado X">
          </label>
          <label>Produto encontrado
            <input name="product_name" required placeholder="Ex.: Vela 24 horas">
          </label>
          <label>Preço por unidade
            <input name="unit_price" type="number" min="0" step="0.01" required placeholder="0,00">
          </label>
          <label>Quantidade para a compra
            <input name="quantity" type="number" min="0.01" step="0.01" value="${esc(selected?.quantity||1)}" required>
          </label>
          <label>Frete / taxa
            <input name="shipping" type="number" min="0" step="0.01" value="0">
          </label>
          <label>Dia da oferta (se informado pela rede)
            <input name="offer_date" type="date">
          </label>
          <label class="full">Informação da promoção / observação
            <textarea name="promo_note" rows="2" placeholder="Ex.: oferta válida sexta e sábado; preço com cartão; leve 3..."></textarea>
          </label>
          <label class="full mq-photo">📸 Foto do preço / etiqueta
            <input id="mqPhoto" name="photo" type="file" accept="image/*" capture="environment">
            <small class="mq-muted">A foto é comprimida antes de ser guardada para não pesar no portal.</small>
            <img id="mqPreview" alt="Prévia da foto do preço">
          </label>
          <div class="full mq-actions">
            <button type="submit" class="mq-btn mq-gold">💾 Salvar cotação</button>
            <button type="button" class="mq-btn mq-blue" id="mqSearch">🌐 Pesquisar internet</button>
            <button type="button" class="mq-btn mq-dark" id="mqCompare">🔎 Comparar redes</button>
          </div>
        </form>
        <div id="mqStatus" class="mq-status">Pronto para registrar a primeira cotação.</div>
        <div id="mqResults"></div>
      </div>`;
    document.body.appendChild(back);

    const form=back.querySelector('#mqForm');
    const photoInput=back.querySelector('#mqPhoto');
    const preview=back.querySelector('#mqPreview');
    let photoData=null;
    photoInput.addEventListener('change',async()=>{photoData=null;preview.style.display='none';const f=photoInput.files?.[0];if(!f)return;try{photoData=await compressPhoto(f);preview.src=photoData;preview.style.display='block'}catch(e){notify('Não consegui preparar a foto: '+e.message)}});

    back.querySelector('#mqClose').onclick=()=>back.remove();
    back.addEventListener('click',e=>{if(e.target===back)back.remove()});

    form.budget_item_id.value=itemId;
    form.network_name.onchange=()=>{form.custom_network.disabled=form.network_name.value!=='__custom';if(form.network_name.value!=='__custom')form.custom_network.value='';};
    form.network_name.dispatchEvent(new Event('change'));

    async function loadQuotes(){
      const item=form.budget_item_id.value; if(!item){back.querySelector('#mqStatus').textContent='Selecione um item primeiro.';return [];}
      const q=await s.from('finance_budget_quotes').select('*').eq('budget_item_id',item).order('unit_price',{ascending:true});
      if(q.error){notify('Erro ao carregar cotações: '+q.error.message);return [];}
      renderResults(q.data||[],[]);
      return q.data||[];
    }

    function renderResults(saved=[],internet=[]){
      const all=[...saved.map(x=>({...x,_saved:true})),...internet.map(x=>({...x,_saved:false}))].filter(x=>num(x.unit_price)>0);
      all.sort((a,b)=>(num(a.unit_price)+num(a.shipping))-(num(b.unit_price)+num(b.shipping)));
      const best=all[0];
      if(!all.length){back.querySelector('#mqResults').innerHTML='<div class="mq-status">Nenhuma cotação encontrada ainda.</div>';return;}
      back.querySelector('#mqResults').innerHTML='<h3 style="margin-top:18px">📊 Comparação automática</h3><div class="mq-results">'+all.map((x,i)=>{
        const total=(num(x.unit_price)*num(x.quantity||form.quantity.value||1))+num(x.shipping);
        const net=x.network_name||x.market_name||x.platform||'Fonte não identificada';
        return '<article class="mq-card '+(i===0?'best':'')+'">'+(i===0?'<div class="mq-best">🏆 MELHOR PREÇO ENCONTRADO</div>':'')+'<h4>'+esc(net)+'</h4><div>'+esc(x.product_name||x.productName||form.product_name.value)+'</div><div class="mq-price">'+money(x.unit_price)+'</div><div>Compra estimada: <b>'+money(total)+'</b></div>'+(x.offer_date?'<div class="mq-muted">📅 Oferta: '+esc(x.offer_date)+'</div>':'')+(x.promo_note?'<div class="mq-muted">🔥 '+esc(x.promo_note)+'</div>':'')+(x.source_url?'<div class="mq-actions"><a class="mq-btn mq-dark" href="'+esc(x.source_url)+'" target="_blank" rel="noopener">Abrir fonte</a></div>':'')+(x.photo_data_url?'<img class="mq-photo-thumb" src="'+x.photo_data_url+'" alt="Foto do preço">':'')+(x._saved?'':'<div class="mq-actions"><button class="mq-btn mq-gold" data-save-web="'+esc(JSON.stringify(x).replace(/"/g,'&quot;'))+'">💾 Guardar esta cotação</button></div>')+'</article>';
      }).join('')+'</div>';
      back.querySelectorAll('[data-save-web]').forEach(btn=>btn.onclick=async()=>{
        try{const x=JSON.parse(btn.getAttribute('data-save-web'));await saveQuote({...x,budget_item_id:form.budget_item_id.value,quantity:num(form.quantity.value)||1});await loadQuotes()}catch(e){notify(e.message||e)}
      });
    }

    async function saveQuote(data){
      const network=data.network_name||data.market_name||data.platform||'Internet';
      const payload={
        budget_item_id:data.budget_item_id||form.budget_item_id.value,
        market_name:network,
        network_name:network,
        platform:data.platform||'mercado_local',
        product_name:data.product_name||form.product_name.value,
        product_url:data.product_url||data.source_url||null,
        unit_price:num(data.unit_price),
        shipping:num(data.shipping),
        total_price:(num(data.unit_price)*(num(data.quantity)||num(form.quantity.value)||1))+num(data.shipping),
        seller_name:data.seller_name||null,
        seller_rating:data.seller_rating||null,
        sales_count:data.sales_count||null,
        availability:data.availability||null,
        delivery_estimate:data.delivery_estimate||null,
        trusted_score:data.trusted_score||null,
        source_type:data.source_type||'manual',
        checked_at:data.checked_at||new Date().toISOString(),
        notes:data.notes||null,
        network_name:network,
        photo_data_url:data.photo_data_url||photoData||null,
        offer_date:data.offer_date||form.offer_date.value||null,
        promo_note:data.promo_note||form.promo_note.value||null,
        source_url:data.source_url||data.product_url||null,
        checked_by:uid,
      };
      const q=await s.from('finance_budget_quotes').insert(payload).select().single();
      if(q.error)throw q.error;
      return q.data;
    }

    async function saveManual(){
      const d=Object.fromEntries(new FormData(form));
      const network=d.network_name==='__custom'?d.custom_network:d.network_name;
      if(!network)throw new Error('Informe a rede.');
      if(num(d.unit_price)<=0)throw new Error('Informe um preço maior que zero.');
      await saveQuote({
        budget_item_id:d.budget_item_id,network_name:network,market_name:network,product_name:d.product_name,
        unit_price:num(d.unit_price),shipping:num(d.shipping),quantity:num(d.quantity)||1,
        offer_date:d.offer_date||null,promo_note:d.promo_note||null,photo_data_url:photoData||null,source_type:'foto_local'
      });
      await loadQuotes();
      back.querySelector('#mqStatus').className='mq-status good';
      back.querySelector('#mqStatus').textContent='✅ Cotação guardada. O sistema já pode comparar esta rede com as próximas.';
    }

    form.onsubmit=async e=>{e.preventDefault();try{await saveManual()}catch(err){notify('Não consegui salvar a cotação: '+(err.message||err))}};

    back.querySelector('#mqCompare').onclick=async()=>{await loadQuotes();back.querySelector('#mqStatus').textContent='🔎 Comparação atualizada com as cotações já guardadas.'};

    back.querySelector('#mqSearch').onclick=async()=>{
      const product=form.product_name.value.trim();
      if(!product){notify('Informe o produto para pesquisar.');return;}
      const selectedNetworks=[...back.querySelectorAll('#mqNetwork option')].map(o=>o.value).filter(x=>x&&x!=='__custom');
      back.querySelector('#mqStatus').className='mq-status warn';
      back.querySelector('#mqStatus').textContent='🌐 Pesquisando preços e sinais de ofertas…';
      try{
        const r=await s.functions.invoke('market-research',{body:{product,networks:selectedNetworks}});
        if(r.error)throw r.error;
        const d=r.data||{};
        renderResults([],d.results||[]);
        const hints=(d.promo_hints||[]).length;
        back.querySelector('#mqStatus').textContent='🌐 Pesquisa concluída. '+(d.results||[]).length+' resultado(s) encontrados.'+(hints?' Há '+hints+' sinal(is) de promoção para conferir.':'');
      }catch(e){
        back.querySelector('#mqStatus').textContent='⚠️ Pesquisa automática indisponível agora. Você ainda pode registrar a foto e o preço manualmente.';
      }
    };

    await loadQuotes();
  }

  function injectLauncher(){
    if(location.pathname.split('/').pop()!=='comandante.html') return;
    const view=document.getElementById('view');
    if(!view) return;
    const h2=[...view.querySelectorAll('h2')].find(x=>/Compras, Orçamentos e Gastos Reais/i.test(x.textContent||''));
    if(!h2) return;
    const head=h2.closest('.command-dashboard-head');
    const actions=head?.querySelector('.row-actions');
    if(!actions || actions.querySelector('[data-market-quote]')) return;
    const b=document.createElement('button');
    b.type='button';b.className='btn outline mq-launch';b.setAttribute('data-market-quote','1');b.textContent='📷 Cotar no mercado';
    b.onclick=()=>openQuote('');
    actions.appendChild(b);
  }

  window.ALDEIA_MARKET_QUOTE={open:openQuote};
  const boot=()=>{
    addStyles();
    injectLauncher();
    const view=document.getElementById('view');
    if(view){
      new MutationObserver(()=>setTimeout(injectLauncher,60)).observe(view,{childList:true,subtree:true});
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();