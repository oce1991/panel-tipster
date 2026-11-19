const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('conserva solo la probabilidad del mismo partido, línea y cuota',()=>{
 const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('function matchCornerSnapshot('),b=s.indexOf('function computeModelProbForBet()',a);assert.ok(a>=0&&b>a);
 const ctx={Number};vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
 const snap={homeName:'A',awayName:'B',liga:'Primera',line:9.5,pOver:.61,pUnder:.39,pPush:0,total:10.2,oddOver:1.9,oddUnder:2,calculatedAt:'2026-01-01T00:00:00Z'};
 const bet={market:'Corners',pick:'Over 9.5 corners',liga:'Primera',match:'A - B',odd:1.9};
 assert.equal(ctx.matchCornerSnapshot(snap,bet).probability,.61);
 for(const bad of [{...bet,match:'A - C'},{...bet,pick:'Over 10.5 corners'},{...bet,odd:1.8},{...bet,market:'Goles'}])assert.equal(ctx.matchCornerSnapshot(snap,bad),null);
});
test('solo acepta líneas enteras o medias y cuotas decimales válidas',()=>{
 const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('function isSupportedCornerLine('),b=s.indexOf('// ---------- selector',a);assert.ok(a>=0&&b>a);
 const ctx={Number,Math};vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
 assert.equal(ctx.isSupportedCornerLine(9),true);assert.equal(ctx.isSupportedCornerLine(9.5),true);assert.equal(ctx.isSupportedCornerLine(9.25),false);assert.equal(ctx.isSupportedCornerLine(-1),false);
 assert.equal(ctx.devigTwoWay(.9,2),null);assert.equal(ctx.devigTwoWay(1.9,NaN),null);
});
