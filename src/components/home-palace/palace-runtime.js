import * as THREE from "three";

export function mountHomePalace(root, { catalog, navigateToTreasury }) {

const photos=catalog.map(p=>({name:p.name,slug:p.slug,src:p.imageUrl}));
const chestAtlas="/images/palace/chest-atlas.webp";
root.style.setProperty('--chest-atlas','url("'+chestAtlas+'")');
const info=[{"slug": "gold", "name": "گنجینهٔ طلا", "x": 3.85, "z": 1.2, "photos": [4, 5]}, {"slug": "silver", "name": "گنجینهٔ نقره", "x": 0, "z": 1.2, "photos": [3]}, {"slug": "weave", "name": "گنجینهٔ بافت", "x": -3.85, "z": 1.2, "photos": [0, 1, 2]}];
info.forEach(t=>{t.photos=catalog.map((p,i)=>({p,i})).filter(({p})=>{const gold=p.hasGold??p.material==='GOLD',silver=p.hasSilver??p.material==='SILVER';return t.slug==='gold'?gold:t.slug==='silver'?silver:!gold&&!silver;}).slice(0,3).map(({i})=>i);});
const labels=['نمای محصول'];
const cleanups=[],frames=new Set(),timeouts=new Set();let disposed=false;
function requestFrame(fn){const id=window.requestAnimationFrame(time=>{frames.delete(id);if(!disposed)fn(time);});frames.add(id);return id;}
function setTimeout(fn,ms){const id=window.setTimeout(()=>{timeouts.delete(id);if(!disposed)fn();},ms);timeouts.add(id);return id;}
function observeResize(fn,el){const observer=new ResizeObserver(fn);observer.observe(el);cleanups.push(()=>observer.disconnect());}
function listenRoot(type,fn,options){root.addEventListener(type,fn,options);cleanups.push(()=>root.removeEventListener(type,fn,options));}

let selectChest=()=>{}, selected=-1, returnView=()=>{}, turn=()=>{}, moveIntoChest=()=>{}, resetCamera=()=>{};
const lightbox=root.querySelector('.ep-lightbox');let lastFocus=null;
function closePhoto(){lightbox.hidden=true;if(lastFocus)lastFocus.focus();}
function photoButton(i,view=0){const b=document.createElement('button');b.type='button';b.className='ep-photo cursor-interaction'+(view===1?' zoom':view===2?' zoom2':'');b.setAttribute('aria-label',photos[i].name+'، '+labels[view]);const im=document.createElement('img');im.src=photos[i].src;im.alt=photos[i].name;im.loading='lazy';b.append(im);if(view){const s=document.createElement('span');s.textContent=labels[view];b.append(s);}b.onclick=()=>{lastFocus=b;lightbox.querySelector('img').src=photos[i].src;lightbox.querySelector('img').alt=photos[i].name;lightbox.querySelector('p').textContent=photos[i].name;lightbox.hidden=false;root.querySelector('.ep-close').focus();};return b;}
info.forEach((t,i)=>{
 const card=document.createElement('section');card.className='ep-treasury';card.dataset.index=i;
 card.innerHTML='<div class="ep-title-row"><h3 class="ep-calligraphy">'+t.name+'</h3></div><div class="ep-photos"></div><a class="ep-enter cursor-interaction" href="/fa/collections/'+t.slug+'"><span>ورود به گنجینه</span><span aria-hidden="true">←</span></a>';

 for(let j=0;j<3;j++){
  const idx=t.photos[j];
  if(idx!==undefined){
   const figure=document.createElement('figure');figure.className='ep-product-preview';figure.append(photoButton(idx));
   const caption=document.createElement('figcaption');caption.textContent=photos[idx].name;figure.append(caption);card.querySelector('.ep-photos').append(figure);
  }else{
   const empty=document.createElement('span');empty.className='ep-photo-empty';empty.textContent='—';empty.setAttribute('aria-label','محصول دیگری برای نمایش موجود نیست');card.querySelector('.ep-photos').append(empty);
  }
 }
 root.querySelector('.ep-treasuries').append(card);

 t.photos.slice(0,3).forEach(photoIndex=>{
  const sample=document.createElement('img');sample.className='ep-interior-sample';sample.src=photos[photoIndex].src;sample.alt=photos[photoIndex].name;
  root.querySelector('[data-css-index="'+i+'"] .ep-box-inner').append(sample);
 });
});

root.querySelectorAll('button:not(.ep-photo),.ep-enter,.ep-shop-link').forEach(el=>el.classList.add('ep-frame'));
photos.forEach((p,i)=>root.querySelector('.ep-featured-grid').append(photoButton(i)));
root.querySelector('.ep-close').onclick=closePhoto;
lightbox.onclick=e=>{if(e.target===lightbox)closePhoto();};
listenRoot('keydown',e=>{if(e.key==='Escape'){if(!lightbox.hidden)closePhoto();else returnView();}if(e.key==='Tab'&&!lightbox.hidden){e.preventDefault();root.querySelector('.ep-close').focus();}});
root.querySelector('.ep-overview').onclick=()=>returnView();root.querySelectorAll('.ep-turn').forEach(b=>b.onclick=()=>turn(Number(b.dataset.turn)));
let liteMode=false;function enableLiteMode(){if(liteMode)return;liteMode=true;root.dataset.mode='lite';root.dataset.ready='true';root.querySelector('.ep-loading').hidden=true;selected=-1;
const details=[...root.querySelectorAll('.ep-css-chest details')];function sync(){root.dataset.selected=String(selected);root.querySelectorAll('.ep-treasury').forEach((el,i)=>{const yes=i===selected;el.classList.toggle('is-open',yes);});root.querySelector('.ep-status').textContent=selected<0?'برای ورود، صندوقچه یا دکمهٔ گنجینه را انتخاب کنید.':info[selected].name+' باز شد؛ در حال ورود…';}
selectChest=i=>{selected=i;details.forEach(d=>d.open=Number(d.parentElement.dataset.cssIndex)===selected);sync();};details.forEach(d=>{d.querySelector('summary').onclick=e=>{e.preventDefault();enterTreasury(Number(d.parentElement.dataset.cssIndex));};});returnView=()=>{selected=-1;details.forEach(d=>d.open=false);root.style.setProperty('--ep-angle','0deg');sync();};turn=()=>{};
moveIntoChest=(i,done)=>{
 const stage=root.querySelector('.ep-stage'),world=root.querySelector('.ep-world');
 const box=root.querySelector('[data-css-index="'+i+'"] .ep-box-inner').getBoundingClientRect(),r=stage.getBoundingClientRect();
 const x=box.left+box.width/2-r.left,y=box.top+box.height/2-r.top;
 const scale=Math.min(7.2,Math.max(2.8,.72*stage.clientWidth/Math.max(16,box.width)));
 const token=journey,start=performance.now();world.style.transformOrigin='0 0';world.style.transition='none';
 function step(now){
  if(token!==journey)return;
  const elapsed=now-start,t=Math.min(1,elapsed/2300),p=t*t*(3-2*t),z=1+(scale-1)*p;
  const dx=(stage.clientWidth/2-x)*p+(1-z)*x,dy=(stage.clientHeight*.56-y)*p+(1-z)*y;
  world.style.transform='translate('+dx+'px,'+dy+'px) scale('+z+')';
  root.dataset.flightPhase=elapsed<2300?'approach':'focus';
  root.style.setProperty('--ep-entry-veil',String(Math.max(0,Math.min(1,(elapsed-3000)/350))));
  if(elapsed>=3350){done();return;}requestFrame(step);
 }
 requestFrame(step);
};
resetCamera=()=>{root.querySelector('.ep-world').style.transformOrigin='50% 50%';};
sync();requestFrame(fitLightweightScene);}

function fail(){enableLiteMode();}

function start(){try{init(THREE);}catch(e){console.error(e);fail();}}
Promise.resolve().then(()=>{if(!disposed)start();});
function init(T){
const host=root.querySelector('.ep-canvas'),scene=new T.Scene();scene.background=null;
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;host.append(renderer.domElement);
const camera=new T.PerspectiveCamera(46,1,.1,80);const look=new T.Vector3(0,1.7,-3);let goalYaw=0,goalCam=new T.Vector3(),goalLook=new T.Vector3();
const mats={stone:new T.MeshStandardMaterial({color:'#cbb58a',roughness:.85}),stoneDark:new T.MeshStandardMaterial({color:'#9e8b64',roughness:.88}),gold:new T.MeshPhysicalMaterial({color:'#b38d51',metalness:.78,roughness:.38,clearcoat:.12}),silver:new T.MeshPhysicalMaterial({color:'#bdc5c5',metalness:.9,roughness:.23,clearcoat:.15}),green:new T.MeshStandardMaterial({color:'#064332',roughness:.9}),velvet:new T.MeshStandardMaterial({color:'#07372c',roughness:1}),wood:new T.MeshPhysicalMaterial({color:'#402719',roughness:.59,clearcoat:.12,clearcoatRoughness:.4}),gem:new T.MeshPhysicalMaterial({color:'#24747a',metalness:.12,roughness:.13,clearcoat:1,ior:1.48}),dark:new T.MeshStandardMaterial({color:'#112d22',roughness:.82})};
function mesh(g,m,parent=scene){const a=new T.Mesh(g,m);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
function box(w,h,d,x,y,z,m,parent=scene){
let geo;if(w<2.5&&h>.045&&d>.045){const b=Math.min(.018,w*.05,h*.12,d*.12),hw=w/2-b,hh=h/2-b;const shape=new T.Shape();shape.moveTo(-hw,-hh);shape.lineTo(hw,-hh);shape.lineTo(hw,hh);shape.lineTo(-hw,hh);shape.closePath();geo=new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,steps:1});geo.translate(0,0,-d/2+b);}else geo=new T.BoxGeometry(w,h,d);const a=mesh(geo,m,parent);a.position.set(x,y,z);return a;}
function cyl(rt,rb,h,x,y,z,m,parent=scene,n=32){const a=mesh(new T.CylinderGeometry(rt,rb,h,n),m,parent);a.position.set(x,y,z);return a;}
function rosette(x,y,z,r,m,parent=scene){const g=new T.Group();g.position.set(x,y,z);parent.add(g);for(let k=0;k<12;k++){const a=k*Math.PI/6;const p=mesh(new T.SphereGeometry(1,8,5),m,g);p.scale.set(r*.15,r*.36,r*.055);p.rotation.z=-a;p.position.set(Math.sin(a)*r*.55,Math.cos(a)*r*.55,0);}const center=mesh(new T.SphereGeometry(r*.16,12,8),m,g);center.scale.z=.4;return g;}
function texture(kind){const c=document.createElement('canvas');c.width=c.height=384;const ctx=c.getContext('2d');const data=ctx.createImageData(384,384);const hash=(x,y)=>{let n=(x*374761393+y*668265263)|0;n=(n^(n>>>13))*1274126177;return((n^(n>>>16))>>>0)/4294967295;};function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),T.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}function fbm(x,y){let n=0,a=.5;for(let k=0;k<4;k++){n+=a*noise(x,y);x*=2;y*=2;a*=.5;}return n;}
for(let y=0;y<384;y++)for(let x=0;x<384;x++){const u=x/384,v=y/384,n=fbm(u*5,v*5),fine=hash(x,y);let r,g,b;if(kind==='wood'){const grain=Math.sin(v*360+n*13+Math.sin(u*6)*3),fiber=Math.pow(.5+.5*Math.sin(v*1000+n*6),8);const t=n*.45+grain*.06-fiber*.045+(fine-.5)*.025;r=68+t*72;g=36+t*50;b=20+t*34;}else{const vein=Math.pow(1-Math.abs(Math.sin((u*.8+v*.6+n*.65)*15)),18),t=n*.22+(fine-.5)*.027-vein*.09;r=188+t*80;g=178+t*74;b=152+t*68;}const p=(y*384+x)*4;data.data[p]=r;data.data[p+1]=g;data.data[p+2]=b;data.data[p+3]=255;}ctx.putImageData(data,0,0);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;return tex;}

