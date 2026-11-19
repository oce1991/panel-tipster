const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('compara los mismos partidos sin datos del mismo día ni cuotas incompletas',()=>{
 const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('function compareGoalModels('),b=s.indexOf('function renderGoalModelComparison(',a);assert.ok(a>=0&&b>a);
 const ctx={BACKTEST_MIN_MATCHES:6,Math,Number,Object};vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
 const pre=Array.from({length:25},(_,i)=>({d:`2025-06-${String(i+1).padStart(2,'0')}`,h:'A',a:'B',hg:i%3,ag:1,oO25:2,oU25:2}));
 const x={d:'2025-08-01',h:'A',a:'B',hg:3,ag:0,oO25:2.2,oU25:1.7},y={d:'2025-08-01',h:'A',a:'B',hg:0,ag:0,oO25:2.2,oU25:1.7},missing={d:'2025-08-02',h:'A',a:'B',hg:99,ag:99,oO25:null,oU25:2};
 const r=ctx.compareGoalModels(pre.concat([x,y,missing]),'2025-07-01','2026-07-01');
 const reversed=ctx.compareGoalModels(pre.concat([y,x,missing]),'2025-07-01','2026-07-01');
 assert.equal(r.n,2);assert.deepEqual(r,reversed);
 assert.ok(Math.abs(r.models.find(m=>m.id==='market').meanP-((1/2.2)/(1/2.2+1/1.7)))<1e-10);
 const earlier=ctx.compareGoalModels(pre,'2025-07-01','2026-07-01');assert.equal(earlier.n,0);
});
