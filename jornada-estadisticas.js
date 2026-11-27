(function(root){
'use strict';
const markets={corners:{title:'Córneres',keys:['hc','ac'],line:4.5},goals:{title:'Goles',keys:['hg','ag'],line:1.5},shots:{title:'Tiros',keys:['hs','as'],line:9.5},target:{title:'Tiros a puerta',keys:['hst','ast'],line:3.5},fouls:{title:'Faltas',keys:['hf','af'],line:9.5},cards:{title:'Tarjetas registradas',keys:['hCards','aCards'],line:1.5}};
const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0;
function calculate(rows,team,venue,market,line,limit,cutoff,side='for'){
 const spec=markets[market==='btts'?'goals':market];if(!spec||!['home','away','all'].includes(venue)||!['for','against','total'].includes(side)||(market!=='btts'&&(!Number.isFinite(line)||line<0||line>100))||![5,10,20,50].includes(limit))throw Error('Filtros inválidos');
 const seen=new Set();const selected=(rows||[]).filter(x=>x&&x.d&&x.d<cutoff&&(venue==='all'?(x.h===team||x.a===team):venue==='home'?x.h===team:x.a===team)).sort((a,b)=>String(b.d).localeCompare(String(a.d))).filter(x=>{let k=[x.d,x.h,x.a].join('|');if(seen.has(k))return false;seen.add(k);return true}).slice(0,limit);
 let missing=0;const games=[];for(const x of selected){let h=x[spec.keys[0]],a=x[spec.keys[1]];if(!valid(h)||!valid(a)){missing++;continue}let isHome=x.h===team,own=Number(isHome?h:a),against=Number(isHome?a:h),value=side==='total'?own+against:side==='against'?against:own;games.push({date:x.d,home:x.h,away:x.a,own,against,value,hit:market==='btts'?own>0&&against>0:value>line})}const n=games.length;return{reviewed:selected.length,missing,count:n,avg:n?games.reduce((sum,g)=>sum+g.value,0)/n:null,against:n?games.reduce((sum,g)=>sum+g.against,0)/n:null,hits:games.filter(g=>g.hit).length,games};
}
if(typeof module!=='undefined'&&module.exports)module.exports={calculate};if(!root.document)return;
const d=root.document,$=id=>d.getElementById(id),view=$('view-stats');if(!view)return;
const style=d.createElement('style');style.textContent=`
.sj-match-title{margin:20px 0 14px;color:#f4f6f2;font-size:19px}.sj-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.sj-team-card{background:#2c3234;border:1px solid #46504c;border-radius:14px;padding:18px;min-width:0}.sj-team-card h4{color:#f6f8f4;font-size:17px;margin:0}.sj-subtitle{color:#c1c9c3;font-size:13px;margin:5px 0 15px}.sj-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px}.sj-metric{background:#222829;border:1px solid #3c4742;border-radius:10px;padding:12px;min-width:0}.sj-metric span{display:block;color:#c9d2c9;font-size:12px;line-height:1.3}.sj-metric strong{display:block;color:#c8ff37;font-size:25px;line-height:1.2;margin-top:6px}.sj-coverage{font-size:12px;color:#c3cdc4;margin:12px 0}.sj-details{border-top:1px solid #46504c;margin-top:12px;padding-top:12px}.sj-details summary{cursor:pointer;color:#e8f2e7;font-weight:700}.sj-game{display:flex;justify-content:space-between;align-items:center;gap:10px;border-bottom:1px solid #45504b;padding:10px 0}.sj-game-info{min-width:0}.sj-game-info span,.sj-game-info strong{display:block}.sj-game-info span{font-size:11px;color:#bac7bc}.sj-game-info strong{font-size:12px;color:#f0f4ef;line-height:1.4}.sj-game-result{text-align:right;flex-shrink:0}.sj-game-result strong,.sj-game-result span{display:block}.sj-game-result strong{font-size:19px;color:#f5f8f2}.sj-game-result span{font-size:11px}.sj-hit{color:#c8ff37}.sj-miss{color:#c6cdca}@media(max-width:700px){.sj-grid{grid-template-columns:1fr}.sj-team-card{padding:14px}.sj-metric strong{font-size:22px}}
`;d.head.append(style);
const area=d.createElement('div');area.className='card';area.innerHTML='<h2>Analiza un partido de la jornada</h2><p class="hint">Selecciona una liga y una jornada para abrir la ficha con sus datos disponibles. Los partidos proceden de tus calendarios cargados.</p><div class="grid2"><div><label for="sj-league">Liga</label><select id="sj-league"></select></div><div><label for="sj-round">Jornada</label><select id="sj-round"></select></div><div><label for="sj-match">Partido</label><select id="sj-match"></select></div><div><label for="sj-window">Últimos partidos por condición</label><select id="sj-window"><option>5</option><option selected>10</option><option>20</option><option value="50">Hasta 50</option></select></div><div><label for="sj-venue">Condición de los partidos</label><select id="sj-venue"><option value="match">Local en casa y visitante fuera</option><option value="all">Todos los partidos</option><option value="home">Ambos equipos en casa</option><option value="away">Ambos equipos fuera</option></select></div><div><label for="sj-market">Mercado</label><select id="sj-market"><option value="corners">Córneres</option><option value="goals">Goles</option><option value="btts">Ambos marcan</option><option value="shots">Tiros</option><option value="target">Tiros a puerta</option><option value="fouls">Faltas</option><option value="cards">Tarjetas registradas</option></select></div><div id="sj-side-wrap"><label for="sj-side">Qué quieres analizar</label><select id="sj-side"><option value="total">Total del partido</option><option value="for">A favor del equipo</option><option value="against">En contra del equipo</option></select></div><div id="sj-line-wrap"><label for="sj-line">Línea: más de</label><input id="sj-line" type="number" min="0" max="100" step="0.5" value="9.5"></div></div><p class="hint" id="sj-status" aria-live="polite"></p><div id="sj-result"></div><p class="hint">Son frecuencias históricas, no probabilidades pronosticadas. Las tarjetas corresponden a las registradas en la fuente, no a puntos de una casa. Los datos ausentes no cuentan como cero.</p>';view.insertBefore(area,view.firstChild);
const show=n=>root.displayTeamName?.(n)||n;function add(sel,value,text){let o=d.createElement('option');o.value=value;o.textContent=text;sel.append(o)}
function fixtureId(f){return String(f.id)}
function selectLeague(value){const s=$('sj-league'),old=value||s.value;s.replaceChildren();let ligas=[...new Set(FIXTURES.map(f=>f.liga).filter(Boolean))].sort((a,b)=>a.localeCompare(b));ligas.forEach(l=>add(s,l,l));if(ligas.includes(old))s.value=old;selectRound()}
function selectRound(value){const league=$('sj-league').value,s=$('sj-round'),old=value||s.value;s.replaceChildren();let rounds=[...new Set(FIXTURES.filter(f=>f.liga===league).map(f=>String(f.jornada)))].sort((a,b)=>(Number(a)||0)-(Number(b)||0)||a.localeCompare(b));rounds.forEach(j=>add(s,j,'Jornada '+j));if(rounds.includes(old))s.value=old;else{const recent=typeof suggestCurrentJornada==='function'?suggestCurrentJornada(FIXTURES.filter(f=>f.liga===league),rounds):null;if(recent&&rounds.includes(String(recent)))s.value=String(recent)}selectMatch()}
function selectMatch(value){const l=$('sj-league').value,j=$('sj-round').value,s=$('sj-match'),old=value||s.value;s.replaceChildren();let list=FIXTURES.filter(f=>f.liga===l&&String(f.jornada)===j);list.forEach(f=>{const sc=fixtureSchedule(f);add(s,fixtureId(f),show(f.local)+' — '+show(f.visitante)+(sc.date?' · '+sc.date.split('-').reverse().join('/'): '')+' · '+(sc.time?sc.time+' h':'Hora pendiente'))});if(list.some(f=>fixtureId(f)===String(old)))s.value=String(old);render()}
function resolve(name,league){let found=findTeamInLiga(name,league);return found&&typeof found.name==='string'?found.name:null}
function makeNode(tag,text,cls){let x=d.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x}
function render(){
 const out=$('sj-result'),status=$('sj-status');out.replaceChildren();
 const fixture=FIXTURES.find(f=>fixtureId(f)===$('sj-match').value&&f.liga===$('sj-league').value),raw=$('sj-line').value,line=Number(raw),market=$('sj-market').value,side=$('sj-side').value,n=Number($('sj-window').value),isBtts=market==='btts';
 $('sj-side-wrap').style.display=isBtts?'none':'';$('sj-line-wrap').style.display=isBtts?'none':'';
 if(!fixture){status.textContent='No hay partidos en esta jornada. Importa un calendario para consultarlos.';return}
 if(!isBtts&&(raw===''||!Number.isFinite(line)||line<0||line>100)){status.textContent='Introduce una línea entre 0 y 100.';return}
 let home=resolve(fixture.local,fixture.liga),away=resolve(fixture.visitante,fixture.liga);
 if(!home||!away||home===away){status.textContent='No se han podido relacionar ambos equipos con sus estadísticas. Revisa sus equivalencias y los datos cargados.';return}
 let schedule=fixtureSchedule(fixture),date=schedule.date;
 let today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let cutoff=date&&date<today?date:today,rows=buildCombinedMatchLogs()[fixture.liga]||[];
 let label=isBtts?'Ambos marcan':markets[market].title+' · '+({total:'total del partido',for:'a favor',against:'en contra'})[side]+' · más de '+line;
 status.textContent=(date?'Partido: '+date.split('-').reverse().join('/')+' · '+(schedule.time?schedule.time+' h':'hora pendiente')+' · ':'')+'Histórico anterior al '+cutoff+' · '+label+'.';
 out.append(makeNode('h3',show(fixture.local)+' vs '+show(fixture.visitante),'sj-match-title'));
 let overview=makeNode('div',undefined,'sj-grid');
 let grid=makeNode('div',undefined,'sj-grid');
 for(const [name,venue,venueLabel] of [[home,'home','Local en casa'],[away,'away','Visitante fuera']]){
  const chosenVenue=$('sj-venue').value==='match'?venue:$('sj-venue').value;
  venueLabel=chosenVenue==='all'?'Todos los partidos':chosenVenue==='home'?'Partidos en casa':'Partidos fuera';
  let v=calculate(rows,name,chosenVenue,market,line,n,cutoff,side),box=makeNode('section',undefined,'sj-team-card');
  box.append(makeNode('h4',show(name)),makeNode('p',venueLabel,'sj-subtitle'));
  let metrics=makeNode('div',undefined,'sj-metrics');
  function metric(caption,value){let item=makeNode('div',undefined,'sj-metric');item.append(makeNode('span',caption),makeNode('strong',value));metrics.append(item)}
  if(!isBtts)metric(side==='total'?'Media total':side==='for'?'Media a favor':'Media en contra',v.count?v.avg.toFixed(2):'—');
  metric(isBtts?'Ambos marcan':'Supera la línea',v.count?Math.round(v.hits/v.count*100)+' %':'—');
  metric('Partidos cumplidos',v.count?v.hits+' / '+v.count:'—');
  box.append(metrics,makeNode('p',v.count+' con datos de '+v.reviewed+' revisados · '+v.missing+' sin datos'+(v.count<5?' · Muestra pequeña':''),'sj-coverage'));
  let quick=makeNode('div',undefined,'sj-coverage');
  for(const [m,ln,label] of [['corners',9.5,'Córneres +9,5'],['goals',1.5,'Goles +1,5'],['goals',2.5,'Goles +2,5'],['btts',0,'Ambos marcan'],['shots',19.5,'Tiros +19,5'],['cards',4.5,'Tarjetas +4,5']]){let q=calculate(rows,name,chosenVenue,m,ln,n,cutoff,'total');quick.append(makeNode('p',label+': '+(q.count?q.hits+'/'+q.count+' · '+Math.round(q.hits/q.count*100)+' %':'Sin datos')+(q.missing?' · '+q.missing+' sin datos':'')))}
  box.append(makeNode('strong','Resumen de mercados'),quick);
  let details=makeNode('details',undefined,'sj-details');details.append(makeNode('summary','Ver partidos'));
  for(const g of v.games){let row=makeNode('div',undefined,'sj-game');let info=makeNode('div',undefined,'sj-game-info');info.append(makeNode('span',g.date),makeNode('strong',show(g.home)+' — '+show(g.away)));let score=makeNode('div',undefined,'sj-game-result');score.append(makeNode('strong',g.own+' / '+g.against),makeNode('span',isBtts?(g.hit?'Ambos marcan':'No marcan ambos'):(g.hit?'Supera':'No supera'),g.hit?'sj-hit':'sj-miss'));row.append(info,score);details.append(row)}
  if(v.games.length)details.append(makeNode('p','Valores: a favor / en contra del equipo analizado.','sj-coverage'));
  box.append(details);grid.append(box)
 }
 out.append(grid)
}
$('sj-league').addEventListener('change',()=>selectRound());$('sj-round').addEventListener('change',()=>selectMatch());$('sj-match').addEventListener('change',render);$('sj-window').addEventListener('change',render);$('sj-venue').addEventListener('change',render);$('sj-market').addEventListener('change',()=>{let market=$('sj-market').value;if(market!=='btts')$('sj-line').value=$('sj-side').value==='total'?({corners:9.5,goals:2.5,shots:19.5,target:7.5,fouls:24.5,cards:4.5})[market]:markets[market].line;render()});$('sj-side').addEventListener('change',()=>{let market=$('sj-market').value;if(market!=='btts')$('sj-line').value=$('sj-side').value==='total'?({corners:9.5,goals:2.5,shots:19.5,target:7.5,fouls:24.5,cards:4.5})[market]:markets[market].line;render()});$('sj-line').addEventListener('input',render);d.querySelector('nav.tabs').addEventListener('click',e=>{if(e.target.closest('button')?.dataset.view==='stats')selectLeague()});
root.openFixtureStats=function(id){const f=FIXTURES.find(x=>fixtureId(x)===String(id));if(!f)return;switchToView('stats');selectLeague(f.liga);selectRound(String(f.jornada));selectMatch(fixtureId(f));area.scrollIntoView({behavior:'smooth',block:'start'})};
})(typeof window!=='undefined'?window:globalThis);