mats.wood.map=texture('wood');mats.wood.color.set('#ffffff');mats.stone.map=texture('stone');mats.stone.color.set('#dec19a');mats.stone.bumpMap=mats.stone.map;mats.stone.bumpScale=.025;mats.wood.bumpMap=mats.wood.map;mats.wood.bumpScale=.018;
const shadowFloor=new T.Mesh(new T.PlaneGeometry(40,40),new T.ShadowMaterial({color:'#21180f',opacity:.28}));shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=-.008;shadowFloor.receiveShadow=true;scene.add(shadowFloor);
const amb=new T.HemisphereLight('#ffedd4','#432b16',1.15);scene.add(amb);
const sun=new T.DirectionalLight('#ffdfae',1.75);sun.position.set(7,8,-2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:12,bottom:-12,near:.5,far:40});sun.shadow.radius=4;sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;sun.target.position.set(0,0,-4);scene.add(sun,sun.target);
const fill=new T.DirectionalLight('#ead3b2',.45);fill.position.set(-6,5,6);scene.add(fill);
for(let z=-4;z>=-20;z-=8){const light=new T.PointLight('#eac897',28,12,2);light.position.set(0,6.5,z);scene.add(light);}

// Reflection environment gives the metal and polished wood a physical highlight.
const envScene=new T.Scene();envScene.background=new T.Color('#716553');const envBox=new T.Mesh(new T.BoxGeometry(16,12,20),new T.MeshBasicMaterial({color:'#736d5d',side:T.BackSide}));envScene.add(envBox);function softbox(x,y,z,w,h,r){const m=new T.MeshBasicMaterial({color:new T.Color().setRGB(r,r*.94,r*.82)});const p=new T.Mesh(new T.PlaneGeometry(w,h),m);p.position.set(x,y,z);p.lookAt(0,2,0);envScene.add(p);}softbox(-6,4,4,5,5,6);softbox(7,3,1,3,5,2);softbox(0,5,-8,4,2,2.5);const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.15).texture;pmrem.dispose();
const chests=[],hits=[];
// One atlas serves both WebGL surfaces and the lightweight fallback.
const atlasImage=new Image();const atlasTexture=new T.Texture(atlasImage);
atlasTexture.colorSpace=T.SRGBColorSpace;atlasTexture.anisotropy=Math.min(16,renderer.capabilities?.getMaxAnisotropy?.()||8);
const frontTexture=atlasTexture.clone();frontTexture.repeat.set(1,.5);frontTexture.offset.set(0,.5);
const lidTexture=atlasTexture.clone();lidTexture.repeat.set(1,.5);lidTexture.offset.set(0,0);
atlasImage.onload=()=>{[atlasTexture,frontTexture,lidTexture].forEach(t=>t.needsUpdate=true);wake();};
atlasImage.src=chestAtlas;
const carvedFace=new T.MeshStandardMaterial({map:frontTexture,roughness:.57,metalness:.18,color:'#eee1ce'});
const carvedLid=new T.MeshStandardMaterial({map:lidTexture,roughness:.53,metalness:.16,color:'#eee1ce'});
info.forEach((t,i)=>{
 const p=new T.Group();p.position.set(t.x,0,t.z);scene.add(p);
 const g=new T.Group();g.position.y=.0595*1.45;g.scale.set(1.85,1.45,1.80);p.add(g);
 const trim=mats.gold,lining=mats.velvet.clone();lining.color.set(i===0?'#351718':i===1?'#18252d':'#0b3025');
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
 t.photos.slice(0,3).forEach((photoIndex,j)=>{
  const photo=photos[photoIndex],sampleImage=new Image(),sampleTexture=new T.Texture(sampleImage);
  sampleTexture.colorSpace=T.SRGBColorSpace;sampleTexture.anisotropy=8;
  sampleImage.onload=()=>{sampleTexture.needsUpdate=true;wake();};sampleImage.src=photo.src;
  const sampleMat=new T.MeshBasicMaterial({map:sampleTexture,toneMapped:false});
  const width=t.photos.length===1?.46:t.photos.length===2?.44:.34;
  const x=(j-(Math.min(3,t.photos.length)-1)/2)*(width+.045);
  const sample=mesh(new T.PlaneGeometry(width,width*1.16),sampleMat,g);
  sample.rotation.x=-Math.PI/2;sample.position.set(x,.578,-.04);
  sample.userData.productSlug=photo.slug;sample.userData.interiorProduct=true;
 });
 // The clasp is a separate entry target; the rest of the chest opens for inspection.
 const entryClasp=box(.15,.16,.025,0,.60,.53,trim,g);entryClasp.userData.entersTreasury=true;
 g.traverse(o=>{if(o.isMesh){o.userData.chest=i;hits.push(o);}});chests.push({group:g,pedestal:p,lid:hinge,light:liningLight,open:0});
});

