import assert from 'node:assert/strict';
import { startSeoScheduler } from './seo-scheduler.mjs';
const timeouts=[],intervals=[];
const original={setTimeout,clearTimeout,setInterval,clearInterval};
Object.assign(globalThis,{setTimeout:(fn,ms)=>{const t={fn,ms};timeouts.push(t);return t;},clearTimeout:()=>{},setInterval:(fn,ms)=>{const t={fn,ms};intervals.push(t);return t;},clearInterval:()=>{}});
try{
 let calls=0,resolveRequest;const log={log(){},warn(){}};
 startSeoScheduler({port:3000,env:{},log});assert.equal(intervals.length,0);
 const stop=startSeoScheduler({port:3000,env:{CRON_SECRET:'x'.repeat(48)},log,fetcher:async(url,options)=>{calls++;assert.equal(url,'http://127.0.0.1:3000/api/cron/content-health');assert.ok(options.headers.Authorization);return new Promise(resolve=>{resolveRequest=resolve;});}});
 assert.equal(timeouts[0].ms,60000);assert.equal(intervals[0].ms,1800000);
 timeouts[0].fn();intervals[0].fn();assert.equal(calls,1,'Do not overlap requests');
 resolveRequest({status:200});await new Promise(resolve=>original.setTimeout(resolve,0));stop();intervals[0].fn();assert.equal(calls,1,'Stopped scheduler must not send requests');
 console.log('PASS: scheduler requires auth, delays startup, bounds interval, prevents overlap and stops');
}finally{Object.assign(globalThis,original);}
