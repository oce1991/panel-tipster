(function(root){
'use strict';
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
function poissonOver(k,mu){let p=Math.exp(-mu),sum=p;for(let i=1;i<=k;i++){p*=mu/i;sum+=p}return Math.max(0,Math.min(1,1-sum))}
function validate(logs,opts={}){
 const from=opts.from||'0000-01-01',until=opts.until||'9999-12-31',minimum=6,seen=new Map(),conflicts=new Set();let rejected=0;
 for(const m of logs||[]){if(!m||typeof m.d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(m.d)||typeof m.h!=='string'||typeof m.a!=='string'||!valid(m.hg)||!valid(m.ag)){rejected++;continue}let key=[m.d,m.h,m.a].join('|'),old=seen.get(key);if(old&&(old.hg!==m.hg||old.ag!==m.ag||((valid(old.hc)&&valid(m.hc)&&old.hc!==m.hc)||(valid(old.ac)&&valid(m.ac)&&old.ac!==m.ac)))){conflicts.add(key);continue}if(!old)seen.set(key,m);else if(!valid(old.hc)&&valid(m.hc)&&valid(m.ac))seen.set(key,m)}
 const sorted=[...seen.entries()].filter(([k])=>!conflicts.has(k)).map(([,v])=>v).sort((a,b)=>a.d.localeCompare(b.d)),teams={},results={over15:[],over25:[],btts:[],corners95:[]};
 const entry=(team,side)=>{if(!teams[team])teams[team]={home:{n:0,gf:0,ga:0,cn:0,cf:0,ca:0},away:{n:0,gf:0,ga:0,cn:0,cf:0,ca:0}};return teams[team][side]};
 let leagueN=0,leagueHG=0,leagueAG=0,leagueCN=0,leagueC=0,skippedGoals=0,skippedCorners=0;
 for(let i=0;i<sorted.length;){let j=i;while(j<sorted.length&&sorted[j].d===sorted[i].d)j++;
  for(let k=i;k<j;k++){const m=sorted[k];if(m.d<from||m.d>until)continue;const h=entry(m.h,'home'),a=entry(m.a,'away');
   if(h.n>=minimum&&a.n>=minimum&&leagueN){const lh=(h.gf/h.n+a.ga/a.n)/2,la=(a.gf/a.n+h.ga/h.n)/2,avgH=leagueHG/leagueN,avgA=leagueAG/leagueN,actual=m.hg+m.ag;
    results.over15.push({p:poissonOver(1,lh+la),baseline:poissonOver(1,avgH+avgA),y:actual>1?1:0});results.over25.push({p:poissonOver(2,lh+la),baseline:poissonOver(2,avgH+avgA),y:actual>2?1:0});results.btts.push({p:(1-Math.exp(-lh))*(1-Math.exp(-la)),baseline:(1-Math.exp(-avgH))*(1-Math.exp(-avgA)),y:m.hg>0&&m.ag>0?1:0});
   }else skippedGoals++;
   if(valid(m.hc)&&valid(m.ac)&&h.cn>=minimum&&a.cn>=minimum&&leagueCN){const mu=(h.cf/h.cn+a.ca/a.cn+a.cf/a.cn+h.ca/h.cn)/2;results.corners95.push({p:poissonOver(9,mu),baseline:poissonOver(9,leagueC/leagueCN),y:m.hc+m.ac>9.5?1:0})}else skippedCorners++;
  }
  for(let k=i;k<j;k++){let m=sorted[k],h=entry(m.h,'home'),a=entry(m.a,'away');h.n++;h.gf+=m.hg;h.ga+=m.ag;a.n++;a.gf+=m.ag;a.ga+=m.hg;leagueN++;leagueHG+=m.hg;leagueAG+=m.ag;if(valid(m.hc)&&valid(m.ac)){h.cn++;h.cf+=m.hc;h.ca+=m.ac;a.cn++;a.cf+=m.ac;a.ca+=m.hc;leagueCN++;leagueC+=m.hc+m.ac}}
  i=j;
 }
 const metrics={};for(const [key,rows] of Object.entries(results)){let n=rows.length,bins=Array.from({length:5},(_,i)=>({low:i*20,high:(i+1)*20,n:0,sum:0,hits:0}));for(const x of rows){let b=bins[Math.min(4,Math.floor(x.p*5))];b.n++;b.sum+=x.p;b.hits+=x.y}metrics[key]={n,predicted:n?rows.reduce((s,x)=>s+x.p,0)/n:null,actual:n?rows.reduce((s,x)=>s+x.y,0)/n:null,brier:n?rows.reduce((s,x)=>s+(x.p-x.y)**2,0)/n:null,baseline:n?rows.reduce((s,x)=>s+(x.baseline-x.y)**2,0)/n:null,bins:bins.filter(b=>b.n)}}
 return {metrics,skippedGoals,skippedCorners,rejected,conflicts:conflicts.size,first:sorted[0]?.d||null,last:sorted.at(-1)?.d||null};
}
if(typeof module!=='undefined'&&module.exports)module.exports={validate,poissonOver};if(!root.document)return;
const d=root.document,$=id=>d.getElementById(id),safe=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
$('vm-run').addEventListener('click',()=>{const league=$('bt_liga').value,from=$('vm-from').value,until=$('vm-until').value,box=$('vm-result');box.style.display='block';if(!league){box.textContent='Selecciona una liga en el bloque superior.';return}if(from&&until&&from>until){box.textContent='La fecha inicial debe ser anterior a la final.';return}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),end=until&&until<today?until:today,r=validate(buildBacktestMatchLogs()[league]||[],{from,until:end});let html='<p><strong>'+safe(league)+'</strong> · Histórico disponible: '+safe(r.first||'—')+' a '+safe(r.last||'—')+'.</p><p class="hint">Evaluación por fecha con al menos 6 partidos anteriores en casa del local y 6 fuera del visitante. El historial anterior al periodo también sirve para preparar cada predicción.</p><div style="overflow-x:auto"><table><thead><tr><th>Mercado</th><th>Partidos</th><th>Probabilidad media</th><th>Frecuencia real</th><th>Brier modelo</th><th>Brier media de liga</th></tr></thead><tbody>';
 for(const [k,label] of [['over15','Más de 1,5 goles'],['over25','Más de 2,5 goles'],['btts','Ambos marcan'],['corners95','Más de 9,5 córneres']]){const x=r.metrics[k];html+='<tr><td>'+label+'</td><td>'+x.n+'</td><td>'+(x.n?fmtPct(x.predicted):'—')+'</td><td>'+(x.n?fmtPct(x.actual):'—')+'</td><td>'+(x.n?x.brier.toFixed(3):'—')+'</td><td>'+(x.n?x.baseline.toFixed(3):'—')+'</td></tr>'}html+='</tbody></table></div>';
 for(const [k,label] of [['over15','Más de 1,5 goles'],['over25','Más de 2,5 goles'],['btts','Ambos marcan'],['corners95','Más de 9,5 córneres']]){const x=r.metrics[k];if(!x.n)continue;html+='<details><summary>Calibración · '+label+'</summary><table><thead><tr><th>Intervalo</th><th>Partidos</th><th>Media prevista</th><th>Frecuencia real</th></tr></thead><tbody>'+x.bins.map(b=>'<tr><td>'+b.low+'–'+b.high+' %</td><td>'+b.n+'</td><td>'+fmtPct(b.sum/b.n)+'</td><td>'+fmtPct(b.hits/b.n)+'</td></tr>').join('')+'</tbody></table></details>'}
 const n=Math.max(...Object.values(r.metrics).map(x=>x.n));html+='<p class="hint">Omitidos por falta de historial o datos: goles '+r.skippedGoals+'; córneres '+r.skippedCorners+'. Registros no válidos: '+r.rejected+'; partidos duplicados con conflicto: '+r.conflicts+'.</p><p class="hint">Brier mide error de probabilidad: menor es mejor. La referencia usa la media de liga anterior a cada fecha. Es una prueba exploratoria de Poisson simplificado, no del modelo completo en directo; no incluye cuotas ni mide rentabilidad.</p>'+(n<50?'<p class="hint">Muestra pequeña: los resultados pueden variar mucho y no permiten concluir qué método es mejor.</p>':'');box.innerHTML=html;
});
})(typeof window!=='undefined'?window:globalThis);
