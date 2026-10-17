import * as THREE from "three";
import assets from "./palace-assets.json";

/** Optional desktop decoration; navigation and readable cards work without WebGL. */
export function mountHomePalace(root, { navigateToTreasury }) {
const chestAtlas=assets["chest-atlas"][1].url;
const info=[{slug:"gold",x:4.9,z:1.2},{slug:"silver",x:0,z:1.2},{slug:"weave",x:-4.9,z:1.2}];
const cleanups=[],frames=new Set();let disposed=false,selected=-1;
function requestFrame(fn){const id=window.requestAnimationFrame(time=>{frames.delete(id);if(!disposed)fn(time);});frames.add(id);return id;}
function observeResize(fn,el){const observer=new ResizeObserver(fn);observer.observe(el);cleanups.push(()=>observer.disconnect());}
function enterTreasury(i){if(info[i]&&!disposed)navigateToTreasury(info[i].slug);}
try { init(THREE); } catch(error) { console.error("[Eloria Palace] Using lightweight scene", error);root.dataset.mode="lite"; }
function init(T){
const host=root.querySelector('.ep-canvas'),scene=new T.Scene();scene.background=null;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;host.append(renderer.domElement);
const camera=new T.PerspectiveCamera(46,1,.1,80);const look=new T.Vector3(0,1.7,-3);let goalYaw=0,goalCam=new T.Vector3(),goalLook=new T.Vector3();
const mats={stone:new T.MeshStandardMaterial({color:'#cbb58a',roughness:.85}),stoneDark:new T.MeshStandardMaterial({color:'#9e8b64',roughness:.88}),gold:new T.MeshPhysicalMaterial({color:'#b38d51',metalness:.78,roughness:.38,clearcoat:.12}),silver:new T.MeshPhysicalMaterial({color:'#bdc5c5',metalness:.9,roughness:.23,clearcoat:.15}),green:new T.MeshStandardMaterial({color:'#131d5e',roughness:.9}),velvet:new T.MeshStandardMaterial({color:'#131b50',roughness:1}),wood:new T.MeshPhysicalMaterial({color:'#402719',roughness:.59,clearcoat:.12,clearcoatRoughness:.4}),gem:new T.MeshPhysicalMaterial({color:'#24747a',metalness:.12,roughness:.13,clearcoat:1,ior:1.48}),dark:new T.MeshStandardMaterial({color:'#1f2445',roughness:.82})};
function mesh(g,m,parent=scene){const a=new T.Mesh(g,m);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
function box(w,h,d,x,y,z,m,parent=scene){
let geo;if(w<2.5&&h>.045&&d>.045){const b=Math.min(.018,w*.05,h*.12,d*.12),hw=w/2-b,hh=h/2-b;const shape=new T.Shape();shape.moveTo(-hw,-hh);shape.lineTo(hw,-hh);shape.lineTo(hw,hh);shape.lineTo(-hw,hh);shape.closePath();geo=new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,steps:1});geo.translate(0,0,-d/2+b);}else geo=new T.BoxGeometry(w,h,d);const a=mesh(geo,m,parent);a.position.set(x,y,z);return a;}
function cyl(rt,rb,h,x,y,z,m,parent=scene,n=32){const a=mesh(new T.CylinderGeometry(rt,rb,h,n),m,parent);a.position.set(x,y,z);return a;}
function rosette(x,y,z,r,m,parent=scene){const g=new T.Group();g.position.set(x,y,z);parent.add(g);for(let k=0;k<12;k++){const a=k*Math.PI/6;const p=mesh(new T.SphereGeometry(1,8,5),m,g);p.scale.set(r*.15,r*.36,r*.055);p.rotation.z=-a;p.position.set(Math.sin(a)*r*.55,Math.cos(a)*r*.55,0);}const center=mesh(new T.SphereGeometry(r*.16,12,8),m,g);center.scale.z=.4;return g;}
const shadowFloor=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({color:'#21180f',opacity:.28}));shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=-.008;shadowFloor.receiveShadow=true;scene.add(shadowFloor);
const amb=new T.HemisphereLight('#ffedd4','#432b16',1.15);scene.add(amb);
const sun=new T.DirectionalLight('#ffdfae',1.75);sun.position.set(7,8,-2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-11,right:11,top:12,bottom:-12,near:.5,far:40});sun.shadow.radius=4;sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;sun.target.position.set(0,0,-4);scene.add(sun,sun.target);
const fill=new T.DirectionalLight('#ead3b2',.45);fill.position.set(-6,5,6);scene.add(fill);
for(let z=-4;z>=-20;z-=8){const light=new T.PointLight('#eac897',28,12,2);light.position.set(0,6.5,z);scene.add(light);}

