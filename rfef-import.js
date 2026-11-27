(function(root){
'use strict';
const LIGAS={'1':'1ª RFEF - Grupo 1','2':'1ª RFEF - Grupo 2'};
const aliases={
 'ad merida':'merida','arenas getxo':'arenas','ath bilbao b':'bilbao athletic','cd extremadura':'extremadura 1924','cacereno':'cacereno','cultural leonesa':'cultural','dep fabril':'fabril','r union':'real union','racing club ferrol':'racing ferrol','real aviles':'real aviles','ud logrones':'ud logrones','unionistas':'unionistas salamanca',
 'aguilas fc':'aguilas f c','alcorcon':'alcorcon','atl madrid b':'atletico de madrid b','ce europa':'europa','fc cartagena sad':'cartagena','gimnastic':'nastic','hercules':'hercules','jaen':'real jaen','murcia':'real murcia','real madrid b':'real madrid castilla','torremolinos':'juventud torremolinos','ud ibiza':'ibiza'
};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const team=s=>{const n=norm(s);return aliases[n]||n};
const fields={fthg:'Goals_H_FT',ftag:'Goals_A_FT',hc:'Corners_H',ac:'Corners_A',hs:'Shots_H',as:'Shots_A',hst:'ShotsOnTarget_H',ast:'ShotsOnTarget_A',hf:'Fouls_H',af:'Fouls_A',yellowHome:'Yellow_Cards_H',yellowAway:'Yellow_Cards_A',redHome:'Red_Cards_H',redAway:'Red_Cards_A',xgHome:'xG_H',xgAway:'xG_A',possessionHome:'Possession_H',possessionAway:'Possession_A'};
const labels={fthg:'Goles local',ftag:'Goles visitante',hc:'Córneres local',ac:'Córneres visitante',hs:'Tiros local',as:'Tiros visitante',hst:'Tiros a puerta local',ast:'Tiros a puerta visitante',hf:'Faltas local',af:'Faltas visitante',hCards:'Tarjetas local',aCards:'Tarjetas visitante',yellowHome:'Amarillas local',yellowAway:'Amarillas visitante',redHome:'Rojas local',redAway:'Rojas visitante',xgHome:'xG local',xgAway:'xG visitante',possessionHome:'Posesión local',possessionAway:'Posesión visitante'};
function numberValue(raw,key){if(raw===undefined||raw===null||String(raw).trim()==='')return null;const n=Number(String(raw).trim());if(!Number.isFinite(n)||n<0||(!key.startsWith('xg')&&!Number.isInteger(n))||((key==='possessionHome'||key==='possessionAway')&&n>100))throw Error('Valor inválido en '+key);return n}
function getDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null}
function analyse(records,group,fixtures,existing,today){
 const liga=LIGAS[group];if(!liga)throw Error('Selecciona un grupo válido.');if(!Array.isArray(records)||records.length<2)throw Error('El archivo está vacío.');
 const header=records[0].map(x=>String(x).replace(/^\uFEFF/,'').trim()),cols=Object.fromEntries(header.map((k,i)=>[k,i]));for(const k of ['League','Season','Date','Status','Round','Home','Away','Goals_H_FT','Goals_A_FT'])if(cols[k]===undefined)throw Error('Falta la columna '+k+'. Utiliza el CSV original de FutPythonTrader.');
 const now=new Date(today+'T12:00:00Z'),year=now.getUTCFullYear()-(now.getUTCMonth()<6?1:0),season=year+'/'+(year+1);
 const index=new Map();for(const f of fixtures.filter(f=>f.liga===liga)){const k=[String(f.jornada),team(f.local),team(f.visitante)].join('|');let a=index.get(k)||[];a.push(f);index.set(k,a)}
 const old=new Map();for(const r of existing||[]){if(r.fxId){const key=String(r.fxId);if(old.has(key))throw Error('Hay resultados duplicados para un partido ya guardado; revísalos antes de importar.');old.set(key,r)}}
 const parsed=[],issues=[];
 for(let i=1;i<records.length;i++){
  const x=records[i],get=k=>cols[k]===undefined?'':String(x[cols[k]]??'').trim();let sourceLeague=get('League'),sourceSeason=get('Season');
  if(!new RegExp('(?:group|grupo)\\s*'+group+'\\s*$','i').test(sourceLeague)||!/rfef/i.test(sourceLeague)||sourceSeason!==season)throw Error('Fila '+(i+1)+': el grupo o la temporada no coincide con '+liga+' '+season+'.');
  if(get('Status').toLowerCase()!=='complete'){issues.push('Fila '+(i+1)+': partido no finalizado.');continue}
  const date=getDate(get('Date'));if(!date||date>today){issues.push('Fila '+(i+1)+': fecha inválida o futura.');continue}
  const key=[get('Round'),team(get('Home')),team(get('Away'))].join('|'),matches=index.get(key)||[];
  if(matches.length!==1){issues.push('Fila '+(i+1)+': '+get('Home')+' – '+get('Away')+' (jornada '+get('Round')+'): '+(matches.length?'calendario ambiguo':'sin coincidencia exacta en el calendario')+'.');continue}
  const fx=matches[0],before=old.get(String(fx.id))||null;if(before?.sourceId&&get('Id_Game')&&before.sourceId!==get('Id_Game')){issues.push('Fila '+(i+1)+': '+fx.local+' – '+fx.visitante+' tiene otro identificador de origen; no se actualizará.');continue}
  try{
   const incoming={};for(const [k,v] of Object.entries(fields))incoming[k]=numberValue(get(v),k);
   if(incoming.fthg===null||incoming.ftag===null)throw Error('faltan goles');
   incoming.hCards=incoming.yellowHome!==null&&incoming.redHome!==null?incoming.yellowHome+incoming.redHome:null;
   incoming.aCards=incoming.yellowAway!==null&&incoming.redAway!==null?incoming.yellowAway+incoming.redAway:null;
   const changes=[],conflicts=[];for(const [k,value] of Object.entries(incoming))if(value!==null&&before?.[k]!==value){if(before?.[k]!==null&&before?.[k]!==undefined)conflicts.push({key:k,old:before[k],value});else changes.push({key:k,value})}
   parsed.push({fx,incoming,before,changes,conflicts,date,sourceId:get('Id_Game')});
  }catch(e){issues.push('Fila '+(i+1)+': '+e.message+'.')}
 }
 const occurrences=new Map();for(const p of parsed){const k=String(p.fx.id);occurrences.set(k,(occurrences.get(k)||0)+1)}
 const unique=parsed.filter(p=>{if(occurrences.get(String(p.fx.id))>1){issues.push(p.fx.local+' – '+p.fx.visitante+': encuentro duplicado en el archivo; no se importará.');return false}return true});
 return {liga,season,items:unique,issues};
}
function merge(plan,accept){return plan.items.map(p=>{const r={...(p.before||{}),fxId:p.fx.id,home:p.fx.local,away:p.fx.visitante};for(const c of p.changes)r[c.key]=c.value;for(const c of p.conflicts)if(accept.has(String(p.fx.id)))r[c.key]=c.value;
 for(const [total,yellow,red] of [['hCards','yellowHome','redHome'],['aCards','yellowAway','redAway']]){const unresolved=p.conflicts.some(c=>c.key===total)&&!accept.has(String(p.fx.id));if(!unresolved && r[yellow]!=null && r[red]!=null)r[total]=r[yellow]+r[red];}
 if(accept.has(String(p.fx.id)) && Array.isArray(r.sourceConflicts)){const acceptedKeys=new Set(p.conflicts.map(c=>c.key));r.sourceConflicts=r.sourceConflicts.filter(c=>!acceptedKeys.has(c.field));if(!r.sourceConflicts.length)delete r.sourceConflicts;}
 // Solo el CSV con rojas y amarillas completas puede establecer un total nuevo.
 r.dateSort=p.date;r.source='FutPythonTrader';if(p.sourceId)r.sourceId=p.sourceId;return r})}
if(typeof module!=='undefined'&&module.exports)module.exports={analyse,merge,team};
if(!root.document)return;
const d=root.document,$=id=>d.getElementById(id);let plan=null,snapshot=null;
const safe=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function reset(){plan=null;snapshot=null;$('rfef-apply').disabled=true;$('rfef-review').innerHTML=''}
$('rfef-file').addEventListener('change',reset);$('rfef-group').addEventListener('change',reset);
$('rfef-preview').addEventListener('click',async()=>{
 reset();const box=$('rfef-review'),file=$('rfef-file').files[0];if(!file){box.textContent='Selecciona un CSV.';return}box.textContent='Comprobando archivo y datos guardados…';
 try{
  if(file.size>10*1024*1024)throw Error('El archivo supera 10 MB.');
  const {data,error}=await sbClient.from('tipster_data').select('data,updated_at').eq('id','manual_results').maybeSingle();if(error||!data||!data.data?.manualResults||!data.updated_at)throw Error('No se han podido leer los resultados actuales. Comprueba la conexión.');
  const rows=parseCSVRecords(await file.text());const group=$('rfef-group').value,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  plan=analyse(rows,group,FIXTURES,data.data.manualResults[LIGAS[group]]||[],today);snapshot=data.updated_at;
  const fresh=plan.items.filter(x=>!x.before).length,conf=plan.items.filter(x=>x.conflicts.length),unchanged=plan.items.filter(x=>x.before&&!x.changes.length&&!x.conflicts.length).length;
  let html='<p><strong>'+safe(plan.liga)+' · '+safe(plan.season)+'</strong></p><p>'+plan.items.length+' partidos identificados · '+fresh+' nuevos · '+(plan.items.length-fresh-unchanged)+' con datos nuevos o diferentes · '+unchanged+' sin cambios estadísticos · '+plan.issues.length+' incidencias.</p>';
  if(conf.length){html+='<p>Hay '+conf.length+' partidos con discrepancias. Por defecto se mantienen los valores guardados; marca solo los partidos cuyos valores del archivo quieras aceptar.</p><div style="max-height:360px;overflow:auto">';for(const x of conf){html+='<label style="display:block;margin:12px 0;padding:10px;border:1px solid var(--line);border-radius:8px"><input type="checkbox" class="rfef-conflict" value="'+safe(x.fx.id)+'" style="width:auto;margin-right:8px"><strong>'+safe(x.fx.local)+' – '+safe(x.fx.visitante)+'</strong> · jornada '+safe(x.fx.jornada)+'<br><span class="hint">'+x.conflicts.map(c=>safe(labels[c.key]||c.key)+': '+safe(c.old)+' → '+safe(c.value)).join(' · ')+'</span></label>'}html+='</div>'}
  if(plan.issues.length)html+='<details><summary>Ver '+plan.issues.length+' incidencias omitidas</summary><ul>'+plan.issues.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></details>';
  html+='<p class="hint">Los valores vacíos no sustituyen los datos existentes. Los totales de tarjetas se importan solo si constan amarillas y rojas. La importación no borra partidos que no estén en el archivo.</p>';box.innerHTML=html;$('rfef-apply').disabled=!plan.items.length;
 }catch(e){plan=null;box.textContent='No se puede preparar la importación: '+e.message}
});
$('rfef-apply').addEventListener('click',async()=>{
 if(!plan||!snapshot)return;const button=$('rfef-apply'),box=$('rfef-review');button.disabled=true;
 try{
  const {data,error}=await sbClient.from('tipster_data').select('data,updated_at').eq('id','manual_results').maybeSingle();if(error||!data||data.updated_at!==snapshot)throw Error('Los datos han cambiado desde la revisión. Vuelve a analizar el archivo.');
  const accepted=new Set([...d.querySelectorAll('.rfef-conflict:checked')].map(x=>x.value)),updated=merge(plan,accepted),existing=data.data.manualResults[plan.liga]||[],map=new Map(updated.map(x=>[String(x.fxId),x]));
  const result=existing.map(x=>map.has(String(x.fxId))?(map.get(String(x.fxId))):(x));const known=new Set(existing.map(x=>String(x.fxId)));for(const x of updated)if(!known.has(String(x.fxId)))result.push(x);
  const next={...data.data,manualResults:{...data.data.manualResults,[plan.liga]:result}},stamp=new Date().toISOString();
  const saved=await sbClient.from('tipster_data').update({data:next,updated_at:stamp}).eq('id','manual_results').eq('updated_at',snapshot).select('id');
  if(saved.error||!saved.data||saved.data.length!==1)throw Error('No se ha podido guardar o los datos cambiaron. Vuelve a analizar el archivo.');
  MANUAL_RESULTS=next.manualResults;const league=plan.liga;box.textContent='Importación guardada: '+updated.length+' partidos revisados. Discrepancias aceptadas: '+accepted.size+'. Las no marcadas conservaron sus valores anteriores.';plan=null;snapshot=null;
  try{rebuildManualSeasonImport(league);recomputeTeams();renderTeams();refreshJornadaSelect();refreshStandingsLigaSelect();}catch(refreshError){console.error(refreshError);box.textContent+=' Recarga la página para actualizar las vistas.';}
 }catch(e){box.textContent='Importación no completada: '+e.message;plan=null;snapshot=null}
});
})(typeof window!=='undefined'?window:globalThis);
