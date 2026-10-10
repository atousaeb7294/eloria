/* eslint-disable @typescript-eslint/no-explicit-any -- Execute client component with isolated browser doubles. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const require = createRequire(import.meta.url);
  const timers = new Map<number, () => void>(); let timer = 0;
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const win = Object.assign(new EventTarget(), {
    setTimeout: (fn: () => void) => { timers.set(++timer,fn);return timer; },
    clearTimeout: (id: number) => timers.delete(id),
    setInterval: () => ++timer, clearInterval: () => {},
  });
  let requests = 0, deliver!: (result: unknown) => void;
  const mod = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/live-purchase-box.tsx","utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(compiled, {
    module:mod, exports:mod.exports, require:(name:string)=>{
      if(name==="next/link")return {__esModule:true,default:(props:any)=>React.createElement("a",props)};
      if(name==="@/components/add-to-cart-button")return {AddToCartButton:(props:any)=>React.createElement("button",{disabled:props.disabled,"data-add":true},"Add")};
      if(name==="@/lib/weight-units")return {formatWeightSoot:()=>"500"};
      return require(name);
    },
    window:win, document:doc, navigator:{onLine:true}, Date, performance, AbortController, console,
    clearTimeout:win.clearTimeout, clearInterval:win.clearInterval,
    fetch:(_url:string,options:any)=>{
      requests++; return new Promise((resolve,reject)=>{
        deliver=resolve; options.signal.addEventListener("abort",()=>reject(Error("aborted")),{once:true});
      });
    },
  });
  let tree!: ReactTestRenderer;
  const props={locale:"en",slug:"test"};
  await act(async()=>{tree=create(React.createElement(mod.exports.LivePurchaseBox,props));});
  assert.equal(requests,1); assert.equal(tree.root.findByType("button").props.disabled,true);
  await act(async()=>deliver({ok:false,json:async()=>({successful:false})}));
  const retry=()=>tree.root.findAllByType("button").find(b=>b.children.join("")==="Try again")!;
  assert.ok(retry()); assert.equal(retry().props.disabled,false);
  await act(async()=>retry().props.onClick()); assert.equal(requests,2);
  const quote={successful:true,product:{slug:"test",stock:1,isPurchasable:true,material:"GOLD"},variant:null,liveRate:null,pricing:{mode:"MANUAL",finalPriceToman:"1000000",breakdown:null},quote:{generatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+120000).toISOString()}};
  await act(async()=>deliver({ok:true,json:async()=>quote}));
  assert.equal(tree.root.findByProps({"data-add":true}).props.disabled,false);
  await act(async()=>win.dispatchEvent(new Event("online")));
  await act(async()=>deliver({ok:true,json:async()=>({...quote,product:{...quote.product,stock:0,isPurchasable:false}})}));
  assert.equal(tree.root.findAllByProps({"data-add":true}).length,0);
  assert.equal(tree.root.findByType("a").props.href,"/en/preorder/test");
  await act(async()=>win.dispatchEvent(new Event("online")));
  await act(async()=>deliver({ok:true,json:async()=>({...quote,quote:{generatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()-1000).toISOString()}})}));
  assert.equal(tree.root.findAllByProps({"data-add":true}).length,0,'Expired quote cannot enable purchase');
  assert.ok(retry());
  await act(async()=>tree.unmount()); assert.equal(timers.size,0,'Timers cleaned on unmount');
  console.log('PASS: actual React purchase effect fails safely, manual retry recovers, stock-out differs from error, expired quotes stay blocked, cleanup');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
