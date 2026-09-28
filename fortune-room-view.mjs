import {createFortuneRoom, reduceFortuneRoom} from './fortune-room.mjs';

const asset = name => new URL('./assets/' + name, import.meta.url).href;
const image = (name, className = '') => `<img class="${className}" src="${asset(name)}" alt="" draggable="false">`;
const directions = ['north', 'east', 'south', 'west'];
const names = {north:'陆九的席前', east:'东窗', south:'来时的门', west:'旧碗架', ceiling:'梁上', table:'桌前 · 问路签', window:'窗台 · 侧光'};
const lotNames = {go:'行签', stay:'留签'};
const opening = '青禾：“当年的路费单，给我看看。” 陆九：“从筒里取出行签，路费单就给你；留签，就再坐一会儿。”';
const roomImage = view => `fortune-${view}-${view==='north'?'v3':'v1'}.png`;
const images = ['north','east','south','west','ceiling'].map(roomImage).concat(['fortune-cylinder-v1.png','fortune-cylinder-open-v1.png','fortune-stick-v1.png','fortune-baffle-v1.png','tabletop-banquet-v1.png','woodcut-paper.png']);
const messages = {
  'cylinder-taken':'签筒拿在手里，筒内的签仍在原处。',
  'cylinder-placed-table':'签筒在桌上放稳。', 'cylinder-placed-window':'签筒放在窗台，侧边的木缝透出光。',
  'go-taken':'你拿起行签。签头左侧有一道缺口，认得出是这一支。', 'stay-taken':'你拿起留签，签头平整。',
  'go-drawn':'你从出口亲手抽出了行签。左侧那道缺口还在——是你放进去的那支。',
  'go-inserted':'缺口行签从筒口插入。', 'stay-inserted':'平头留签从筒口插入。',
  'go-put':'行签放回桌上，缺口仍朝外。', 'stay-put':'留签放回桌上。', 'stay-returned':'留签放回右侧窄槽。',
  'shaken-go':'竹签顺着通路滑到底口。露出的签头左侧，仍是那道缺口。',
  'shake-empty':'筒里没有签落下来。', 'outlet-occupied':'出口已有一支签，先把它取出来。',
  'panel-opened':'侧板滑开。中间一条直槽，右边还有一条窄槽。', 'panel-closed':'侧板合上。',
  'baffle-removed':'小木片被抽开，中间的通路通向底口。', 'baffle-restored':'小木片插回槽内，中间的通路又被截住。',
  'receipt-offered':'陆九看了看缺口：“是行签。说给你，就给你。” 他把路费单推到桌边。',
  'receipt-taken':'你亲手收起路费单：两人，一次验讫，原单存善堂。',
  'receipt-held':'路费单已经收好。', 'lot-unproven':'陆九：“要从筒里取出来，才算。”',
  'departure-blocked':'路费单还没拿到。青禾停在门边。', 'out-of-reach':'隔着这里够不着，走近再动手。',
  'hand-occupied':'手里还有一支签，先找地方放下。', 'main-occupied':'筒口里已经插着一支签。',
  'side-occupied':'右侧窄槽里已经有签。', 'nothing-held':'手里没有签。',
  'cylinder-held':'先把签筒放稳。', 'invalid-route':'这里不是它能放稳的位置。'
};

