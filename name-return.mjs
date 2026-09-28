// Scene-local progress. Positions are authoritative; there is only one held item.
export const createNameReturn=()=>({paused:false,split:false,loan:'joined',name:'joined',released:false,stamped:false,plaque:'drawer'});

// Events describe visible responses, never deferred unlocks or animation callbacks.
export function reduceNameReturn(state,action){
 const result=(next=state,event=null)=>({state:next,event});
 const change=(patch,event)=>result({...state,...patch},event);
 const held=state.plaque==='hand'?'plaque':state.loan==='hand'?'loan':state.name==='hand'?'name':null;
 const type=action.type;
 if(type==='reset')return result(createNameReturn(),'reset');
 if(type==='tryWhole')return result(state,state.split?'already-split':'whole-held');
 if(type==='liftName')return result(state,state.split?'already-split':'name-lifted');
 if(state.plaque==='worn')return result(state,'finished');
 if(type==='stopRenewal')return state.paused?result(state,'already-paused'):change({paused:true},'renewal-stopped');
 if(type==='split')return state.split?result(state,'already-split'):change({paused:true,split:true,loan:'desk',name:'desk'},'split');
 if(type==='cancel'){
  if(held==='plaque')return result(state,'plaque-held');
  return held?change({[held]:'desk'},'cancelled'):result(state,'nothing-held');
 }
 if(type==='pickLoan'||type==='pickName'){
  const item=type==='pickLoan'?'loan':'name';
  if(!state.split)return result(state,'joined');
  // Once personally collected, the clerk files the loan; wearing is the final act.
  if(item==='loan'&&state.plaque!=='drawer')return result(state,'loan-filed');
  if(held)return result(state,held===item?'already-held':'hands-full');
  if(item==='loan'&&state.loan==='archive')return change({loan:'hand',released:false},state.released?'control-restored':'loan-taken');
  return change({[item]:'hand'},`${item}-taken`);
 }
 if(type==='placeLoan'||type==='placeName'||type==='archiveLoan'){
  const item=type==='placeName'?'name':'loan';
  if(held!==item)return result(state,`need-${item}`);
  return change({[item]:type==='archiveLoan'?'archive':'desk'},type==='archiveLoan'?'loan-archived':`${item}-placed`);
 }
 if(type==='claimName'){
  if(!state.split)return result(state,'joined');
  if(held!=='name')return result(state,'need-name');
  if(state.loan!=='archive')return result(state,'need-loan');
  return change({paused:true,name:'claim',released:true},state.released?'claim-restated':'released');
 }
 if(type==='stampReturn'){
  if(!state.released&&state.plaque==='drawer')return result(state,'stamp-held');
  return state.stamped?result(state,'already-stamped'):change({stamped:true},'return-stamped');
 }
 if(type==='takePlaque'){
  if(state.plaque!=='drawer')return result(state,'plaque-held');
  if(held)return result(state,'hands-full');
  if(!state.released||state.loan!=='archive')return result(state,'drawer-held');
  return change({plaque:'hand'},'plaque-taken');
 }
 if(type==='wearPlaque')return state.plaque==='hand'?change({plaque:'worn'},'completed'):result(state,'need-plaque');
 return result();
}
