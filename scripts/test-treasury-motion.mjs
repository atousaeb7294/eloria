import assert from 'node:assert/strict';
import { mountTreasuryStory, storyFrame } from '../src/lib/treasury-story.ts';
function harness({width=1280,reduced=false,small=false}={}) {
 const events=new Map(),rootEvents=new Map(),frames=new Map(),media=[];let id=0,resize,now=0;
 Object.defineProperty(globalThis,"performance",{configurable:true,value:{now:()=>now}});
 class Node {
  constructor(name=''){this.id=name;this.dataset={};this.attrs=new Map();this.inert=false;this.style={removeProperty(key){delete this[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];}};}
  closest(){return null;}
  setAttribute(k,v){this.attrs.set(k,v);}removeAttribute(k){this.attrs.delete(k);}toggleAttribute(k,v){if(v)this.attrs.set(k,'');else this.attrs.delete(k);}focus(){this.focused=true;}
 }
 globalThis.Element=Node;
 const chapters=['promenade-intro','treasury-gold','treasury-silver','treasury-weave'].map(s=>new Node(s));
 const dots=chapters.map((_,index)=>{const n=new Node();n.dataset.storyGo=String(index);return n;});
 const stage={clientHeight:800};const root=new Node();
 root.getBoundingClientRect=()=>({top:-window.scrollY});root.querySelector=()=>stage;
 root.querySelectorAll=q=>q.includes('promenade-chapter')?chapters:dots;
 root.addEventListener=(k,f)=>rootEvents.set(k,f);root.removeEventListener=k=>rootEvents.delete(k);
 const scrolls=[];
 globalThis.window={innerWidth:width,scrollY:0,scrollTo(options){scrolls.push(options);this.scrollY=options.top;events.get('scroll')?.();},addEventListener(k,f,opts){events.set(k,f);if(k==='scroll')assert.equal(opts.passive,true);},removeEventListener:k=>events.delete(k)};
 globalThis.requestAnimationFrame=f=>{const n=++id;frames.set(n,f);return n;};globalThis.cancelAnimationFrame=n=>frames.delete(n);
 globalThis.matchMedia=q=>{const m={matches:q.includes('reduced')?reduced:small,addEventListener(k,f){this.change=f;},removeEventListener(){}};media.push(m);return m;};
 globalThis.ResizeObserver=class{constructor(f){resize=f;}observe(){}disconnect(){}};
 const dispose=mountTreasuryStory(root);
 const flush=()=>{assert.ok(frames.size<=1,'at most one pending frame');const work=[...frames.values()];frames.clear();work.forEach(f=>f());assert.ok(chapters.filter(c=>c.style.visibility==='visible').length<=2);};
 flush();
 return {events,rootEvents,frames,root,chapters,media,scrolls,dispose,flush,resize:()=>resize(),
 advance(ms){now+=ms;flush();},
 finish(){for(let n=0;n<40 && frames.size;n++){now+=16;flush();}assert.equal(frames.size,0,'animation finishes without a perpetual loop');},
 wheel(delta,extra={}){const e={deltaY:delta,deltaX:0,deltaMode:0,cancelable:true,target:root,preventDefault(){this.prevented=true;},...extra};rootEvents.get('wheel')?.(e);return e;},
 touch(type,x=100,y=400){const e={touches:[{clientX:x,clientY:y}],target:root,cancelable:true,preventDefault(){this.prevented=true;}};rootEvents.get(type)?.(e);return e;},
 scroll(y){window.scrollY=y;events.get('scroll')?.();},
 click(hash){const link=new Node();link.closest=()=>link;link.getAttribute=()=>hash;const e={button:0,detail:0,target:link,preventDefault(){this.prevented=true;}};rootEvents.get('click')?.(e);return e;}};
}
for(const compact of [false,true])for(let step=0;step<=600;step++){
 const progress=step/200;const frames=[0,1,2,3].map(index=>storyFrame(progress,index,compact));
 assert.ok(frames.filter(f=>f.visible).length<=2);assert.ok(frames.every(f=>!/NaN|Infinity/.test(f.transform)));
}
let h=harness();
assert.ok(h.wheel(60).prevented);h.finish();assert.equal(window.scrollY,800,'one notch completes without further input');
h.advance(250);h.wheel(60);h.advance(100);assert.ok(window.scrollY>800 && window.scrollY<1600);
for(let n=0;n<10;n++){h.wheel(5);h.advance(16);}h.finish();assert.equal(window.scrollY,1600,'inertial tail does not skip chapters');
h.advance(250);h.wheel(60);h.advance(80);h.wheel(-60);h.finish();assert.equal(window.scrollY,1600,'reverse midway returns to previous chapter');
h.advance(250);h.wheel(-60);h.finish();assert.equal(window.scrollY,800);
h.advance(250);h.wheel(-60);h.finish();assert.equal(window.scrollY,0);assert.ok(!h.wheel(-60).prevented,'top edge releases');
h.scroll(2400);h.flush();assert.ok(!h.wheel(60).prevented,'footer edge releases');
h.scroll(2800);h.flush();assert.ok(!h.wheel(-60).prevented,'footer remains native');
h.scroll(0);h.flush();assert.ok(!h.wheel(60,{ctrlKey:true}).prevented);assert.ok(!h.wheel(60,{deltaX:90}).prevented);
const dialog={};Object.setPrototypeOf(dialog,Element.prototype);dialog.closest=()=>dialog;
assert.ok(!h.wheel(60,{target:dialog}).prevented,'dialog is not captured');
h.resize();h.flush();assert.ok(h.click('#treasury-silver').prevented);h.finish();assert.equal(h.chapters[2].focused,true);assert.equal(window.scrollY,1600);
h.advance(250);h.wheel(60);h.advance(80);h.events.get('eloria:reset-home')();h.finish();assert.equal(window.scrollY,0);assert.equal(h.root.dataset.storyChapter,'0');
h.advance(250);h.wheel(60);h.advance(80);h.scroll(170);h.finish();assert.equal(window.scrollY,170,'external native scroll cancels animation');
h.scroll(0);h.resize();h.flush();h.wheel(60);h.advance(80);h.resize();h.finish();const resizedY=window.scrollY;h.advance(600);assert.equal(window.scrollY,resizedY,'resize cancels stale destination');
h.scroll(0);h.resize();h.flush();h.wheel(60);h.advance(80);
const departureY=window.scrollY;h.events.get('eloria:navigate')();h.finish();assert.equal(window.scrollY,departureY,'route navigation must stop the outgoing scroll owner');
h.dispose();assert.equal(h.frames.size,0);assert.equal(h.events.size,0);assert.equal(h.rootEvents.size,0);assert.ok(h.chapters.every(c=>!c.inert && !c.attrs.has('aria-hidden') && !c.style.transform));
h=harness({width:390});h.touch('touchstart');assert.ok(h.touch('touchmove',100,350).prevented);assert.equal(h.scrolls.length,0,'finger still down');h.touch('touchend');h.finish();assert.equal(window.scrollY,800,'swipe completes after release');
h.touch('touchstart');h.touch('touchmove',100,460);h.touch('touchend');h.finish();assert.equal(window.scrollY,0,'reverse swipe');
h.touch('touchstart');assert.ok(!h.touch('touchmove',190,390).prevented,'horizontal gestures remain native');h.touch('touchend');h.finish();assert.equal(window.scrollY,0);
h.touch('touchstart');h.touch('touchmove',100,350);h.touch('touchcancel');h.finish();assert.equal(window.scrollY,0,'cancel does not navigate');
h.wheel(60);h.advance(80);h.touch('touchstart');h.touch('touchend');h.finish();assert.equal(window.scrollY,800,'tap during motion resumes completion');
h.advance(250);h.wheel(60);h.advance(80);h.touch('touchstart');h.touch('touchcancel');h.finish();assert.equal(window.scrollY,1600,'system touch cancellation resumes interrupted movement');h.dispose();
for(const config of [{reduced:true},{small:true}]){h=harness(config);assert.ok(!h.root.attrs.has('data-story-enhanced'));assert.ok(!h.wheel(60).prevented);assert.equal(h.click('#treasury-gold').prevented,undefined);h.dispose();}
console.log('PASS: automatic notch completion, inertia, reversal, edges/footer, pinch/horizontal/dialog exclusion, one frame loop, external interruption, resize, anchors, reset, mobile swipe/reversal/tap/cancel, reduced motion and cleanup.');
