import {createNameReturnView} from './name-return-view.mjs?v=fortune-room-62';
import {createFortuneRoomView} from './fortune-room-view.mjs?v=fortune-room-62';
import {createPrologue} from './prologue.mjs?v=fortune-room-62';
import {mirrorClean,wipeMirror,cabinetInUse} from './game.mjs?v=layout-1';
import {createWorkshops} from './workshops.mjs?v=layout-1';
import {NAMES,TOOLS,createGame,movePuppet,setLight,toggleCabinet,takeCabinetItem,returnCabinetItem,projection,contacts,resolveContacts,shadowFit,LOCK_REGISTER,tryBox,takeLetter,touchMirror,liftReceipt,showReceipt,isRevealed,turn,enterCloseup,leaveCloseup} from './game.mjs?v=layout-1';
import {createShen,shenStage,shenLine,beginDeparture,finishDeparture,banquetScene,askLu} from './shen.mjs?v=layout-1';
import {SCENES} from './scenes.mjs';
const $=s=>document.querySelector(s),order=['shen','lu','qing'];
let state={...createGame(),view:1},shen=createShen(),departureTimer=null,departureMotion=null,entryTimer=null,banquet=null,banquetTimer=null,banquetMotion=null,inspection=null,selected=null,drag=null,bookOpen=false,echoTimer=null,loadTicket=0;
const bg={a:'room-a',b:'counter-room-v1',c:'room-c',d:'room-d',table:'close-table',box:'counter-room-v1',ledger:'room-c',mirror:'room-d'};
const boxRects=[[42,135,447,302],[545,137,446,300],[1044,179,450,258],[42,656,446,257],[523,606,488,343],[1026,513,490,436]];
const at=(x,y,w,h)=>'left:'+x+'%;top:'+y+'%;width:'+w+'%;height:'+h+'%';
const say=t=>{$('#status').textContent=t;$('#hint-actions').replaceChildren();};
const imageCache=new Map(),imageRetries=new Map();
const workshops=createWorkshops({say,renderRoom:()=>render(),roomState:()=>state,updateRoom:fn=>{state=fn(state);paintCabinetInventory();},cabinetArt:i=>cabinetItemArt(i),goToDoor:()=>{state={...state,view:2,closeup:null};render();},showSheet:sheet,onOffer:handover,beforeOffer:checkOffering,onPaint:refreshSceneAssets,onOpen:()=>{clearSpeech();inspection=null;paintInspection();}});
function sprite(file,r){const [x,y,w,h]=r;return 'background-image:url(assets/'+file+');background-size:'+1536/w*100+'% '+1024/h*100+'%;background-position:'+x/(1536-w)*100+'% '+y/(1024-h)*100+'%';}
const receipt=complete=>sprite('quiet-paper.png',complete?[893,175,455,633]:[193,228,461,432]);
function hit(id,label,x,y,w,h,fn,cls='hotspot'){const e=document.createElement('button');e.id=id;e.className=cls;e.setAttribute('aria-label',label);e.style.cssText=at(x,y,w,h);e.onclick=fn;$('#hotspots').append(e);return e;}
function sheet(title,body,actions=[]){$('#sheet-title').textContent=title;$('#sheet-body').innerHTML=body;$('#sheet-actions').replaceChildren();for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;$('#sheet-actions').append(b);}if(!$('#sheet').open)$('#sheet').showModal();}
const closeSheet=()=>$('#sheet').close();
function caption(){return state.view===0?'纸偶停在桌上，屏风里的手却像在等什么。':state.view===1?state.opened?'匣盖开着，红绸垂在两侧。':state.unlocked&&state.ribbonCut?'锁扣和红绸都松了。':state.unlocked?'锁扣已经弹开，红绸仍缠着匣盖。':state.ribbonCut?'红绸断了，锁扣还咬着。':'木匣上，一把锁、一结红绸。':state.view===2?'账桌上放着一本缝线松脱的旧簿。':!mirrorClean(state)?'镜面蒙着旧灰，只能看见模糊的衣影。':isRevealed(state)?'镜里的人抬起手，剪具映着一点暗光。':'镜面空着，像少了一个人。';}
function near(){clearSpeech();state=enterCloseup(state,SCENES[state.view].closeup);selected=null;render();say(state.closeup==='table'?'试着挪动纸偶，看看屏风。':state.closeup==='ledger'?'封皮磨旧了，书角还夹着一截红线。':caption());}
function back(){state=liftReceipt(state,false);if(banquet){closeBanquet();return;}clearSpeech();if(inspection){inspection=null;render();return;}if(workshops.isOpen()){workshops.close();say(caption());return;}cancelDrag();selected=null;state=leaveCloseup(state);hideEcho();render();say(caption());}
function navigate(d){state=liftReceipt(state,false);if(banquet||inspection||workshops.isOpen()||shen.departure==='carrying')return;clearSpeech();if($('#intro').open||$('#sheet').open)return;cancelDrag();selected=null;state=turn(state,d);hideEcho();render();say(caption());}
function controls(){const doll=order.includes(selected);$('#puppet-controls').hidden=!doll;$('#lamp-controls').hidden=selected!=='lamp';if(doll)$('#puppet-label').textContent='持'+TOOLS[selected]+'的纸偶';$('#lamp-position').value=state.light;$('#lamp-depth').value=state.lightDepth;document.querySelectorAll('.puppet-hit').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.name===selected)));}
function select(n){selected=n;controls();say(n==='lamp'?'拖动灯，影子随灯偏移。':'拖动纸偶；前后挪动时，影子也会升降。');}
function boxIndex(){return state.opened?5:state.unlocked?(state.ribbonCut?3:1):(state.ribbonCut?2:0);}
function chestHTML(index,nearView,id='chest'){const r=boxRects[index],w=nearView?53:25,h=w*1.5*r[3]/r[2],foot=nearView?77:57.5;return '<div id="'+id+'" class="chest" data-state="'+index+'" style="'+at(nearView?48:50,foot-h,w,h)+'"><div class="chest-frame raster" style="'+sprite('cooperation-box-states.png',r)+'"></div></div>';}
function showEcho(text,previous){clearTimeout(echoTimer);const e=$('#mechanism-echo');e.hidden=false;e.innerHTML='<div class="echo-art"><div class="raster" style="'+sprite('cooperation-box-states.png',boxRects[boxIndex()])+'"></div><div class="raster echo-before" style="'+sprite('cooperation-box-states.png',boxRects[previous])+'"></div></div><p>'+text+'</p>';requestAnimationFrame(()=>e.querySelector('.echo-before')?.classList.add('gone'));echoTimer=setTimeout(hideEcho,2600);}
function hideEcho(){clearTimeout(echoTimer);$('#mechanism-echo').hidden=true;}
function act(next,commit=true){
 const old=state,previous=boxIndex();state=commit?resolveContacts(next):next;paintTable();
 const changed=old.unlocked!==state.unlocked||old.ribbonCut!==state.ribbonCut;
 if(changed){if(state.closeup!=='table')showEcho(state.unlocked&&state.ribbonCut?'锁与绸都松了':state.unlocked?'锁扣弹开了':'绸带断开了',previous);say(state.unlocked&&state.ribbonCut?'柜台上的匣子松开了。现在可以亲手抬盖。':state.unlocked?'钥匙影触到锁眼，柜台上的真锁弹开了。红绸还在。':'剪口合在红结上，柜台上的绸带断了。锁扣还在。');}
}
function paintContact(){
 const host=$('#contact-preview');if(!host)return;
 const fit=shadowFit(state),c=contacts(state),preview=(state.unlocked||fit.key?1:0)+(state.ribbonCut||fit.scissors?2:0);
 host.dataset.key=String(state.unlocked||fit.key);host.dataset.scissors=String(state.ribbonCut||fit.scissors);
 host.querySelector('.contact-box').style.cssText=sprite('cooperation-box-states.png',boxRects[preview]);
 const line=state.unlocked&&state.ribbonCut?'锁、绸都已松开':fit.key&&!state.unlocked?'锁舌动了 · 放开纸偶试试':fit.scissors&&!state.ribbonCut?'红绸绷开了 · 放开纸偶试试':state.unlocked?'锁开了，绸还在':state.ribbonCut?'绸断了，锁还在':Math.min(c.key,c.scissors)<7?'有东西轻轻碰了一下':'柜台上的木匣';
 host.querySelector('span').textContent=line;
}
function bindDrag(button,name,nearView){button.onclick=e=>{if(e.detail===0)select(name);};button.onpointerdown=e=>{if(e.button!==0)return;select(name);drag={id:e.pointerId,name,start:state,x:e.clientX,y:e.clientY,nearView};button.setPointerCapture(e.pointerId);};button.onpointermove=e=>{const d=drag;if(!d||d.id!==e.pointerId)return;const r=$('#scene').getBoundingClientRect(),dx=(e.clientX-d.x)/r.width*100,dy=(e.clientY-d.y)/r.height*100;if(name==='lamp')act(setLight(state,d.start.light+dx/(nearView?80:50),d.start.lightDepth+dy/(nearView?10:6)),false);else{const p=d.start.puppets[name];act(movePuppet(state,name,p.x+dx,p.y+dy),false);}};button.onpointerup=e=>{if(drag?.id===e.pointerId){drag=null;act(state);}};button.onpointercancel=cancelDrag;}
function cancelDrag(){if(drag){state=drag.start;drag=null;hideEcho();paintTable();say('回到了刚才的位置。');}}
function nudge(dx,dy){if(drag)return;if(selected==='lamp')act(setLight(state,state.light+dx*.01,state.lightDepth+dy*.03));else if(order.includes(selected)){const p=state.puppets[selected];act(movePuppet(state,selected,p.x+dx*.6,p.y+dy*.6));}}
function paintTable(){if(state.view!==0)return;const close=state.closeup==='table';for(const n of order){const p=state.puppets[n],q=projection(state,n),a=$('#puppet-'+n),h=$('#drag-'+n),shadow=$('#shadow-'+n),x=close?p.x:50+(p.x-50)*.64,y=close?p.y-8:48+(p.y-64)*.5;if(a){a.style.left=x+'%';a.style.top=y+'%';a.style.zIndex=Math.round(p.y);}if(h){h.style.left=(x-7)+'%';h.style.top=(y+3)+'%';h.style.zIndex=Math.round(p.y);}if(shadow){const ratio=close?1:.64;shadow.style.cssText=at(close?q.x:50+(q.x-50)*ratio,close?q.y:12+q.y*ratio,q.w*ratio,q.h*ratio)+';transform:translateX(-50%) matrix(1,0,'+(-q.shear*1.5/q.h)+',1,0,0);transform-origin:50% 100%';const art=shadow.firstElementChild;art.style.cssText='background-position:'+order.indexOf(n)*50+'% 0';if(n==='lu'){const i=(state.ribbonCut?2:0)+(state.unlocked?1:0),r=[[309,24,263,477],[985,24,261,477],[309,519,263,478],[985,519,261,478]][i],holeX=i%2?1016:341,holeY=i>1?736:241,w=r[2]*4/3/512*100,h=r[3]*51/32/1024*100,left=(111+(r[0]-holeX)*4/3)/512*100,top=(475+(r[1]-holeY)*51/32)/1024*100;art.style.cssText=at(left,top,w,h)+';'+sprite('cooperation-lock-shadows.png',r);}}}
 const x=(close?10:25)+state.light*(close?80:50),y=(close?74:57)+state.lightDepth*(close?10:6);for(const id of ['lamp','lamp-art'])if($('#'+id)){$('#'+id).style.left=x+'%';$('#'+id).style.top=y+'%';}$('#lamp-position').value=state.light;$('#lamp-depth').value=state.lightDepth;const fit=shadowFit(state),mark=$('#shadow-register');if(mark){mark.dataset.fit=String(fit.registered);mark.dataset.ready=String(fit.ready||state.unlocked);}for(const [n,ready] of [['shen',fit.key],['qing',fit.scissors]])if($('#shadow-'+n))$('#shadow-'+n).dataset.fit=String(ready);paintContact();}
