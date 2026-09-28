import {SCENES} from './scenes.mjs';
export const NAMES={shen:'沈嫂',lu:'陆九',qing:'青禾'};
export const TOOLS={shen:'钥匙',lu:'锁',qing:'剪具'};
export const createGame=()=>({puppets:{shen:{x:22,y:64},lu:{x:52,y:64},qing:{x:80,y:64}},light:.5,lightDepth:.5,cabinet:[false,false,false,false],cabinetTaken:[false,false,false],bowlPlaced:false,mirrorWipes:[false,false,false],parcelWrapped:false,parcelTied:false,unlocked:false,ribbonCut:false,opened:false,letterTaken:false,mirrorTouched:false,mirrorRaised:false,mirrorEvidence:false,recognized:false,receiptShown:false,view:0,closeup:null});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function movePuppet(s,n,x,y){if(!s.puppets[n]||!Number.isFinite(x)||!Number.isFinite(y))return s;return {...s,puppets:{...s.puppets,[n]:{x:clamp(x,14,86),y:clamp(y,58,70)}}};}
export const setLight=(s,v,depth=s.lightDepth)=>Number.isFinite(v)&&Number.isFinite(depth)?{...s,light:clamp(v,0,1),lightDepth:clamp(depth,0,1)}:s;
export function toggleCabinet(s,i){return Number.isInteger(i)&&i>=0&&i<4?{...s,cabinet:s.cabinet.map((open,n)=>n===i?!open:open)}:s;}
// A bounded perspective approximation: the screen stays fixed, the candle moves in depth.
// The final shear is also used for the tool tips, so visual and puzzle contact agree.
export function projection(s,n){const p=s.puppets[n],base=1.2+(64-p.y)*.025,depth=.8+s.lightDepth*.4,plane=(base-1)/base,k=depth/(depth-plane),oldW=20+(64-p.y)*.16,w=oldW*k/base,h=w*3,lx=10+s.light*80;return {x:50+(p.x-50)*k-(lx-50)*(k-1),y:4+(p.y-64)*1.4+oldW*3-h,w,h,shear:(p.x-lx)*.09/depth};}
const point=(p,x,y)=>({x:p.x+(x-.5)*p.w+p.shear*(1-y),y:p.y+y*p.h});
export function contactPoints(s){return {key:point(projection(s,'shen'),502/512,374/1024),lock:point(projection(s,'lu'),111/512,475/1024),knot:point(projection(s,'lu'),143/512,424/1024),scissors:point(projection(s,'qing'),28/512,370/1024)};}
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*2/3);
export function contacts(s){const p=contactPoints(s);return {key:distance(p.key,p.lock),scissors:distance(p.scissors,p.knot),wrong:distance(p.key,p.scissors)};}
export const LOCK_REGISTER=Object.freeze({x:51,y:34});
export function shadowFit(s){const c=contacts(s),registerDistance=distance(contactPoints(s).lock,LOCK_REGISTER),key=c.key<3.4,scissors=c.scissors<3.4,registered=registerDistance<2.2;return {key,scissors,registered,registerDistance,ready:(s.unlocked||key)&&(s.ribbonCut||scissors)};}
export function resolveContacts(s){const fit=shadowFit(s);return {...s,unlocked:s.unlocked||fit.key,ribbonCut:s.ribbonCut||fit.scissors};}
export const tryBox=s=>s.unlocked&&s.ribbonCut?{...s,opened:true}:s;
export const takeLetter=s=>s.opened?{...s,letterTaken:true}:s;
export const touchMirror=s=>({...s,mirrorTouched:true,recognized:s.recognized||!!(mirrorClean(s)&&s.letterTaken&&s.mirrorRaised&&s.mirrorEvidence)});
export const liftReceipt=(s,raised=true)=>({...s,mirrorRaised:raised,mirrorEvidence:s.mirrorEvidence||!!(mirrorClean(s)&&raised&&s.letterTaken&&s.mirrorTouched)});
export const showReceipt=s=>({...s,receiptShown:true});
export const isRevealed=s=>!!s.recognized;
export const turn=(s,d)=>!s.closeup&&[-1,1].includes(d)?{...s,view:(s.view+d+4)%4}:s;
export const enterCloseup=(s,c)=>SCENES[s.view].closeup===c?{...s,closeup:c}:s;
export const leaveCloseup=s=>({...s,closeup:null});

export function takeCabinetItem(s,i){if(!Number.isInteger(i)||i<0||i>2||!s.cabinet[i]||s.cabinetTaken[i])return s;return {...s,cabinetTaken:s.cabinetTaken.map((taken,n)=>n===i?true:taken)};}
export function returnCabinetItem(s,i){if(!Number.isInteger(i)||i<0||i>2||!s.cabinetTaken[i]||cabinetInUse(s,i))return s;return {...s,cabinetTaken:s.cabinetTaken.map((taken,n)=>n===i?false:taken),cabinet:s.cabinet.map((open,n)=>n===i?true:open)};}

export const mirrorClean=s=>s.mirrorWipes.every(Boolean);
export const canCatchEye=s=>!!s.bowlPlaced;
export const cabinetInUse=(s,i)=>i===0?s.bowlPlaced:i===1?s.parcelWrapped:mirrorClean(s);
export const placeBowl=s=>s.cabinetTaken[0]&&!s.bowlPlaced?{...s,bowlPlaced:true}:s;
export const wipeMirror=(s,i)=>s.cabinetTaken[2]&&Number.isInteger(i)&&i>=0&&i<3&&!s.mirrorWipes[i]?{...s,mirrorWipes:s.mirrorWipes.map((v,n)=>n===i?true:v)}:s;
export const wrapParcel=(s,coated)=>s.cabinetTaken[1]&&coated&&!s.parcelWrapped?{...s,parcelWrapped:true}:s;
export const tieParcel=s=>s.parcelWrapped&&!s.parcelTied?{...s,parcelTied:true}:s;
