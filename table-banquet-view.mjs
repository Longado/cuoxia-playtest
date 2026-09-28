import {TABLE_LAYOUT,mealZone,createTableBanquet,reduceTableBanquet} from './table-banquet.mjs';

const asset = name => new URL('./assets/' + name, import.meta.url).href;
const opening = '陆九把碗卸到桌上，手边压着路费单。青禾：“当年的路费单，给我看看。”';
const itemNames = {meal:'盛糕碗',self:'陆九的空碗',stack:'七只叠碗'};
const requiredImages = ['nine-bowls-room-v1.png','nine-bowls-actors-v1.png','engraved-bowl-v1.png','engraved-cake-v1.png','engraved-cup-v1.png','engraved-teapot-v1.png','lu-drinking-v1.png','lu-release-v1.png','woodcut-paper.png','tabletop-banquet-v1.png','tabletop-bowl-v1.png','tabletop-hand-v1.png'];
const image = (file,cls='') => `<img class="${cls}" src="${asset(file)}" alt="" draggable="false">`;
const position = p => `left:${p.x*100}%;top:${p.y*100}%`;
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

export function createTableBanquetView({host,onExit=()=>{},onContinue=()=>{}}) {
  let state=createTableBanquet(),opened=false,resources='idle',loadGeneration=0;
  let feedback=opening,reading=false,kettle=false,pouring=null,departing=false,event=null;
  let eventTimer=null,pourTimer=null,departureTimer=null,drag=null,keyboardPreview=null,suppressClick=false;
  let lastMemory=null,hintLevel=0,loadCleanups=[],armFrame=null,eventStarted=0;
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const table=()=>host.querySelector('.tb-tabletop');

  function stopEvent(){clearTimeout(eventTimer);eventTimer=null;event=null;}
  function stopPour(){clearTimeout(pourTimer);pourTimer=null;pouring=null;}
  function stopDeparture(){clearTimeout(departureTimer);departureTimer=null;departing=false;}
  function cancelLoading(){loadGeneration++;loadCleanups.forEach(fn=>fn());loadCleanups=[];if(resources==='loading')resources='idle';}
  function preload(file) {
    return new Promise((resolve,reject)=>{
      const img=new Image();let settled=false;
      const cleanup=()=>{clearTimeout(timeout);img.onload=null;img.onerror=null;};
      const finish=(error)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve();};
      const timeout=setTimeout(()=>finish(new Error('image timeout')),15000);
      loadCleanups.push(()=>{if(!settled){settled=true;cleanup();resolve();}});
      img.onload=()=>finish();img.onerror=()=>finish(new Error('image unavailable'));img.src=asset(file);
    });
  }
  function loadResources(){
    if(resources==='loading'||resources==='ready')return;
    resources='loading';const generation=++loadGeneration;render();
    Promise.all(requiredImages.map(preload)).then(()=>{
      if(generation!==loadGeneration||!opened)return;
      loadCleanups=[];resources='ready';render();
    },()=>{
      if(generation!==loadGeneration||!opened)return;
      loadCleanups.forEach(fn=>fn());loadCleanups=[];resources='error';render();
    });
  }
  function selectionText(){
    if(departing)return '收好纸据，起身离席。';
    if(kettle)return '壶在手 · 点空杯添茶';
    if(state.selected)return `${itemNames[state.selected]} · 拖动，或点桌面放下`;
    if(state.view==='front')return state.receiptTaken?'纸据已收 · 门外就是去善堂的路':'点桌面，近看碗和他手下的纸';
    if(state.receiptTaken)return '纸据已收 · 抬眼可见去善堂的门';
    if(state.paperFree)return event==='intercepted'?'纸正向你手边滑来':'纸到了手边，可以拿了';
    return state.bitten?'糕缺了一角 · 碗还可以挪':'盛糕的碗可以推到席前';
  }
  function bowlMarkup(id){
    const stack=id==='stack',file=state.view==='front'?'engraved-bowl-v1.png':'tabletop-bowl-v1.png';
    const images=stack?Array.from({length:7},(_,i)=>`<span class="tb-stack-bowl" style="--i:${i}">${image(file)}</span>`).join(''):image(file,'tb-bowl-image');
    return `<button class="tb-item tb-${id} ${state.selected===id?'tb-selected':''} ${id==='meal'&&state.bitten?'tb-bitten':''}" data-item="${id}" style="${position(state.positions[id])}" aria-label="${id==='meal'?(state.bitten?'盛着缺角糕的碗':'盛着完整糕的碗'):itemNames[id]}" aria-pressed="${state.selected===id}">${images}${id==='meal'?`<span class="tb-cake">${image('engraved-cake-v1.png')}</span>`:''}</button>`;
  }
  function cup(who){
    return `<button class="tb-cup tb-cup-${who} ${pouring===who?'tb-full':''} ${state.teaTried[who]?'tb-used':''}" data-cup="${who}" aria-label="${who==='guest'?'纸衣客位':'陆九'}的${pouring===who?'茶杯，有茶':'空茶杯'}">${image('engraved-cup-v1.png')}<span class="tb-tea"></span></button>`;
  }
  function reader(){
    return `<div class="tb-reader" role="dialog" aria-modal="true" aria-labelledby="tb-receipt-title"><article><span class="tb-kicker">陆九手下的纸据</span><h3 id="tb-receipt-title">路费收据</h3><dl><div><dt>所付</dt><dd>路费</dd></div><div><dt>人数</dt><dd>两人</dd></div><div><dt>核验</dt><dd>一次验讫</dd></div></dl><p class="tb-original">原单存善堂</p><p>没有姓名，也没有写明谁离开了。</p><button class="tb-control" data-action="close-reader">收起纸据</button></article></div>`;
  }
  function render(){
    cancelAnimationFrame(armFrame);armFrame=null;
    host.hidden=!opened;if(!opened)return;
    const oldFocus=host.contains(document.activeElement)?document.activeElement:null;
    const focusKey=oldFocus?.dataset.item?`[data-item="${oldFocus.dataset.item}"]`:oldFocus?.dataset.action?`[data-action="${oldFocus.dataset.action}"]`:null;
    host.className=`table-banquet tb-view-${state.view} ${state.serving?'tb-serving':''} ${state.paperFree?'tb-paper-free':''} ${state.receiptTaken?'tb-taken':''} ${event?'tb-event-'+event:''} ${pouring?'tb-pouring':''} ${departing?'tb-departing':''}`;
    host.style.setProperty('--tb-event-delay',`${event?-(performance.now()-eventStarted):0}ms`);
    if(resources!=='ready'){
      host.innerHTML=`<div class="tb-loading" role="status"><span class="tb-kicker">第二折</span><h2>九碗客</h2><p>${resources==='error'?'茶席图暂未载入，请重试。':'正在布置茶席…'}</p><div>${resources==='error'?'<button class="tb-control" data-action="retry">重新载入</button>':''}<button class="tb-control" data-action="exit">← 返回</button></div></div>`;return;
    }
    host.innerHTML=`<div class="tb-scene" aria-label="纸衣客席在左，陆九坐在右边。他的右手压着路费单。">
      <button class="tb-actor tb-guest" data-action="guest" aria-label="观察纸衣客人"><span class="tb-guest-chest"></span></button>
      <button class="tb-actor tb-lu" data-action="lu" aria-label="询问陆九"><span class="tb-throat"></span></button>
      <div class="tb-front-table" aria-hidden="true"></div>
      <button class="tb-door ${state.receiptTaken?'tb-door-ready':''}" data-action="door" aria-label="${state.receiptTaken?'离席，去善堂':'看向门外'}"><span>${state.receiptTaken?'去善堂':'门外'}</span></button>
      <div class="tb-tabletop" tabindex="0" aria-label="茶桌：左上纸衣客席，右上陆九；选中碗后可用方向键挪动，回车放下" role="group">
        <span class="tb-seat-tag tb-seat-guest">${state.lotDrawn?'青禾':'客席'}</span><span class="tb-seat-tag tb-seat-lu">陆九</span>
        <span class="tb-seat-clip ${state.lotDrawn?'tb-lot-inserted':''}" aria-hidden="true"><i>青禾</i>${state.lotDrawn?'<b>行路</b>':''}</span>
        <button class="tb-lot ${state.lotDrawn?'tb-lot-drawn':''}" data-action="lot" aria-label="${state.lotDrawn?'查看已经插在青禾席前的签':'抽出一支行路签'}"><i></i><i></i><i></i><span>签</span></button>
        ${bowlMarkup('stack')}${bowlMarkup('self')}${bowlMarkup('meal')}
        ${cup('guest')}${cup('lu')}
        <button class="tb-kettle ${kettle?'tb-selected':''}" data-action="kettle" aria-label="拿起茶壶" aria-pressed="${kettle}">${image('engraved-teapot-v1.png')}</button>
        <button class="tb-paper" data-action="paper" aria-label="${state.receiptTaken?'重读路费收据':state.paperFree?'拿起手边的路费单':'抽取陆九手下的纸据'}"><span>路费</span></button>
        <div class="tb-arm" aria-hidden="true">${image('tabletop-hand-v1.png')}</div>
        <div class="tb-hand" aria-hidden="true"><span class="tb-wrist-point"></span>${image('tabletop-hand-v1.png')}</div>
        ${state.view==='front'?'<button class="tb-table-look" data-action="look-table" aria-label="低头近看桌上的碗与路费单"><span>近看桌面</span></button>':''}
      </div>
    </div>
    <div class="tb-top"><div><span class="tb-kicker">第二折 · 九碗客</span><p>${state.receiptTaken?'拿着这张纸，去善堂问原单。':'问清当年的路费，看看他手下的单子。'}</p></div><div class="tb-top-actions">${state.view==='table'?'<button class="tb-control" data-action="look-front">抬眼</button>':''}<button class="tb-control" data-action="exit" aria-label="返回">←</button></div></div>
    <div class="tb-bottom"><p class="tb-feedback" role="status" aria-live="polite">${feedback}</p><div class="tb-actions"><span class="tb-selection">${selectionText()}</span>${state.selected||kettle?'<button class="tb-control" data-action="cancel">放下</button>':''}<button class="tb-control" data-action="hint">提示</button>${lastMemory?'<button class="tb-control" data-action="recall">回想</button>':''}${state.receiptTaken?'<button class="tb-control" data-action="read">纸据</button>':''}<button class="tb-control" data-action="reset">重来</button></div></div>
    ${reading?reader():''}`;
    if(reading)host.querySelector('[data-action="close-reader"]')?.focus({preventScroll:true});
    else if(focusKey)host.querySelector(focusKey)?.focus({preventScroll:true});
    alignArm();
  }
  function alignArm(){
    if(!opened||!state.paperFree)return;
    const surface=table(),hand=host.querySelector('.tb-hand'),arm=host.querySelector('.tb-arm'),wrist=host.querySelector('.tb-wrist-point');
    if(!surface||!hand||!arm||!wrist)return;
    const box=surface.getBoundingClientRect(),tip=wrist.getBoundingClientRect();
    const origin={x:box.width*.76,y:-box.height*.09},dx=tip.x-box.x-origin.x,dy=tip.y-box.y-origin.y;
    arm.style.cssText=`left:${origin.x}px;top:${origin.y}px;width:${hand.offsetWidth}px;height:${Math.hypot(dx,dy)+5}px;transform:translateX(-50%) rotate(${-Math.atan2(dx,dy)*180/Math.PI}deg)`;
    if(event==='intercepted'&&!reducedMotion())armFrame=requestAnimationFrame(alignArm);
  }
  function animate(name,duration=1600){
    stopEvent();event=name;eventStarted=performance.now();
    eventTimer=setTimeout(()=>{event=null;eventTimer=null;if(opened&&!drag&&!keyboardPreview)render();},reducedMotion()?80:duration);
  }
  function act(action){
    cancelPreview(false);
    const wasPaperFree=state.paperFree;
    const result=reduceTableBanquet(state,action);state=result.state;const e=result.event;
    const messages={
      fed:'纸衣的胸口鼓起，糕缺了一角。陆九的喉头却动了一下。',
      refed:'碗回到客席，纸衣又鼓了起来；陆九随之咽了一口。',
      stopped:'碗离开客席，纸衣松下，陆九也停了。糕上的缺角还在。',
      'bowl-moved':'碗放稳了，糕仍在碗里。',
      intercepted:wasPaperFree?`陆九仍挡住碗：“别挪席。” ${state.receiptTaken?'纸据已经被你收好。':'纸据还在你手边。'}`:'陆九用压纸的手拦住碗：“别挪席。” 掌根把纸拨向你这边。',
      'object-moved':action.item==='stack'?'七只碗叠在一起，挪开后桌上宽了些。':'空碗挪开了。',
      'lot-drawn':'陆九把你抽的签插入空席的青禾夹：“你的席，在这儿。”',
      'lot-already':'“青禾”夹里，仍插着你刚抽的那支签。',
      'receipt-taken':'陆九：“你自己去问。” 纸据上写着：两人，一次验讫。',
      'paper-held':'陆九的手压着纸：“先搁着。”',
      'receipt-held':'纸据已经收好，可以再读。'
    };
    if(messages[e])feedback=messages[e];
    if(e==='intercepted'&&wasPaperFree)stopEvent();
    else if(['fed','refed','stopped','intercepted','lot-drawn'].includes(e))animate(e,e==='lot-drawn'?1800:1700);
    if(e==='fed'||e==='refed')lastMemory='刚才：碗在纸衣客席前，糕缺了一角，纸衣胸口鼓起，陆九却咽了下去。';
    if(e==='stopped')lastMemory='刚才：盛糕碗移离客席，纸衣松下；糕上的缺角没有恢复。';
    if(e==='intercepted')lastMemory=wasPaperFree?'刚才：你再次推碗，陆九仍伸手拦着。纸据没有回到他手下。':'刚才：碗向陆九推去，他用一直压纸的手拦住碗，掌根把纸带到了你手边。';
    if(e==='lot-drawn')lastMemory='刚才：你抽出一支行路签，陆九把它插在写着青禾的空席夹里。';
    if(e==='receipt-taken'){reading=true;lastMemory='刚才：你从手边取走纸据；两人，一次验讫，原单存善堂。';}
    render();
  }
  function look(view){
    cancelPreview(false);kettle=false;state=reduceTableBanquet(state,{type:'cancel'}).state;
    state=reduceTableBanquet(state,{type:'look',view}).state;render();
  }
  function pour(target){
    if(pouring){feedback='这杯还没饮完，杯空再添。';render();return;}
    stopEvent();state=reduceTableBanquet(state,{type:'pour',target}).state;kettle=false;pouring=target;
    feedback=target==='guest'?'纸衣的杯里茶渐渐少了，陆九端起自己的空杯，饮了一口。':'陆九端起面前的茶。纸衣的杯没有变化。';
    lastMemory=target==='guest'?'刚才：纸衣杯里的茶少了，陆九却端着自己的空杯饮茶。':'刚才：陆九喝了自己杯里的茶，纸衣的杯没有变化。';
    pourTimer=setTimeout(()=>{pouring=null;pourTimer=null;if(opened&&!drag&&!keyboardPreview)render();},reducedMotion()?120:1900);render();
  }
  function depart(){
    if(!state.receiptTaken||reading||departing)return;
    cancelPreview(false);stopEvent();stopPour();kettle=false;
    state=reduceTableBanquet(state,{type:'cancel'}).state;departing=true;
    feedback='青禾收好纸据，从茶席起身。陆九侧身，让出了门。';render();
    departureTimer=setTimeout(()=>{if(!opened||!departing)return;close();onContinue();},reducedMotion()?180:1000);
  }
  function reset(){
    cancelPreview(false);stopDeparture();stopEvent();stopPour();state=createTableBanquet();
    reading=false;kettle=false;lastMemory=null;hintLevel=0;feedback=opening;render();
  }
  function open(){opened=true;render();loadResources();}
  function close(){
    cancelPreview(false);stopDeparture();stopEvent();stopPour();cancelLoading();
    cancelAnimationFrame(armFrame);armFrame=null;
    kettle=false;state=reduceTableBanquet(state,{type:'cancel'}).state;opened=false;host.hidden=true;
  }
  function point(e){
    const box=table().getBoundingClientRect(),b=TABLE_LAYOUT.bounds;
    return {x:clamp((e.clientX-box.left)/box.width,b.minX,b.maxX),y:clamp((e.clientY-box.top)/box.height,b.minY,b.maxY)};
  }
  function preview(item,p){
    const el=host.querySelector(`[data-item="${item}"]`);if(!el)return;
    el.style.left=`${p.x*100}%`;el.style.top=`${p.y*100}%`;el.classList.add('tb-dragging');
  }
  function cancelPreview(redraw=true){
    if(drag){try{host.releasePointerCapture(drag.pointerId);}catch{}drag=null;}
    keyboardPreview=null;
    if(redraw&&opened)render();
  }
  function select(item){
    keyboardPreview=null;
    kettle=false;state=reduceTableBanquet(state,{type:'select',item}).state;
    feedback=`${itemNames[item]}可以挪。拖到桌上，或点一处放下。`;render();
  }
  function move(item,p){keyboardPreview=null;kettle=false;act({type:'move',item,x:p.x,y:p.y});}

  host.addEventListener('pointerdown',e=>{
    suppressClick=false;
    if(!opened||reading||departing||state.view!=='table'||e.button!==0)return;
    const el=e.target.closest('[data-item]');if(!el)return;
    cancelPreview(false);
    const p=point(e),id=el.dataset.item;
    const bounds=table().getBoundingClientRect();
    drag={item:id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,offsetX:state.positions[id].x-p.x,offsetY:state.positions[id].y-p.y,position:{...state.positions[id]},moved:false,width:bounds.width,height:bounds.height};
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7)return;
    e.preventDefault();drag.moved=true;
    const p=point(e),b=TABLE_LAYOUT.bounds;
    drag.position={x:clamp(p.x+drag.offsetX,b.minX,b.maxX),y:clamp(p.y+drag.offsetY,b.minY,b.maxY)};
    preview(drag.item,drag.position);
  });
  host.addEventListener('pointerup',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    const ended=drag;drag=null;
    try{host.releasePointerCapture(e.pointerId);}catch{}
    suppressClick=true;
    const bounds=table().getBoundingClientRect();
    if(Math.abs(bounds.width-ended.width)>.1||Math.abs(bounds.height-ended.height)>.1){render();return;}
    if(ended.moved)move(ended.item,ended.position);else select(ended.item);
  });
  host.addEventListener('pointercancel',()=>cancelPreview());
  host.addEventListener('lostpointercapture',()=>{if(drag)cancelPreview();});
  host.addEventListener('click',e=>{
    if(!opened)return;
    if(suppressClick){suppressClick=false;return;}
    const el=e.target.closest('button');
    if(reading&&!['close-reader','exit'].includes(el?.dataset.action))return;
    if(departing&&!['exit','reset'].includes(el?.dataset.action))return;
    if(state.view==='table'&&state.selected&&e.target.closest('.tb-tabletop')&&!el?.dataset.item&&!['kettle','lot'].includes(el?.dataset.action)){move(state.selected,point(e));return;}
    if(el?.dataset.item){if(state.view==='front')look('table');else select(el.dataset.item);return;}
    if(el?.dataset.cup){if(state.view==='front'){look('table');return;}if(kettle)pour(el.dataset.cup);else{feedback=pouring===el.dataset.cup?'杯里还有茶，饮过就能再添。':'杯空着。可拿起桌上的壶，添一杯茶。';render();}return;}
    if(el&&host.contains(el)){
      cancelPreview(false);
      switch(el.dataset.action){
        case'retry':loadResources();break;
        case'exit':close();onExit();break;
        case'reset':reset();break;
        case'look-table':look('table');break;
        case'look-front':look('front');break;
        case'cancel':cancelPreview(false);kettle=false;state=reduceTableBanquet(state,{type:'cancel'}).state;feedback='物件仍在放稳的位置。';render();break;
        case'lot':if(state.view==='front')look('table');else act({type:'drawLot'});break;
        case'kettle':if(state.view==='front'){look('table');break;}cancelPreview(false);state=reduceTableBanquet(state,{type:'cancel'}).state;kettle=!kettle;feedback=kettle?'壶口热气未散。可以给空杯添茶。':'壶放回桌上。';render();break;
        case'paper':if(state.view==='front'&&!state.receiptTaken){look('table');break;}cancelPreview(false);state=reduceTableBanquet(state,{type:'cancel'}).state;kettle=false;if(state.receiptTaken){reading=true;render();}else act({type:'takeReceipt'});break;
        case'read':reading=true;render();break;
        case'close-reader':reading=false;feedback='陆九：“你自己去问。” 原单还在善堂。';render();break;
        case'door':if(state.receiptTaken)depart();else{feedback='门通向街上。先拿到陆九手下的路费单。';render();}break;
        case'guest':feedback=state.serving?'纸衣的胸口鼓着，衣领里却没有人。':state.bitten?'纸衣已经松下。糕上的缺角还在。':'一件纸衣坐在空席上，领口没有脸。';render();break;
        case'lu':feedback=state.receiptTaken?'陆九：“你自己去问。”':state.paperFree?'陆九收着手，没有再把纸压回去。':'陆九：“先坐。路上的事，慢慢说。”';render();break;
        case'recall':feedback=lastMemory||feedback;render();break;
        case'hint':hintLevel++;feedback=state.receiptTaken?'纸据写着原单存善堂。从门口离席，亲自去问。':state.paperFree?'那张纸已经被他的掌根带到你手边。点纸，拿起来。':hintLevel%2?'他看着碗，右手却一直压着纸。':state.view==='front'?'点桌面近看，试着把盛糕碗推到陆九面前。':'把盛糕碗推向陆九，看看他压纸的那只手。';render();break;
      }
      return;
    }
    if(state.view==='table'&&state.selected&&e.target.closest('.tb-tabletop'))move(state.selected,point(e));
  });
  host.addEventListener('keydown',e=>{
    if(!opened)return;
    suppressClick=false;
    if(e.key==='Escape'){
      if(departing){e.preventDefault();stopDeparture();feedback='你仍坐在席前，纸据已经收好。';render();return;}
      e.preventDefault();if(reading){reading=false;render();return;}
      cancelPreview(false);kettle=false;state=reduceTableBanquet(state,{type:'cancel'}).state;feedback='物件仍在放稳的位置。';render();return;
    }
    if(reading){
      if(e.key==='Tab'){e.preventDefault();host.querySelector('[data-action="close-reader"]')?.focus();}return;
    }
    if(departing||state.view!=='table')return;
    const arrows={ArrowLeft:[-.045,0],ArrowRight:[.045,0],ArrowUp:[0,-.045],ArrowDown:[0,.045]};
    if(arrows[e.key]&&state.selected){
      e.preventDefault();const id=state.selected,b=TABLE_LAYOUT.bounds,p=keyboardPreview?.item===id?keyboardPreview.position:state.positions[id];
      keyboardPreview={item:id,position:{x:clamp(p.x+arrows[e.key][0],b.minX,b.maxX),y:clamp(p.y+arrows[e.key][1],b.minY,b.maxY)}};
      preview(id,keyboardPreview.position);return;
    }
    if(e.key==='Enter'&&keyboardPreview){e.preventDefault();move(keyboardPreview.item,keyboardPreview.position);}
  });
  window.addEventListener('resize',()=>{if(opened&&(drag||keyboardPreview))cancelPreview();else if(opened){cancelAnimationFrame(armFrame);alignArm();}});
  return {open,close,reset,isOpen:()=>opened};
}
