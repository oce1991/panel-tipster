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
 const context={BACKTEST_MIN_MATCHES:6,buildBacktestMatchLogs:()=>({L:matches}),poissonPMF:(k,m)=>Math.exp(-m)*m**k/[1,1,2,6,24,120,720,5040,40320][k]};vm.createContext(context);vm.runInContext(source.slice(a,b),context);const result=context.runBacktest('L');assert.equal(result.bets,0,'El segundo encuentro del día no debe usar el primero');
 matches.push({d:'2024-01-07',h:'A',a:'B',hg:2,ag:1,oO25:3,oU25:3});assert.equal(context.runBacktest('L').bets,1,'El día siguiente sí debe utilizar resultados anteriores');
}
console.log('CSV de navegador y tarea: comillas, comas y datos incompletos correctos; prueba histórica sin filtración en el mismo día.');
(async()=>{
 const source=fs.readFileSync('index.html','utf8');const start=source.indexOf('async function saveTeamsState()'),end=source.indexOf('async function deleteLeagueRow(',start);let warnings=[];const ctx={MANUAL_TEAMS:[{liga:'Primera'}],SEASON_IMPORTS:[],FIXTURES:[],ligaSlug:()=> 'league_primera',alert:s=>warnings.push(s),console:{error:()=>{}},sbClient:{from:()=>({upsert:async()=>({error:{message:'Fallo de red'}})})}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);let rejected=false;try{await ctx.saveTeamsState()}catch{rejected=true}assert.ok(rejected,'El error de Supabase debe llegar al código que llama');assert.equal(warnings.length,1,'El usuario debe recibir un aviso');console.log('Errores de guardado: aviso y propagación correctos.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 const src=fs.readFileSync('index.html','utf8'),a=src.indexOf('async function requestAccountLink()'),b=src.indexOf('function getSupabaseConfig()',a);
 let requested; const fields={auth_status:{textContent:''},auth_email:{value:'user@example.org',validity:{valid:true}}};
 const ctx={document:{getElementById:id=>fields[id]},location:{origin:'https://example.org',pathname:'/panel/'},sbClient:{auth:{signInWithOtp:async opts=>(requested=opts,{error:null})}}};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);await ctx.requestAccountLink();
 assert.equal(requested.options.shouldCreateUser,false);assert.equal(requested.options.emailRedirectTo,'https://example.org/panel/');
 fields.auth_email.validity.valid=false;requested=null;await ctx.requestAccountLink();assert.equal(requested,null);
 console.log('Acceso: no crea usuarios y limita la redirección a la ruta del panel.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 const src=fs.readFileSync('actualizar-datos.js','utf8');const start=src.indexOf('async function authenticateSync()'),end=src.indexOf('// ---------- parseo',start);
 let calls=0;const ctx={SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SYNC_EMAIL:'updater@example.org',SUPABASE_SYNC_PASSWORD:'test-password',supabaseAccessToken:'public',fetch:async()=>{calls++;return {ok:true,json:async()=>({access_token:'session-token'})}}};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);await ctx.authenticateSync();assert.equal(calls,1);assert.equal(ctx.supabaseAccessToken,'session-token');
 ctx.fetch=async()=>({ok:false});await assert.rejects(ctx.authenticateSync(),/No se ha podido autenticar/);
 ctx.SUPABASE_SYNC_PASSWORD='';await assert.rejects(ctx.authenticateSync(),/incompleta/);
 console.log('Actualización: autenticación de servicio y errores verificados.');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const src=fs.readFileSync('index.html','utf8'),a=src.indexOf('async function readAllBackupRows('),b=src.indexOf('async function exportDatabaseBackup(',a);const ctx={};vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 function client(size,fail=false){let data=Array.from({length:size},(_,i)=>({id:String(i),data:{n:i}}));return {from:()=>({select:()=>({order:()=>({range:async(start,end)=>fail?{error:{message:'sin acceso'}}:{data:data.slice(start,end+1),count:size,error:null}})})})}}
 let result=await ctx.readAllBackupRows(client(245));assert.equal(result.length,245);assert.equal((await ctx.readAllBackupRows(client(0))).length,0);let rejected=false;try{await ctx.readAllBackupRows(client(10,true))}catch{rejected=true}assert.ok(rejected,'No debe generar copias incompletas ante errores');console.log('Copia de seguridad: paginación completa y rechazo de errores correctos.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
  const src=fs.readFileSync('index.html','utf8'),a=src.indexOf('async function archiveManualCSV('),b=src.indexOf('async function importCSV()',a);
  const {webcrypto}=require('node:crypto');let writes=[];
  const ctx={TextEncoder,Uint8Array,Date,String,Array,crypto:webcrypto,btoa:s=>Buffer.from(s,'binary').toString('base64'),sbClient:{from:()=>({upsert:async data=>(writes.push(data),{error:null})})}};
  vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
  const bytes=Buffer.from([0,44,255,10]),file={name:'x.csv',arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
  await ctx.archiveManualCSV(file,'Primera','26/27');await ctx.archiveManualCSV(file,'Primera','26/27');
  assert.equal(writes[0].id,writes[1].id);assert.deepEqual(Buffer.from(writes[0].data.contentBase64,'base64'),bytes);
  ctx.sbClient.from=()=>({upsert:async()=>({error:{message:'blocked'}})});await assert.rejects(ctx.archiveManualCSV(file,'Primera','26/27'));
  console.log('Archivo original: bytes, idempotencia y errores verificados.');
})().catch(e=>{console.error(e);process.exitCode=1});