function table(close){for(const n of order){const i=order.indexOf(n);$('#shadows').insertAdjacentHTML('beforeend','<div id="shadow-'+n+'" class="projected-shadow" role="img" aria-label="持'+TOOLS[n]+'的影子"><div class="shadow-art"></div></div>');$('#objects').insertAdjacentHTML('beforeend','<div id="puppet-'+n+'" class="puppet raster" style="width:'+(close?10:6.5)+'%;height:'+(close?30:19.5)+'%;background-position:'+i*50+'% 0"></div>');if(close){const b=hit('drag-'+n,'移动持'+TOOLS[n]+'的纸偶',0,0,14,23,()=>select(n),'puppet-hit');b.dataset.name=n;bindDrag(b,n,true);}}
 const w=close?10:9,y=close?79:60;$('#objects').insertAdjacentHTML('beforeend','<div id="lamp-art" class="prop lamp-on" style="'+at(50,y,w,w*1.5)+'"></div>');const l=hit('lamp','拖动蜡烛',50,y,w,w*1.5,()=>select('lamp'),'lamp-hit');l.style.transform='translateX(-50%)';l.style.zIndex='100';bindDrag(l,'lamp',close);if(close)$('#objects').insertAdjacentHTML('beforeend','<aside id="contact-preview" aria-label="柜台木匣的响应"><div class="contact-box raster"></div><span></span></aside>');paintTable();}