// Reflection environment gives the metal and polished wood a physical highlight.
const envScene=new T.Scene();envScene.background=new T.Color('#716553');const envBox=new T.Mesh(new T.BoxGeometry(16,12,20),new T.MeshBasicMaterial({color:'#736d5d',side:T.BackSide}));envScene.add(envBox);function softbox(x,y,z,w,h,r){const m=new T.MeshBasicMaterial({color:new T.Color().setRGB(r,r*.94,r*.82)});const p=new T.Mesh(new T.PlaneGeometry(w,h),m);p.position.set(x,y,z);p.lookAt(0,2,0);envScene.add(p);}softbox(-6,4,4,5,5,6);softbox(7,3,1,3,5,2);softbox(0,5,-8,4,2,2.5);const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.15).texture;pmrem.dispose();
const chests=[],hits=[];
// One atlas serves both WebGL surfaces and the lightweight fallback.
const atlasImage=new Image();atlasImage.decoding="async";const atlasTexture=new T.Texture(atlasImage);
atlasTexture.colorSpace=T.SRGBColorSpace;atlasTexture.anisotropy=Math.min(16,renderer.capabilities?.getMaxAnisotropy?.()||8);
const frontTexture=atlasTexture.clone();frontTexture.repeat.set(1,.5);frontTexture.offset.set(0,.5);
const lidTexture=atlasTexture.clone();lidTexture.repeat.set(1,.5);lidTexture.offset.set(0,0);
atlasImage.onload=()=>{if(disposed)return;[atlasTexture,frontTexture,lidTexture].forEach(t=>t.needsUpdate=true);root.dataset.mode="webgl";wake();};
atlasImage.src=chestAtlas;
const carvedFace=new T.MeshStandardMaterial({map:frontTexture,roughness:.57,metalness:.18,color:'#eee1ce'});
const carvedLid=new T.MeshStandardMaterial({map:lidTexture,roughness:.53,metalness:.16,color:'#eee1ce'});
info.forEach((t,i)=>{
 const p=new T.Group();p.position.set(t.x,0,t.z);scene.add(p);
 const g=new T.Group();g.position.y=.0595*1.45;g.scale.set(1.85,1.45,1.80);p.add(g);
 const trim=mats.gold,lining=mats.velvet.clone();lining.color.set(i===0?'#351718':i===1?'#18252d':'#171e48');
 for(const x of [-.66,.66])for(const z of [-.39,.39]){box(.19,.10,.18,x,0,z,trim,g);box(.22,.035,.20,x,-.042,z,trim,g);}
 box(1.58,.075,1.04,0,.065,0,trim,g);box(1.50,.56,.085,0,.375,.457,mats.wood,g);box(1.50,.56,.085,0,.375,-.457,mats.wood,g);
 for(const x of [-.705,.705])box(.085,.56,.84,x,.375,0,mats.wood,g);
 for(const x of [-.738,.738])for(const z of [-.479,.479])box(.043,.56,.043,x,.375,z,trim,g);
 // Photographic relief panels sit flush on solid geometry; the lid remains independent.
 const front=mesh(new T.PlaneGeometry(1.50,.55),carvedFace,g);front.position.set(0,.375,.501);
 const back=mesh(new T.PlaneGeometry(1.50,.55),carvedFace,g);back.position.set(0,.375,-.501);back.rotation.y=Math.PI;
 for(const x of [-.751,.751]){const side=mesh(new T.PlaneGeometry(.93,.55),carvedLid,g);side.position.set(x,.375,0);side.rotation.y=x>0?Math.PI/2:-Math.PI/2;}
 box(1.32,.035,.77,0,.132,0,lining,g);
 for(const y of [.107,.653]){box(1.54,.022,.018,0,y,.506,trim,g);box(1.54,.022,.018,0,y,-.506,trim,g);for(const x of [-.768,.768])box(.018,.022,1.0,x,y,0,trim,g);}
 const hinge=new T.Group();hinge.position.set(0,.68,-.49);g.add(hinge);
 box(1.57,.082,1.03,0,.012,.49,mats.wood,hinge);
 const outer=mesh(new T.PlaneGeometry(1.57,1.03),carvedLid,hinge);outer.rotation.x=-Math.PI/2;outer.position.set(0,.055,.49);
 const inner=mesh(new T.PlaneGeometry(1.43,.88),lining,hinge);inner.rotation.x=Math.PI/2;inner.position.set(0,-.031,.49);
 for(const z of [-.02,1.0])box(1.58,.035,.024,0,.02,z,trim,hinge);
 for(const x of [-.79,.79])box(.024,.035,1.04,x,.02,.49,trim,hinge);
 for(const x of [-.48,.48]){const barrel=cyl(.027,.027,.14,x,.68,-.50,trim,g,14);barrel.rotation.z=Math.PI/2;}
 box(.08,.14,.022,0,-.034,1.015,trim,hinge);
 rosette(0,.615,.523,.066,trim,g);
 const liningLight=new T.PointLight('#e1b771',0,2.4,2);g.add(liningLight);
 // A shallow velvet tray and real product photos are anchored inside the body.
 // No sample or interior face is attached to the moving lid.
 box(1.30,.055,.73,0,.548,0,lining,g);
 // The clasp is a separate entry target; the rest of the chest opens for inspection.
 const entryClasp=box(.15,.16,.025,0,.60,.53,trim,g);entryClasp.userData.entersTreasury=true;
 g.traverse(o=>{if(o.isMesh){o.userData.chest=i;hits.push(o);}});chests.push({group:g,pedestal:p,lid:hinge,light:liningLight,open:0});
});

