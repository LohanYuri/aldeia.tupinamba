/* ORCAMENTOS AVANCADOS - Aldeia Tupinamba */
(function(){
  if(!/comandante\.html$/i.test(location.pathname)) return;
  const PLATFORMS=[
    {name:'Mercado Livre',url:q=>'https://lista.mercadolivre.com.br/'+encodeURIComponent(q).replace(/%20/g,'-')},
    {name:'Shopee',url:q=>'https://shopee.com.br/search?keyword='+encodeURIComponent(q)},
    {name:'Amazon Brasil',url:q=>'https://www.amazon.com.br/s?k='+encodeURIComponent(q)},
    {name:'Magalu',url:q=>'https://www.magazineluiza.com.br/busca/'+encodeURIComponent(q)+'/'},
    {name:'AliExpress',url:q=>'https://pt.aliexpress.com/w/wholesale-'+encodeURIComponent(q).replace(/%20/g,'-')+'.html'}
  ];
  const NICHES=['Geral / Reserva','Festa de Cosme e Damião','Festa de Seu 7','Festa do Cacique','Festa da Vovó','Manutenção da Casa','Material religioso','Alimentação','Decoração','Outro'];
  const sb=window.ALDEIA_SUPABASE;
  const V=()=>document.getElementById('view');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'R$ '+Number(v||0).toFixed(2).replace('.',',');
  const today=()=>new Date().toISOString().slice(0,10);
  const month=()=>today().slice(0,7)+'-01';
  const card=(t,b)=>'<article class="command-card"><h3>'+t+'</h3>'+b+'</article>';
  const actor=async()=>{try{return (await sb.auth.getUser()).data?.user?.id||null}catch(e){return null}};
  const audit=async(action,entity,id,details)=>{try{await sb.from('audit_logs').insert({actor_id:await actor(),action,entity,entity_id:id||null,details:details||{}})}catch(e){}};
  async function loadQuotes(){
    const r=await sb.from('finance_budget_quotes').select('*').order('checked_at',{ascending:false}).limit(1000);
    window.__budgetQuotes=r.data||[];
  }
  async function loadFunds(){
    const [p,a]=await Promise.all([
      sb.from('budget_fund_pool').select('*').eq('id',1).maybeSingle(),
      sb.from('budget_fund_allocations').select('*').eq('active',true).order('created_at',{ascending:false})
    ]);
    window.__budgetFundPool=p.data||{id:1,total_received:0};
    window.__budgetFundAllocations=a.data||[];
  }
  function quoteScore(q){
    const price=Number(q.total_price||0), rating=Number(q.seller_rating||0), trust=Number(q.trusted_score||0);
    return price+(rating>=4.7?0:price*.04)+(trust>=80?0:price*.03);
  }
  function recommendation(quotes){
    if(!quotes.length)return '<div class="notice-box">🔎 <b>Nenhuma cotação registrada.</b> Use <b>Pesquisar online</b> e depois <b>Registrar preço</b>. O comparador considera custo total, frete, reputação e confiança.</div>';
    const best=[...quotes].sort((a,b)=>quoteScore(a)-quoteScore(b))[0];
    return '<div class="notice-box" style="border-left:4px solid #2d8a52">🏆 <b>Melhor opção registrada</b><br><b>'+esc(best.market_name)+'</b> • '+esc(best.platform)+' • <b>'+money(best.total_price)+'</b>'+
      (best.seller_rating?' • ⭐ '+esc(best.seller_rating):'')+(best.sales_count?' • '+esc(best.sales_count)+' vendido(s)':'')+
      '<br><span class="mini">Não é preço ao vivo: é a melhor cotação registrada no painel. Confira CEP, frete, estoque e prazo antes de comprar.</span>'+
      (best.product_url?'<br><a href="'+esc(best.product_url)+'" target="_blank" rel="noopener">🔗 Abrir oferta</a>':'')+'</div>';
  }
  function openSearches(item){
    PLATFORMS.forEach((p,i)=>setTimeout(()=>window.open(p.url(item||''),'_blank','noopener'),i*150));
  }
  async function compras(){
    await Promise.all([loadQuotes(),loadFunds()]);
    const r=await sb.from('finance_budget_items').select('*').eq('reference_month',month()).order('created_at',{ascending:false});
    if(r.error){alert(r.error.message);return}
    const rows=r.data||[],quotes=window.__budgetQuotes||[],pool=window.__budgetFundPool||{total_received:0},alloc=window.__budgetFundAllocations||[];
    window.__budgetItems=rows;
    const allocated=alloc.reduce((s,x)=>s+Number(x.allocated_amount||0),0);
    const available=Number(pool.total_received||0)-allocated;
    const total=rows.reduce((s,x)=>s+Number(x.total_price||0),0);
    const niches=alloc.map(x=>'<tr><td><b>'+esc(x.niche)+'</b></td><td>'+money(x.allocated_amount)+'</td><td>'+money(x.spent_amount)+'</td><td><b>'+money(Number(x.allocated_amount||0)-Number(x.spent_amount||0))+'</b></td><td><button class="btn secondary small" onclick="editarCaixinhaOrcamento(\''+x.id+'\')">✏️ Editar</button> <button class="btn danger small" onclick="apagarCaixinhaOrcamento(\''+x.id+'\')">🗑️</button></td></tr>').join('');
    V().innerHTML=
      '<div class="command-dashboard-head"><div><span class="eyebrow">ORÇAMENTOS</span><h2>🛒 Orçamentos, mercados e caixinhas</h2><p class="lead">Registre compras de mercado, lojas, festas ou plataformas online. O orçamento não precisa virar cota dos filhos.</p></div><div class="row-actions"><button class="btn gold" onclick="novoOrcamentoAvancado()">➕ Novo orçamento</button><button class="btn secondary" onclick="configurarCaixinhaTerreiro()">🏦 Caixinha Terreiro</button></div></div>'+
      '<div class="command-grid">'+card('🏦 Entrou no Terreiro','<div class="money">'+money(pool.total_received)+'</div><p>Total disponibilizado.</p>')+card('📦 Aplicado','<div class="money">'+money(allocated)+'</div><p>Distribuído nas caixinhas.</p>')+card('💚 Saldo livre','<div class="money">'+money(available)+'</div><p>Ainda sem aplicação.</p>')+card('🛒 Total orçado','<div class="money">'+money(total)+'</div><p>'+rows.length+' item(ns).</p>')+'</div>'+
      '<div class="command-card" style="margin-top:16px"><h3>🏦 Caixinhas do orçamento</h3><p class="mini muted">Escolha quanto aplicar em cada finalidade. Tudo fica editável.</p><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Aplicar em</th><th>Orçado</th><th>Gasto</th><th>Saldo</th><th>Ações</th></tr></thead><tbody>'+(niches||'<tr><td colspan="5">Nenhuma caixinha.</td></tr>')+'</tbody></table></div><button class="btn gold" style="margin-top:10px" onclick="novaCaixinhaOrcamento()">➕ Aplicar saldo em um nicho</button></div>'+
      '<div class="command-card" style="margin-top:16px"><h3>🔎 Comparador online</h3><p>Pesquise o mesmo produto nas plataformas confiáveis e registre as ofertas encontradas.</p>'+recommendation(quotes)+'</div>'+
      '<div class="command-card" style="margin-top:16px"><h3>📋 Orçamentos de '+new Date(month()+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})+'</h3><div class="command-table-wrap"><table class="command-table"><thead><tr><th>Produto</th><th>Mercado / loja</th><th>Qtd.</th><th>Total</th><th>Caixinha</th><th>Ações</th></tr></thead><tbody>'+
      (rows.length?rows.map(x=>{const qs=quotes.filter(q=>q.budget_item_id===x.id),best=qs.length?[...qs].sort((a,b)=>quoteScore(a)-quoteScore(b))[0]:null;return '<tr><td><b>'+esc(x.item_name)+'</b><br><span class="mini">'+esc(x.category||'')+'</span>'+(best?'<br><span class="pill success">🏆 '+esc(best.market_name)+' • '+money(best.total_price)+'</span>':'')+'</td><td>'+esc(x.market_name||'—')+(x.purchase_url?'<br><a href="'+esc(x.purchase_url)+'" target="_blank" rel="noopener">🔗 oferta</a>':'')+'</td><td>'+esc(x.quantity)+' '+esc(x.unit||'')+'</td><td><b>'+money(x.total_price)+'</b></td><td>'+esc(x.fund_niche||'Geral / Reserva')+'</td><td><div class="row-actions"><button class="btn secondary small" onclick="editarOrcamentoAvancado(\''+x.id+'\')">✏️ Editar</button><button class="btn gold small" onclick="pesquisarOrcamentoOnline(\''+x.id+'\')">🌐 Pesquisar online</button><button class="btn outline small" onclick="registrarCotacao(\''+x.id+'\')">💲 Registrar preço</button><button class="btn secondary small" onclick="verCotacoes(\''+x.id+'\')">📊 Comparar '+qs.length+'</button><button class="btn outline small" onclick="gerarCotaOrcamento(\''+x.id+'\')">💰 Cota</button><button class="btn danger small" onclick="apagarCompra(\''+x.id+'\')">🗑️ Apagar</button></div></td></tr>'}).join(''):'<tr><td colspan="6">Nenhum orçamento cadastrado.</td></tr>')+
      '</tbody></table></div></div>'+
      '<div class="notice-box">ℹ️ <b>Importante:</b> o portal não inventa preço ao vivo. A pesquisa abre as plataformas oficiais; o Comandante registra as ofertas e o sistema compara. Isso evita recomendar um preço que mudou por CEP, frete, cupom, estoque ou vendedor.</div>';
  }
  function formOrcamentoAvancado(x){
    const niches=NICHES.map(n=>'<option '+(x.fund_niche===n?'selected':'')+'>'+esc(n)+'</option>').join('');
    const cats=['Alimentos','Bebidas','Velas','Festas e decoração','Limpeza','Material religioso','Fumo','Charuto','Descartáveis','Equipamentos','Outro'].map(n=>'<option '+(x.category===n?'selected':'')+'>'+esc(n)+'</option>').join('');
    V().innerHTML='<div class="command-dashboard-head"><div><span class="eyebrow">ORÇAMENTO</span><h2>🛒 '+(x.id?'Editar orçamento':'Novo orçamento')+'</h2><p class="lead">Mercado físico, loja ou compra online.</p></div><button class="btn secondary" onclick="compras()">← Voltar</button></div><form id="bf2" class="command-form"><label>Aplicar em<select name="fund_niche">'+niches+'</select></label><label>Categoria<select name="category">'+cats+'</select></label><label>Produto / item<input name="item_name" required value="'+esc(x.item_name||'')+'"></label><label>Mercado / loja<input name="market_name" value="'+esc(x.market_name||'')+'"' placeholder="Ex.: Atacadão, Mercado Livre..."></label><label>Quantidade<input name="quantity" type="number" min="0.01" step="0.01" value="'+esc(x.quantity||1)+'" required></label><label>Unidade<input name="unit" value="'+esc(x.unit||'')+'"' placeholder="unidade, caixa, pacote"></label><label>Preço unitário<input name="quoted_price" type="number" min="0" step="0.01" value="'+esc(x.quoted_price||'')+'" required></label><label>Data limite<input name="due_date" type="date" value="'+esc(x.due_date||'')+'"></label><label class="full">Link da oferta<input name="purchase_url" type="url" value="'+esc(x.purchase_url||'')+'" placeholder="https://..."></label><label class="full">Observações<textarea name="notes" rows="4">'+esc(x.notes||'')+'</textarea></label><div class="full"><button class="btn gold">💾 Salvar orçamento</button> <button type="button" class="btn secondary" onclick="compras()">Cancelar</button></div></form>';
    document.getElementById('bf2').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),qty=Number(d.quantity),price=Number(d.quoted_price),payload={reference_month:x.reference_month||month(),fund_niche:d.fund_niche,category:d.category,item_name:d.item_name.trim(),market_name:d.market_name||null,quantity:qty,unit:d.unit||null,quoted_price:price,total_price:qty*price,split_count:0,per_child_amount:0,due_date:d.due_date||null,status:'orcamento',purchase_url:d.purchase_url||null,notes:d.notes||null,updated_at:new Date().toISOString()};const q=x.id?await sb.from('finance_budget_items').update(payload).eq('id',x.id).select().single():await sb.from('finance_budget_items').insert({...payload,created_by:await actor()}).select().single();if(q.error){alert(q.error.message);return}await audit(x.id?'update_budget_item':'create_budget_item','finance_budget_items',x.id||q.data.id,{item:payload.item_name,total:payload.total_price,market:payload.market_name,fund:payload.fund_niche});compras()};
  }
  function novoOrcamentoAvancado(){formOrcamentoAvancado({})}
  function editarOrcamentoAvancado(id){formOrcamentoAvancado((window.__budgetItems||[]).find(x=>x.id===id)||{})}
  function pesquisarOrcamentoOnline(id){const x=(window.__budgetItems||[]).find(r=>r.id===id);if(!x)return;openSearches(x.item_name);alert('As plataformas foram abertas. Registre os preços encontrados para o comparador identificar a melhor opção.');}
  function registrarCotacao(id){
    const x=(window.__budgetItems||[]).find(r=>r.id===id);if(!x)return;
    const opts=PLATFORMS.map(p=>'<option>'+p.name+'</option>').join('');
    V().innerHTML='<div class="command-dashboard-head"><div><h2>💲 Registrar cotação — '+esc(x.item_name)+'</h2><p class="lead">Preço encontrado em mercado físico ou online.</p></div><button class="btn secondary" onclick="compras()">← Voltar</button></div><form id="qf" class="command-form"><label>Mercado / loja<input name="market_name" required></label><label>Plataforma<select name="platform"><option>Mercado local</option>'+opts+'</select></label><label>Produto anunciado<input name="product_name" required value="'+esc(x.item_name)+'"></label><label>Preço unitário<input name="unit_price" type="number" min="0" step="0.01" required></label><label>Frete<input name="shipping" type="number" min="0" step="0.01" value="0"></label><label>Total da compra<input name="total_price" type="number" min="0" step="0.01" required></label><label>Vendedor<input name="seller_name"></label><label>Avaliação do vendedor<input name="seller_rating" type="number" min="0" max="5" step="0.1" placeholder="4.9"></label><label>Vendas<input name="sales_count" placeholder="10 mil+"></label><label>Prazo<input name="delivery_estimate" placeholder="2 dias"></label><label class="full">Link da oferta<input name="product_url" type="url"></label><label class="full">Observações<textarea name="notes" rows="4" placeholder="Loja oficial, frete grátis, cupom, retirada..."></textarea></label><div class="full"><button class="btn gold">💾 Registrar cotação</button> <button type="button" class="btn secondary" onclick="compras()">Cancelar</button></div></form>';
    document.getElementById('qf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),rating=Number(d.seller_rating||0),trust=Math.min(100,Math.round((rating?rating/5*60:25)+(d.sales_count?20:0)+(d.seller_name?20:0)));const q=await sb.from('finance_budget_quotes').insert({budget_item_id:id,market_name:d.market_name,platform:d.platform,product_name:d.product_name,product_url:d.product_url||null,unit_price:Number(d.unit_price),shipping:Number(d.shipping||0),total_price:Number(d.total_price),seller_name:d.seller_name||null,seller_rating:rating||null,sales_count:d.sales_count||null,delivery_estimate:d.delivery_estimate||null,trusted_score:trust,source_type:d.platform==='Mercado local'?'manual':'marketplace',notes:d.notes||null,created_by:await actor()}).select().single();if(q.error){alert(q.error.message);return}await audit('create_budget_quote','finance_budget_quotes',q.data.id,{item:x.item_name,market:d.market_name,total:Number(d.total_price)});compras()};
  }
  async function verCotacoes(id){
    const x=(window.__budgetItems||[]).find(r=>r.id===id),r=await sb.from('finance_budget_quotes').select('*').eq('budget_item_id',id).order('total_price');if(r.error){alert(r.error.message);return}
    const qs=r.data||[];
    V().innerHTML='<div class="command-dashboard-head"><div><h2>📊 Comparação — '+esc(x?.item_name||'Produto')+'</h2><p class="lead">Compare mercado, preço, frete, vendedor, vendas e prazo.</p></div><div class="row-actions"><button class="btn gold" onclick="registrarCotacao(\''+id+'\')">➕ Nova cotação</button><button class="btn secondary" onclick="compras()">← Voltar</button></div></div>'+recommendation(qs)+'<div class="command-table-wrap"><table class="command-table"><thead><tr><th>Mercado</th><th>Plataforma</th><th>Preço</th><th>Frete</th><th>Total</th><th>Vendedor</th><th>Confiança</th><th>Oferta</th></tr></thead><tbody>'+qs.map((q,i)=>'<tr><td><b>'+(i===0?'🏆 ':'')+esc(q.market_name)+'</b></td><td>'+esc(q.platform)+'</td><td>'+money(q.unit_price)+'</td><td>'+money(q.shipping)+'</td><td><b>'+money(q.total_price)+'</b></td><td>'+esc(q.seller_name||'—')+(q.seller_rating?' • ⭐ '+esc(q.seller_rating):'')+(q.sales_count?' • '+esc(q.sales_count):'')+'</td><td>'+esc(q.trusted_score||0)+'/100</td><td>'+(q.product_url?'<a class="btn outline small" href="'+esc(q.product_url)+'" target="_blank" rel="noopener">🔗 Abrir</a>':'—')+'</td></tr>').join('')+'</tbody></table></div>';
  }
  async function configurarCaixinhaTerreiro(){
    await loadFunds();const p=window.__budgetFundPool||{total_received:0,notes:''};
    V().innerHTML='<h2>🏦 Caixinha Terreiro</h2><p class="lead">Informe quanto entrou no total de tudo e transforme esse valor em saldo disponível para os orçamentos.</p><form id="poolf" class="command-form"><label class="full">💰 Total que entrou<input name="total_received" type="number" min="0" step="0.01" value="'+Number(p.total_received||0)+'" required></label><label class="full">Observações<textarea name="notes" rows="4">'+esc(p.notes||'')+'</textarea></label><div class="full"><button class="btn gold">💾 Salvar saldo do Terreiro</button> <button type="button" class="btn secondary" onclick="compras()">Cancelar</button></div></form>';
    document.getElementById('poolf').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),q=await sb.from('budget_fund_pool').upsert({id:1,total_received:Number(d.total_received),notes:d.notes||null,updated_by:await actor(),updated_at:new Date().toISOString()},{onConflict:'id'});if(q.error){alert(q.error.message);return}await audit('update_budget_fund_pool','budget_fund_pool',1,{total_received:Number(d.total_received)});compras()};
  }
  function formCaixinha(x){
    V().innerHTML='<h2>📦 '+(x.id?'Editar':'Nova')+' caixinha de orçamento</h2><form id="af" class="command-form"><label>Aplicar em<select name="niche">'+NICHES.map(n=>'<option '+(x.niche===n?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label><label>Valor destinado<input name="allocated_amount" type="number" min="0" step="0.01" value="'+Number(x.allocated_amount||0)+'" required></label><label>Gasto já realizado<input name="spent_amount" type="number" min="0" step="0.01" value="'+Number(x.spent_amount||0)+'"></label><label class="full">Observações<textarea name="notes" rows="4">'+esc(x.notes||'')+'</textarea></label><div class="full"><button class="btn gold">💾 Salvar caixinha</button> <button type="button" class="btn secondary" onclick="compras()">Cancelar</button></div></form>';
    document.getElementById('af').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),payload={niche:d.niche,allocated_amount:Number(d.allocated_amount),spent_amount:Number(d.spent_amount||0),notes:d.notes||null,active:true,updated_at:new Date().toISOString()};const q=x.id?await sb.from('budget_fund_allocations').update(payload).eq('id',x.id):await sb.from('budget_fund_allocations').insert({...payload,created_by:await actor()});if(q.error){alert(q.error.message);return}await audit(x.id?'update_budget_fund_allocation':'create_budget_fund_allocation','budget_fund_allocations',x.id||null,{niche:d.niche,amount:Number(d.allocated_amount)});compras()};
  }
  function novaCaixinhaOrcamento(){formCaixinha({})}
  async function editarCaixinhaOrcamento(id){const r=await sb.from('budget_fund_allocations').select('*').eq('id',id).single();if(r.data)formCaixinha(r.data)}
  async function apagarCaixinhaOrcamento(id){if(!confirm('Apagar esta caixinha?'))return;const r=await sb.from('budget_fund_allocations').delete().eq('id',id);if(r.error){alert(r.error.message);return}await audit('delete_budget_fund_allocation','budget_fund_allocations',id,{});compras()}
  window.compras=compras;window.novoOrcamentoAvancado=novoOrcamentoAvancado;window.editarOrcamentoAvancado=editarOrcamentoAvancado;window.pesquisarOrcamentoOnline=pesquisarOrcamentoOnline;window.registrarCotacao=registrarCotacao;window.verCotacoes=verCotacoes;window.configurarCaixinhaTerreiro=configurarCaixinhaTerreiro;window.novaCaixinhaOrcamento=novaCaixinhaOrcamento;window.editarCaixinhaOrcamento=editarCaixinhaOrcamento;window.apagarCaixinhaOrcamento=apagarCaixinhaOrcamento;
  function boot(){setTimeout(()=>{window.compras=compras},100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();