function alignHallPerspective(){
 camera.clearViewOffset();camera.updateProjectionMatrix();
 camera.setViewOffset(host.clientWidth,host.clientHeight,0,-host.clientHeight*.05,host.clientWidth,host.clientHeight);
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
}

let flight=null;
const focusWorld=root.querySelector('.ep-world');
const easeFocus=t=>t*t*(3-2*t);
moveIntoChest=(i,done)=>{
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const group=chests[i].group;
 const center=group.localToWorld(new T.Vector3(0,.49,.02)).project(camera);
 const left=group.localToWorld(new T.Vector3(-.78,.49,.02)).project(camera);
 const right=group.localToWorld(new T.Vector3(.78,.49,.02)).project(camera);
 const boxWidth=Math.max(.05,Math.abs(right.x-left.x)/2);
 flight={done,start:performance.now(),x:(center.x+1)/2,y:(1-center.y)/2,
  scale:Math.min(7.2,Math.max(2.8,.72/boxWidth))};
 const pixels=Math.min(6,Math.max(1,devicePixelRatio)*flight.scale,4096/host.clientWidth,4096/host.clientHeight);
 renderer.setPixelRatio(pixels);renderer.setSize(host.clientWidth,host.clientHeight,false);
 focusWorld.style.transition='none';focusWorld.style.transformOrigin='0 0';
 root.dataset.flightPhase='approach';wake();
};
resetCamera=()=>{
 flight=null;focusWorld.style.transition='none';focusWorld.style.transform='none';
 focusWorld.style.transformOrigin='50% 50%';root.style.setProperty('--ep-entry-veil','0');
 root.dataset.flightPhase='idle';renderer.setPixelRatio(Math.min(devicePixelRatio,2));resize();
};
function advanceFlight(now){
 if(!flight)return false;
 const f=flight,elapsed=now-f.start,t=Math.min(1,elapsed/2300),p=easeFocus(t);
 const scale=1+(f.scale-1)*p;
 const dx=(.5-f.x)*host.clientWidth*p+(1-scale)*f.x*host.clientWidth;
 const dy=(.56-f.y)*host.clientHeight*p+(1-scale)*f.y*host.clientHeight;
 focusWorld.style.transform='translate('+dx+'px,'+dy+'px) scale('+scale+')';
 // Every part of the room shares this transform. The camera orientation and all
 // chest body matrices stay unchanged, avoiding orbit, lift, or exploded panels.
 root.dataset.flightPhase=elapsed<2300?'approach':'focus';
 root.style.setProperty('--ep-entry-veil',String(Math.max(0,Math.min(1,(elapsed-3000)/350))));
 if(elapsed>=3350){flight=null;f.done();return false;}
 return true;
}

