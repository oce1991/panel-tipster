// ============================================================
// ACTUALIZAR DATOS — descarga los CSV de football-data.co.uk
// directamente desde el servidor de GitHub (sin proxy, sin CORS)
// y actualiza tu Supabase. Reemplaza a la actualización automática
// del navegador, que dependía de servicios de terceros poco fiables.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// ---------- parseo de CSV (portado literal de la app) ----------
const CSV_ALIASES = {
  home: ['hometeam','home','local','equipolocal','home_team'],
  away: ['awayteam','away','visitante','equipovisitante','away_team'],
  fthg: ['fthg','homegoals','golouloclal','goleslocal','home_goals','hg'],
  ftag: ['ftag','awaygoals','golesvisitante','away_goals','ag'],
  hc:   ['hc','homecorners','cornerslocal','corners_home'],
  ac:   ['ac','awaycorners','cornersvisitante','corners_away'],
  hy:   ['hy','homeyellow','amarillaslocal'],
  ay:   ['ay','awayyellow','amarillasvisitante'],
  hr:   ['hr','homered','rojaslocal'],
  ar:   ['ar','awayred','rojasvisitante'],
  hs:   ['hs','homeshots','tiroslocal'],
  as_:  ['as','awayshots','tirosvisitante'],
  hst:  ['hst','homeshotsontarget','tirosaporterialocal'],
  ast:  ['ast','awayshotsontarget','tirosaporteriavisitante'],
  oddH: ['avgh','b365h','psh','maxh'],
  oddD: ['avgd','b365d','psd','maxd'],
  oddA: ['avga','b365a','psa','maxa'],
  oddO25: ['avg>2.5','b365>2.5','p>2.5','max>2.5'],
  oddU25: ['avg<2.5','b365<2.5','p<2.5','max<2.5'],
  hf:   ['hf','homefouls','faltaslocal'],
  af:   ['af','awayfouls','faltasvisitante'],
  referee: ['referee','arbitro','árbitro'],
  date: ['date','fecha']
};
function findCol(headers, aliases){
  const norm = headers.map(h=>h.trim().toLowerCase().replace(/\s+/g,''));
  for(const a of aliases){
    const idx = norm.indexOf(a);
    if(idx!==-1) return idx;
  }
  return -1;
}
function parseDateToSortable(s){
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(!m) return null;
  let [_, d, mo, y] = m;
  if(y.length===2) y = (parseInt(y)<50 ? '20':'19') + y;
  return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
}
function parseCSVText(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
  if(!lines.length) return {rows:[], missingCorners:false};
  const headers = lines[0].split(',');
  const iHome = findCol(headers, CSV_ALIASES.home);
  const iAway = findCol(headers, CSV_ALIASES.away);
  const iFthg = findCol(headers, CSV_ALIASES.fthg);
  const iFtag = findCol(headers, CSV_ALIASES.ftag);
  const iHc = findCol(headers, CSV_ALIASES.hc);
  const iAc = findCol(headers, CSV_ALIASES.ac);
  const iHy = findCol(headers, CSV_ALIASES.hy);
  const iAy = findCol(headers, CSV_ALIASES.ay);
  const iHr = findCol(headers, CSV_ALIASES.hr);
  const iAr = findCol(headers, CSV_ALIASES.ar);
  const iHs = findCol(headers, CSV_ALIASES.hs);
  const iAs = findCol(headers, CSV_ALIASES.as_);
  const iHst = findCol(headers, CSV_ALIASES.hst);
  const iAst = findCol(headers, CSV_ALIASES.ast);
  const iOddH = findCol(headers, CSV_ALIASES.oddH);
  const iOddD = findCol(headers, CSV_ALIASES.oddD);
  const iOddA = findCol(headers, CSV_ALIASES.oddA);
  const iOddO25 = findCol(headers, CSV_ALIASES.oddO25);
  const iOddU25 = findCol(headers, CSV_ALIASES.oddU25);
  const iHf = findCol(headers, CSV_ALIASES.hf);
  const iAf = findCol(headers, CSV_ALIASES.af);
  const iReferee = findCol(headers, CSV_ALIASES.referee);
  const iDate = findCol(headers, CSV_ALIASES.date);
  if(iHome===-1 || iAway===-1 || iFthg===-1 || iFtag===-1){
    return {rows:null, error:'No se han encontrado las columnas de equipos/goles esperadas (HomeTeam, AwayTeam, FTHG, FTAG).'};
  }
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = lines[i].split(',');
    const home = (cols[iHome]||'').trim();
    const away = (cols[iAway]||'').trim();
    const fthg = parseInt(cols[iFthg]);
    const ftag = parseInt(cols[iFtag]);
    if(!home || !away || isNaN(fthg) || isNaN(ftag)) continue;
    const hc = iHc!==-1 ? parseInt(cols[iHc]) : NaN;
    const ac = iAc!==-1 ? parseInt(cols[iAc]) : NaN;
    const hy = iHy!==-1 ? parseInt(cols[iHy]) : NaN;
    const ay = iAy!==-1 ? parseInt(cols[iAy]) : NaN;
    const hr = iHr!==-1 ? parseInt(cols[iHr]) : NaN;
    const ar = iAr!==-1 ? parseInt(cols[iAr]) : NaN;
    const hs = iHs!==-1 ? parseInt(cols[iHs]) : NaN;
    const as = iAs!==-1 ? parseInt(cols[iAs]) : NaN;
    const hst = iHst!==-1 ? parseInt(cols[iHst]) : NaN;
    const ast = iAst!==-1 ? parseInt(cols[iAst]) : NaN;
    const oddH = iOddH!==-1 ? parseFloat(cols[iOddH]) : NaN;
    const oddD = iOddD!==-1 ? parseFloat(cols[iOddD]) : NaN;
    const oddA = iOddA!==-1 ? parseFloat(cols[iOddA]) : NaN;
    const oddO25 = iOddO25!==-1 ? parseFloat(cols[iOddO25]) : NaN;
    const oddU25 = iOddU25!==-1 ? parseFloat(cols[iOddU25]) : NaN;
    const hf = iHf!==-1 ? parseInt(cols[iHf]) : NaN;
    const af = iAf!==-1 ? parseInt(cols[iAf]) : NaN;
    const referee = iReferee!==-1 ? (cols[iReferee]||'').trim() : '';
    const dateSort = iDate!==-1 ? parseDateToSortable(cols[iDate]||'') : null;
    rows.push({
      home,away,fthg,ftag,
      hc:isNaN(hc)?null:hc, ac:isNaN(ac)?null:ac,
      hCards: (isNaN(hy)&&isNaN(hr)) ? null : (isNaN(hy)?0:hy)+(isNaN(hr)?0:hr),
      aCards: (isNaN(ay)&&isNaN(ar)) ? null : (isNaN(ay)?0:ay)+(isNaN(ar)?0:ar),
      hs: isNaN(hs)?null:hs, as: isNaN(as)?null:as,
      hst: isNaN(hst)?null:hst, ast: isNaN(ast)?null:ast,
      oddH: isNaN(oddH)?null:oddH, oddD: isNaN(oddD)?null:oddD, oddA: isNaN(oddA)?null:oddA,
      oddO25: isNaN(oddO25)?null:oddO25, oddU25: isNaN(oddU25)?null:oddU25,
      hf: isNaN(hf)?null:hf, af: isNaN(af)?null:af, referee: referee||null,
      dateSort
    });
  }
  return {rows, missingCorners: iHc===-1 || iAc===-1, missingCards: iHy===-1 && iHr===-1, missingShots: iHs===-1 && iHst===-1, missingOdds: iOddH===-1 && iOddO25===-1, missingFouls: iHf===-1 && iAf===-1};
}
function blankSide(){ return {mp:0,gf:0,ga:0,cmp:0,cf:0,ca:0,crmp:0,crf:0,cra:0,shmp:0,shf:0,sha:0,sotf:0,sota:0,fmp:0,fl:0}; }
function aggregateRows(rows){
  const groups = {};
  function ensure(name){
    if(!groups[name]) groups[name] = { home: blankSide(), away: blankSide() };
    return groups[name];
  }
  rows.forEach(r=>{
    const h = ensure(r.home), a = ensure(r.away);
    h.home.mp++; h.home.gf+=r.fthg; h.home.ga+=r.ftag;
    a.away.mp++; a.away.gf+=r.ftag; a.away.ga+=r.fthg;
    if(r.hc!==null && r.ac!==null){
      h.home.cmp++; h.home.cf+=r.hc; h.home.ca+=r.ac;
      a.away.cmp++; a.away.cf+=r.ac; a.away.ca+=r.hc;
    }
    if(r.hCards!==null && r.aCards!==null){
      h.home.crmp++; h.home.crf+=r.hCards; h.home.cra+=r.aCards;
      a.away.crmp++; a.away.crf+=r.aCards; a.away.cra+=r.hCards;
    }
    if(r.hs!==null && r.as!==null){
      h.home.shmp++; h.home.shf+=r.hs; h.home.sha+=r.as;
      a.away.shmp++; a.away.shf+=r.as; a.away.sha+=r.hs;
      if(r.hst!==null && r.ast!==null){
        h.home.sotf+=r.hst; h.home.sota+=r.ast;
        a.away.sotf+=r.ast; a.away.sota+=r.hst;
      }
    }
    if(r.hf!==null){ h.home.fmp++; h.home.fl+=r.hf; }
    if(r.af!==null){ a.away.fmp++; a.away.fl+=r.af; }
  });
  return groups;
}
function computeRegressionSums(rows){
  let n=0,sumX=0,sumY=0,sumXY=0,sumX2=0;
  rows.forEach(r=>{
    if(r.hc!==null && r.ac!==null){
      const x = r.fthg+r.ftag;
      const y = r.hc+r.ac;
      n++; sumX+=x; sumY+=y; sumXY+=x*y; sumX2+=x*x;
    }
  });
  return {n,sumX,sumY,sumXY,sumX2};
}
function computeScorelineSums(rows){
  let n=0, sumHome=0, sumAway=0, c00=0, c10=0, c01=0, c11=0;
  rows.forEach(r=>{
    n++; sumHome+=r.fthg; sumAway+=r.ftag;
    if(r.fthg===0 && r.ftag===0) c00++;
    else if(r.fthg===1 && r.ftag===0) c10++;
    else if(r.fthg===0 && r.ftag===1) c01++;
    else if(r.fthg===1 && r.ftag===1) c11++;
  });
  return {n, sumHome, sumAway, c00, c10, c01, c11};
}
function computeShotSums(rows){
  let n=0,sumX=0,sumY=0,sumXY=0,sumX2=0;
  let nConv=0, sumSOT=0, sumGoalsConv=0;
  rows.forEach(r=>{
    if(r.hs!==null && r.as!==null && r.hc!==null && r.ac!==null){
      const x = r.hs+r.as;
      const y = r.hc+r.ac;
      n++; sumX+=x; sumY+=y; sumXY+=x*y; sumX2+=x*x;
    }
    if(r.hst!==null && r.ast!==null){
      nConv++; sumSOT += r.hst+r.ast; sumGoalsConv += r.fthg+r.ftag;
    }
  });
  return {n,sumX,sumY,sumXY,sumX2,nConv,sumSOT,sumGoalsConv};
}
function computeFoulSums(rows){
  let nCards=0, sumFouls=0, sumCardsConv=0;
  rows.forEach(r=>{
    if(r.hf!==null && r.hCards!==null){ nCards++; sumFouls+=r.hf; sumCardsConv+=r.hCards; }
    if(r.af!==null && r.aCards!==null){ nCards++; sumFouls+=r.af; sumCardsConv+=r.aCards; }
  });
  return {nCards, sumFouls, sumCardsConv};
}
function importParsedIntoSeason(SEASON_IMPORTS, liga, temporada, weight, parsed){
  const groups = aggregateRows(parsed.rows);
  const regression = computeRegressionSums(parsed.rows);
  const scorelines = computeScorelineSums(parsed.rows);
  const shotStats = computeShotSums(parsed.rows);
  const foulStats = computeFoulSums(parsed.rows);
  const matchLog = parsed.rows.filter(r=>r.dateSort).map(r=>({
    d: r.dateSort, h: r.home, a: r.away, hg: r.fthg, ag: r.ftag, hc: r.hc, ac: r.ac,
    oH: r.oddH, oD: r.oddD, oA: r.oddA, oO25: r.oddO25, oU25: r.oddU25,
    hf: r.hf, af: r.af, hCards: r.hCards, aCards: r.aCards, ref: r.referee
  }));
  const key = liga.toLowerCase()+'||'+temporada.toLowerCase();
  const existingIdx = SEASON_IMPORTS.findIndex(i => (i.liga.toLowerCase()+'||'+i.temporada.toLowerCase())===key);
  const record = { id: existingIdx!==-1 ? SEASON_IMPORTS[existingIdx].id : Date.now().toString()+Math.random().toString(36).slice(2,6), liga, temporada, weight, groups, regression, scorelines, shotStats, foulStats, matchLog };
  if(existingIdx!==-1) SEASON_IMPORTS[existingIdx] = record; else SEASON_IMPORTS.push(record);
  return matchLog.length;
}

