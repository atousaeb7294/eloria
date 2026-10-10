import assert from 'node:assert/strict';
import { startMaintenanceScheduler } from './maintenance-scheduler.mjs';
const timeouts=[], intervals=[];
const original={setTimeout,clearTimeout,setInterval,clearInterval};
Object.assign(globalThis,{setTimeout:(fn,ms)=>{const t={fn,ms};timeouts.push(t);return t;},clearTimeout:()=>{},setInterval:(fn,ms)=>{const t={fn,ms};intervals.push(t);return t;},clearInterval:()=>{}});
try {
  const log={log(){},warn(){}}; let release, calls=[];
  startMaintenanceScheduler({port:3000,env:{},log}); assert.equal(intervals.length,0);
  const stop=startMaintenanceScheduler({port:3000,env:{CRON_SECRET:'x'.repeat(48)},log,fetcher:async(url,options)=>{
    calls.push(url); assert.equal(options.redirect,'error'); assert.ok(options.headers.Authorization);
    return new Promise(resolve=>{release=resolve;});
  }});
  timeouts[0].fn(); intervals[0].fn(); assert.equal(calls.length,1,'No overlap');
  release({ok:true,status:200}); await new Promise(r=>original.setTimeout(r,0));
  assert.match(calls[1],/security-alerts$/);
  release({ok:true,status:200}); await new Promise(r=>original.setTimeout(r,0));
  assert.match(calls[2],/data-retention$/);
  release({ok:true,status:200}); await new Promise(r=>original.setTimeout(r,0));
  intervals[0].fn(); assert.equal(calls.length,3,'Successful jobs wait for their next due time');
  stop(); intervals[0].fn(); assert.equal(calls.length,3,'No jobs after shutdown');
  console.log('PASS: essential cron authorization, sequence, no overlap, due times and shutdown');
} finally { Object.assign(globalThis,original); }
