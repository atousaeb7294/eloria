import assert from 'node:assert/strict';
import { storyFrame, createStoryGesture, mountTreasuryStory } from '../src/lib/treasury-story.ts';

for (let n = 0; n <= 300; n++) {
  const progress = n / 100;
  const frames = [0, 1, 2, 3].map(i => storyFrame(progress, i));
  assert.ok(frames.filter(f => f.visible).length <= 2, 'only two layers may be visible');
  assert.ok(frames.filter(f => f.visible).every(f => f.opacity === '1'), 'visible images must not blend');
}
assert.equal(new Set([1, 2, 3].map(i => storyFrame(i - 0.5, i).transform)).size, 3, 'distinct entrances');
assert.equal(new Set([0, 1, 2].map(i => storyFrame(i + 0.5, i).transform)).size, 3, 'distinct exits');
const gesture = createStoryGesture();
assert.equal(gesture(20, 0), 1);
assert.equal(gesture(20, 60), 0);
assert.equal(gesture(-20, 70), -1);

function harness({ reduced = false, width = 1280, viewport = 800 } = {}) {
  let now = 0, nextId = 1, pendingScroll = false;
  const raf = new Map(), timers = new Map(), events = new Map(), media = new Map();
  const scrolls = [];
  class Node {
    constructor(id = '') {
      this.id = id; this.dataset = {}; this.attrs = new Map(); this.events = new Map();
      this.style = { removeProperty(key) { delete this[key.replace(/-([a-z])/g, (_,c) => c.toUpperCase())]; } };
    }
    closest() { return null; }
    setAttribute(k,v) { this.attrs.set(k,v); }
    removeAttribute(k) { this.attrs.delete(k); }
    toggleAttribute(k,v) { if(v) this.attrs.set(k,''); else this.attrs.delete(k); }
    addEventListener(k,f) { this.events.set(k,f); }
    removeEventListener(k) { this.events.delete(k); }
    focus() { this.focused = true; }
  }
  const chapters = [0,1,2,3].map(i => new Node(`chapter-${i}`));
  const dots = chapters.map((_,i) => { const n = new Node(); n.dataset.storyGo = String(i); return n; });
  const stage = {clientHeight:viewport};
  const root = new Node();
  root.querySelector = () => stage;
  root.querySelectorAll = s => s === '[data-promenade-chapter]' ? chapters : dots;
  root.getBoundingClientRect = () => ({top:-window.scrollY});
  globalThis.Element = Node;
  Object.defineProperty(globalThis, 'performance', {configurable:true,value:{now:()=>now}});
  globalThis.requestAnimationFrame = f => {const id=nextId++;raf.set(id,f);return id;};
  globalThis.cancelAnimationFrame = id => raf.delete(id);
  globalThis.clearTimeout = id => timers.delete(id);
  globalThis.window = {
    innerWidth:width, innerHeight:viewport, scrollY:0,
    scrollTo({top,behavior}) { this.scrollY=top;scrolls.push({top,behavior});pendingScroll=true; },
    addEventListener(k,f) {events.set(k,f);}, removeEventListener(k) {events.delete(k);},
    setTimeout(f,ms) {const id=nextId++;timers.set(id,{f,at:now+ms});return id;},
  };
  globalThis.document = {querySelector:()=>null,documentElement:{scrollHeight:viewport*5}};
  globalThis.matchMedia = q => {
    const m = {matches:q.includes('reduced-motion') ? reduced : viewport <= 520, addEventListener(k,f){this.listener=f;},removeEventListener(){}};
    media.set(q,m);return m;
  };
  let resize;
  globalThis.ResizeObserver = class {constructor(f){resize=f;}observe(){}disconnect(){}};
  const dispose = mountTreasuryStory(root);
  function step(ms=16) {
    now+=ms;
    if(pendingScroll){pendingScroll=false;events.get('scroll')?.();}
    for(const [id,t] of [...timers]) if(t.at<=now){timers.delete(id);t.f();}
    const batch=[...raf];raf.clear();
    assert.ok(batch.length<=1,'there must be a single scheduled rendering frame');
    batch.forEach(([,f])=>f(now));
    assert.ok(chapters.filter(c=>c.style.visibility==='visible').length<=2);
  }
  function advance(ms) {for(let t=0;t<ms;t+=16)step();}
  function wheel(delta) {
    const e={deltaY:delta,deltaX:0,deltaMode:0,target:null,preventDefault(){this.prevented=true;}};
    events.get('wheel')?.(e);return e;
  }
  return {root,chapters,scrolls,raf,events,stage,dispose,step,advance,wheel,resize:()=>resize(),nativeScroll(y){window.scrollY=y;events.get('scroll')?.();}};
}

let h=harness();
assert.ok(h.wheel(100).prevented);
h.advance(320);
assert.equal(h.scrolls.length,0,'document must not scroll on every animation frame');
h.resize(); // An unchanged ResizeObserver notification must not stop an animation.
h.advance(600);
assert.equal(window.scrollY,800);
assert.equal(h.scrolls.length,1,'one document scroll per complete chapter transition');
assert.equal(h.root.dataset.storyChapter,'1');
h.wheel(100);h.advance(900);
assert.equal(window.scrollY,1600);
h.wheel(100);h.advance(900);
assert.equal(window.scrollY,2400);
h.wheel(100);h.advance(200);
assert.equal(window.scrollY,3200,'footer remains reachable');
h.dispose();assert.equal(h.raf.size,0);assert.equal(h.events.size,0);
assert.ok(h.chapters.every(c=>!c.inert && !c.attrs.has('aria-hidden') && !c.style.transform));

h=harness();h.wheel(100);h.advance(320);h.wheel(-100);h.advance(900);
assert.equal(window.scrollY,0,'reversing a gesture returns smoothly to the preceding chapter');
h.wheel(100);h.advance(250);h.nativeScroll(1200);h.advance(1100);
assert.equal(window.scrollY,1600,'native scroll owns the interruption and then settles');
h.dispose();

h=harness({reduced:true});assert.ok(!h.root.attrs.has('data-story-enhanced'));
assert.ok(!h.wheel(100).prevented);h.dispose();
h=harness({viewport:500});assert.ok(!h.root.attrs.has('data-story-enhanced'));h.dispose();
h=harness({width:390});h.wheel(100);h.advance(900);assert.equal(window.scrollY,800);h.dispose();
console.log('PASS: chapter visibility, distinct motion, inertia, single render loop, one scroll per transition, reversal, native interruption, resize, footer, reduced motion, compact viewport and cleanup');
