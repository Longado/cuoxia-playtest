import {createNineBowls,reduceNineBowls} from './nine-bowls.mjs';
const asset=name=>new URL('./assets/'+name,import.meta.url).href;
const bowl=(cracked=false)=>`<img src="${asset('engraved-bowl-v1.png')}" alt="">${cracked?'<span class="nb-crack-mark" aria-hidden="true"></span>':''}`;
const opening='青禾：“当年的路费单，给我看看。” 陆九按住碗：“先添杯茶，路上的事慢慢说。”';
const admission='陆九：“那一晚的名字，是我替你留下的。我以为一晚就够。”';
export function createNineBowlsView({host,onExit=()=>{},onContinue=()=>{}}){
 let state=createNineBowls(),opened=false,event=null,timer=null,pourTimer=null,pouring=null,kettle=false,reading=false,hintLevel=0;
 let resources='idle',loadGeneration=0,feedback=opening,lastMemory=null,departing=false,departureTimer=null;
 const requiredImages=['nine-bowls-room-v1.png','nine-bowls-actors-v1.png','engraved-teapot-v1.png','engraved-cup-v1.png','engraved-bowl-v1.png','engraved-cake-v1.png','lu-drinking-v1.png','lu-release-v1.png'];
 const hasTea=()=>Object.values(state.teaTried).some(Boolean);
 const fed=()=>Object.values(state.cakes).some(c=>c.fed);
 const stopEvent=()=>{clearTimeout(timer);timer=null;event=null;};
 const settleTea=()=>{clearTimeout(pourTimer);pourTimer=null;pouring=null;};
 const stopDeparture=()=>{clearTimeout(departureTimer);departureTimer=null;departing=false;};
 function selectionText(){
  if(departing)return '收好纸据，离开茶席。';
  if(kettle)return '茶壶在手 · 点一只空杯添茶';
  if(state.selected)return '糕在手 · 点席前的碗或原盘放下';
  if(state.receiptTaken)return '纸据已收 · 原单还在善堂';
  if(state.cracked)return '他的手松开了 · 碗下露出纸角';
  if(fed())return '糕缺了一角 · 还可以拿起';
  return hasTea()?'杯沿还湿着 · 桌上的糕仍完整':'路费单压在陆九碗下';
 }
 function closeReader(){reading=false;feedback=admission;render();}
 function continueToHall(){
  if(!state.receiptTaken||reading||departing)return;
  stopEvent();settleTea();kettle=false;state=reduceNineBowls(state,{type:'cancel'}).state;departing=true;
  feedback='陆九侧身让开。青禾收好纸据，从茶席起身。';render();
  departureTimer=setTimeout(()=>{if(!opened||!departing)return;close();onContinue();},matchMedia('(prefers-reduced-motion: reduce)').matches?180:1100);
 }
 function loadResources(){
  if(resources==='loading'||resources==='ready')return;
  resources='loading';const generation=++loadGeneration;render();
  Promise.all(requiredImages.map(file=>new Promise((resolve,reject)=>{const img=new Image();const timeout=setTimeout(()=>reject(new Error('timeout')),15000);img.onload=()=>{clearTimeout(timeout);resolve();};img.onerror=()=>{clearTimeout(timeout);reject(new Error('image'));};img.src=asset(file);}))).then(()=>{if(generation!==loadGeneration)return;resources='ready';if(opened)render();},()=>{if(generation!==loadGeneration)return;resources='error';if(opened)render();});
 }
 function cake(id){const c=state.cakes[id];return `<button class="nb-cake ${c.fed?'nb-bitten':''} ${state.selected===id?'nb-selected':''}" data-cake="${id}" aria-label="选择${c.fed?'缺角的':'完整的'}花印糕" aria-pressed="${state.selected===id}"><img src="${asset('engraved-cake-v1.png')}" alt=""></button>`;}
 const cakesAt=where=>Object.keys(state.cakes).filter(id=>state.cakes[id].location===where).map(cake).join('');
 const cup=who=>`<button class="nb-cup nb-cup-${who} ${pouring===who?'nb-cup-full':''} ${(who==='lu'?hasTea():state.teaTried.guest)?'nb-cup-used':''}" data-cup="${who}" aria-label="${who==='guest'?'客位':'陆九'}茶杯${pouring===who?'，有茶':'，空杯'}"><img src="${asset('engraved-cup-v1.png')}" alt=""><span class="nb-tea-water"></span><span class="nb-tea-ring"></span></button>`;
 function render(){
  host.hidden=!opened;if(!opened)return;
  host.className=`nine-bowls ${state.cracked?'nb-cracked':''} ${fed()?'nb-fed':''} ${state.receiptTaken?'nb-taken':''} ${event?'nb-event-'+event:''} ${pouring?'nb-pouring nb-pouring-'+pouring:''} ${hasTea()?'nb-tea-tried':''} ${departing?'nb-departing':''}`;
  if(resources!=='ready'){host.innerHTML=`<div class="nb-loading" role="status"><span class="nb-kicker">第二折</span><h2>九碗客</h2><p>${resources==='error'?'茶席图暂未载入，请重试。':'正在布置茶席…'}</p><div>${resources==='error'?'<button class="nb-control" data-action="retry">重新载入</button>':''}<button class="nb-control" data-action="exit">← 返回</button></div></div>`;return;}
  host.innerHTML=`<div class="nb-top"><div><span class="nb-kicker">第二折 · 九碗客</span><p class="nb-purpose">${state.receiptTaken?'去善堂核对原单':'问清当年的路费，看看碗下那张单子。'}</p></div><button class="nb-control" data-action="exit" aria-label="返回">←</button></div>
  <div class="nb-scene" aria-label="纸衣客位在左，陆九在右，桌上有糕与茶壶">
   <button class="nb-rack" data-action="back-bowl" aria-label="陆九背负九只碗，${state.cracked?'首碗已裂':'尚未裂开'}">${Array.from({length:9},(_,i)=>`<span class="nb-back-bowl ${i===0?'nb-first-bowl':''}">${bowl(i===0&&state.cracked)}</span>`).join('')}</button>
   <button class="nb-actor nb-guest" data-action="guest" aria-label="观察纸衣客人"></button>
   <button class="nb-actor nb-lu" data-action="lu" aria-label="询问陆九"><span class="nb-actor-hit" aria-hidden="true"></span><span class="nb-throat"></span><span class="nb-lip-trace"></span><span class="nb-avert">先搁着。</span></button>
   <div class="nb-table"><span class="nb-table-grain"></span></div>
   <div class="nb-seat nb-guest-seat"><button class="nb-bowl-target" data-target="guest" aria-label="${state.selected?'将选中的糕放入':'查看'}客位碗">${bowl()}</button><div class="nb-food">${cakesAt('guest')}</div></div>
   <div class="nb-seat nb-lu-seat"><button class="nb-bowl-target" data-target="lu" aria-label="${state.selected?'将选中的糕放入':'查看'}陆九碗">${bowl()}</button><div class="nb-food">${cakesAt('lu')}</div></div>
   ${cup('guest')}${cup('lu')}
   <button class="nb-kettle ${kettle?'nb-selected':''}" data-action="kettle" aria-label="拿起茶壶" aria-pressed="${kettle}"><img src="${asset('engraved-teapot-v1.png')}" alt=""></button>
   <span class="nb-paper-slip" aria-hidden="true"></span><button class="nb-paper-corner" data-action="paper" aria-label="${state.receiptTaken?'重读路费收据':'抽取碗底纸角'}"><span>${state.receiptTaken?'路费单':'路费'}</span></button>
   <div class="nb-plate"><button class="nb-plate-target" data-target="plate" aria-label="将选中的糕放回原盘"></button><div class="nb-plate-food">${cakesAt('plate')}</div></div>
   ${pouring||event?'<button class="nb-control nb-skip" data-action="skip">略过动作</button>':''}
  </div>
  <div class="nb-bottom"><p class="nb-feedback" role="status" aria-live="polite">${feedback}</p><div class="nb-actions"><span class="nb-selection">${selectionText()}</span>${kettle||state.selected?'<button class="nb-control" data-action="cancel">放下</button>':''}<button class="nb-control" data-action="hint">提示</button>${lastMemory?'<button class="nb-control" data-action="recall">回想刚才</button>':''}<button class="nb-control" data-action="reset">重来</button></div>${state.receiptTaken&&!reading&&event!=='receipt-taken'?`<div class="nb-ending"><p>纸据上只有两人、一次验讫。原单还在善堂。</p><button class="nb-control nb-continue" data-action="continue" ${departing?'disabled':''}>${departing?'正在离席':'去善堂'}</button></div>`:''}</div>
  ${reading?`<div class="nb-reader" role="dialog" aria-modal="true" aria-labelledby="nb-receipt-title"><article><span class="nb-kicker">从碗底抽出的纸据</span><h3 id="nb-receipt-title">路费收据</h3><dl><div><dt>所付</dt><dd>路费</dd></div><div><dt>人数</dt><dd>两人</dd></div><div><dt>核验</dt><dd>一次验讫</dd></div></dl><p class="nb-original">原单存善堂</p><p class="nb-reading-note">没有姓名，也没有写明谁离开了。</p><button class="nb-control" data-action="close-reader">收起纸据</button></article></div>`:''}`;
 }
 function animate(e){stopEvent();event=e;timer=setTimeout(()=>{event=null;if(e==='receipt-taken')reading=true;render();},e==='receipt-taken'?1200:2200);}
 function act(action){
  const reduced=reduceNineBowls(state,action);state=reduced.state;const e=reduced.event;
  const messages={selected:'拿起花印糕。',cancelled:'糕仍留在原处。',placed:'糕放稳了。',fed:'纸衣的胸口鼓起来，糕上少了一角。桌子另一侧传来一声吞咽。',refused:'陆九摇头：“留给那位客人吧。” 糕还完整，可以拿回来。',cracked:'背后首碗裂响。陆九一怔，转眼收回手；纸衣松下，碗边露出纸角。',returned:'糕落回陆九碗中。','paper-held':'先放下手里的糕。','receipt-blocked':fed()?'你再伸向纸据。陆九避开你的目光：“各吃各的，别换席。”':hasTea()?'陆九仍压着单子：“先替那位客人摆一口饭吧。” 他望了望纸衣面前的空碗。':'陆九按住碗：“别急。先添杯茶，路上的事慢慢说。”','receipt-taken':'你从已经挪开的碗下，抽出了路费单。'};
  if(e)feedback=messages[e]||feedback;
  if(e==='cracked')settleTea();
  const memories={fed:'刚才：糕放进纸衣面前的碗，胸口鼓起，糕缺了一角；吞咽声却从陆九一侧传来。',refused:'刚才：完整的糕放进陆九碗里，他推辞，让你留给纸衣客人。',cracked:'刚才：缺角的糕换到陆九碗中，纸衣松下，背后首碗裂开。他转眼收回手，碗挪开了。','receipt-taken':'刚才：你从露出的纸角抽出路费单。上面是两人、一次验讫，原单存善堂。'};
  if(memories[e])lastMemory=memories[e];
  if(['fed','refused','cracked','receipt-blocked','receipt-taken'].includes(e))animate(e);
  render();
 }
 function pour(target){
  if(pouring){feedback='这一杯还没饮完。杯空再添。';render();return;}
  stopEvent();const first=!hasTea();state=reduceNineBowls(state,{type:'pour',target}).state;pouring=target;kettle=false;
  feedback=first?'陆九：“两个人的路费，我都付过。” 他端起了杯。':target==='guest'?'你再给客位添了一杯。':'你把这一杯添在陆九面前。';
  lastMemory=target==='guest'?'刚才：纸衣面前的茶少了，陆九却端着自己的空杯饮了一口。两只杯沿都留下了湿痕。':'刚才：陆九喝的是自己杯里的茶，纸衣面前的杯没有变化。';
  pourTimer=setTimeout(()=>{pouring=null;pourTimer=null;render();},1900);render();
 }
 function recall(){if(lastMemory)feedback=lastMemory;render();}
 function reset(){stopDeparture();stopEvent();settleTea();state=createNineBowls();kettle=false;reading=false;hintLevel=0;lastMemory=null;feedback=opening;render();}
 function open(){opened=true;render();loadResources();}
 function close(){if(event==='receipt-taken')reading=true;if(departing)feedback=admission;stopDeparture();stopEvent();settleTea();kettle=false;opened=false;host.hidden=true;}
 host.addEventListener('click',e=>{const el=e.target.closest('button');if(!el||!host.contains(el))return;
  if(departing&&!['exit','reset'].includes(el.dataset.action))return;
  if(el.dataset.cake){kettle=false;act({type:'select',cake:el.dataset.cake});return;}
  if(el.dataset.cup){if(kettle)pour(el.dataset.cup);else{feedback=pouring===el.dataset.cup?'杯里有茶，等他饮过便能再添。':state.teaTried[el.dataset.cup]?'杯已经空了，沿口还湿着。可拿壶再添。':'空杯放在碗旁。陆九推来的壶就在手边。';render();}return;}
  if(el.dataset.target){if(state.selected)act({type:'place',target:el.dataset.target});else{feedback=el.dataset.target==='plate'?'一块花印糕。可以拿起，放进席上的碗。':el.dataset.target==='guest'?'陆九：“先替那位客人摆一口饭吧。” 椅子上只有一件纸衣。':state.cracked?'陆九没有再拦你，碗下的纸露了出来。':'陆九的碗下压着路费单。他一直留意你的手。';render();}return;}
  switch(el.dataset.action){
   case'retry':loadResources();break;case'exit':close();onExit();break;case'reset':reset();break;
   case'kettle':kettle=!kettle;state=reduceNineBowls(state,{type:'cancel'}).state;feedback=kettle?'壶口热气未散。陆九：“杯空了再添，别漫出来。”':'茶壶放回桌上。';render();break;
   case'cancel':kettle=false;act({type:'cancel'});break;
   case'paper':if(kettle){feedback='先把茶壶放下。';render();}else if(state.receiptTaken){reading=true;render();}else act({type:'takeReceipt'});break;
   case'close-reader':closeReader();break;
   case'continue':continueToHall();break;
   case'back-bowl':feedback=state.selected?'背后的碗挂在绳上，放不了糕。糕还在你手里。':state.cracked?'只有首碗裂开了。其余碗仍挂在陆九背后。':'九只碗挂在陆九背后，随着呼吸轻碰。';render();break;
   case'skip':if(event==='receipt-taken')reading=true;stopEvent();settleTea();render();break;
   case'recall':recall();break;
   case'guest':feedback=state.cracked?'纸衣已经松下去了，客位没有再传来响动。':fed()?'纸衣胸前鼓着。刚才摆给它的糕缺了一角。':state.teaTried.guest?'纸衣没有嘴，杯沿却湿了。':'一个空座，一件纸衣。陆九仍称它为客人。';render();break;
   case'lu':feedback=state.receiptTaken?admission:state.cracked?'陆九：“单子你拿去吧。原单在善堂。”':fed()?'陆九：“各吃各的，别换席。” 可刚才，吞咽声分明从他这边传来。':hasTea()?'陆九：“两个人的路费，我都付过。” 你还没有看到原单。':'青禾：“单子就在碗下，为什么不让我看？” 陆九把茶壶往前推了推。';render();break;
   case'hint':hintLevel=Math.min(2,hintLevel+1);feedback=state.receiptTaken?'收好纸据，去善堂看看原单。':state.cracked?'纸角已经露出来，陆九不再拦着。':hintLevel===1?(!hasTea()?'陆九推来了茶壶。先给空杯添茶，听他怎样回答。':'给一边添茶时，看看另一边的杯和人。糕又会被谁吃掉？'):'把糕放在纸衣面前观察；再将缺角的那块换到陆九碗里，试试他还会不会推辞。';render();break;
  }
 });
 document.addEventListener('keydown',e=>{if(!opened||e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();if(reading){closeReader();}else if(kettle||state.selected){kettle=false;act({type:'cancel'});}else{close();onExit();}},true);
 host.hidden=true;return{open,close,reset,isOpen:()=>opened};
}
