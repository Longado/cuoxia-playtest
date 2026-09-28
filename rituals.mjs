export const MATERIALS={eye:'眼珠',finger:'指节',cube:'肉块'};
export const createRituals=()=>({gaps:[0,2,0,2,0],skewer:false,collected:[],threaded:[],rotation:0,rolling:0,lastDirection:0,reversals:0,coated:false,offered:false});
export const ABACUS_ROUTE=Object.freeze([0,1,2,1,0]);
export function setGap(s,column,row){if(s.skewer||!Number.isInteger(column)||column<0||column>4||!Number.isInteger(row)||row<0||row>2||row===s.gaps[column])return s;const delta=(row-s.gaps[column]+3)%3;return {...s,gaps:s.gaps.map((r,i)=>i===column||i===(column+1)%5?(r+delta)%3:r)};}
export function abacusPath(s){const stopped=s.gaps.findIndex((r,i)=>r!==ABACUS_ROUTE[i]);return {ok:stopped<0,rows:[1,...ABACUS_ROUTE,1],stopped:stopped<0?6:stopped};}
export function releasePearl(s){return !s.skewer&&abacusPath(s).ok?{...s,skewer:true,collected:s.collected.includes('eye')?s.collected:[...s.collected,'eye']}:s;}
export function collectMaterial(s,id,room){if(!MATERIALS[id]||s.collected.includes(id)||id==='finger'&&!room.opened||id==='eye')return s;return {...s,collected:[...s.collected,id]};}
export function threadMaterial(s,id){if(!s.skewer||s.coated||!s.collected.includes(id)||s.threaded.includes(id))return s;return {...s,threaded:[...s.threaded,id],rotation:0,rolling:0,lastDirection:0,reversals:0};}
export function unthreadLast(s){if(!s.threaded.length||s.coated)return s;return {...s,threaded:s.threaded.slice(0,-1),rotation:0,rolling:0,lastDirection:0,reversals:0};}
export function rollSugar(s,delta){if(s.threaded.length!==3||s.coated||!Number.isFinite(delta)||delta===0)return s;const d=Math.sign(delta),reversals=s.reversals+(s.lastDirection&&s.lastDirection!==d?1:0),rolling=s.rolling+Math.min(360,Math.abs(delta));return {...s,rotation:s.rotation+delta,rolling,lastDirection:d,reversals,coated:rolling>=720&&reversals>=2};}
export const offerCandy=s=>s.coated?{...s,offered:true}:s;

export function inventoryItems(s){if(s.offered)return [];return [...(s.skewer?[{kind:'skewer',materials:[...s.threaded],coated:s.coated}]:[]),...s.collected.filter(id=>!s.threaded.includes(id)).map(id=>({kind:'material',id}))];}
