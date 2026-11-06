// Resonant blade viewer. All WebGL lives here; the page talks to it through createViewer().
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

export const VIEW_NAMES=['three','front','back','edge','handle','butt','photo'];
const VIEWS={front:[[0,0,1],0,1],back:[[0,0,-1],0,1],edge:[[1,.02,.12],0,1],three:[[.5,.2,.85],0,1],handle:[[.42,.1,.9],-78,.42],butt:[[.22,-1,.42],-120,.3],layers:[[.93,.14,.42],4,1.02]};

const POSE={h2:{e:[-1.5,-.95,.1],pos:[-30,-95,175],tgt:[28,-122,-20]}};

export async function createViewer({canvas,labelLayer=null,onProgress=()=>{}}){
const cv=canvas;
const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
r.setClearColor(0,0);
r.setPixelRatio(Math.min(devicePixelRatio,2));r.toneMapping=THREE.NeutralToneMapping;
const sc=new THREE.Scene();
sc.environment=new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(),.04).texture;sc.environmentIntensity=.72;
const cam=new THREE.PerspectiveCamera(24,1,5,4000);sc.add(cam);
const key=new THREE.DirectionalLight(0xfff6ea,.85);key.position.set(60,80,200);cam.add(key);cam.add(key.target);key.target.position.set(0,0,-300);
const ctl=new OrbitControls(cam,cv);ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.enablePan=false;ctl.minDistance=70;ctl.maxDistance=1100;ctl.minPolarAngle=0;ctl.maxPolarAngle=Math.PI;
const tl=new THREE.TextureLoader(),A=r.capabilities.getMaxAnisotropy();
let done=0;const NT=21;const tick=x=>{onProgress(++done/NT);return x};
const T=async(n,c=1)=>{const t=await tl.loadAsync('tex/'+n+'.jpg');t.colorSpace=c?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=A;return tick(t)};
const [ft,fn,bt,bn,h1f,h1fn,h1b,h1bn,h2,h2n,h2b,h2bn,tg,b1,b2,ed,ply,core,M]=await Promise.all([T('front'),T('front_n',0),T('back'),T('back_n',0),T('h1f'),T('h1f_n',0),T('h1b'),T('h1b_n',0),T('h2'),T('h2_n',0),T('h2b'),T('h2b_n',0),T('tang'),T('b1'),T('b2'),T('edge'),T('ply'),T('core'),fetch('mesh.json').then(x=>x.json()).then(tick)]);
ed.wrapS=THREE.RepeatWrapping;
const pm=(map,nm,rough,cc=0,ns=.5,sp=.5)=>new THREE.MeshPhysicalMaterial({map,normalMap:nm||null,normalScale:new THREE.Vector2(ns,ns),roughness:rough,clearcoat:cc,clearcoatRoughness:.5,specularIntensity:sp});
const mat={front:pm(ft,fn,.56,.03,.5,.34),back:pm(bt,bn,.56,.03,.5,.34),edge:pm(ed,null,.62),h1f:pm(h1f,h1fn,.62,0,.6,.3),h1b:pm(h1b,h1bn,.62,0,.6,.3),h2:pm(h2,h2n,.4,.18,.17,.55),h2b:pm(h2b,h2bn,.4,.18,.17,.55),tang:pm(tg,null,.38,.2),b1:pm(b1,null,.6),b2:pm(b2,null,.66)};
const g=new THREE.Group();sc.add(g);g.position.y=-129;
function build(m,kind){
  const P=m.position,N=m.normal,I=m.index,hd=kind!=='blade';
  const cr=new Float32Array(60);
  if(hd)for(let i=0;i<P.length;i+=3){const b=Math.min(59,Math.round(P[i+1]/2));cr[b]=Math.max(cr[b],Math.abs(P[i+2]));}
  for(let i=1;i<60;i++)if(!cr[i])cr[i]=cr[i-1];
  const crown=y=>{const f=y/2,a=Math.min(59,Math.floor(f)),b=Math.min(59,a+1);return cr[a]+(cr[b]-cr[a])*(f-a)};
  const buckets=hd?[[],[]]:[[],[],[],[]];
  for(let t=0;t<I.length;t+=3){
    let nz=0,ny=0,y=0;for(let k=0;k<3;k++){const v=I[t+k];nz+=N[v*3+2]/3;ny+=N[v*3+1]/3;y+=P[v*3+1]/3}
    const isButt=ny<-.7&&y<3;
    buckets[hd?(isButt?1:0):(isButt?3:nz>.9?0:nz<-.9?1:2)].push(t);
  }
  const pos=[],nor=[],uv=[],geo=new THREE.BufferGeometry();let n0=0;
  buckets.forEach((b,gi)=>{
    for(const t of b)for(let k=0;k<3;k++){
      const v=I[t+k],x=P[v*3],y=P[v*3+1],z=P[v*3+2];
      pos.push(x,y,z);nor.push(N[v*3],N[v*3+1],N[v*3+2]);
      if(hd){
        if(gi===1)uv.push((x+17.94)/35.88,(z+13)/26);
        else{const d=Math.max(0,crown(y)-Math.abs(z));uv.push((x+Math.sign(x)*d+32)/64,y/104)}
      }else if(gi===3)uv.push((x+17.94)/35.88,(z+13)/26);
      else if(gi===2)uv.push(Math.atan2(x,y-175)*105/400,(z+3)/6);
      else uv.push((x+75.5)/151,y/258);
    }
    geo.addGroup(n0,b.length*3,gi);n0+=b.length*3;
  });
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return geo;
}
const blade=new THREE.Mesh(build(M[0],'blade'),[mat.front,mat.back,mat.edge,mat.b1]);g.add(blade);
const hf=new THREE.Mesh(build(M[1],'front'),[mat.h1f,mat.b1]),hb=new THREE.Mesh(build(M[2],'back'),[mat.h1b,mat.b1]);g.add(hf,hb);
function tangStrip(m){
  const P=m.position,N=m.normal,I=m.index,pos=[],nor=[],uv=[];
  for(let t=0;t<I.length;t+=3){
    let nz=0,ny=0,y=1e9;for(let k=0;k<3;k++){const v=I[t+k];nz+=N[v*3+2]/3;ny+=N[v*3+1]/3;y=Math.min(y,P[v*3+1])}
    if(Math.abs(nz)>.9||y>=102||(ny<-.97&&y<3))continue;
    for(let k=0;k<3;k++){const v=I[t+k];pos.push(P[v*3],P[v*3+1],P[v*3+2]*1.04);nor.push(N[v*3],N[v*3+1],N[v*3+2]);uv.push((P[v*3+2]+3)/6,P[v*3+1]/104)}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return geo;
}
mat.tang.polygonOffset=true;mat.tang.polygonOffsetFactor=-2;mat.tang.polygonOffsetUnits=-2;
mat.tang.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLocal=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLocal;\n').replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    if(vLocal.y>80.||abs(vLocal.x)>18.6)discard;`);
};
const tang=new THREE.Mesh(tangStrip(M[0]),mat.tang);tang.visible=false;g.add(tang);