let narrow=false;function overviewTargets(){
 const depth=narrow?16.8:10.8;
 // The photographed floor converges at 55% of image height; feet sit at 81%.
 // A level, shifted lens preserves the verticals and matches that vanishing line.
 const eyeHeight=.26*2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*depth;
 goalCam.set(0,eyeHeight,1.2+depth);goalLook.set(0,eyeHeight,-10);
}
function resize(){if(flight)return;const w=host.clientWidth,h=host.clientHeight;narrow=w<600;camera.aspect=w/h;camera.fov=narrow?48:49;camera.updateProjectionMatrix();renderer.setSize(w,h,false);overviewTargets();camera.position.copy(goalCam);look.copy(goalLook);camera.lookAt(look);alignHallPerspective();wake();}
function updateCards(){root.querySelectorAll('.ep-treasury').forEach((el,i)=>{const is=selected===i;el.classList.toggle('is-open',is);});root.querySelector('.ep-status').textContent=selected<0?'برای ورود، صندوقچه یا دکمهٔ گنجینه را انتخاب کنید.':info[selected].name+' باز شد؛ در حال ورود…';}
selectChest=i=>{selected=i;goalYaw=0;chests.forEach((c,k)=>c.open=k===selected?1:0);updateCards();wake();};
returnView=()=>{selected=-1;goalYaw=0;chests.forEach(c=>c.open=0);overviewTargets();updateCards();wake();};
turn=()=>{};
let down=null,moved=false;const ray=new T.Raycaster(),pointer=new T.Vector2();const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw:goalYaw};moved=false;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)moved=true;});
canvas.addEventListener('pointerup',e=>{if(down&&!moved){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits,false)[0];if(hit)enterTreasury(hit.object.userData.chest);}down=null;});canvas.addEventListener('pointercancel',()=>{down=null;});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=0,last=performance.now();
function wake(){if(disposed)return;if(!frame)frame=requestFrame(render);}
function render(now){frame=0;const dt=Math.min(.05,(now-last)/1000);last=now;const a=reduced?1:1-Math.exp(-dt*4);let moving=false;chests.forEach(c=>{const target=-c.open*1.35;c.lid.rotation.x+=(target-c.lid.rotation.x)*a;c.light.intensity=0;if(Math.abs(target-c.lid.rotation.x)>.001)moving=true;});if(advanceFlight(now))moving=true;renderer.render(scene,camera);root.dataset.selected=String(selected);root.dataset.lidAngles=chests.map(c=>c.lid.rotation.x.toFixed(3)).join(',');if(moving)wake();}
resize();camera.position.copy(goalCam);look.copy(goalLook);camera.lookAt(look);observeResize(resize,host);wake();root.querySelector('.ep-loading').hidden=true;root.dataset.ready='true';
cleanups.push(()=>{const seen=new Set();scene.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m||seen.has(m))continue;seen.add(m);for(const value of Object.values(m))if(value?.isTexture&&!seen.has(value)){seen.add(value);value.dispose();}m.dispose();}});scene.environment?.dispose();renderer.dispose();renderer.forceContextLoss();});
root._eloriaDebug={camera,scene,chests,renderer,projectChest(i){const p=chests[i].group.localToWorld(new T.Vector3(0,.38,.50)).project(camera);return{x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2};}};
}
const stage=root.querySelector('.ep-stage'),world=root.querySelector('.ep-world');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let journey=0,journeyTimer=0,entering=false;
function resetJourney(){
 journey++;clearTimeout(journeyTimer);entering=false;root.dataset.entering='false';root.dataset.view='hall';
 stage.hidden=false;root.querySelector('.ep-hall-content').hidden=false;
 world.style.transition='none';world.style.transform='none';
 root.style.setProperty('--ep-entry-veil','0');root.dataset.flightPhase='idle';
 returnView();resetCamera();
 root.querySelector('.ep-overview').textContent='نمای تالار';root.querySelector('.ep-overview').style.visibility='';
}
function showCollection(i,token){
 if(token!==journey)return;
 root.dataset.entering='false';entering=false;root.style.setProperty('--ep-entry-veil','0');
 root.dataset.destination=info[i].slug;
 if(typeof navigateToTreasury==='function'){navigateToTreasury(info[i].slug);return;}
 const status=root.querySelector('.ep-status');status.replaceChildren();
 const link=document.createElement('a');link.className='ep-live-destination';link.href='/fa/collections/'+info[i].slug;
 link.target='_blank';link.rel='noopener noreferrer';link.textContent='مشاهدهٔ '+info[i].name+' در سایت فعلی';status.append(link);
 root.dataset.view='focused';root.querySelector('.ep-overview').style.visibility='visible';
}
function enterTreasury(i){
 if(entering||!info[i]||root.dataset.ready!=='true'||root.dataset.view==='focused')return;
 entering=true;const token=++journey;root.dataset.entering='true';root.dataset.destination=info[i].slug;
 selectChest(i);root.dataset.flightPhase='lid';
 root.querySelector('.ep-status').textContent='در حال ورود به '+info[i].name+'…';
 root.querySelector('.ep-overview').textContent='بازگشت به تالار';
 journeyTimer=setTimeout(()=>{
  if(token!==journey)return;
  if(reducedMotion){showCollection(i,token);return;}
  moveIntoChest(i,()=>showCollection(i,token));
 },reducedMotion?0:850);
}
root.querySelectorAll('.ep-enter').forEach((link,i)=>link.addEventListener('click',e=>{
 if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();enterTreasury(i);
}));
root.querySelector('.ep-overview').onclick=resetJourney;
listenRoot('keydown',e=>{if(e.key==='Escape'&&lightbox.hidden)resetJourney();});
root._journeyDebug={enter:enterTreasury,reset:resetJourney};

