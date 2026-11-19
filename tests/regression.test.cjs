const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const file of ['index.html','actualizar-datos.js']){
 const source=fs.readFileSync(file,'utf8'),start=source.indexOf('const CSV_ALIASES = {'),end=source.indexOf('\nfunction ',source.indexOf('function parseCSVText(text)',start)+10);assert.ok(start>=0&&end>start);
 const context={};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const csv='Date,HomeTeam,AwayTeam,FTHG,FTAG,HC,AC,Referee\r\n01/05/2025,"Equipo, Norte",Sur,2,1,4,3,"Pérez ""Junior"""\r\n';
 let parsed=context.parseCSVText(csv);assert.equal(parsed.rows.length,1,file);assert.equal(parsed.rows[0].home,'Equipo, Norte',file);assert.equal(parsed.rows[0].fthg,2,file);assert.equal(parsed.rows[0].hc,4,file);assert.equal(parsed.rows[0].referee,'Pérez "Junior"',file);
 assert.match(context.parseCSVText('Date,HomeTeam,AwayTeam,FTHG,FTAG\n01/01/2025,"sin cerrar').error,/sin cerrar/,file);
}
{
 const source=fs.readFileSync('index.html','utf8'),a=source.indexOf('function runBacktest('),b=source.indexOf('function renderBacktest()',a);const matches=[];
 for(let n=1;n<=5;n++)matches.push({d:`2024-01-0${n}`,h:'A',a:'B',hg:2,ag:1,oO25:3,oU25:3});
 matches.push({d:'2024-01-06',h:'A',a:'B',hg:2,ag:1,oO25:3,oU25:3},{d:'2024-01-06',h:'A',a:'B',hg:2,ag:1,oO25:3,oU25:3});
 const context={BACKTEST_MIN_MATCHES:6,buildCombinedMatchLogs:()=>({L:matches}),poissonPMF:(k,m)=>Math.exp(-m)*m**k/[1,1,2,6,24,120,720,5040,40320][k]};vm.createContext(context);vm.runInContext(source.slice(a,b),context);const result=context.runBacktest('L');assert.equal(result.bets,0,'El segundo encuentro del día no debe usar el primero');
 matches.push({d:'2024-01-07',h:'A',a:'B',hg:2,ag:1,oO25:3,oU25:3});assert.equal(context.runBacktest('L').bets,1,'El día siguiente sí debe utilizar resultados anteriores');
}
console.log('CSV de navegador y tarea: comillas, comas y datos incompletos correctos; prueba histórica sin filtración en el mismo día.');
(async()=>{
 const source=fs.readFileSync('index.html','utf8');const start=source.indexOf('async function saveTeamsState()'),end=source.indexOf('async function deleteLeagueRow(',start);let warnings=[];const ctx={MANUAL_TEAMS:[{liga:'Primera'}],SEASON_IMPORTS:[],FIXTURES:[],ligaSlug:()=> 'league_primera',alert:s=>warnings.push(s),console:{error:()=>{}},sbClient:{from:()=>({upsert:async()=>({error:{message:'Fallo de red'}})})}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);let rejected=false;try{await ctx.saveTeamsState()}catch{rejected=true}assert.ok(rejected,'El error de Supabase debe llegar al código que llama');assert.equal(warnings.length,1,'El usuario debe recibir un aviso');console.log('Errores de guardado: aviso y propagación correctos.');
})().catch(e=>{console.error(e);process.exitCode=1});