// ---- canvas layers: the plate, flag and engraving are drawn onto the wood, so they follow the surface exactly
const loadImg=u=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(tick(i));i.onerror=no;i.src=u});
const [plateImg,flagBr]=await Promise.all([loadImg('tex/plate.png'),loadImg('tex/flag-br.png')]);
const paintTex=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=A;return {c,x:c.getContext('2d',{willReadFrequently:true}),t}};
// each handle keeps its own painted textures on the GPU, so switching only swaps materials
const P={1:{f:paintTex(1280,2080),b:paintTex(1280,2080),sf:h1f,sb:h1b,key:null},2:{f:paintTex(1920,3120),b:paintTex(1920,3120),sf:h2,sb:h2b,key:null}},pe=paintTex(ft.image.width,ft.image.height);
mat.h1f.map=P[1].f.t;mat.h1b.map=P[1].b.t;mat.h2.map=P[2].f.t;mat.h2b.map=P[2].b.t;mat.front.map=pe.t;
const FLAGS={
  ch:(x,r)=>{x.fillStyle='#d52b1e';x.fillRect(-r,-r,2*r,2*r);x.fillStyle='#fff';x.fillRect(-r*.62,-r*.17,r*1.24,r*.34);x.fillRect(-r*.17,-r*.62,r*.34,r*1.24)},
  de:(x,r)=>{[['#111',-1],['#d00',-1/3],['#fc0',1/3]].forEach(([c,y])=>{x.fillStyle=c;x.fillRect(-r,y*r,2*r,r*2/3+1)})},
  fr:(x,r)=>{[['#0055a4',-1],['#fff',-1/3],['#ef4135',1/3]].forEach(([c,k])=>{x.fillStyle=c;x.fillRect(k*r,-r,r*2/3+1,2*r)})},
  it:(x,r)=>{[['#009246',-1],['#fff',-1/3],['#ce2b37',1/3]].forEach(([c,k])=>{x.fillStyle=c;x.fillRect(k*r,-r,r*2/3+1,2*r)})},
};
function drawFlag(x,code,cx,cy,r){
  if(code==='br'){x.drawImage(flagBr,cx-r*1.08,cy-r*1.08,r*2.16,r*2.16);return}
  x.save();x.translate(cx,cy);
  x.beginPath();x.arc(0,0,r*1.08,0,7);x.fillStyle='#14110f';x.fill();
  x.beginPath();x.arc(0,0,r*.9,0,7);x.clip();FLAGS[code](x,r*.92);
  const g=x.createRadialGradient(-r*.3,-r*.35,r*.05,0,0,r);g.addColorStop(0,'rgba(255,255,255,.34)');g.addColorStop(.5,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(0,0,0,.28)');
  x.fillStyle=g;x.fillRect(-r,-r,2*r,2*r);x.restore();
}
function paintHandle(h,plate,flag){
  const p=P[h],key=plate+'|'+flag;if(p.key===key)return;p.key=key;
  const {c}=p.f,k=c.width/1280;
  p.f.x.drawImage(p.sf.image,0,0,c.width,c.height);p.b.x.drawImage(p.sb.image,0,0,c.width,c.height);
  if(plate)p.f.x.drawImage(plateImg,555*k,914*k,150*k,852*k);
  if(flag&&(flag==='br'||FLAGS[flag]))drawFlag(p.b.x,flag,640*k,1568*k,88*k);
  p.f.t.needsUpdate=true;p.b.t.needsUpdate=true;
}
function paintEngraving(){
  const x=pe.x,{width:W,height:H}=pe.c;x.drawImage(ft.image,0,0,W,H);
  const txt=(state.engraving||'').toUpperCase().slice(0,12);
  if(txt){const k=W/2048;x.save();x.textAlign='right';x.textBaseline='alphabetic';x.font=`${50*k}px Bahnschrift,"DIN Alternate","DIN Condensed","Arial Narrow",Arial,sans-serif`;
    if('letterSpacing' in x)x.letterSpacing=`${3*k}px`;
    x.fillStyle='rgba(255,226,196,.13)';x.fillText(txt,985*k,(1924+1.6)*k);x.fillStyle='rgba(14,8,6,.86)';x.fillText(txt,985*k,1924*k);x.restore()}
  pe.t.needsUpdate=true;
}
const FIN=[mat.h1f,mat.h1b,mat.h2,mat.h2b,mat.tang];FIN.forEach(m=>m.userData.base={r:m.roughness,c:m.clearcoat,s:m.specularIntensity});
function paintFinish(){const oil=state.finish==='oiled';
  for(const m of FIN){const b=m.userData.base;m.color.setRGB(...(oil?[1,1,1]:[1.16,1.13,1.1]));m.roughness=oil?b.r:Math.min(.86,b.r+.3);m.clearcoat=oil?b.c:0;m.specularIntensity=oil?b.s:b.s*.45;m.needsUpdate=true}
}
// ---- soft contact shadow under the handle end
const shadow=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createRadialGradient(128,128,4,128,128,128);g.addColorStop(0,'rgba(30,22,16,.5)');g.addColorStop(.45,'rgba(30,22,16,.16)');g.addColorStop(1,'rgba(30,22,16,0)');x.fillStyle=g;x.fillRect(0,0,256,256);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(240,120),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=-133;sc.add(m);return m})();
// ---- exploded layers
const ROOT=new THREE.Group();g.add(ROOT);
const faceGeo=z=>{const b=blade.geometry.clone(),p=b.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)*z);p.needsUpdate=true;return b};
const inner=m=>new THREE.MeshPhysicalMaterial({map:m,roughness:.62,specularIntensity:.3});
const matPly=inner(ply),matCore=inner(core);
const dark=new THREE.MeshStandardMaterial({color:0x1d120d,roughness:.9,side:THREE.DoubleSide});
function chamber(z){
  const grp=new THREE.Group(),mk=(w,h,y)=>{const s=new THREE.Shape(),r=w/2;s.moveTo(-r,y+r);s.lineTo(-r,y+h-r);s.absarc(0,y+h-r,r,Math.PI,0,true);s.lineTo(r,y+r);s.absarc(0,y+r,r,0,Math.PI,true);const m=new THREE.Mesh(new THREE.ShapeGeometry(s,20),dark);m.position.z=z;return m};
  grp.userData.partial=[mk(9,46,34)];grp.userData.max=[mk(13,74,14)];grp.add(...grp.userData.partial,...grp.userData.max);return grp;
}
const chF=chamber(2.98),chB=chamber(-2.98);hf.add(chF);hb.add(chB);
function paintChamber(){for(const c of [chF,chB]){c.userData.partial.forEach(m=>m.visible=state.structure==='partial');c.userData.max.forEach(m=>m.visible=state.structure==='max')}}
let plies=[],labels=[],ex=0,exTo=0;const GAP=22;
function clearPlies(){plies.forEach(p=>{ROOT.remove(p.mesh);p.mesh.geometry.dispose()});plies=[];labels.forEach(l=>l.el.remove());labels=[]}
function makePlies(list){
  clearPlies();const n=list.length,tot=list.reduce((a,l)=>a+(l.mm||1.2),0);let z=3;
  list.forEach((l,i)=>{const t=(l.mm||1.2)/tot*6;const outer=i===0||i===n-1;z-=t;
    const m=outer?(i===0?[mat.front,matPly,matPly,matPly]:[matPly,mat.back,matPly,matPly]):Array(4).fill(/core/i.test(l.name)?matCore:matPly);
    const mesh=new THREE.Mesh(faceGeo(t/6),m);const home=z+t/2,to=((n-1)/2-i)*GAP;mesh.position.z=home;mesh.visible=false;ROOT.add(mesh);plies.push({mesh,home,to});
    if(labelLayer){const el=document.createElement('div');el.className='layer-label';el.style.cssText='position:absolute;left:0;top:0;white-space:nowrap;font-size:12px;line-height:1;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.9);color:#1b1a18;box-shadow:0 1px 4px rgba(0,0,0,.14);will-change:transform;opacity:0;transition:opacity .25s';el.textContent=l.name+(l.mm!=null?`  ${l.mm} mm`:'');labelLayer.append(el);labels.push({el,ply:plies[i]})}
  });
}
const HZ=()=>((plies.length-1)/2+1)*GAP;
const P3=new THREE.Vector3();
let lastT=performance.now();
function stepExplode(){
  const now=performance.now(),dt=Math.min(.25,(now-lastT)/1000);lastT=now;
  ex+=(exTo-ex)*(1-Math.exp(-dt*9));if(Math.abs(exTo-ex)<.002)ex=exTo;
  const on=ex>.001;blade.visible=!on;plies.forEach(p=>{p.mesh.visible=on;p.mesh.position.z=p.home+(p.to-p.home)*ex});
  hf.position.z=HZ()*ex;hb.position.z=-HZ()*ex;tang.visible=!on&&state.handle==2;
  const [w,h]=box();
  labels.forEach((l,i)=>{const dy=46-i*23,yy=175+dy;P3.set(75.5*Math.sqrt(Math.max(0,1-(dy/90)**2)),yy,l.ply.mesh.position.z);g.localToWorld(P3);P3.project(cam);l.el.style.transform=`translate(${(P3.x+1)/2*w+6}px,${(1-P3.y)/2*h-12}px)`;l.el.style.opacity=ex>.7?1:0});
}
const state={handle:1,finish:'oiled',flag:'br',plate:true,engraving:'',structure:'solid'};
const seen={};
function set(p={}){Object.assign(state,p);
  const w=state.handle==2;hf.material=[w?mat.h2:mat.h1f,w?mat.b2:mat.b1];hb.material=[w?mat.h2b:mat.h1b,w?mat.b2:mat.b1];blade.material[3]=w?mat.b2:mat.b1;
  const key=k=>k.map(n=>state[n]).join('|');
  paintHandle(state.handle,state.plate,state.flag);
  if(seen.e!==state.engraving){seen.e=state.engraving;paintEngraving()}
  if(seen.f!==state.finish){seen.f=state.finish;paintFinish()}
  paintChamber();
}
const box=()=>{const p=cv.parentElement;return [p.clientWidth||innerWidth,p.clientHeight||innerHeight]};
let inset={t:0,r:0,b:0,l:0},lastView='three',moved=false;
function applyOffset(){const [w,h]=box(),dx=(inset.l-inset.r)/2,dy=(inset.t-inset.b)/2;if(dx||dy)cam.setViewOffset(w,h,-dx,-dy,w,h);else cam.clearViewOffset();cam.updateProjectionMatrix()}
function resize(){const [w,h]=box();r.setSize(w,h,false);cam.aspect=w/h;applyOffset()}
function setInsets(i={}){inset={t:0,r:0,b:0,l:0,...i};applyOffset();if(!moved)view(lastView,{instant:true})}
const free=()=>{const [w,h]=box();return [Math.max(120,w-inset.l-inset.r)/w,Math.max(120,h-inset.t-inset.b)/h]};
const dist=s=>{const tn=2*Math.tan(cam.fov*Math.PI/360),[fw,fh]=free();return Math.max(285/(tn*fh),175/(tn*cam.aspect*fw))*s};
let tw=null,spinning=false;
const Q0=new THREE.Quaternion(),Q1=new THREE.Quaternion().setFromEuler(new THREE.Euler(...POSE.h2.e,'YXZ'));
function view(v,{instant=false}={}){
  if(v==='photo'&&state.handle!=2)v='front';
  lastView=v;moved=false;
  let p,t,q=Q0;
  if(v==='photo'){t=new THREE.Vector3(...POSE.h2.tgt);const [fw]=free();p=new THREE.Vector3(...POSE.h2.pos).sub(t).multiplyScalar(Math.max(1,1.33/(cam.aspect*fw))).add(t);q=Q1}
  else{const [d,ty,s]=VIEWS[v];t=new THREE.Vector3(0,ty,0);p=new THREE.Vector3(...d).normalize().multiplyScalar(dist(s)).add(t)}
  if(instant){cam.position.copy(p);ctl.target.copy(t);g.quaternion.copy(q);ctl.update();return}
  tw={p0:cam.position.clone(),t0:ctl.target.clone(),q0:g.quaternion.clone(),q,p,t,s:performance.now()};
}
function explode(on,layers=[]){if(on){if(layers.length)makePlies(layers);exTo=1;view('layers')}else{exTo=0;view('three')}}
function spin(on){spinning=on;ctl.autoRotate=on;ctl.autoRotateSpeed=2}
async function snapshot({size=2048,transparent=true}={}){
  const [w,h]=box(),pr=r.getPixelRatio(),k=size/Math.max(w,h);
  cam.clearViewOffset();cam.updateProjectionMatrix();
  r.setPixelRatio(1);r.setSize(Math.round(w*k),Math.round(h*k),false);
  if(!transparent)r.setClearColor(0xffffff,1);
  const sv=shadow.visible;shadow.visible=false;r.render(sc,cam);shadow.visible=sv;
  const blob=await new Promise(f=>cv.toBlob(f,'image/png'));
  r.setClearColor(0,0);r.setPixelRatio(pr);resize();
  return blob;
}
new ResizeObserver(resize).observe(cv.parentElement);resize();
ctl.addEventListener('start',()=>{tw=null;moved=true});
paintHandle(1,true,'br');paintHandle(2,false,null);
view('three',{instant:true});set();
for(const k of [1,2])for(const q of ['f','b'])r.initTexture(P[k][q].t);
set({handle:2,plate:false});r.render(sc,cam);set({handle:1,plate:true,flag:'br'});r.render(sc,cam); // compile both handles' shaders now, so the first switch is instant too
r.setAnimationLoop(()=>{
  if(tw){const k=Math.min(1,(performance.now()-tw.s)/650),e=k*k*(3-2*k);cam.position.lerpVectors(tw.p0,tw.p,e);ctl.target.lerpVectors(tw.t0,tw.t,e);g.quaternion.slerpQuaternions(tw.q0,tw.q,e);if(k==1)tw=null}
  ctl.update();stepExplode();shadow.visible=cam.position.y>-120&&ex<.01&&g.quaternion.w>.999;r.render(sc,cam);
});
return {set,view,explode,spin,snapshot,resize,setInsets,state,cam,ctl};
}
