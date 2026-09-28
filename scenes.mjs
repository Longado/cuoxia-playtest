export const SCENES=[
 {id:'a',name:'屏风与茶桌',closeup:'table',target:'近看茶桌',caption:'纸人面朝屏风，像在等人入席。',hotspot:[17,48,66,40]},
 {id:'b',name:'匣柜',closeup:'box',target:'近看木匣',caption:'柜上有只木匣，红绳一直垂到柜沿。',hotspot:[34,36,32,26]},
 {id:'c',name:'房门与账桌',closeup:'ledger',target:'近看账页',caption:'门闩未动。账桌上摊着一页旧账。',hotspot:[57,46,35,15]},
 {id:'d',name:'窗与镜台',closeup:'mirror',target:'近看镜子',caption:'窗纸映着雨，镜面却没有映出你。',hotspot:[52,10,24,48]}
];
export const CLOSEUPS=SCENES.map(s=>s.closeup);