const cabinetRects=[[310,641,194,182],[550,641,195,182],[788,641,194,182],[1030,641,195,182]];
const cabinetDetails=[['旧茶碗','两只茶碗叠在一起，碗沿磕掉了一小块。'],['红绸','红绸绕了几圈，压在最下面的那截已经褪色。'],['旧布','布折得方正，折痕里积着薄灰。'],['空格','木板上留着一道圆印，原来放在这里的东西已经取走了。']];
function cabinet(){cabinetRects.forEach((r,i)=>{const open=state.cabinet[i],x=r[0]/1536*100,y=r[1]/1024*100,w=r[2]/1536*100,h=r[3]/1024*100;const wrap=document.createElement('div');wrap.className='cabinet-compartment';wrap.id='cabinet-'+i;wrap.dataset.open=String(open);wrap.style.cssText=at(x,y,w,h);wrap.innerHTML='<div class="cabinet-inside shallow-cabinet">'+cabinetContents(i)+'</div><div class="cabinet-panel" style="'+sprite('counter-room-v1.png',r)+'"></div>';
 const door=document.createElement('button');door.id='cabinet-door-'+i;door.className='cabinet-door';door.setAttribute('aria-label',(i+1)+'号柜门');door.setAttribute('aria-expanded',String(open));door.onclick=()=>{state=toggleCabinet(state,i);const now=state.cabinet[i];wrap.dataset.open=String(now);door.setAttribute('aria-expanded',String(now));inspect.hidden=!now;say(now?'柜门拉开了。':'柜门合上了。');};wrap.append(door);
 const inspect=document.createElement('button');inspect.id='cabinet-inspect-'+i;inspect.className='cabinet-inspect';inspect.hidden=!open;inspect.setAttribute('aria-label','查看柜内'+cabinetDetails[i][0]);inspect.onclick=()=>openInspection('cabinet',i);wrap.append(inspect);$('#hotspots').append(wrap);});}