export function createFortuneRoomView({host, onExit=()=>{}, onContinue=()=>{}}) {
  let state=createFortuneRoom(), opened=false, resources='idle', loadGeneration=0;
  let feedback=opening, reading=false, confirmation=null, hintLevel=0, lastMemory=opening;
  let mainSettled=false, transitOrigin=-165.49, transitRoute='side';
  let transient=null, animationTimer=null, departureTimer=null, loadCleanups=[], returnFocus=null, dialogReturnKey=null;
  const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const held=()=>Object.keys(state.sticks).find(id=>state.sticks[id]==='hand');
  const near=()=>state.view==='table'||state.view==='window';
  const reachable=()=>near()&&state.cylinder===state.view;
  const inCylinder=location=>Object.keys(state.sticks).find(id=>state.sticks[id]===location);
  const isWall=()=>directions.includes(state.view);
  const currentKey=()=>host.contains(document.activeElement)?document.activeElement?.dataset.key:null;
  const restoreFocus=key=>{
    if(!key)return;
    const target=[...host.querySelectorAll('[data-key]')].find(node=>node.dataset.key===key);
    (target||host.querySelector('[data-key="back"]')||host.querySelector('[data-key="exit"]'))?.focus({preventScroll:true});
  };
  const control=(action,label,extra='',className='fr-control')=>`<button type="button" class="${className}" data-action="${action}" data-key="${action}" ${extra}>${label}</button>`;
  const hotspot=(action,label,className,contents='')=>`<button type="button" class="fr-hotspot ${className}" data-action="${action}" data-key="${action}" aria-label="${label}">${contents}<span class="fr-object-label">${label}</span></button>`;

  function stopAnimations(){clearTimeout(animationTimer);clearTimeout(departureTimer);animationTimer=null;departureTimer=null;transient=null;}
  function cancelLoading(){loadGeneration++;loadCleanups.forEach(fn=>fn());loadCleanups=[];if(resources==='loading')resources='idle';}
  function preload(file){
    return new Promise((resolve,reject)=>{
      const img=new Image();let done=false;
      const cleanup=()=>{clearTimeout(timeout);img.onload=null;img.onerror=null;};
      const finish=error=>{if(done)return;done=true;cleanup();error?reject(error):resolve();};
      const timeout=setTimeout(()=>finish(new Error(file)),15000);
      loadCleanups.push(()=>{if(!done){done=true;cleanup();img.removeAttribute('src');resolve();}});
      img.onload=()=>finish();img.onerror=()=>finish(new Error(file));img.src=asset(file);
    });
  }
  function loadResources(){
    if(resources==='ready'||resources==='loading')return;
    resources='loading';const generation=++loadGeneration;render();
    Promise.all(images.map(preload)).then(()=>{
      if(generation!==loadGeneration||!opened)return;
      loadCleanups=[];resources='ready';render();
    },()=>{
      if(generation!==loadGeneration||!opened)return;
      loadCleanups.forEach(fn=>fn());loadCleanups=[];resources='error';render();
    });
  }
  function lotVisual(id){
    return `<span class="fr-stick-sprite">${image('fortune-stick-v1.png')}<span class="fr-stick-word">${id==='go'?'行':'留'}</span>${id==='go'?'<i class="fr-notch" aria-hidden="true"></i>':''}</span>`;
  }
  function lot(id, location, interactive=true){
    const cls=`fr-stick fr-stick-${id} fr-stick-${location}`;
    if(!interactive)return `<span class="${cls}">${lotVisual(id)}</span>`;
    return `<button type="button" class="${cls}" data-action="take-stick" data-stick="${id}" data-key="stick-${id}" aria-label="${location==='outlet'?'从底口取出':location==='main'?'从筒口拿出':location==='side'?'从侧槽取出':'拿起'}${lotNames[id]}${id==='go'?'，签头有缺口':'，签头平整'}">${lotVisual(id)}</button>`;
  }
  function cylinderContents(interactive=true){
    const main=inCylinder('main'), side=inCylinder('side'), outlet=inCylinder('outlet');
    const baffle=state.baffleRemoved?'':image('fortune-baffle-v1.png','fr-baffle-art');
    return `${image(state.panelOpen?'fortune-cylinder-open-v1.png':'fortune-cylinder-v1.png','fr-cylinder-art')}
      ${main?lot(main,'main',interactive):interactive?hotspot('insert','把手里的签插入筒口','fr-inlet'):''}
      ${state.panelOpen?`${side?lot(side,'side',interactive):interactive?hotspot('return-stay','把留签放回侧槽','fr-side-slot'):''}${interactive?hotspot(state.baffleRemoved?'restore-baffle':'remove-baffle',state.baffleRemoved?'放回小木片':'抽开小木片','fr-baffle',baffle):`<span class="fr-baffle">${baffle}</span>`}`:''}
      ${outlet?lot(outlet,'outlet',interactive):''}
      ${interactive&&state.view==='window'?hotspot('panel',state.panelOpen?'合上侧板':'查看侧板','fr-panel-handle'):''}`;
  }
  function cylinderDecor(cls,action=null){
    const tag=action?'button':'span';
    return `<${tag} class="${cls} fr-cylinder-mini ${state.panelOpen?'fr-cylinder-open':''} ${mainSettled?'':'fr-main-raised'}" ${action?`type="button" data-action="${action}" data-key="${action}" aria-label="近看签筒"`:'aria-hidden="true"'}>${cylinderContents(false)}</${tag}>`;
  }
  function cylinder(){
    if(!reachable())return state.cylinder==='hand'?hotspot('place-cylinder','放下签筒','fr-cylinder-place','<span class="fr-placement-ring" aria-hidden="true">＋</span>'):'';
    return `<div class="fr-cylinder ${state.panelOpen?'fr-cylinder-open':''} ${state.baffleRemoved?'fr-baffle-removed':''} ${mainSettled?'':'fr-main-raised'}" aria-label="问路签筒">${cylinderContents()}</div><div class="fr-cylinder-tools">${control('take-cylinder','拿起签筒')}${control('shake','摇一摇')}</div>`;
  }
  function receiptObject(className=''){
    return `<button type="button" class="fr-paper ${className}" data-action="receipt" data-key="receipt" aria-label="${state.receiptOffered?'拿起陆九递来的路费单':'看看陆九手边的路费单'}">${image('woodcut-paper.png')}<span>路费单</span></button>`;
  }
  function scene(){
    if(near()){
      const table=state.view==='table';
      return `<div class="fr-workbench ${table?'fr-workbench-table':'fr-workbench-window'}">${image(roomImage(table?'north':'east'),'fr-workbench-wall')}${image('tabletop-banquet-v1.png','fr-workbench-wood')}<span class="fr-table-apron" aria-hidden="true"></span>${!table?'<div class="fr-window-light" aria-hidden="true"></div>':''}
        ${table?Object.keys(state.sticks).filter(id=>state.sticks[id]==='table').map(id=>lot(id,'table')).join(''):''}
        ${held()&&table?hotspot('put-stick','把手里的签放在桌上','fr-put-stick'+(held()==='stay'?' fr-put-stick-stay':'')):''}
        ${cylinder()}
        ${table&&!state.receiptTaken?receiptObject(state.receiptOffered?'':'fr-paper-held'):''}
        ${table?control('lu',state.receiptTaken?'与陆九说话':held()==='go'&&state.goDrawn?'把行签给陆九看':'陆九','aria-label="与陆九说话，或把手中行签给他看"','fr-control fr-lu-near'):''}
        ${!table?'<span class="fr-window-caption" aria-hidden="true">窗光照在签筒侧面</span>':''}
      </div>`;
    }
    const world=image(roomImage(state.view),'fr-world');
    if(state.view==='north')return `${world}${hotspot('lu','陆九','fr-lu')}${hotspot('guest','空衣客席','fr-guest')}${hotspot('table',state.cylinder==='table'?'近看桌上的签筒':'近看桌面','fr-table-look'+(state.cylinder==='table'?' fr-table-with-cylinder':''))}${state.cylinder==='table'?cylinderDecor('fr-room-cylinder','table-cylinder'):''}${Object.keys(state.sticks).filter(id=>state.sticks[id]==='table').map(id=>lot(id,'room',false)).join('')}${!state.receiptTaken?receiptObject('fr-paper-room'+(state.receiptOffered?'':' fr-paper-held')):''}`;
    if(state.view==='east')return `${world}${hotspot('window','走近窗台','fr-window-look')}${state.cylinder==='window'?cylinderDecor('fr-window-cylinder'):''}`;
    if(state.view==='south')return `${world}${hotspot('door',state.receiptTaken?'拿着路费单，去善堂':'看向门外','fr-door')}`;
    if(state.view==='west')return `${world}${hotspot('rack','看看旧碗架','fr-rack')}${hotspot('luggage','看看旧行李','fr-luggage')}`;
    return world;
  }
  function inventory(){
    const stick=held();
    return `<div class="fr-inventory" aria-label="随身物品">${state.cylinder==='hand'?`<button class="fr-inventory-item" data-action="held-cylinder" data-key="held-cylinder" aria-label="手里的签筒">${cylinderDecor('fr-inventory-cylinder')}<span>签筒</span></button>`:''}${stick?`<button class="fr-inventory-item fr-inventory-stick" data-action="held-stick" data-key="held-stick" aria-label="手里的${lotNames[stick]}${stick==='go'?'，有缺口':''}"><span class="fr-hand-stick">${lotVisual(stick)}</span><span>${lotNames[stick]}${stick==='go'?' · 缺口':''}</span></button>`:''}${state.receiptTaken?`<button class="fr-inventory-item" data-action="read" data-key="read" aria-label="重读路费收据">${image('woodcut-paper.png')}<span>路费单</span></button>`:''}</div>`;
  }
  function reader(){
    return `<div class="fr-overlay" role="dialog" aria-modal="true" aria-labelledby="fr-receipt-title"><article class="fr-reader"><span class="fr-kicker">亲手取回的纸据</span><h2 id="fr-receipt-title">路费收据</h2><dl><div><dt>所付</dt><dd>路费</dd></div><div><dt>人数</dt><dd>两人</dd></div><div><dt>核验</dt><dd>一次验讫</dd></div></dl><p class="fr-original">原单存善堂</p><p>没有姓名，也没有写明谁离开了。</p>${control('close-reader','收好路费单')}</article></div>`;
  }
  function confirmDialog(){
    return `<div class="fr-overlay" role="dialog" aria-modal="true" aria-labelledby="fr-confirm-title"><article class="fr-confirm"><h2 id="fr-confirm-title">${confirmation==='reset'?'重新问一次路？':'暂时离开这间屋？'}</h2><p>${confirmation==='reset'?'桌上与筒内的物件会回到最初的位置。':'这次问路的进度会留着。'}</p><div>${control('cancel-dialog','继续留在这里')}${control('confirm-dialog',confirmation==='reset'?'重新开始':'暂时离开')}</div></article></div>`;
  }
  function render(){
    host.hidden=!opened;if(!opened)return;
    const key=currentKey();
    host.className=`fortune-room fr-view-${state.view} ${transient?'fr-event-'+transient:''} fr-transit-${transitRoute}`;
    host.style.setProperty('--fr-transit-origin',`${transitOrigin}%`);
    if(resources!=='ready'){
      host.innerHTML=`<div class="fr-loading" role="status"><span class="fr-kicker">第二折 · 问路</span><h2>一签行留</h2><p>${resources==='error'?'屋里的画面暂未载入。可以保留进度再试一次。':'正在点亮屋里的灯…'}</p><div>${resources==='error'?control('retry','重新载入'):''}${control('exit','返回')}</div></div>${confirmation?confirmDialog():''}`;
    }else{
      host.innerHTML=`<div class="fr-shell"><div class="fr-stage" role="group" aria-label="${names[state.view]}">
        <div class="fr-scene">${scene()}</div>
        <header class="fr-top"><div><span class="fr-kicker">第二折 · 问路</span><p>${names[state.view]}</p></div><div>${!isWall()?control('back','↩','aria-label="返回房间"'):control('ceiling','⌃','aria-label="抬头看梁上"')}${control('exit','×','aria-label="暂时离开第二折"')}</div></header>
        ${isWall()?`<nav class="fr-turns" aria-label="转身">${control('turn-left','‹','aria-label="向左转身"','fr-turn')}${control('turn-right','›','aria-label="向右转身"','fr-turn')}</nav>`:''}
        ${inventory()}
      </div><footer class="fr-bottom"><p class="fr-feedback" role="status" aria-live="polite">${feedback}</p><div class="fr-footer-actions"><span class="fr-intent">${state.receiptTaken?'路费单已收好 · 原单在善堂':held()?`手中：${lotNames[held()]}${held()==='go'?'，左侧缺口':''}`:state.cylinder==='hand'?'手中：签筒':'要回当年的路费单'}</span><div>${control('recall','回想')}${control('hint','提示')}${control('reset','重来')}</div></div></footer></div>${reading?reader():confirmation?confirmDialog():''}`;
    }
    if(reading)restoreFocus('close-reader');else if(confirmation)restoreFocus('cancel-dialog');else restoreFocus(key);
  }
  function animate(event){
    clearTimeout(animationTimer);transient=event;
    animationTimer=setTimeout(()=>{transient=null;animationTimer=null;if(opened)render();},reducedMotion()?1:1150);
  }
  function act(action){
    const before=state, result=reduceFortuneRoom(state,action);state=result.state;
    if(messages[result.event])feedback=messages[result.event];
    if(result.event==='lot-unproven'&&action.type==='takeReceipt')feedback='陆九把纸留在自己手边：“从筒里取出行签，单子就给你。”';
    if(result.event==='shaken-stay')feedback=state.baffleRemoved?'平头留签顺着中间通路滑到底口。':before.sticks.go==='main'?'筒里轻轻一响。底口露出的是平头留签，缺口行签却没有出来。':'明腔没有进签，底口却仍落出一支平头留签。';
    if(result.event?.endsWith('-inserted'))mainSettled=false;
    if(result.event?.startsWith('shaken-')){
      transitOrigin=mainSettled?-165.49:-320.49;transitRoute=before.baffleRemoved?'main':'side';
      if(!before.baffleRemoved&&inCylinder('main'))mainSettled=true;
      animate(result.event);lastMemory=feedback;
    }
    if(result.event==='shake-empty'&&inCylinder('main')&&!state.baffleRemoved)mainSettled=true;
    if(['go-drawn','receipt-offered','receipt-taken','baffle-removed'].includes(result.event))lastMemory=feedback;
    if(result.event==='receipt-taken'){reading=true;dialogReturnKey='read';}
    if(result.event==='departed'){
      if(departureTimer)return;
      feedback='青禾把路费单收进衣襟，亲自去善堂查原单。';transient='departing';render();
      departureTimer=setTimeout(()=>{if(!opened)return;close();onContinue();},reducedMotion()?1:1150);return;
    }
    if(before.view!==state.view){hintLevel=0;transient=null;clearTimeout(animationTimer);}
    render();
  }
  function speak(){
    if(!state.receiptTaken&&!state.receiptOffered&&held()==='go'){act({type:'showLot'});return;}
    feedback=state.receiptTaken?'陆九：“原单在善堂。这一回，你自己去问。”':state.receiptOffered?'陆九把纸留在桌边，等你亲手拿走。':'陆九：“从筒里取出行签，路费单就给你；留签，就再坐一会儿。”';lastMemory=feedback;render();
  }
  function hint(){
    hintLevel++;
    if(state.receiptTaken)feedback=hintLevel===1?'纸上写着“原单存善堂”。':'转向来时的门，拿着路费单去善堂。';
    else if(state.receiptOffered)feedback='路费单已经推到桌边，还要亲手把它收好。';
    else if(state.goDrawn&&held()==='go')feedback='那道缺口证明是原来的行签。陆九就在席前。';
    else if(state.baffleRemoved)feedback=hintLevel===1?'改变了里面的通路，可以再试试同一支签。':'让缺口行签从筒口进入，摇一下，再亲手从底口取出。';
    else if(state.panelOpen)feedback=hintLevel===1?'中间的行签为什么到不了底口？沿着它往下看。':'中间槽里横着一片小木片，可以亲手抽开再试。';
    else if(state.sticks.go==='main'||state.sticks.stay==='outlet')feedback=hintLevel===1?'放进去和出来的，真是同一支签吗？窗边更亮。':'拿着签筒走近东窗，把它放稳，再检查侧边木板。';
    else feedback=hintLevel===1?'看看桌上的签头，再看看签筒的出口。':'拿起那支有缺口的行签，插进筒口，摇一摇，看它会从哪里出来。';
    render();
  }
  function requestConfirmation(kind){if(departureTimer)stopAnimations();dialogReturnKey=currentKey();confirmation=kind;render();}
  function closeDialog(){confirmation=null;reading=false;render();restoreFocus(dialogReturnKey);}
  function open(){
    if(opened)return;
    returnFocus=document.activeElement;opened=true;render();loadResources();
    host.querySelector('button')?.focus({preventScroll:true});
  }
  function close(){
    stopAnimations();cancelLoading();opened=false;reading=false;confirmation=null;host.hidden=true;
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  }
  function reset(){
    stopAnimations();mainSettled=false;state=createFortuneRoom();feedback=opening;lastMemory=opening;reading=false;confirmation=null;hintLevel=0;render();
  }
  function handleClick(event){
    const button=event.target.closest('button[data-action]');if(!button||!host.contains(button)||!opened)return;
    const action=button.dataset.action;
    if(confirmation&&!['cancel-dialog','confirm-dialog'].includes(action))return;
    if(reading&&action!=='close-reader')return;
    if(action==='exit'){requestConfirmation('exit');return;}
    if(action==='cancel-dialog'||action==='close-reader'){closeDialog();return;}
    if(action==='confirm-dialog'){const kind=confirmation;confirmation=null;if(kind==='reset')reset();else{close();onExit();}return;}
    if(action==='retry'){resources='idle';loadResources();return;}
    if(resources!=='ready'||departureTimer)return;
    switch(action){
      case 'table-cylinder':
      case 'table':act({type:'look',view:'table'});break;
      case 'window':act({type:'look',view:'window'});break;
      case 'ceiling':act({type:'look',view:'ceiling'});break;
      case 'back':act({type:'back'});break;
      case 'turn-left':act({type:'turn',delta:-1});break;
      case 'turn-right':act({type:'turn',delta:1});break;
      case 'take-cylinder':act({type:'takeCylinder'});break;
      case 'place-cylinder':act({type:'placeCylinder',place:state.view});break;
      case 'take-stick':act({type:'takeStick',stick:button.dataset.stick});break;
      case 'insert':act({type:'insertStick',stick:held()});break;
      case 'put-stick':act({type:'putStick',stick:held()});break;
      case 'return-stay':act({type:'returnStay'});break;
      case 'shake':act({type:'shake'});break;
      case 'panel':act({type:'togglePanel'});break;
      case 'remove-baffle':act({type:'removeBaffle'});break;
      case 'restore-baffle':act({type:'restoreBaffle'});break;
      case 'lu':speak();break;
      case 'receipt':act({type:'takeReceipt'});break;
      case 'door':act({type:'depart'});break;
      case 'read':dialogReturnKey=currentKey();reading=true;render();break;
      case 'reset':requestConfirmation('reset');break;
      case 'hint':hint();break;
      case 'recall':feedback=lastMemory;render();break;
      case 'guest':feedback='纸衣搭在空椅背上，袖口垂在桌边，没有人在里面。';render();break;
      case 'rack':feedback='几只旧碗叠在架上。没有声息。';render();break;
      case 'luggage':feedback='行路杖靠着旧行李，像是有人随时准备送客，又留了很久。';render();break;
      case 'held-cylinder':feedback='签筒在手里。桌前和窗台，都能把它放稳。';render();break;
      case 'held-stick':feedback=held()==='go'?'手里是缺口行签。签头上的缺口不会换位置。':'手里是平头留签。';render();break;
    }
  }
  function handleKey(event){
    if(!opened)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();
      if(departureTimer){stopAnimations();feedback='青禾在门边停下，路费单还在手里。';render();return;}
      if(reading||confirmation)closeDialog();else if(!isWall())act({type:'back'});else requestConfirmation('exit');
      return;
    }
    if((reading||confirmation)&&event.key==='Tab'){
      const buttons=[...host.querySelectorAll('.fr-overlay button')];const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      return;
    }
    if(resources!=='ready'||reading||confirmation||departureTimer)return;
    if(isWall()&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();act({type:'turn',delta:event.key==='ArrowLeft'?-1:1});}
    if(isWall()&&event.key==='ArrowUp'){event.preventDefault();act({type:'look',view:'ceiling'});}
    if(!isWall()&&event.key==='ArrowDown'){event.preventDefault();act({type:'back'});}
  }
  host.addEventListener('click',handleClick);
  document.addEventListener('keydown',handleKey,true);
  return {open,close,reset,isOpen:()=>opened};
}
