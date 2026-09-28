import {createNameReturn,reduceNameReturn} from './name-return.mjs';

const arrival='你带来陆九桌上的路费单。掌事守着窗口，等你递进来。';
const opening='掌事对过路费单，翻开原单：“青禾，续押。” 他把姓名联和印泥推到你面前。';
const clerk=`<svg viewBox="0 0 180 180" aria-hidden="true"><path d="M45 64 38 163 145 163 137 65 112 47 69 48Z" fill="#38332d"/><path d="m62 69 29 52 30-52M90 119v42M51 143l27-39m51 39-28-39" fill="none" stroke="#b6a17b" stroke-width="2"/><path d="m65 28 8 30 17 12 18-12 9-30" fill="#d3ba90" stroke="#38332d" stroke-width="3"/><path d="M57 27h67l-12-16H69Z" fill="#39342d"/><path d="m76 39 7-1m17 1 7-1M89 40l-3 11 8 1m-12 8 18-2" fill="none" stroke="#493c2b" stroke-width="2"/></svg>`;

export function createNameReturnView({host,onExit=()=>{}}){
 let state=createNameReturn(),opened=false,introduced=false,receiptSelected=false,feedback=arrival,lastEvent='',reading=false,confirmingReset=false;
 const held=()=>state.plaque==='hand'?'plaque':state.loan==='hand'?'loan':state.name==='hand'?'name':null;
 const loanText='<span class="nr-paper-overline">原单 · 借款联</span><strong>陆九</strong><span>路费原账</span><span class="nr-rule"></span><span class="nr-paper-note">借款记录<br>留存于善堂</span>';
 const nameText='<span class="nr-paper-overline">原单 · 姓名联</span><strong>青禾</strong><span>续押</span><span class="nr-signature">画押处<span></span></span>';
 const messages={
  reset:opening,
  'whole-held':'你提起整张原单。掌事立即压住陆九的借款一侧，姓名那半张却翘了起来。',
  'name-lifted':'姓名那半张掀得起来，掌事只把借款一侧按平。两联之间留着一排齿孔。',
  'already-split':'纸已经分开，齿孔处留下了毛边。两联都还在。',
  finished:'青禾把姓名牌别回衣襟。原账仍留在善堂，这一次，没有再续押她的名字。',
  'already-paused':'你的纸仍压在手边，朱印停住了。掌事没有再落印。',
  'renewal-stopped':'青禾按住姓名那一联：“这次不续了。” 掌事的朱印停在纸上方。',
  split:'青禾挡住落印的手，沿齿孔分开两联。掌事仍留意着借款记录。',
  'plaque-held':'姓名牌还握在你手里。衣襟就在面前。',
  cancelled:'纸放回桌面。分开的毛边仍在，朱印也没有落下。',
  'nothing-held':'手里没有拿着东西。',
  joined:'两联还连在一起。掌事护着借款那半，姓名一侧的纸边可以掀起。',
  'loan-filed':'掌事已经把借款联收妥。原账留在匣中，仍可查看。',
  'already-held':'这张纸已经拿在手里。',
  'hands-full':'手里还拿着一件东西，先安放好它。',
  'control-restored':'借款联离开账匣，掌事立即把手重新横在抽屉前。姓名牌仍在原处。',
  'loan-taken':'借款联拿在手里，陆九的记录没有被抹去。',
  'name-taken':'青禾的姓名联拿在手里。抽屉中的同名牌仍清楚可见。',
  'loan-archived':'借款联落进账匣。掌事抚平账页，却仍把手横在姓名抽屉前。',
  'loan-placed':'借款联放回桌面，记录仍完整。',
  'name-placed':'姓名联放回桌面，续押处仍未落印。',
  'claim-restated':'你仍要亲自领回姓名。掌事看过匣中的借款记录，没有再伸手阻挡。',
  released:'你持姓名联伸向青禾的牌。掌事看一眼匣中的原账，慢慢撤开挡着抽屉的手，把朱印放下。',
  'stamp-held':'朱印仍在掌事手中。他看着账页，也没有松开抽屉前的手。',
  'already-stamped':'“退还”的印迹已经留在姓名联上，不必重盖。',
  'return-stamped':'你在姓名联上留下“退还”印迹。借款记录没有改变。',
  'drawer-held':'牌就在抽屉里。掌事的手横在前面，没有让开。',
  'plaque-taken':'你亲手取出了“青禾”。掌事将借款联收好，原账仍可查看。',
  completed:'青禾把姓名牌别回衣襟。原账仍留在善堂，这一次，没有再续押她的名字。',
  'need-plaque':'衣襟上还空着，那块姓名牌尚未拿到手里。'
 };

 function act(type){
  const result=reduceNameReturn(state,{type});state=result.state;lastEvent=result.event||'';
  if(result.event==='need-loan')feedback=type==='claimName'?'掌事看向空着的账匣，又按住抽屉。借款记录还没有留下。':'手里没有借款联，这里没有东西可以归入。';
  else if(result.event==='need-name')feedback=type==='claimName'?'你伸手去领牌，掌事看向桌上的姓名联。那张纸还没有带到抽屉前。':'手里没有姓名联可放下。';
  else if(result.event)feedback=messages[result.event]||feedback;
  if(result.event==='loan-filed')reading=true;
  render();
 }

 function paper(kind){
  const location=state[kind],isHeld=location==='hand',name=kind==='loan'?'借款联':'姓名联';
  if(location==='archive')return `<button class="nr-paper-space" data-action="desk-loan" aria-label="将借款联放在桌面"><span>借款联原位</span><i>纸已归匣</i></button>`;
  if(location==='claim')return `<button class="nr-paper-space" data-action="desk-name" aria-label="将姓名联放在桌面"><span>姓名联原位</span><i>纸在抽屉前</i></button>`;
  return `<button class="nr-paper nr-paper-${kind} ${isHeld?'nr-held':''}" data-action="${kind}" aria-label="${isHeld?'放下':state.split?'拿起':kind==='loan'?'提起整张原单，查看':'掀起'}${name}" aria-pressed="${isHeld}">${kind==='loan'?loanText:nameText}${kind==='name'&&state.stamped?'<span class="nr-return-mark">退还</span>':''}${isHeld?'<span class="nr-held-label">手中</span>':''}</button>`;
 }

 function render(){
  host.hidden=!opened;if(!opened)return;
  const focused=host.contains(document.activeElement)?document.activeElement.dataset.action:null;
  const item=held(),collected=state.plaque!=='drawer';
  host.className=`name-return ${!introduced?'nr-arriving':''} ${receiptSelected?'nr-receipt-selected':''} ${state.split?'nr-split':''} ${state.paused?'nr-paused':''} ${state.released?'nr-released':''} ${collected?'nr-collected':''} ${state.plaque==='worn'?'nr-complete':''} ${item==='name'?'nr-holding-name':''} nr-event-${lastEvent}`;
  host.dataset.released=String(state.released);host.dataset.paused=String(state.paused);host.dataset.introduced=String(introduced);
  host.innerHTML=`
   <header class="nr-top"><div><span class="nr-kicker">第三折 · 交互简图</span><h2>领回</h2><p class="nr-purpose">${!introduced?'看看善堂保存的原单。':state.plaque==='worn'?'姓名已经戴回，原账仍在。':'亲手领回「青禾」的姓名牌。'}</p></div><div class="nr-top-tools"><span class="nr-prototype">灰盒 · 非最终美术</span><button class="nr-control" data-action="exit" aria-label="返回上一处">← 返回</button></div></header>
   <div class="nr-room" aria-label="善堂柜桌，掌事面前摊着双联原单，左侧账匣，右侧姓名抽屉">
    <div class="nr-back-wall" aria-hidden="true"><span>善堂</span></div>
    <button class="nr-clerk" data-action="clerk" aria-label="观察掌事">${clerk}<span>掌事</span></button>
    <p class="nr-clerk-state">${!introduced?'他示意面前的窗口':collected?'他已收好原账':state.released?'他看过账匣，撤开了手':state.paused?'印停着，手仍护着账':'印悬在续押处'}</p>
    <div class="nr-table" aria-hidden="true"></div>
    ${!introduced?`<div class="nr-arrival">
     <button class="nr-window" data-action="present-receipt" aria-label="把路费单递入善堂窗口"><span>原单留存</span><i aria-hidden="true"></i><small>善堂窗口</small></button>
     <button class="nr-arrival-receipt" data-action="arrival-receipt" aria-pressed="${receiptSelected}" aria-label="拿起带来的路费单"><span>路费</span><strong>两人</strong><span>一次验讫</span><small>原单存善堂</small></button>
    </div>`:''}
    <div class="nr-workspace" ${introduced?'':'hidden'}>
     <section class="nr-archive-zone" aria-label="账匣">
      <button class="nr-archive" data-action="archive" aria-label="${state.loan==='archive'?(collected?'查看收好的借款联':'取回账匣中的借款联'):'将手中借款联放入账匣'}"><span class="nr-archive-slot"></span><strong>账匣</strong><span>${state.loan==='archive'?'原账在匣中':'留存原账'}</span></button>
      ${state.loan==='archive'?`<button class="nr-filed-paper" data-action="loan" aria-label="${collected?'查看收好的':'拿起归匣的'}借款联">借款联 · 陆九<small>${collected?'已收好 · 可查':'原账留存'}</small></button>`:''}
     </section>
     <section class="nr-doc-zone" aria-label="有齿孔的双联原单">
      <div class="nr-doc-caption">原单 <span>${state.split?'两联已分开':'两联相接'}</span></div>
      <div class="nr-docs">${paper('loan')}${paper('name')}${!state.split?'<button class="nr-perforation" data-action="split" aria-label="沿齿孔分开两联"><span>沿齿孔分开</span></button>':''}</div>
      ${!state.paused?'<button class="nr-stop" data-action="stopRenewal" aria-label="按住姓名联，停止续押">按住纸页</button>':'<span class="nr-paper-rest">续押已停</span>'}
      <button class="nr-inkpad" data-action="inkpad" aria-label="查看姓名联旁的印泥"><i aria-hidden="true"></i><span>印泥</span></button><span class="nr-guard-hand" aria-hidden="true"><i></i></span>
     </section>
     <section class="nr-drawer-zone" aria-label="青禾的姓名抽屉">
      <button class="nr-drawer" data-action="drawer" aria-label="持姓名联向抽屉领名"><span class="nr-drawer-caption">姓名抽屉</span><span class="nr-drawer-hole"></span><span class="nr-drawer-handle"></span></button>
      ${state.plaque==='drawer'?'<button class="nr-plaque nr-plaque-drawer" data-action="plaque" data-place="drawer" aria-label="亲手取出青禾姓名牌"><span>青禾</span></button>':''}
      <span class="nr-drawer-hand" aria-hidden="true"><i></i></span>
      ${state.name==='claim'?`<button class="nr-claim-paper" data-action="name" aria-label="拿起抽屉前的姓名联">姓名联 · 青禾${state.stamped?'<span>退还</span>':''}</button>`:''}
     </section>
    </div>
    <button class="nr-seal" ${introduced?'':'hidden'} data-action="stamp" aria-label="用朱印留下退还记录"><i aria-hidden="true"></i><strong>朱印</strong><small>${state.stamped?'已留退还印':state.released||collected?'已放下':'掌事手中'}</small></button>
   </div>
   <div class="nr-bottom">
    <p class="nr-feedback" role="status" aria-live="polite" tabindex="-1">${feedback}</p>
    <div class="nr-in-hand" ${item||state.plaque==='worn'?'':'hidden'}>${state.plaque==='hand'?'<button class="nr-plaque nr-plaque-hand" data-action="plaque" data-place="hand" aria-label="查看手中的青禾姓名牌"><span>青禾</span></button>':''}<span>${item==='loan'?'借款联在手':item==='name'?'姓名联在手':item==='plaque'?'姓名牌在手':state.plaque==='worn'?'青禾 · 姓名戴回':''}</span>${item==='plaque'?'<button class="nr-lapel" data-action="wear" aria-label="把青禾姓名牌别回衣襟"><span aria-hidden="true"></span>别回衣襟</button>':''}</div>
    <div class="nr-controls"><span class="nr-session-note">${!introduced?'点选纸据 · 再点窗口<br>':state.plaque==='drawer'?'点选拿取 · 再点落处<br>':''}本页保留进度 · 刷新后重新开始</span>${item?'<button class="nr-control" data-action="cancel">取消拿取</button>':''}<button class="nr-control" data-action="reset">重来本段</button></div>
   </div>
   ${reading?'<div class="nr-modal" role="dialog" aria-modal="true" aria-labelledby="nr-reading-title"><article><span class="nr-kicker">匣中原账</span><h3 id="nr-reading-title">借款联 · 陆九</h3><p>路费原账仍在善堂留存。姓名的退还没有抹去这份借款记录。</p><button class="nr-control" data-action="close-reader">收起原账</button></article></div>':''}
   ${confirmingReset?'<div class="nr-modal" role="dialog" aria-modal="true" aria-labelledby="nr-reset-title"><article><h3 id="nr-reset-title">重来这一段？</h3><p>善堂的纸与姓名牌会回到入场时，上一处的进度保留。</p><div><button class="nr-control" data-action="confirm-reset">重来本段</button><button class="nr-control" data-action="cancel-reset">继续这一局</button></div></article></div>':''}`;
  if(focused)host.querySelector(`[data-action="${focused}"]`)?.focus({preventScroll:true});
 }

 function reset(){state=createNameReturn();introduced=false;receiptSelected=false;feedback=arrival;lastEvent='';reading=false;confirmingReset=false;render();}
 function open(){opened=true;render();}
 function close(){opened=false;receiptSelected=false;if(!introduced)feedback=arrival;reading=false;confirmingReset=false;host.hidden=true;}
 function exit(){close();onExit();}
 host.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||!host.contains(button)||!opened)return;
  const action=button.dataset.action;
  if((reading||confirmingReset)&&!button.closest('.nr-modal'))return;
  if((action==='loan'||action==='archive')&&state.plaque!=='drawer'){
   feedback=messages['loan-filed'];reading=true;render();host.querySelector('[data-action="close-reader"]')?.focus();return;
  }
  if(!introduced&&!['exit','reset','confirm-reset','cancel-reset','arrival-receipt','present-receipt','clerk'].includes(action))return;
  switch(action){
   case'arrival-receipt':receiptSelected=!receiptSelected;feedback=receiptSelected?'路费单拿在手里。掌事把窗口前空了出来。':arrival;render();break;
   case'present-receipt':
    if(!receiptSelected){feedback='带来的路费单还在桌边。';render();break;}
    introduced=true;receiptSelected=false;lastEvent='presented';feedback=opening;render();break;
   case'inkpad':lastEvent='observe';feedback='印泥摆在姓名联旁，画押处仍然空着。你的手还没有落下。';render();break;
   case'exit':exit();break;
   case'reset':confirmingReset=true;render();host.querySelector('[data-action="cancel-reset"]')?.focus();break;
   case'confirm-reset':reset();break;
   case'cancel-reset':confirmingReset=false;render();break;
   case'close-reader':reading=false;render();break;
   case'loan':act(!state.split?'tryWhole':state.loan==='hand'?'placeLoan':'pickLoan');break;
   case'name':act(!state.split?'liftName':state.name==='hand'?'placeName':'pickName');break;
   case'desk-loan':act('placeLoan');break;
   case'desk-name':act('placeName');break;
   case'archive':act(held()==='loan'?'archiveLoan':state.loan==='archive'?'pickLoan':'archiveLoan');break;
   case'drawer':act(held()==='name'?'claimName':'takePlaque');break;
   case'plaque':act(held()==='name'?'claimName':'takePlaque');break;
   case'stamp':act('stampReturn');break;
   case'wear':act('wearPlaque');break;
   case'cancel':act('cancel');break;
   case'split':act('split');break;
   case'stopRenewal':act('stopRenewal');break;
   case'clerk':feedback=!introduced?'掌事指了指窗口：“单子。”':state.plaque==='worn'?'掌事守着留下的账。青禾的名字已不在他的抽屉里。':state.released?'他看过账匣，终于把手从姓名牌前撤开。':state.split?'掌事的目光跟着借款联，另一只手仍拦在姓名抽屉前。':'掌事把借款那半张纸按平，姓名一侧的纸边却翘着。';lastEvent='observe';render();break;
  }
 });
 document.addEventListener('keydown',e=>{
  if(!opened||e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();
  if(reading){reading=false;render();}else if(confirmingReset){confirmingReset=false;render();}else if(receiptSelected){receiptSelected=false;feedback=arrival;render();}else if(held())act('cancel');else exit();
 },true);
 host.hidden=true;
 return {open,close,reset,isOpen:()=>opened};
}
