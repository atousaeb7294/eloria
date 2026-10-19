import { PALACE_OPENING_MS } from "./palace-entry";
import { LIDS, hingeDepth, lidVertex, openingAngle, projectWorld, type Lid, type Point } from "./palace-hinge";
import { MOBILE_SCENE_QUERY, SCENES, type SceneMode } from "./palace-scene";
import type { Treasury } from "./palace-products";

export type ChestMotion = { warm: () => void; open: (slug: Treasury) => boolean; reset: () => void; destroy: () => void };
type Artwork = { original: HTMLImageElement; plate: HTMLImageElement; ready: boolean };
function polygon(ctx: CanvasRenderingContext2D, points: readonly Point[]) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
}
function triangle(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, source: Point[], dest: Point[]) {
  const [[x0,y0],[x1,y1],[x2,y2]] = source, [[u0,v0],[u1,v1],[u2,v2]] = dest;
  const det = (x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
  if (Math.abs(det) < .001) return;
  const area = (u1-u0)*(v2-v0)-(u2-u0)*(v1-v0);
  if (area <= .01) return; // The exterior never draws through the velvet underside.
  const a=((u1-u0)*(y2-y0)-(u2-u0)*(y1-y0))/det;
  const b=((v1-v0)*(y2-y0)-(v2-v0)*(y1-y0))/det;
  const c=((u2-u0)*(x1-x0)-(u1-u0)*(x2-x0))/det;
  const d=((v2-v0)*(x1-x0)-(v1-v0)*(x2-x0))/det;
  ctx.save();
  // Sub-pixel overlap avoids seams between adjacent photographic triangles.
  const cx=(u0+u1+u2)/3, cy=(v0+v1+v2)/3;
  polygon(ctx,dest.map(([x,y])=>[cx+(x-cx)*1.008,cy+(y-cy)*1.008] as Point)); ctx.clip();
  ctx.transform(a,b,c,d,u0-a*x0-c*y0,v0-b*x0-d*y0);
  ctx.drawImage(texture,0,0); ctx.restore();
}
function bounds(points: Point[]) {
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return { x:Math.floor(Math.min(...xs))-2,y:Math.floor(Math.min(...ys))-2,
    width:Math.ceil(Math.max(...xs)-Math.min(...xs))+4,height:Math.ceil(Math.max(...ys)-Math.min(...ys))+4 };
}
function cutout(image: HTMLImageElement, points: Point[], mode: SceneMode) {
  const box=bounds(points), canvas=document.createElement("canvas"); canvas.width=box.width;canvas.height=box.height;
  const ctx=canvas.getContext("2d"); if(!ctx) return null;
  ctx.translate(-box.x,-box.y); polygon(ctx,points);ctx.clip();
  ctx.drawImage(image,0,0,SCENES[mode].width,SCENES[mode].height);
  return { canvas,box };
}

/** One small 2D mesh, on demand. No Three.js, idle loop, React-per-frame updates,
 * video, duplicated desktop/mobile DOM, or network work above the fold. */
export function createChestMotion(root: HTMLElement): ChestMotion {
  const canvas=root.querySelector<HTMLCanvasElement>(".ep-chest-motion");
  let frame=0,disposed=false;
  const media=window.matchMedia(MOBILE_SCENE_QUERY);
  const artwork: Partial<Record<SceneMode,Artwork>>={};
  const mode=(): SceneMode=>media.matches?"mobile":"desktop";
  function warm() {
    const selected=mode();
    if(disposed || artwork[selected] || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const original=new Image(),plate=new Image();
    original.decoding=plate.decoding="async";
    const item:Artwork={original,plate,ready:false};artwork[selected]=item;
    const update=()=>{item.ready=original.complete&&original.naturalWidth>0&&plate.complete&&plate.naturalWidth>0;};
    original.onload=plate.onload=update;
    original.onerror=plate.onerror=()=>{delete artwork[selected];};
    original.src=SCENES[selected].src;plate.src=SCENES[selected].plate;
    update();
  }
  function reset() {
    cancelAnimationFrame(frame);frame=0;
    if(canvas){canvas.dataset.active="false";canvas.getContext("2d")?.clearRect(0,0,canvas.width,canvas.height);}
  }
  function open(slug:Treasury) {
    reset();const selected=mode(),art=artwork[selected],scene=SCENES[selected],lid=LIDS[selected][slug];
    if(disposed||!canvas||!art?.ready) return false;
    const ctx=canvas.getContext("2d");if(!ctx)return false;
    const shell=cutout(art.original,lid.outline,selected),latch=cutout(art.original,lid.latch,selected);
    if(!shell||!latch)return false;
    const scale=Math.min(1.5,Math.max(.5,canvas.getBoundingClientRect().width/scene.width*Math.min(window.devicePixelRatio||1,2)));
    canvas.width=Math.round(scene.width*scale);canvas.height=Math.round(scene.height*scale);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
    const start=performance.now();canvas.dataset.active="true";
    const cols=8,rows=10;
    function paint(now:number) {
      if(disposed||!canvas||!ctx||mode()!==selected){reset();return;}
      const elapsed=now-start,angle=openingAngle(elapsed);
      ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,scene.width,scene.height);
      // Only the original lid/latch footprints use the matched clean plate.
      // The full reference scene and stationary chest body remain unchanged.
      for(const mask of [lid.outline,lid.latch]) {
        ctx.save();const b=bounds(mask),cx=b.x+b.width/2,cy=b.y+b.height/2;
        polygon(ctx,mask.map(([x,y])=>[cx+(x-cx)*1.014,cy+(y-cy)*1.014] as Point));ctx.clip();
        ctx.drawImage(art!.plate,0,0,scene.width,scene.height);ctx.restore();
      }
      const {x,y,width,height}=shell!.box;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
        const left=width*col/cols,top=height*row/rows,right=width*(col+1)/cols,bottom=height*(row+1)/rows;
        const points:Point[]=[[left,top],[right,top],[right,bottom],[left,bottom]];
        const projected=points.map(([px,py])=>lidVertex(lid,[px+x,py+y],angle));
        for(const indices of [[0,1,2],[0,2,3]]) triangle(ctx,shell!.canvas,indices.map(i=>points[i]),indices.map(i=>projected[i]));
      }
      if(angle>.35) {
        // Underside panel has a fixed rear edge and finite depth; only the lid moves.
        const left=lid.rear[0]-(width*.42),right=lid.rear[0]+(width*.42),depth=hingeDepth(lid);
        const inner=[projectWorld(lid,left,0,0,angle),projectWorld(lid,right,0,0,angle),projectWorld(lid,right,0,depth,angle),projectWorld(lid,left,0,depth,angle)];
        const gradient=ctx.createLinearGradient(inner[0][0],inner[0][1],inner[2][0],inner[2][1]);
        gradient.addColorStop(0,"#17091e");gradient.addColorStop(.52,"#421235");gradient.addColorStop(1,"#13091c");
        polygon(ctx,inner);ctx.fillStyle=gradient;ctx.fill();
        ctx.strokeStyle=slug==="silver"?"#bcafa0":"#b48b42";ctx.lineWidth=2;ctx.stroke();
        // A subtle inset seam, not a glowing empty hole.
        const cx=inner.reduce((s,p)=>s+p[0],0)/4,cy=inner.reduce((s,p)=>s+p[1],0)/4;
        polygon(ctx,inner.map(([px,py])=>[cx+(px-cx)*.95,cy+(py-cy)*.92] as Point));ctx.strokeStyle="#855c59";ctx.lineWidth=.65;ctx.stroke();
      }
      // The loose hasp swings under gravity instead of stretching with the roof.
      const anchor=lidVertex(lid,lid.anchor,angle);
      ctx.save();ctx.translate(anchor[0],anchor[1]);ctx.rotate(-.12*Math.sin(angle)*Math.min(1,elapsed/90));
      ctx.drawImage(latch!.canvas,latch!.box.x-lid.anchor[0],latch!.box.y-lid.anchor[1]);ctx.restore();
      // Small hinge barrels stay attached to the rear edge, throughout the motion.
      if(angle>.04){ctx.strokeStyle=slug==="silver"?"#cfc3b4":"#d6b66f";ctx.lineWidth=3.5;ctx.lineCap="round";
        for(const dx of [-width*.3,width*.3]){const p=projectWorld(lid,lid.rear[0]+dx,0,0,angle);ctx.beginPath();ctx.moveTo(p[0]-7,p[1]);ctx.lineTo(p[0]+7,p[1]+14*lid.slope);ctx.stroke();}}
      if(elapsed<PALACE_OPENING_MS)frame=requestAnimationFrame(paint);else frame=0;
    }
    frame=requestAnimationFrame(paint);return true;
  }
  const resize=()=>reset();media.addEventListener("change",resize);
  return {warm,open,reset,destroy(){disposed=true;reset();media.removeEventListener("change",resize);
    for(const value of Object.values(artwork)){value.original.onload=value.plate.onload=null;value.original.onerror=value.plate.onerror=null;}
  }};
}
