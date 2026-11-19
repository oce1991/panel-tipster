const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('córners y ambos marcan no dependen del orden del mismo día ni de datos futuros',()=>{
 const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('function runCornersBacktest('),b=s.indexOf('function renderCornersBacktest(',a),c=s.indexOf('function runBttsBacktest('),d=s.indexOf('function renderBttsBacktest(',c);
 assert.ok(a>=0 && b>a && c>=0 && d>c);
 const days=Array.from({length:6},(_,i)=>({d:`2026-01-0${i+1}`,h:'A',a:'B',hg:1,ag:1,hc:4,ac:4}));
 const x={d:'2026-01-07',h:'A',a:'B',hg:4,ag:1,hc:17,ac:1},y={d:'2026-01-07',h:'A',a:'B',hg:0,ag:0,hc:1,ac:1};
 const ctx={logs:days.concat([x,y]),BACKTEST_MIN_MATCHES:6,poissonOver:(line,total)=>Math.min(.99,total/100),LEAGUE_STATS:{L:{slope:999,meanGoals:2}},Math,Number};
 ctx.buildCombinedMatchLogs=()=>({L:ctx.logs});vm.createContext(ctx);vm.runInContext(s.slice(a,b)+s.slice(c,d),ctx);
 const r1=ctx.runCornersBacktest('L',9.5),b1=ctx.runBttsBacktest('L');
 ctx.logs=days.concat([y,x]);assert.deepEqual(ctx.runCornersBacktest('L',9.5),r1);assert.deepEqual(ctx.runBttsBacktest('L'),b1);
 assert.equal(r1.n,2);assert.equal(b1.n,2);assert.equal(r1.avgPredicted,8);
 ctx.logs=days.concat([x,y,{d:'2026-01-08',h:'C',a:'D',hg:99,ag:99,hc:99,ac:99}]);
 assert.equal(ctx.runCornersBacktest('L',9.5).avgPredicted,r1.avgPredicted);
});