function openBox(){const before=state.opened;state=tryBox(state);if(!state.opened){const c=$('#chest');c?.animate([{translate:'0'},{translate:'-3px'},{translate:'3px'},{translate:'0'}],{duration:220});say(!state.unlocked&&!state.ribbonCut?'锁扣咬着，红绸也绷紧。':!state.unlocked?'绸带断了，锁扣还在。':'锁开了，绸带还缠着盖子。');return;}render();if(!before){const chest=$('#chest');setChestFrame(chest,3);setTimeout(()=>{if(chest.isConnected)setChestFrame(chest,4);},130);setTimeout(()=>{if(chest.isConnected){setChestFrame(chest,5);$('#take-letter')?.removeAttribute('hidden');}},480);$('#take-letter').hidden=true;say('匣盖抬起，断开的红绸垂到两旁。');}else say(state.letterTaken?'里面留下了纸张的折痕。':'匣内还有半张凭条。');}
function setChestFrame(chest,index){const close=!!state.closeup,r=boxRects[index],w=close?53:25,h=w*1.5*r[3]/r[2];chest.style.cssText=at(close?48:50,(close?77:57.5)-h,w,h);chest.dataset.state=index;chest.firstElementChild.style.cssText=sprite('cooperation-box-states.png',r);}
function box(close){$('#objects').insertAdjacentHTML('beforeend',chestHTML(boxIndex(),close));if(close){hit('box-open','抬起匣盖',20,18,57,60,openBox);if(state.opened&&!state.letterTaken){const e=hit('take-letter','取出凭条',48,36,9,16,()=>{state=takeLetter(state);render();letter();},'paper-item');e.textContent='';e.classList.add('receipt-icon-world','raster');e.style.cssText+=';'+receipt(true);}hit('inspect-lock','看看锁扣和绸带',24,72,48,17,()=>say(state.unlocked&&state.ribbonCut?'锁与绸带都松了。':state.unlocked?'锁舌已退，绸带仍旧绷着。':state.ribbonCut?'绸带断口整齐，锁孔仍闭着。':'锁孔窄得容不下指尖；绸带已经勒进木纹里。'));}}
function ledger(close){if(!close){$('#objects').insertAdjacentHTML('beforeend','<div class="closed-ledger-wide raster" style="'+sprite('ledger-flat.png',[142,292,1257,527])+'"></div>');return;}if(!bookOpen){const e=hit('open-ledger','翻开旧账本',50,43,67,42,()=>{bookOpen=true;render();say('旧簿摊开，纸页发出轻轻的响声。');},'book-closed raster');e.style.cssText+=';'+sprite('ledger-flat.png',[142,292,1257,527]);}else{$('#objects').insertAdjacentHTML('beforeend','<div class="book-open"><div class="raster book-art" style="'+sprite('cooperation-ledger.png',[816,259,636,446])+'"></div><article class="book-page left-page"><h3>寄物簿</h3><p>雨夜收存</p><p>旧匣一只<br>小锁一具<br>红绸一束</p></article><article class="book-page right-page"><h3>青禾</h3><p>人未到。<br>物未取。</p><p class="book-note">名字已由<br>陆九代押。</p><p class="book-tail">门前留糖一串。</p></article></div>');hit('close-ledger','合上账本',83,5,12,12,()=>{bookOpen=false;render();say('书页合上了。');},'book-close').textContent='合上';}}
// Invert the background close-up transform; reflection and dust share its zoom.
function mirrorRect(close){return close?at(36,11,29,58):at((36+55.6)/1.65,(11+11.45)/1.65,29/1.65,58/1.65);}
function mirror(close){
 const known=isRevealed(state),candidate=mirrorClean(state)&&state.mirrorRaised&&state.letterTaken&&state.mirrorEvidence;
 $('#stage').dataset.recognized=String(known);
 $('#objects').insertAdjacentHTML('beforeend','<div id="reflection" class="'+(known?'recognized':candidate?'candidate':'empty')+'" style="'+mirrorRect(close)+'"><div class="reflection-empty"></div><div class="reflection-person"></div></div>');
 if(!mirrorClean(state)){
 const fog=document.createElement('div');fog.id='mirror-grime';fog.style.cssText=mirrorRect(close);
 fog.style.setProperty('--dust-mask','linear-gradient(to bottom,'+state.mirrorWipes.flatMap((clean,i)=>{const c=clean?'transparent':'#000';return [c+' '+(i*33.333+5)+'%',c+' '+(i*33.333+28.333)+'%'];}).join(',')+')');
 fog.innerHTML=state.mirrorWipes.map((clean,i)=>clean?'':'<button class="grime-patch" data-patch="'+i+'" aria-label="擦去第'+(i+1)+'处镜面污痕" style="top:'+i*33.333+'%"></button>').join('');$('#objects').append(fog);
 if(close)fog.querySelectorAll('button').forEach(b=>{const wipe=()=>{if(!state.cabinetTaken[2]){say('指尖只抹开了一道灰，镜面仍旧模糊。');return;}state=wipeMirror(state,Number(b.dataset.patch));render();say(mirrorClean(state)?'积灰擦净了。镜里仍只有一身空衣。':'旧布带下一层灰，镜面清楚了一些。');};b.onclick=wipe;b.onpointermove=e=>{if(e.buttons===1)wipe();};});
 }else $('#objects').insertAdjacentHTML('beforeend','<div id="mirror-used-cloth">'+cabinetItemArt(2)+'</div>');
 if(!close)return;
 $('#objects').insertAdjacentHTML('beforeend','<div class="mirror-actions"><button id="touch-mirror">抬起手</button><button id="raise-receipt">'+(state.mirrorRaised?'放下凭条':'举起凭条')+'</button></div>');
 if(state.mirrorRaised)$('#objects').insertAdjacentHTML('beforeend','<div id="mirror-paper" class="raster" style="'+receipt(state.letterTaken)+'"></div><span class="mirror-name">'+(state.letterTaken?'青禾':'代取')+'</span>');
 $('#touch-mirror').onclick=()=>{if(!mirrorClean(state)){say('镜面蒙着灰，抬起的手看不清楚。');return;}const before=isRevealed(state);state=touchMirror(state);render();$('#reflection')?.animate([{transform:'translateY(3%)'},{transform:'translateY(0)'}],{duration:420});if(!before&&isRevealed(state)){say('你抬起手，镜中的人也抬起手。');speak('青禾','这只手……是我的。青禾，是我。',[['凭条上还有陆九的名字',()=>goToShen()]]);}else say(isRevealed(state)?'你抬起手，她也抬起手。那张面容没有再消失。':'你抬起手，空袖跟着抬起来。脸的位置仍是一片空白。');};
 $('#raise-receipt').onclick=()=>{state=liftReceipt(state,!state.mirrorRaised);render();say(!mirrorClean(state)?'凭条举起来了，字和倒影都被灰挡住。':state.mirrorRaised?(state.letterTaken?'“青禾”映进镜里。空着的眉眼之间，渐渐有了轮廓。':'纸上的“代取”映得清楚，衣领上方却仍然空着。'):isRevealed(state)?'凭条放下了。镜中的人仍看着你。':'纸离开镜面，淡淡的轮廓又隐去了。');};
 if(known)$('#objects').insertAdjacentHTML('beforeend','<div class="mirror-caption">青禾</div>');
}
const cabinetItemRects=[[84,363,324,276],[514,402,486,207],[1048,390,447,222]];
function cabinetItemArt(i){const r=cabinetItemRects[i];return '<span class="cabinet-item-art" style="'+sprite('cabinet-items.png',r)+';aspect-ratio:'+r[2]+'/'+r[3]+'"></span>';}
function cabinetContents(i){return i<3&&!state.cabinetTaken[i]?'<div class="shelf-item" data-item="'+i+'">'+cabinetItemArt(i)+'</div>':'<span class="shelf-trace" aria-hidden="true"></span>';}
function paintCabinetInventory(){const inv=$('#cabinet-inventory');inv.innerHTML=state.cabinetTaken.map((taken,i)=>taken&&!cabinetInUse(state,i)?'<button id="carried-cabinet-'+i+'" aria-label="查看'+cabinetDetails[i][0]+'">'+cabinetItemArt(i)+'</button>':'').join('');inv.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(shen.departure==='carrying')return;const i=Number(b.id.split('-').at(-1));if(workshops.isOpen()&&workshops.useCabinet(i))return;if(workshops.isOpen())workshops.close();openInspection('item',i);});}
function openInspection(type,index){clearSpeech();cancelDrag();selected=null;inspection={type,index};render();$('#back').focus({preventScroll:true});}
function paintInspection(){const host=$('#inspection'),active=!!inspection;host.hidden=!active;$('#scene').hidden=active;$('.inventory').hidden=active&&['wall','receipt'].includes(inspection.type);$('#stage').dataset.inspection=active?inspection.type:'';host.replaceChildren();if(!active)return;$('#left').hidden=true;$('#right').hidden=true;$('#back').hidden=false;$('#puppet-controls').hidden=true;$('#lamp-controls').hidden=true;hideEcho();const {type,index}=inspection;host.className='inspection-'+type;
 if(type==='wall'){host.innerHTML='<div class="inspection-scroll"><div class="inspection-ink" role="img" aria-label="'+(index?'三物穿串、来回滚糖、放到门前':'纸偶与灯、钥匙开锁、剪具断绸')+'" style="background-position:'+index*100+'% 0"></div></div><p class="wall-reading">'+(index?'三样穿满，次序不拘。':'钥匙开锁，剪具断绸。')+'</p>';}
 else if(type==='receipt'){const complete=state.letterTaken;host.innerHTML='<article id="receipt-paper" class="receipt-paper '+(complete?'complete':'torn')+'" aria-label="'+(complete?'完整的取物凭条':'半张取物凭条')+'">'+(complete?'<header class="receipt-heading"><span>留灯里</span><h2>寄物凭条</h2></header><div class="receipt-rule"></div><dl><div><dt>寄物人</dt><dd>青禾</dd></div><div><dt>代办</dt><dd>陆九</dd></div><div><dt>寄物</dt><dd>旧匣一只</dd></div></dl><p class="receipt-note">来日自取</p>':'<div class="receipt-torn-edge" aria-label="抬头已撕去"></div><dl><div><dt>代取</dt><dd>旧匣一只</dd></div></dl>')+'<span class="receipt-seal" aria-hidden="true">寄物</span></article><button id="inspection-close-receipt">收好</button>';$('#inspection-close-receipt').onclick=back;const action=document.createElement('button');action.id='use-receipt';action.textContent=state.view===3?'拿到镜前':'递给沈嫂';action.onclick=state.view===3?()=>{inspection=null;state={...state,view:3,closeup:'mirror'};render();}:giveReceipt;host.append(action);}
 else if(type==='item'){host.innerHTML='<div class="carried-detail">'+cabinetItemArt(index)+'</div><button id="return-cabinet-item">放回原柜</button>';$('#return-cabinet-item').onclick=()=>{state=returnCabinetItem(state,index);inspection={type:'cabinet',index};render();$('#take-cabinet-item')?.focus({preventScroll:true});};}
 else{host.innerHTML='<div class="inspection-cabinet-art shallow-cabinet" role="img" aria-label="柜内'+(state.cabinetTaken[index]?'空格':cabinetDetails[index][0])+'">'+cabinetContents(index)+'</div><button id="inspection-close-cabinet">合上柜门</button>';if(index<3&&!state.cabinetTaken[index]){const b=document.createElement('button');b.id='take-cabinet-item';b.className='take-cabinet-item';b.style.cssText=at(...[[28,43,44,41],[20,53,60,31],[23,52,54,32]][index]);b.setAttribute('aria-label','拿起'+cabinetDetails[index][0]);b.onclick=()=>{state=takeCabinetItem(state,index);render();$('#carried-cabinet-'+index)?.focus({preventScroll:true});say('收起了'+cabinetDetails[index][0]+'。');};host.append(b);}$('#inspection-close-cabinet').onclick=()=>{state=toggleCabinet(state,index);inspection=null;render();$('#cabinet-door-'+index)?.focus({preventScroll:true});};}}
