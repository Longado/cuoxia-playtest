import {isRevealed} from './game.mjs?v=direct-1';
export const createShen=()=>({departure:'none',invited:false});
export const askLu=(s,room)=>isRevealed(room)?{...s,invited:true}:s;
export const canOffer=(s,room)=>s.departure==='none'&&s.invited&&isRevealed(room);
export function shenStage(s,room,ritual){
 if(s.departure==='gone')return 'gone';
 if(s.departure==='carrying')return 'carrying';
 if(s.invited||ritual.coated||isRevealed(room))return 'waiting';
 if(room.unlocked||room.ribbonCut||room.opened)return 'watching';
 return 'counter';
}
export function shenLine(s,room,ritual){
 if(s.departure==='gone')return '糖已经送到陆九面前了。进去看看吧。';
 if(s.departure==='carrying')return '这一串，收下了。跟我来。';
 if(s.invited)return ritual.coated?'裹好了？我带你去见陆九。':'陆九在里面。帮我把这一串裹好，我带你去问他。';
 if(isRevealed(room))return '人走过了。名字还在，这里就得给你留位置。';
 if(ritual.coated)return '先别松手。凭条上写着谁？窗边的镜子，你仔细看过么？';
 if(room.letterTaken)return '凭条上的人，来日自取。你带着它，到镜前看看。';
 if(room.opened)return '小心里面。东西放久了，经不起摔。';
 if(room.unlocked&&room.ribbonCut)return '听见了。匣子还得你亲手开。';
 if(room.unlocked)return '钥匙还在我这儿。倒是影子先松了手。';
 if(room.ribbonCut)return '绸带断了。里头的东西，可别摔着。';
 return room.receiptShown?'就是这只匣。锁着呢？你看看屏风前的纸人。':'凭条给我看看。这份东西还等着送进里屋。';
}
export function beginDeparture(s,ritual,room){
 return room&&room.parcelTied&&canOffer(s,room)&&ritual.coated&&ritual.offered?{...s,departure:'carrying'}:s;
}
export const finishDeparture=s=>s.departure==='carrying'?{...s,departure:'gone'}:s;
export const banquetScene=s=>s.departure==='gone'?{speaker:'陆九',line:'吃完，我送你走。'}:null;
