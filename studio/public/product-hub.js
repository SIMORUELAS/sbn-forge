'use strict';
(function () {
  const sections = [
    ['dashboard','⌂','Dashboard','Vista ejecutiva'],
    ['productos','◈','Productos','Catálogo del ecosistema'],
    ['aplicaciones','▣','Aplicaciones','Web, móvil y escritorio'],
    ['clientes','♧','Productos de clientes','Empresas usuarias'],
    ['socios','◇','Fabricantes y socios','Productos externos'],
    ['comercial','▤','Marketplace','Ofertas y publicaciones'],
    ['documentos','▧','Documentación y ayudas','Manuales y soporte'],
    ['capacitacion','▱','Capacitación','Cursos y certificaciones'],
    ['mejoras','↗','Mejora continua','Propuestas y seguimiento'],
    ['mercado','◎','Mercado y competencia','Oportunidades'],
    ['produccion','⚙','Producción y operación','Inventarios y cumplimiento'],
    ['finanzas','$','Finanzas e inversiones','Ingresos, costos y ROI'],
    ['reportes','▥','Reportes','Indicadores y estadísticas']
  ];
  const demoProducts = [
    {name:'SBN CRM',source:'SIMO TECNOLOGÍAS',type:'Software',status:'Activo',sales:5842},
    {name:'SBN CONNECT',source:'SIMO TECNOLOGÍAS',type:'Integración',status:'Activo',sales:2945},
    {name:'Sistema Administrativo ABC',source:'Fabricante externo',type:'Escritorio',status:'Publicado',sales:1842},
    {name:'Componentes Industriales',source:'Cliente SBN',type:'Producto físico',status:'Publicado',sales:3216},
    {name:'Consultoría Empresarial',source:'Cliente SBN',type:'Servicio',status:'Publicado',sales:1284}
  ];
  const el = (tag, cls, text) => { const node=document.createElement(tag); if (cls) { node.className=cls; } if (text!==undefined) { node.textContent=text; } return node; };
  const root=document.getElementById('product-hub-app');
  const sidebar=el('aside','ph-sidebar');
  const brand=el('div','ph-brand','⬡  SBN  Product Hub');
  sidebar.append(brand,el('div','ph-muted','PORTAFOLIO CORPORATIVO'));
  const nav=el('nav','ph-nav');
  sections.forEach(([id,icon,label,desc])=>{
    const btn=el('button','ph-navitem',icon+'  '+label);
    btn.type='button';btn.title=desc;btn.dataset.section=id;
    btn.addEventListener('click',()=>show(id));nav.append(btn);
  });
  sidebar.append(nav,el('div','ph-sidebar-foot','SIMO CORPORATION · Vista demostrativa'));
  const main=el('main','ph-main');
  const header=el('header','ph-header');
  const heading=el('div','', 'SBN  /  Product Hub');
  const headerActions=el('div','ph-header-actions');
  const demo=el('span','ph-demo','DATOS DEMOSTRATIVOS');
  const forge=el('a','ph-button ph-button-primary','↗ Abrir Forge Studio');
  forge.href='/';forge.title='Ir al prototipo existente de Forge Studio';
  const userDisplay=el('div','ph-user');
  userDisplay.append(el('span','ph-user-label','USUARIO DEL PORTAL'),el('strong','ph-user-name','Sin vincular'));
  const orgDisplay=el('div','ph-org-context');
  orgDisplay.append(
    el('span','ph-org-line','Empresa activa: No vinculada'),
    el('span','ph-org-line','Organización padre: No disponible')
  );
  userDisplay.append(orgDisplay);
  const userName=userDisplay.querySelector('.ph-user-name');
  const allowedPortalOrigins=['http://localhost:3000','http://127.0.0.1:3000'];
  window.addEventListener('message',(event)=>{
    if (!allowedPortalOrigins.includes(event.origin) ||
        event.source!==window.opener ||
        event.data?.type!=='SBN_PRODUCT_HUB_IDENTITY_DISPLAY') {
      return;
    }
    const name=typeof event.data.name==='string'?event.data.name.trim().slice(0,120):'';
    userName.textContent=name||'Usuario SBN';
    userName.title=typeof event.data.email==='string'?event.data.email.slice(0,160):'';
    const active=typeof event.data.activeOrganization==='string'?event.data.activeOrganization.trim().slice(0,120):'';
    const parent=typeof event.data.parentOrganization==='string'?event.data.parentOrganization.trim().slice(0,120):'';
    orgDisplay.children[0].textContent='Empresa activa: '+(active||'No disponible');
    orgDisplay.children[1].textContent='Organización padre: '+(parent||'No disponible');
  });
  if (window.opener) {
    allowedPortalOrigins.forEach(origin=>{
      window.opener.postMessage({type:'SBN_PRODUCT_HUB_IDENTITY_REQUEST'},origin);
    });
  }
  headerActions.append(userDisplay,demo,forge);header.append(heading,headerActions);
  const content=el('div','ph-content');
  main.append(header,content);root.append(sidebar,main);
  function panel(title){const p=el('section','ph-panel');p.append(el('h2','',title));return p;}
  function metric(label,value,sub){const c=el('div','ph-metric');c.append(el('span','ph-muted',label),el('strong','',value),el('small','ph-positive',sub));return c;}
  function renderDashboard(){
    const hero=el('section','ph-hero');
    const left=el('div');left.append(el('span','ph-eyebrow','SIMO CORPORATION · GOBIERNO DE PRODUCTOS'),el('h1','','SBN Product Hub'),el('p','','Administra productos, desarrollo, mercado, documentación, capacitación y rentabilidad desde un mismo centro.'));
    hero.append(left);content.append(hero);
    const links=el('div','ph-links');
    [['⬡','SBN Forge Studio','Ingeniería, equipos y agentes IA','/'],['▣','Marketplace','Publicación y comercialización','#comercial'],['▤','Catálogo unificado','Productos propios, terceros y clientes','#productos'],['◎','Inteligencia de mercado','Competencia y oportunidades','#mercado']].forEach(([icon,title,subtitle,url])=>{
      const a=el('a','ph-link');a.href=url;a.append(el('span','ph-link-icon',icon),el('strong','',title),el('small','',subtitle));links.append(a);
    });content.append(links);
    const stats=el('div','ph-stats');
    [['Productos registrados','4,126','Ejemplo'],['Productos SIMO','187','Ejemplo'],['Fabricantes externos','856','Ejemplo'],['Productos de clientes','3,041','Ejemplo'],['Rentabilidad global','18.4 %','Ejemplo']].forEach(m=>stats.append(metric(...m)));
    content.append(stats);
    const grid=el('div','ph-grid');
    const productPanel=panel('Productos destacados');
    const table=el('table','ph-table');
    const thead=el('thead');const hr=el('tr');
    ['Producto','Origen','Categoría','Estado','Ventas (demo)'].forEach(x=>hr.append(el('th','',x)));thead.append(hr);table.append(thead);
    const tbody=el('tbody');demoProducts.forEach(p=>{const tr=el('tr');[p.name,p.source,p.type,p.status,p.sales.toLocaleString('es-MX')].forEach((x,i)=>tr.append(el('td',i===3?'ph-good':'',x)));tbody.append(tr);});table.append(tbody);productPanel.append(table);
    const finance=panel('Ingresos y rentabilidad');
    finance.append(el('p','ph-muted','Datos ilustrativos, sin conexión a sistemas financieros.'));
    const bars=el('div','ph-bars');
    [42,52,48,60,58,65,71,62,82,77,90,76].forEach((h,i)=>{const bar=el('div','ph-bar');bar.style.height=h+'%';bar.title='Mes '+(i+1)+' · ejemplo';bars.append(bar);});finance.append(bars);
    grid.append(productPanel,finance);content.append(grid);
    const lower=el('div','ph-lower');
    [['Documentación y ayudas','42 manuales · 26 artículos · 12 tutoriales'],['Capacitación','3 cursos · certificaciones y guías'],['Mejora continua','48 propuestas · 12 en desarrollo'],['Producción','Inventario, órdenes y cumplimiento'],['Inversiones','Costos, ROI y rentabilidad por producto'],['Equipos y agentes IA','Asignaciones, revisiones y auditoría']].forEach(([title,detail])=>{const p=panel(title);p.append(el('p','ph-muted',detail));lower.append(p);});content.append(lower);
  }
  function renderSection(id){
    const item=sections.find(s=>s[0]===id);
    const hero=el('section','ph-hero');
    const wrap=el('div');wrap.append(el('span','ph-eyebrow','SBN PRODUCT HUB'),el('h1','',item[2]),el('p','',item[3]));hero.append(wrap);content.append(hero);
    const notice=panel('Módulo preparado para integración');
    notice.append(el('p','ph-muted','La interfaz de '+item[2]+' está definida. Las operaciones, métricas y permisos reales se conectarán a las APIs autorizadas; todavía no se han implementado escrituras ni consultas a producción.'));
    if(id==='productos'||id==='clientes'||id==='socios'){
      const table=el('table','ph-table');const head=el('tr');
      ['Producto','Origen','Tipo','Estado'].forEach(t=>head.append(el('th','',t)));table.append(head);
      demoProducts.filter(p=>id==='productos'||(id==='clientes'?p.source==='Cliente SBN':p.source==='Fabricante externo')).forEach(p=>{const row=el('tr');[p.name,p.source,p.type,p.status].forEach(t=>row.append(el('td','',t)));table.append(row);});notice.append(table);
    }
    content.append(notice);
  }
  function show(id){
    if(!sections.some(s=>s[0]===id)){id='dashboard';}
    content.replaceChildren();
    nav.querySelectorAll('button').forEach(b=>{b.classList.toggle('ph-active',b.dataset.section===id);b.setAttribute('aria-current',b.dataset.section===id?'page':'false');});
    if(id==='dashboard'){renderDashboard();}else{renderSection(id);}
    if(window.location.hash.slice(1)!==id){window.location.hash=id;}
  }
  window.addEventListener('hashchange',()=>show(window.location.hash.slice(1)));
  show(window.location.hash.slice(1));
}());
