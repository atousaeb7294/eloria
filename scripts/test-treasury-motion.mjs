import assert from 'node:assert/strict';
import { mountTreasuryStory, storyFrame } from '../src/lib/treasury-story.ts';
function harness({width=1280,reduced=false,small=false}={}) {
 const events=new Map(),rootEvents=new Map(),frames=new Map(),media=[];let id=0,resize;
 class Node {
  constructor(name=''){this.id=name;this.dataset={};this.attrs=new Map();this.inert=false;this.style={removeProperty(key){delete this[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];}};}
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
 return {events,frames,root,chapters,media,scrolls,dispose,flush,resize:()=>resize(),
 scroll(y){window.scrollY=y;events.get('scroll')?.();},
 click(hash){const link=new Node();link.closest=()=>link;link.getAttribute=()=>hash;const e={button:0,detail:0,target:link,preventDefault(){this.prevented=true;}};rootEvents.get('click')?.(e);return e;}};
}
for(const compact of [false,true])for(let step=0;step<=600;step++){
 const progress=step/200;const frames=[0,1,2,3].map(index=>storyFrame(progress,index,compact));
 assert.ok(frames.filter(f=>f.visible).length<=2);assert.ok(frames.every(f=>!/NaN|Infinity/.test(f.transform)));
}
let h=harness();
assert.equal(h.events.has('wheel'),false,'mouse must never be captured');
assert.equal(h.events.has('touchstart'),false,'touch must remain native');
for(const y of [80,400,799,1600,1200,20,2399,2400,3000,0]){
 h.scroll(y);h.flush();assert.equal(h.root.dataset.storyChapter,String(Math.round(Math.min(y/800,3))));
}
assert.equal(h.scrolls.length,0,'scroll events must never generate corrective scrolling');
for(let n=0;n<80;n++)h.scroll(n*15);assert.equal(h.frames.size,1);h.flush();
h.resize();h.flush();assert.equal(h.scrolls.length,0,'resize must not jump the viewport');
assert.ok(h.click('#treasury-silver').prevented);h.flush();assert.equal(h.scrolls.at(-1).behavior,'smooth');assert.equal(h.chapters[2].focused,true);
h.events.get('eloria:reset-home')();h.flush();assert.equal(window.scrollY,0);assert.equal(h.root.dataset.storyChapter,'0');
h.scroll(800);h.dispose();assert.equal(h.frames.size,0);assert.equal(h.events.size,0);assert.ok(h.chapters.every(c=>!c.inert && !c.attrs.has('aria-hidden') && !c.style.transform));
h=harness({width:390});h.scroll(1200);h.flush();h.dispose();
h=harness({reduced:true});assert.ok(!h.root.attrs.has('data-story-enhanced'));assert.equal(h.click('#treasury-gold').prevented,undefined);h.dispose();
h=harness({small:true});assert.ok(!h.root.attrs.has('data-story-enhanced'));h.dispose();
console.log('PASS: native mouse/touch ownership, rapid scroll/reversal, max two visible scenes, one frame per burst, no corrective scroll, resize, anchor navigation, home reset, mobile/reduced motion and cleanup.');