// ---------- ligas cubiertas y temporada actual ----------
const LEAGUE_CODES = {
  'Primera':'SP1','Segunda':'SP2','Premier League':'E0','Championship':'E1',
  'Ligue 1':'F1','Serie A':'I1','Eredivisie':'N1','Süper Lig':'T1',
  'Bundesliga':'D1','Bundesliga 2':'D2',
  'Escocia':'SC0','Serie B':'I2','Ligue 2':'F2','Bélgica':'B1','Portugal':'P1','Grecia':'G1'
};
function currentSeasonCode(){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth()+1;
  const startYear = m>=7 ? y : y-1;
  return String(startYear).slice(-2) + String(startYear+1).slice(-2);
}

// ---------- Supabase (lectura y escritura directa via REST) ----------
async function fetchSupabaseRow(id){
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tipster_data?id=eq.${id}&select=data`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
  });
  if(!resp.ok) throw new Error(`Supabase HTTP ${resp.status} leyendo fila '${id}'`);
  const rows = await resp.json();
  return rows.length ? rows[0].data : null;
}
async function upsertSupabaseRow(id, data){
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/tipster_data`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ id, data, updated_at: new Date().toISOString() })
  });
  if(!resp.ok) throw new Error(`Supabase HTTP ${resp.status} guardando fila '${id}': ${await resp.text()}`);
}