function alignHallPerspective(){
 camera.clearViewOffset();camera.updateProjectionMatrix();
 camera.setViewOffset(host.clientWidth,host.clientHeight,0,-host.clientHeight*.05,host.clientWidth,host.clientHeight);
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
}

let narrow=false;function overviewTargets(){
 const depth=narrow?16.8:10.8;
 // The photographed floor converges at 55% of image height; feet sit at 81%.
 // A level, shifted lens preserves the verticals and matches that vanishing line.
 const eyeHeight=.26*2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*depth;
 goalCam.set(0,eyeHeight,1.2+depth);goalLook.set(0,eyeHeight,-10);
}
function resize(){const w=host.clientWidth,h=host.clientHeight;narrow=w<600;camera.aspect=w/h;camera.fov=narrow?48:49;camera.updateProjectionMatrix();renderer.setSize(w,h,false);overviewTargets();camera.position.copy(goalCam);look.copy(goalLook);camera.lookAt(look);alignHallPerspective();wake();}
let down=null,moved=false;const ray=new T.Raycaster(),pointer=new T.Vector2();const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw:goalYaw};moved=false;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)moved=true;});
canvas.addEventListener('pointerup',e=>{if(down&&!moved){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits,false)[0];if(hit)enterTreasury(hit.object.userData.chest);}down=null;});canvas.addEventListener('pointercancel',()=>{down=null;});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=0,last=performance.now();
function wake(){if(disposed)return;if(!frame)frame=requestFrame(render);}
function render(now){frame=0;const dt=Math.min(.05,(now-last)/1000);last=now;const a=reduced?1:1-Math.exp(-dt*4);let moving=false;chests.forEach(c=>{const target=-c.open*1.35;c.lid.rotation.x+=(target-c.lid.rotation.x)*a;c.light.intensity=0;if(Math.abs(target-c.lid.rotation.x)>.001)moving=true;});renderer.render(scene,camera);root.dataset.selected=String(selected);root.dataset.lidAngles=chests.map(c=>c.lid.rotation.x.toFixed(3)).join(',');if(moving)wake();}
resize();camera.position.copy(goalCam);look.copy(goalLook);camera.lookAt(look);observeResize(resize,host);wake();root.dataset.ready='true';
cleanups.push(()=>{const seen=new Set();scene.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m||seen.has(m))continue;seen.add(m);for(const value of Object.values(m))if(value?.isTexture&&!seen.has(value)){seen.add(value);value.dispose();}m.dispose();}});scene.environment?.dispose();renderer.dispose();renderer.forceContextLoss();});
root._eloriaDebug={camera,scene,chests,renderer,projectChest(i){const p=chests[i].group.localToWorld(new T.Vector3(0,.38,.50)).project(camera);return{x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2};}};
}

return ()=>{disposed=true;frames.forEach(id=>window.cancelAnimationFrame(id));cleanups.forEach(fn=>fn());delete root._eloriaDebug;root.querySelector(".ep-canvas")?.replaceChildren();root.dataset.mode="lite";};
}
