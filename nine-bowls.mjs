// Scene-local progress. Selection leaves the cake in its last committed place.
export const createNineBowls=()=>({cakes:{a:{location:'plate',fed:false}},selected:null,cracked:false,receiptTaken:false,teaTried:{guest:false,lu:false},lastTeaTarget:null});

// Events request presentation only: all persistent consequences are already committed.
export function reduceNineBowls(state,action){
 const result=(next=state,event=null)=>({state:next,event});
 if(action.type==='reset')return result(createNineBowls());
 if(action.type==='pour'){
  if(!['guest','lu'].includes(action.target))return result();
  return result({...state,teaTried:{...state.teaTried,[action.target]:true},lastTeaTarget:action.target,selected:null},`tea-${action.target}`);
 }
 if(action.type==='select')return Object.hasOwn(state.cakes,action.cake)?result({...state,selected:action.cake},'selected'):result();
 if(action.type==='cancel')return state.selected?result({...state,selected:null},'cancelled'):result();
 if(action.type==='takeReceipt'){
  if(state.selected)return result(state,'paper-held');
  if(state.receiptTaken)return result();
  if(!state.cracked)return result(state,'receipt-blocked');
  return result({...state,receiptTaken:true},'receipt-taken');
 }
 if(action.type!=='place'||!state.selected||!['plate','guest','lu'].includes(action.target))return result();
 const id=state.selected,cake=state.cakes[id],target=action.target;
 // Selecting and confirming the current location is not another meal or return.
 if(cake.location===target)return result({...state,selected:null},'placed');
 const fedNow=target==='guest'&&!cake.fed;
 const crackNow=target==='lu'&&cake.fed&&!state.cracked;
 const event=fedNow?'fed':target==='lu'?(cake.fed?(crackNow?'cracked':'returned'):'refused'):'placed';
 return result({...state,cakes:{...state.cakes,[id]:{location:target,fed:cake.fed||fedNow}},selected:null,cracked:state.cracked||crackNow},event);
}
