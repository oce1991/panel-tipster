const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('las variantes respetan fechas y usan muestras comparables',()=>{
 const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('function evaluateGoalCandidates('),b=s.indexOf('function lastCompletedSeasonStart()',a);assert.ok(a>=0&&b>a);
 const ctx={Date,Math,Number,Object};vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
 const pre=Array.from({length:40},(_,i)=>({d:new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),h:'A',a:'B',hg:i%3,ag:1,hc:4+i%4,ac:5,oO25:2,oU25:2}));
 const x={d:'2025-08-01',h:'A',a:'B',hg:3,ag:0,hc:17,ac:1,oO25:2.2,oU25:1.7},y={d:'2025-08-01',h:'A',a:'B',hg:0,ag:0,hc:1,ac:1,oO25:2.2,oU25:1.7},future={d:'2026-08-01',h:'A',a:'B',hg:99,ag:99,hc:99,ac:99,oO25:2,oU25:2};
 for(const fn of [rows=>ctx.evaluateGoalCandidates(rows,'2025-07-01','2026-07-01'),rows=>ctx.evaluateCornersCandidates(rows,'2025-07-01','2026-07-01',9.5)]){
   const r=fn(pre.concat([x,y]));assert.equal(r.n,2);assert.deepEqual(r,fn(pre.concat([y,x])));assert.deepEqual(r,fn(pre.concat([x,y,future])));
 }
 const invalid={...x,d:'2025-08-02',oO25:null};assert.equal(ctx.evaluateGoalCandidates(pre.concat([x,y,invalid]),'2025-07-01','2026-07-01').n,2);
});