function wallClue(){if(state.closeup||![1,2].includes(state.view))return;const recipe=state.view===2,position=recipe?[67.5,15,8.5,27.5]:[84.2,12,8.7,29.8],b=hit('wall-clue',recipe?'查看墙上的糖串图':'查看墙上的影子图',...position,()=>openInspection('wall',recipe?1:0),'wall-clue');b.style.backgroundPosition=(recipe?100:0)+'% 50%';}

function render(){const sc=SCENES[state.view],close=!!state.closeup,key=state.closeup||sc.id;$('#background').src=key==='c'&&shen.departure!=='none'?'assets/shen-door-open.png':key==='ledger'?'assets/ledger-table-close.png':'assets/'+(bg[key]==='counter-room-v1'?'counter-room-v1':'woodcut-'+bg[key])+'.png';$('#background').style.cssText=key==='box'?'position:absolute;width:160%;height:160%;left:-30%;top:-19.2%':key==='mirror'?'position:absolute;width:165%;height:165%;left:-55.6%;top:-11.45%':'';$('#scene').className='cooperation '+(close?'closeup':'wide');$('#stage').dataset.view=sc.id;$('#stage').dataset.closeup=state.closeup||'';$('#stage').dataset.recognized=String(isRevealed(state));for(const id of ['objects','shadows','hotspots'])$('#'+id).replaceChildren();$('#left').hidden=close;$('#right').hidden=close;$('#back').hidden=!close;$('#viewname').textContent=close?{table:'纸偶与灯',box:'锁扣与红绸',ledger:'旧账本',mirror:'镜前'}[key]:sc.name;$('#objective').textContent=state.letterTaken?'凭条上写着：青禾':state.opened?'取出匣中的凭条':'取回寄存的木匣';if(!close)hit('entry',sc.target,...(state.view===2?[75.5,49,11,7]:sc.hotspot),near);if(state.view===0)table(close);if(state.view===1){box(close);if(!close)cabinet();}if(state.view===2)ledger(close);if(state.view===3)mirror(close);$('#letter').textContent='';$('#letter').className='inventory-paper receipt-icon raster';$('#letter').setAttribute('aria-label',state.letterTaken?'查看完整凭条':'查看半张凭条');$('#letter').dataset.complete=String(state.letterTaken);$('#letter').style.cssText=receipt(state.letterTaken);controls();workshops.room(state,hit);wallClue();renderShen();paintCabinetInventory();paintInspection();paintBanquet();refreshSceneAssets();}
function letter(){if(workshops.isOpen())workshops.close();openInspection('receipt',0);}
function hint(level=0){
 let hints;
 const ritual=workshops.hint(level);
 if(ritual)hints=[ritual];
 else if(shen.departure==='gone')hints=['沈嫂已经把糖送进去了。','到门边，看看她把糖交给了谁。'];
 else if(state.view===3&&!mirrorClean(state))hints=['镜面蒙着几片旧灰，手和纸都看不清。','拿柜里的旧布，在镜前擦去三处污痕。'];
 else if(state.letterTaken&&!isRevealed(state))hints=['凭条上多了一个名字。窗边的镜子却认不出你。','先在镜前抬手观察，再举起完整凭条，看清轮廓后再抬手核对。'];
 else if(isRevealed(state)&&!shen.invited)hints=['凭条上还有一位代办人。','把凭条给沈嫂看，问问陆九在哪里。'];
 else if(shen.invited)hints=workshops.getState().coated?['沈嫂答应带你去见陆九。','到门旁把糖交给她。']:['沈嫂手边的纸托和门边小画，是为里面的人准备的。','在算盘里取出眼珠和竹签；另两件在纸偶脚边与打开的匣中。穿满后往返裹糖。'];
 else if(state.unlocked&&state.ribbonCut)hints=['柜台上的锁与绸带已经松了。','近看木匣，抬盖并取出凭条。'];
 else hints=['纸偶手里的东西，与匣上的阻碍有些相像。','近看纸偶，移动钥匙影碰锁眼、剪口碰红结。看柜台上的响应；可以先后完成。'];
 say(hints[Math.min(level,hints.length-1)]);if(level===0){const next=document.createElement('button');next.textContent='再提示一步';next.onclick=()=>hint(1);$('#hint-actions').append(next);}
}
function speak(speaker,line,actions=[]){
 $('#speech-speaker').textContent=speaker;$('#speech-line').textContent=line;$('#speech').hidden=false;
 const host=$('#speech-actions');host.replaceChildren();for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;host.append(b);}
}
function clearSpeech(){ $('#speech').hidden=true;$('#speech-actions').replaceChildren(); }
function goToShen(){if(workshops.isOpen())workshops.close();inspection=null;state={...state,closeup:null,view:shenStage(shen,state,workshops.getState())==='waiting'?2:1};render();talkShen();}
function giveReceipt(){state=showReceipt(state);goToShen();say('沈嫂把凭条压在匣边，纸托留在手边。');const known=isRevealed(state);speak('沈嫂',state.letterTaken?known?'青禾。是你自己寄下的。':'来日自取。先看看，这凭条上的人是不是你。':'旧匣一只……就是柜台上这只匣。你亲手取吧。',state.letterTaken?[[known?'问陆九在哪里':'到镜前看看',known?inquireLu:()=>{inspection=null;state={...state,view:3,closeup:'mirror'};render();say('镜里只有衣裳。抬起手，看看它会不会跟着动。');}]]:[['看看木匣',()=>{clearSpeech();state={...state,view:1,closeup:'box'};render();}]]);$('#receipt-on-counter')?.animate([{transform:'translateY(-30%) rotate(-8deg)'},{transform:'translateY(0) rotate(-8deg)'}],{duration:500});}
function inquireLu(){if(!isRevealed(state)){speak('沈嫂','先别急着找他。凭条上的青禾，你在镜子里见过么？',[['到镜前看看',()=>{clearSpeech();state={...state,view:3,closeup:'mirror'};render();}]]);return;}shen=askLu(shen,state);render();speak('沈嫂','陆九在里面。帮我把这一串裹好，我带你去问他。',[['为什么要裹糖？',()=>speak('沈嫂','送行席上的东西，总要裹甜些。纸托我备好了。你不放心，就先看看。',[['再看看屋里',clearSpeech]])],['再看看屋里',clearSpeech]]);}
function talkShen(){const actions=[];if(!state.receiptShown)actions.push(['递上凭条',giveReceipt]);else if(state.letterTaken)actions.push(['问陆九在哪里',inquireLu]);if(workshops.getState().coated)actions.push(['递上糖串',()=>workshops.offer()]);if(shen.invited&&!workshops.getState().coated)actions.push(['为什么要裹糖？',()=>speak('沈嫂','这是送进去的那一份。你帮我裹好，我带你见他。')]);speak('沈嫂',shenLine(shen,state,workshops.getState()),actions);}
function checkOffering(){if(!isRevealed(state)){state=showReceipt(state);render();speak('沈嫂','先别松手。凭条上写着青禾。镜子里……是你么？',[['拿凭条到镜前',()=>{clearSpeech();state={...state,view:3,closeup:'mirror'};render();}]]);return false;}if(!shen.invited){inquireLu();return false;}if(!state.parcelTied){speak('沈嫂','纸托还散着，这样端进去会掉。柜里有一束红绸。',[['看看纸托',()=>{clearSpeech();workshops.open('candy');}]]);return false;}return true;}
function renderShen(){
 const phase=shenStage(shen,state,workshops.getState()),carrying=phase==='carrying',gone=phase==='gone';
 $('#stage').dataset.shen=phase;$('#characters').replaceChildren();$('#skip-handover').hidden=!carrying;
 $('#scene').inert=carrying;$('.inventory').inert=carrying;$('#help').disabled=carrying;
 if(carrying){$('#left').hidden=true;$('#right').hidden=true;$('#back').hidden=true;}
 if(state.closeup||workshops.isOpen())return;
 if(gone){if(state.view===2)hit('listen-door','看看门后的宴席',17,14,27,60,()=>openBanquet(false));return;}
 const atDoor=phase==='waiting'||carrying;
 if(state.view!==(atDoor?2:1))return;
 const pose=atDoor?2:phase==='watching'?1:0;
 const figure=document.createElement('div');figure.id='shen-figure';figure.className=atDoor?'door-shen':'counter-shen';figure.dataset.pose=String(pose);
 figure.innerHTML='<span class="shen-art raster" style="background-position:'+pose*50+'% 0"></span>'+(carrying?'<span class="shen-candy raster" style="'+sprite('candy-atlas-finger.png',[1034,675,486,142])+'"></span>':'');
 $('#characters').append(figure);
 if(!atDoor){$('#objects').insertAdjacentHTML('beforeend','<div id="serving-paper" class="raster" style="'+sprite('cabinet-items.png',cabinetItemRects[2])+'"></div>'+(state.receiptShown?'<div id="receipt-on-counter" class="raster" style="'+receipt(state.letterTaken)+'"></div>':''));const front=document.createElement('div');front.className='counter-foreground';$('#characters').append(front);}
 if(!carrying)hit('shen-person','与沈嫂说话',...(atDoor?[40,21,14,50]:[20,7,16,37]),talkShen,'shen-hit');
}
function handover(){
 const next=beginDeparture(shen,workshops.getState(),state);if(next===shen)return;
 clearTimeout(departureTimer);clearSpeech();cancelDrag();selected=null;shen=next;state={...state,view:2,closeup:null};render();
 speak('沈嫂','这一串，收下了。跟我来。');$('#skip-handover').focus({preventScroll:true});
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced)departureMotion=$('#shen-figure').animate([
  {transform:'translate(0,0) scale(1)',opacity:1,offset:0},
  {transform:'translate(0,0) scale(1)',opacity:1,offset:.18},
  {transform:'translate(-32%,-3%) scale(.94)',opacity:1,offset:.47},
  {transform:'translate(-76%,-12%) scale(.76)',opacity:.95,offset:.8},
  {transform:'translate(-80%,-13%) scale(.72)',opacity:0,offset:1}
 ],{duration:2400,easing:'ease-in-out',fill:'forwards'});
 departureTimer=setTimeout(finishHandover,reduced?500:2450);
}
function finishHandover(animate=true){
 if(shen.departure!=='carrying')return;
 clearTimeout(departureTimer);departureMotion?.cancel();departureMotion=null;shen=finishDeparture(shen);render();
 openBanquet(animate);
}
$('#close-speech').onclick=clearSpeech;$('#skip-handover').onclick=()=>finishHandover(false);

