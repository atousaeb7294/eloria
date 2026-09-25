import assert from 'node:assert/strict';
import { mountSalonWheel } from '../src/lib/salon-wheel.ts';
function harness({rtl=false,reduced=false,count=4}={}) {
 let now=0,index=0,blocked=false,settle;
 const events=new Map(),moves=[];
 globalThis.performance={now:()=>now};
 globalThis.Element=class { closest(){return null;} };
 const element={clientHeight:600,addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
 const api={canScrollNext:()=>index<count-1,canScrollPrev:()=>index>0,
  scrollNext:jump=>{index++;moves.push({index,jump});},scrollPrev:jump=>{index--;moves.push({index,jump});},
  on:(name,callback)=>{settle=callback;},off:()=>{settle=undefined;}};
 const cleanup=mountSalonWheel(element,api,{rtl,blocked:()=>blocked,reducedMotion:()=>reduced});
 return {moves,events,get index(){return index;},settle:()=>settle?.(),block:value=>blocked=value,cleanup,
  wheel(y,at,x=0,extra={}) {now=at;const e={deltaY:y,deltaX:x,deltaMode:0,cancelable:true,target:null,preventDefault(){this.prevented=true;},...extra};events.get('wheel')?.(e);return e;}};
}
let h=harness();
assert.ok(h.wheel(100,0).prevented);assert.equal(h.index,1);
for(let t=80;t<=320;t+=80) h.wheel(100,t);
assert.equal(h.index,1,'no stacking while moving');h.settle();h.wheel(100,400);
assert.equal(h.index,2,'continuous deliberate mouse notches resume after settle');
h.wheel(-100,420);assert.equal(h.index,1,'reversal can retarget immediately');h.cleanup();assert.equal(h.events.size,0);
h=harness({count:2});h.wheel(70.5,0);h.settle();
for(let t=1;t<=12;t++) assert.ok(h.wheel(30/t,t*16).prevented,'inertia stays on the last product');
assert.equal(h.wheel(90,500).prevented,undefined,'fresh edge gesture exits to document');h.cleanup();
h=harness();h.wheel(5,0);h.wheel(6,16);assert.equal(h.index,0);h.wheel(8,32);assert.equal(h.index,1,'small trackpad deltas accumulate');h.cleanup();
h=harness({rtl:true});h.wheel(0,0,-100);assert.equal(h.index,1);h.cleanup();
h=harness({reduced:true});h.wheel(1,0,0,{deltaMode:2});assert.equal(h.moves[0].jump,true);h.cleanup();
h=harness();assert.equal(h.wheel(-100,0).prevented,undefined);h.block(true);h.wheel(100,200);assert.equal(h.index,0);h.block(false);
h.wheel(100,400,0,{ctrlKey:true});h.wheel(100,600,0,{cancelable:false});assert.equal(h.index,0);h.cleanup();
console.log('PASS: mouse notches, trackpad inertia, edge release, RTL horizontal scroll, reversal, movement lock, reduced motion, dialog exclusion and cleanup.');
