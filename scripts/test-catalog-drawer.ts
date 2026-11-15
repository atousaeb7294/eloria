/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated React browser doubles. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import React,{act} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';
async function main(){
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const require=createRequire(import.meta.url), pushes:string[]=[];
 const timers=new Map<number,()=>void>();let timer=0,opened=0;
 const doc={body:{style:{overflow:''}}};
 const win={setTimeout:(fn:()=>void)=>{timers.set(++timer,fn);return timer;},clearTimeout:(id:number)=>timers.delete(id)};
 const mod={exports:{} as any};
 const code=ts.transpileModule(readFileSync('src/components/product-catalog-filters.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(code,{module:mod,exports:mod.exports,require:(name:string)=>{
   if(name==='next/navigation')return {usePathname:()=>'/en/products',useRouter:()=>({push:(url:string)=>pushes.push(url)})};
   if(name==='@/lib/site-measurement-client')return {recordClientMeasurement:()=>{}};
   return require(name);
 },window:win,document:doc,URLSearchParams,console});
 let tree!:ReactTestRenderer;
 await act(async()=>{tree=create(React.createElement(mod.exports.ProductCatalogFilters,{locale:'en',initialFilters:{search:'',material:'all',collection:'all',minPrice:'',maxPrice:'',availability:'all'}}),{createNodeMock:(node:any)=>node.type==='dialog'?{showModal:()=>opened++,close:()=>{}}:null});});
 const text=(n:any):string=>typeof n==='string'?n:(n.children??[]).map(text).join('');
 const button=(label:string)=>tree.root.findAllByType('button').find(n=>text(n)===label)!;
 await act(async()=>button('Filters').props.onClick());
 assert.equal(opened,1);assert.equal(doc.body.style.overflow,'hidden');
 await act(async()=>button('Gold').props.onClick());
 assert.equal(pushes.length,0,'Draft choices do not navigate or remount the open drawer');
 await act(async()=>tree.root.findByProps({'aria-label':'Close filters'}).props.onClick());
 assert.equal(button('Gold').props['aria-pressed'],false,'Cancel restores applied filters');
 assert.equal(timers.size,0,'Cancel does not schedule a filter submission');
 await act(async()=>button('Filters').props.onClick());
 await act(async()=>button('Silver').props.onClick());
 await act(async()=>button('View creations').props.onClick());
 assert.equal(pushes.length,1);assert.match(pushes[0],/material=silver/);
 assert.equal(doc.body.style.overflow,'');
 await act(async()=>tree.unmount());assert.equal(timers.size,0);
 console.log('PASS drawer: modal opens, draft selection stays open, cancel restores, apply navigates once, scroll unlocks and timers clean up.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