const chapterRoute=new URLSearchParams(location.search).get('chapter');
const directSecondChapter=chapterRoute==='2',directThirdChapter=chapterRoute==='3';
let thirdFromSecond=false;
const secondChapter=createFortuneRoomView({host:$('#nine-bowls'),onContinue:()=>enterThirdChapter(true),onExit:()=>{
 document.body.classList.remove('chapter-two');$('#scene').inert=false;render();
 if(directSecondChapter)secondChapterLanding();else openBanquet(false);
}});
const thirdChapter=createNameReturnView({host:$('#name-return'),onExit:()=>{
 document.body.classList.remove('chapter-three');
 if(thirdFromSecond){enterSecondChapter();return;}
 document.body.classList.remove('chapter-two');$('#scene').inert=false;render();thirdChapterLanding();
}});
function enterSecondChapter(){
 thirdChapter.close();document.body.classList.remove('chapter-three');
 clearTimeout(banquetTimer);banquetMotion?.cancel();banquetMotion=null;banquet=null;
 clearSpeech();closeSheet();inspection=null;$('#banquet').hidden=true;$('#scene').inert=true;
 document.body.classList.add('chapter-two');secondChapter.open();
}
function enterThirdChapter(fromSecond=false){
 thirdFromSecond=fromSecond;secondChapter.close();
 clearTimeout(banquetTimer);banquetMotion?.cancel();banquetMotion=null;banquet=null;
 clearSpeech();closeSheet();inspection=null;$('#banquet').hidden=true;$('#scene').inert=true;
 document.body.classList.add('chapter-two','chapter-three');thirdChapter.open();
}
function secondChapterLanding(){sheet('问路 · 第二折','<p>当年陆九替你张罗了路费。如今，你想亲眼看看那张收据。</p><p>可随时返回或重玩本段；刷新后进度重新开始。</p>',[['入席',enterSecondChapter],['从第一折开始',()=>{location.href=location.pathname+'?revision=fortune-room-62';}]]);}
function thirdChapterLanding(){sheet('领回 · 交互简图','<p>你带着陆九桌上的路费单来到善堂，想看看这里保存的原单。</p><p>本段先验证物件关系与动作，美术尚为简图。刷新会重新开始。</p>',[['进入善堂',()=>enterThirdChapter(false)],['回到第二折',()=>{location.href=location.pathname+'?chapter=2&revision=fortune-room-62';}]]);}
function paintBanquet(){
 const host=$('#banquet');host.hidden=!banquet;$('#stage').dataset.banquet=banquet||'';
 if(!banquet){host.replaceChildren();return;}
 $('#scene').inert=true;$('.inventory').hidden=true;$('#left').hidden=true;$('#right').hidden=true;$('#back').hidden=true;$('#help').disabled=true;hideEcho();
 host.innerHTML='<img class="banquet-background" src="assets/banquet-handover-v1.png" alt="沈嫂将糖串放到陆九面前；他背负碗架，旁边的空椅搭着纸衣。" draggable="false"><div id="banquet-candy" class="raster" role="img" aria-label="交给陆九的糖串" style="'+sprite('candy-atlas-finger.png',[1034,675,486,142])+'"></div>'+(banquet==='placing'?'<button id="skip-banquet">跳过动作</button>':'<div class="banquet-finish"><span>第一折 · 终</span><button id="enter-second-chapter">入席</button><button id="replay-banquet">再看交付</button><button id="leave-banquet">回看寄物铺</button></div>');
 if(banquet==='placing')$('#skip-banquet').onclick=settleBanquet;
 else{$('#enter-second-chapter').onclick=enterSecondChapter;$('#replay-banquet').onclick=()=>openBanquet(true);$('#leave-banquet').onclick=closeBanquet;}
}
function openBanquet(animate=false){
 if(!banquetScene(shen))return;
 clearTimeout(banquetTimer);banquetMotion?.cancel();banquetMotion=null;clearSpeech();inspection=null;
 const moving=animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 banquet=moving?'placing':'settled';render();
 if(!moving){settleBanquet();return;}
 speak('沈嫂','陆九，糖送来了。');
 banquetMotion=$('#banquet-candy').animate([{transform:'translate(-30%,-110%) rotate(-12deg)'},{transform:'translate(0,0) rotate(-4deg)'}],{duration:1400,easing:'ease-out',fill:'forwards'});
 $('#skip-banquet').focus({preventScroll:true});banquetTimer=setTimeout(settleBanquet,1450);
}
function settleBanquet(){
 if(!banquet||!banquetScene(shen))return;
 clearTimeout(banquetTimer);banquetMotion?.cancel();banquetMotion=null;banquet='settled';paintBanquet();
 const line=banquetScene(shen);speak(line.speaker,line.line);say('糖串落在陆九面前。空椅上，纸衣的领口扣得整齐。');$('#leave-banquet').focus({preventScroll:true});
}
function closeBanquet(){
 clearTimeout(banquetTimer);banquetMotion?.cancel();banquetMotion=null;banquet=null;clearSpeech();render();say('门后，陆九守着那张空桌。');$('#listen-door')?.focus({preventScroll:true});
}