function fitLightweightScene(){
 const stage=root.querySelector('.ep-stage');
 root.style.setProperty('--ep-room-scale',String(Math.min(1.05,stage.clientWidth/980)));
}
observeResize(fitLightweightScene,root.querySelector('.ep-stage'));
fitLightweightScene();

// A restrained cinemagraph: only the cloth and fire pixels move; architecture stays still.
(function animatePalace(){
 const stage=root.querySelector('.ep-stage'),world=root.querySelector('.ep-world'),source=root.querySelector('.ep-backplate');
 const canvas=document.createElement('canvas');canvas.className='ep-atmosphere';canvas.setAttribute('aria-hidden','true');world.insertBefore(canvas,root.querySelector('.ep-canvas'));
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const still=matchMedia('(prefers-reduced-motion: reduce)');
 let visible=true,frame=0,lastPaint=0,ready=false;
 const flags=[[91,91,68,322],[523,175,58,239],[1091,175,58,239],[1514,91,66,324]];
 const fires=[[439,401,59,53],[1172,401,59,53]];
 function size(){const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(stage.clientWidth*dpr);canvas.height=Math.round(stage.clientHeight*dpr);paint(0);}
 function paint(time){
  if(!ready||!canvas.width||!canvas.height)return;
  const k=Math.max(canvas.width/source.naturalWidth,canvas.height/source.naturalHeight),ox=(canvas.width-source.naturalWidth*k)/2,oy=(canvas.height-source.naturalHeight*k)/2;
  ctx.setTransform(k,0,0,k,ox,oy);ctx.clearRect(-ox/k,-oy/k,canvas.width/k,canvas.height/k);ctx.drawImage(source,0,0);
  if(still.matches)return;
  const t=time*.001;
  flags.forEach(([x,y,w,h],i)=>{
   ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
   for(let dy=0;dy<h;dy+=4){const v=dy/h,shift=(Math.sin(t*1.5-v*5+i*.6)+.35*Math.sin(t*2.1-v*9))*(.5+v)*1.8;
    ctx.drawImage(source,x+shift,y+dy,w,Math.min(4,h-dy),x,y+dy,w,Math.min(4,h-dy));}
   ctx.restore();
  });
  fires.forEach(([x,y,w,h],i)=>{
   ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
   for(let dy=0;dy<h;dy+=2){const tip=1-dy/h,sway=(Math.sin(t*5+dy*.15+i)+.45*Math.sin(t*8.3-dy*.21))*tip*3.7;
    ctx.drawImage(source,x+sway,y+dy,w,Math.min(2,h-dy),x,y+dy,w,Math.min(2,h-dy));}
   const glow=ctx.createRadialGradient(x+w/2,y+h*.8,2,x+w/2,y+h*.8,w*.5);
   glow.addColorStop(0,'rgba(255,183,65,'+(.045+.035*Math.sin(t*7+i))+')');glow.addColorStop(1,'rgba(255,148,40,0)');
   ctx.fillStyle=glow;ctx.fillRect(x,y,w,h);ctx.restore();
  });
 }
 function tick(time){frame=0;if(!ready||!visible||document.hidden||still.matches)return;if(time-lastPaint>=33){paint(time);lastPaint=time;}frame=requestFrame(tick);}
 function resume(){if(ready&&visible&&!document.hidden&&!still.matches&&!frame)frame=requestFrame(tick);else if(still.matches)paint(0);}
 function loaded(){ready=true;size();resume();}
 source.addEventListener('load',loaded,{once:true});if(source.complete&&source.naturalWidth)loaded();
 observeResize(size,stage);
 if(typeof IntersectionObserver!=='undefined'){const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();},{rootMargin:'120px'});observer.observe(stage);cleanups.push(()=>observer.disconnect());}
 document.addEventListener('visibilitychange',resume);still.addEventListener?.('change',resume);cleanups.push(()=>{document.removeEventListener('visibilitychange',resume);still.removeEventListener?.('change',resume);});
})();

return ()=>{disposed=true;frames.forEach(id=>window.cancelAnimationFrame(id));timeouts.forEach(id=>window.clearTimeout(id));cleanups.forEach(fn=>fn());delete root._eloriaDebug;delete root._journeyDebug;root.replaceChildren();};
}