// ---------- programa principal ----------
async function main(){
  const seasonCode = currentSeasonCode();
  const temporada = seasonCode.slice(0,2)+'/'+seasonCode.slice(2);
  console.log(`Temporada actual detectada: ${temporada} (codigo ${seasonCode})`);

  console.log('Leyendo datos actuales de Supabase...');
  const teamsState = await fetchSupabaseRow('main');
  if(!teamsState){ console.error('No se ha podido leer la fila "main" de Supabase.'); process.exit(1); }
  const SEASON_IMPORTS = teamsState.seasonImports || [];

  const resultados = [];
  for(const [liga, code] of Object.entries(LEAGUE_CODES)){
    const url = `https://www.football-data.co.uk/mmz4281/${seasonCode}/${code}.csv`;
    try{
      console.log(`Descargando ${liga} (${code})...`);
      const resp = await fetch(url);
      if(!resp.ok){
        console.log(`  -> HTTP ${resp.status}, se omite esta liga`);
        resultados.push({liga, ok:false, motivo:`HTTP ${resp.status}`});
        continue;
      }
      const text = await resp.text();
      const parsed = parseCSVText(text);
      if(parsed.error || !parsed.rows.length){
        console.log(`  -> ${parsed.error || 'sin partidos en el archivo'}`);
        resultados.push({liga, ok:false, motivo: parsed.error || 'sin partidos'});
        continue;
      }
      const weight = parseFloat(process.env.WEIGHT || '3');
      const nPartidos = importParsedIntoSeason(SEASON_IMPORTS, liga, temporada, weight, parsed);
      console.log(`  -> ${nPartidos} partidos importados`);
      resultados.push({liga, ok:true, partidos:nPartidos});
    }catch(e){
      console.log(`  -> error: ${e.message}`);
      resultados.push({liga, ok:false, motivo:e.message});
    }
  }

  console.log('Guardando en Supabase...');
  teamsState.seasonImports = SEASON_IMPORTS;
  await upsertSupabaseRow('main', teamsState);

  console.log('\n=== Resumen ===');
  resultados.forEach(r=>{
    console.log(r.ok ? `✓ ${r.liga}: ${r.partidos} partidos` : `✗ ${r.liga}: ${r.motivo}`);
  });
  const fallos = resultados.filter(r=>!r.ok);
  if(fallos.length===resultados.length){
    console.error('\nTodas las ligas han fallado.');
    process.exit(1);
  }
}

main().catch(e=>{ console.error('Error fatal:', e); process.exit(1); });
