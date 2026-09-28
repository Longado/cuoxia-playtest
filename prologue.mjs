export const WORLD=5000,DOOR=4610,SPEED=240;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const createWalker=()=>({x:160,target:null,facing:1});
export const canEnter=s=>Math.abs(s.x-DOOR)<115;
export const cameraAt=(x,width)=>clamp(x-width*.38,0,Math.max(0,WORLD-width));
export function advanceWalker(s,{direction=0},dt){
 let target=direction?null:s.target,delta=direction|| (target===null?0:Math.sign(target-s.x));
 const distance=SPEED*clamp(dt,0,.05);let x=clamp(s.x+delta*distance,0,WORLD);
 if(target!==null&&Math.abs(target-s.x)<=distance){x=target;target=null;}
 return {...s,x,target,facing:delta||s.facing};
}
export function once(fn){let done=false;return ()=>{if(done)return;done=true;fn();};}
export function createPrologue({host,onEnterRoom,reducedMotion=false}){
 const $=id=>host.querySelector('#'+id),view=$('alley-view'),walker=$('alley-player');
 const artIds=['qinghe-art','qinghe-walk-art','alley-frame-art','alley-scene-art','alley-leaf-art','alley-lantern-art'];
 let s=createWalker(),camera=0,unit=1,width=1600,frame=0,last=null,disposed=false,entry=null,art='loading',walkDistance=0,loadRequest=0;
 const keys=new Set();
 function pose(){
  if(!entry)return {x:s.x,y:0,face:s.facing,phase:'street',moving:false};
  const t=entry.time,a=entry.approach;
  if(reducedMotion)return t<.2?{x:4568,y:-24,face:1,phase:'crossing',moving:false}:{x:4638,y:-38,face:1,phase:'occluded',moving:false};
  if(t<a)return {x:entry.from+(4568-entry.from)*t/a,y:0,face:Math.sign(4568-entry.from)||1,phase:'approach',moving:true};
  if(t<a+.4)return {x:4568,y:-24*(t-a)/.4,face:1,phase:'crossing',moving:true};
  if(t<a+1){const q=(t-a-.4)/.6;return {x:4568+70*q,y:-24-14*q,face:1,phase:'inside',moving:true};}
  return {x:4638,y:-38,face:1,phase:'occluded',moving:false};
 }
 function resize(){const r=view.getBoundingClientRect();unit=r.height/1000;width=r.width/unit;view.style.setProperty('--u',unit+'px');paint();}
 function paint(){
  camera=cameraAt(s.x,width);const offset=`translateX(${-camera*unit}px)`,p=pose();
  $('alley-world').style.transform=offset;$('alley-foreground').style.transform=offset;$('alley-shop-scene').style.transform=offset;
  $('alley-distant').style.transform=`translateX(${-camera*unit*(reducedMotion?1:.28)}px)`;
  walker.style.left=(p.x-camera)*unit+'px';walker.style.setProperty('--face',p.face);walker.style.setProperty('--entry-y',p.y*unit+'px');walker.disabled=art!=='ready'||!!entry;
  view.dataset.x=s.x.toFixed(2);view.dataset.camera=camera.toFixed(2);view.dataset.art=art;view.dataset.entry=p.phase;
  const near=canEnter(s);$('alley-enter').hidden=art!=='ready'||!near||!!entry;
  $('alley-enter').style.left=clamp((DOOR-camera)*unit,65,Math.max(65,width*unit-65))+'px';
  $('alley-retry').hidden=art!=='error';
  const caption=art==='loading'?'正在准备巷景…':art==='error'?'巷景未能载入，请重试或跳过。':entry?'':near?'灯下的门开着。':s.x<600?'有人托我来取一只匣子。':'';
  if($('alley-caption').textContent!==caption)$('alley-caption').textContent=caption;
 }
 function step(distance){walkDistance+=distance;walker.dataset.step=String(Math.floor((walkDistance+1e-7)/32)%4);}
 function tick(now){
  if(disposed)return;
  const dt=last===null?0:clamp((now-last)/1000,0,.05);last=now;
  if(art==='ready'&&!document.hidden){
   if(entry){
    const old=pose();entry.time+=dt;const p=pose();step(Math.hypot(p.x-old.x,p.y-old.y));walker.classList.toggle('walking',p.moving);paint();
    if(entry.time>=(reducedMotion?.55:entry.approach+1.3)){finish();return;}
   }else{
    const direction=(keys.has('right')?1:0)-(keys.has('left')?1:0),old=s.x;s=advanceWalker(s,{direction},dt);
    walker.classList.toggle('walking',Math.abs(old-s.x)>.01);if(old!==s.x){step(Math.abs(old-s.x));paint();}
   }
  }
  frame=requestAnimationFrame(tick);
 }
 function halt(){keys.clear();s={...s,target:null};last=null;walker.classList.remove('walking');}
 function dispose(){disposed=true;loadRequest++;halt();cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',halt);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',halt);host.removeEventListener('cancel',cancel);}
 const finish=once(()=>{if(disposed)return;dispose();host.close();onEnterRoom();});
 function enter(){if(disposed||entry||art!=='ready'||!canEnter(s))return;halt();entry={from:s.x,time:0,approach:Math.max(.2,Math.abs(s.x-4568)/SPEED)};paint();}
 function loadArt(retry=false){
  if(disposed||entry)return;const request=++loadRequest;art='loading';halt();paint();
  Promise.all(artIds.map(async id=>{const img=$(id);if(!img.dataset.source)img.dataset.source=img.getAttribute?.('src')||img.src||'';
   if(retry)img.src=img.dataset.source+(img.dataset.source.includes('?')?'&':'?')+'artRetry='+request;
   await img.decode();
  })).then(()=>{if(disposed||request!==loadRequest)return;art='ready';last=null;const scene=$('alley-scene-art');view.style.setProperty('--scene-image',`url("${scene.currentSrc||scene.src}")`);const img=$('qinghe-walk-art');if(img.src)view.style.setProperty('--walk-image',`url("${img.currentSrc||img.src}")`);paint();}).catch(()=>{if(disposed||request!==loadRequest)return;art='error';halt();paint();});
 }
 function key(e){return ['ArrowRight','d','D'].includes(e.key)?'right':['ArrowLeft','a','A'].includes(e.key)?'left':null;}
 function down(e){if(disposed||entry||art!=='ready'||e.altKey||e.ctrlKey||e.metaKey)return;const k=key(e);if(k){e.preventDefault();keys.add(k);s={...s,target:null};}else if(e.key==='Enter'&&e.target===view){e.preventDefault();enter();}}
 function up(e){const k=key(e);if(k){e.preventDefault();keys.delete(k);}}
 function cancel(e){e.preventDefault();finish();}
 view.onclick=e=>{if(disposed||entry||art!=='ready'||e.target.closest('button'))return;const r=view.getBoundingClientRect();if(e.clientY<r.top+r.height*.81)return;keys.clear();s={...s,target:clamp(camera+(e.clientX-r.left)/unit,0,WORLD)};view.focus({preventScroll:true});};
 walker.onclick=()=>{if(entry||disposed)return;halt();view.focus({preventScroll:true});};$('alley-enter').onclick=enter;$('alley-skip').onclick=finish;$('alley-retry').onclick=()=>loadArt(true);
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',halt);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',halt);host.addEventListener('cancel',cancel);
 return {start(){host.showModal();resize();loadArt();view.focus({preventScroll:true});frame=requestAnimationFrame(tick);},dispose};
}