function reset(){thirdChapter.close();thirdChapter.reset();secondChapter.close();secondChapter.reset();document.body.classList.remove('chapter-three');document.body.classList.remove('chapter-two');clearTimeout(banquetTimer);banquetMotion?.cancel();banquetMotion=null;banquet=null;inspection=null;closeSheet();clearSpeech();clearTimeout(entryTimer);clearTimeout(departureTimer);departureMotion?.cancel();departureMotion=null;shen=createShen();workshops.reset();state={...createGame(),view:1};selected=null;drag=null;bookOpen=false;hideEcho();render();say(caption());speak('沈嫂','取什么？',[['递上凭条',giveReceipt]]);}
$('#left').onclick=()=>navigate(-1);$('#right').onclick=()=>navigate(1);$('#back').onclick=back;$('#letter').onclick=letter;$('#help').onclick=()=>hint();$('#restart').onclick=()=>sheet('重新开始？','<p>纸偶、灯、锁扣和绸带都会回到最初的状态。</p>',[['继续这一轮',closeSheet],['重新开始',reset]]);$('#close-sheet').onclick=closeSheet;$('#lamp-position').oninput=e=>act(setLight(state,Number(e.target.value)),false);$('#lamp-depth').oninput=e=>act(setLight(state,state.light,Number(e.target.value)),false);for(const id of ['lamp-position','lamp-depth'])$('#'+id).onchange=()=>act(state);document.querySelectorAll('[data-lamp-step]').forEach(e=>e.onclick=()=>nudge(...e.dataset.lampStep.split(',').map(Number)));$('#lamp-done').onclick=()=>{selected=null;controls();};$('#puppet-done').onclick=()=>{selected=null;controls();};$('#puppet-reset').onclick=()=>{if(order.includes(selected)){const p=createGame().puppets[selected];act(movePuppet(state,selected,p.x,p.y));}};document.querySelectorAll('[data-puppet-step]').forEach(e=>e.onclick=()=>nudge(...e.dataset.puppetStep.split(',').map(Number)));
document.addEventListener('keydown',e=>{if(secondChapter.isOpen()||thirdChapter.isOpen())return;if($('#sheet').open||$('#intro').open)return;if(shen.departure==='carrying'){if(e.key==='Escape'){e.preventDefault();finishHandover(false);}return;}if(banquet){if(e.key==='Escape'){e.preventDefault();if(banquet==='placing')settleBanquet();else closeBanquet();}return;}if(e.key==='Escape'){e.preventDefault();if(inspection){back();return;}if(workshops.isOpen()){if(!workshops.cancel())workshops.close();return;}if(drag){cancelDrag();return;}if(selected){selected=null;controls();return;}if(!$('#speech').hidden){clearSpeech();return;}if(state.closeup)back();return;}if(workshops.isOpen()||e.target.id==='lamp-position'||e.target.id==='lamp-depth')return;const m={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],ArrowUp:[0,-1],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowRight:[1,0]}[e.key.length===1?e.key.toLowerCase():e.key];if(m&&selected){e.preventDefault();nudge(...m);}else if(!state.closeup&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();navigate(e.key==='ArrowLeft'?-1:1);}});
$('#stage').onclick=e=>{if(secondChapter.isOpen()||thirdChapter.isOpen())return;if(!e.target.closest('button')){selected=null;controls();}};window.addEventListener('resize',cancelDrag);render();say(caption());const prologue=createPrologue({host:$('#intro'),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,onEnterRoom:()=>{speak('沈嫂','取什么？',[['递上凭条',giveReceipt]]);$('#shen-person')?.focus({preventScroll:true});}});if(directThirdChapter)thirdChapterLanding();else if(directSecondChapter)secondChapterLanding();else prologue.start();

function resourceRoot(url){const u=new URL(url,location.href);u.searchParams.delete('cuoxia-retry');return u.href;}
function resourceURL(url){const root=resourceRoot(url),attempt=imageRetries.get(root);if(!attempt)return root;const u=new URL(root);u.searchParams.set('cuoxia-retry',String(attempt));return u.href;}
function refreshSceneAssets(){
 const ticket=++loadTicket,stage=$('#stage'),notice=$('#scene-load');
 stage.classList.remove('loading-active');notice.hidden=true;
 const urls=new Set();
 for(const el of [stage,...stage.querySelectorAll('*')]){
  if(!el.getClientRects().length)continue;
  const css=getComputedStyle(el);if(css.display==='none'||css.visibility==='hidden')continue;
  if(el.tagName==='IMG'&&el.src){const url=resourceURL(el.src);if(el.src!==url)el.src=url;urls.add(url);}
  const background=css.backgroundImage.replace(/url\(["']?([^"')]+)["']?\)/g,(_,src)=>{const url=resourceURL(src);urls.add(url);return 'url("'+url+'")';});
  if(background!==css.backgroundImage)el.style.backgroundImage=background;
 }
 const pending=[...urls].filter(url=>!imageCache.has(url)||imageCache.get(url).state!=='loaded');
 if(!pending.length)return;
 stage.classList.add('loading-active');notice.hidden=false;notice.textContent='画面正在展开…';
 Promise.all(pending.map(url=>{let item=imageCache.get(url);if(!item){item={state:'pending'};item.promise=new Promise(resolve=>{const im=new Image();im.onload=()=>{item.state='loaded';resolve(true);};im.onerror=()=>{item.state='error';resolve(false);};im.src=url;});imageCache.set(url,item);}return item.promise;})).then(()=>{
  if(ticket!==loadTicket)return;
  const failed=[...urls].filter(url=>imageCache.get(url)?.state==='error');
  if(failed.length){notice.textContent='画面还缺了一部分。';const retry=document.createElement('button');retry.textContent='重新加载画面';retry.onclick=()=>{for(const url of failed){imageCache.delete(url);const root=resourceRoot(url);imageRetries.set(root,(imageRetries.get(root)||0)+1);}render();};notice.append(retry);}
  else{stage.classList.remove('loading-active');notice.hidden=true;}
 });
}
