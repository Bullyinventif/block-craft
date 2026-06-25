// gen-textures.js — génère assets/*.png (16×16 chacune) pour BlockCraft
// Lancer : node gen-textures.js
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const T = 32; // rendu interne 32×32, réduit en 16×16

const TILE_FILES = {
  0:'grass_top', 1:'grass_side', 2:'dirt', 3:'stone', 4:'cobblestone', 5:'sand',
  6:'wood_top', 7:'wood_side', 8:'leaves', 9:'planks', 10:'water', 11:'brick',
  12:'glass', 13:'bedrock', 14:'torch', 15:'coal_ore', 16:'craft_table_top',
  17:'craft_table_side', 18:'coal', 19:'stick', 20:'wood_pickaxe', 21:'wood_shovel',
  22:'wood_axe', 23:'stone_pickaxe', 24:'stone_shovel', 25:'stone_axe', 26:'raw_meat',
  27:'iron_ore', 28:'furnace_front', 29:'furnace_top', 30:'raw_iron', 31:'iron_ingot',
  32:'cooked_meat', 33:'iron_pickaxe', 34:'iron_shovel', 35:'iron_axe', 36:'snow',
  37:'gravel', 38:'cactus_side', 39:'cactus_top',
  40:'mossy_cobblestone', 41:'bookshelf_side', 42:'gold_ore', 43:'raw_gold', 44:'gold_ingot',
  45:'ladder', 46:'door_lower', 47:'door_upper', 48:'chest_top', 49:'chest_side'
};

function lerp(a,b,t){ return a+t*(b-a); }
function mix(c1,c2,t){ return [lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t),c1[3]]; }
function vn(x,y,seed){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const h=(a,b)=>{ let n=(Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(seed,2246822519))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; };
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(h(xi,yi),h(xi+1,yi),u),lerp(h(xi,yi+1),h(xi+1,yi+1),u),v);
}
function fn2(x,y,s){ return 0.6*vn(x,y,s)+0.3*vn(x*2+5,y*2+5,s+1)+0.1*vn(x*4,y*4,s+2); }
function h2(x,y,s){ let n=(Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,2246822519))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; }

const painters = {};
function paint(t,fn){ painters[t]=fn; }

// ── 0: herbe (dessus) ─────────────────────────────────────────
paint(0,(x,y)=>{
  const n=fn2(x/8,y/8,1), b=fn2(x/4,y/4,2)*0.35;
  const base = n>0.55 ? [114,190,52] : [88,162,38];
  if(h2(x,y,99)>0.88) return [base[0]-16,base[1]-22,base[2]-8];
  return mix(base,[92,172,44],b);
});

// ── 1: herbe (côté) ──────────────────────────────────────────
paint(1,(x,y)=>{
  const edge = 3+Math.round((vn(x/5,0,20)-0.5)*2);
  if(y<=edge){ const n=fn2(x/6,y/3,1); return mix([88,162,38],[114,190,52],n); }
  const n=fn2(x/7,y/7,3);
  return mix([120,82,48],[152,108,64],n);
});

// ── 2: terre ─────────────────────────────────────────────────
paint(2,(x,y)=>{
  const n=fn2(x/7,y/7,3);
  const base=mix([118,80,46],[152,108,64],n);
  if(h2(x,y,77)>0.91) return [base[0]+18,base[1]+12,base[2]+6];
  return base;
});

// ── 3: pierre ────────────────────────────────────────────────
paint(3,(x,y)=>{
  const n=fn2(x/7,y/7,4);
  const base=mix([130,132,138],[160,162,168],n);
  if(fn2(x/3.5,y/3.5,44)<0.13) return [base[0]-30,base[1]-30,base[2]-28];
  return base;
});

// ── 4: pavé ──────────────────────────────────────────────────
paint(4,(x,y)=>{
  const gx=x<17?0:1, gy=y<17?0:1;
  const lx=gx===0?x:x-17, ly=gy===0?y:y-17;
  if(lx<=0||lx>=16||ly<=0||ly>=16) return [62,64,70];
  const n=fn2((x+gx*29)/6,(y+gy*29)/6,5+gx*3+gy*5);
  const shade=mix([114,116,122],[140,142,148],n);
  const inner=lx<2||lx>13||ly<2||ly>13;
  return inner ? [shade[0]-10,shade[1]-10,shade[2]-10] : shade;
});

// ── 5: sable ──────────────────────────────────────────────────
paint(5,(x,y)=>{
  const n=fn2(x/8,y/8,6);
  const base=mix([220,204,152],[244,228,178],n);
  if(h2(x,y,55)>0.89) return [base[0]+8,base[1]+6,base[2]+2];
  return base;
});

// ── 6: bois (dessus) — anneaux ──────────────────────────────
paint(6,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy);
  const ring=Math.sin(d*0.78+fn2(x/14,y/14,7)*0.7)*0.5+0.5;
  const noise=fn2(x/5,y/5,7)*0.12;
  return mix([174,122,62],[126,84,42],ring*0.68+noise);
});

// ── 7: bois (côté) — grain vertical ─────────────────────────
paint(7,(x,y)=>{
  const grain=Math.sin(x*1.0+fn2(x/9,y/9,8)*2.1)*0.5+0.5;
  const base=mix([156,110,58],[116,78,40],grain*0.62);
  const kx=14,ky=18;
  if(Math.sqrt((x-kx)*(x-kx)+(y-ky)*(y-ky))<3.5) return mix([96,64,32],[78,50,26],fn2(x/3,y/3,8));
  return base;
});

// ── 8: feuilles ──────────────────────────────────────────────
paint(8,(x,y)=>{
  const n=fn2(x/4,y/4,9);
  if(n<0.20) return null;
  return mix([38,102,26],[70,140,44],fn2(x/3,y/3,9));
});

// ── 9: planches ──────────────────────────────────────────────
paint(9,(x,y)=>{
  const board=Math.floor(y/10);
  if(y%10<1) return [78,56,28];
  if(((x+board*15)%32)<1) return [108,78,44];
  const grain=fn2(x/12,y/4,10+board);
  return mix([180,140,82],[154,118,66],grain*0.6);
});

// ── 10: eau ───────────────────────────────────────────────────
paint(10,(x,y)=>{
  const wave=Math.sin((x+y)*0.44+fn2(x/7,y/7,11)*2.6)*0.5+0.5;
  const c=mix([34,96,186],[54,128,212],wave);
  return [c[0],c[1],c[2],0.76];
});

// ── 11: brique ───────────────────────────────────────────────
paint(11,(x,y)=>{
  const row=Math.floor(y/8), off=(row%2)*16;
  if(y%8<2||(x+off)%32<2) return [188,180,168];
  const n=fn2(x/5,y/5,12);
  return mix([178,58,44],[200,78,58],n);
});

// ── 12: verre ────────────────────────────────────────────────
paint(12,(x,y)=>{
  if(x<3||y<3||x>=T-3||y>=T-3) return [204,232,244,0.94];
  if((x<6||x>=T-6)&&(y<6||y>=T-6)) return [190,222,238,0.38];
  return [200,232,244,0.07];
});

// ── 13: bedrock ───────────────────────────────────────────────
paint(13,(x,y)=>{
  const n=fn2(x/5,y/5,13);
  const base=mix([34,34,40],[58,58,66],n);
  if(fn2(x/3,y/3,33)<0.14) return [18,18,22];
  return base;
});

// ── 14: torche ────────────────────────────────────────────────
paint(14,(x,y)=>{
  const cx=T/2;
  if(x>=cx-2&&x<=cx+1&&y>=T*0.46) return mix([140,94,50],[108,70,36],fn2(x/2,y/3,14));
  const fdx=x-cx,fdy=y-T*0.30,fd=Math.sqrt(fdx*fdx+fdy*fdy);
  if(fd<9) return mix([255,216,60],[255,242,150],Math.max(0,1-fd/9));
  return null;
});

// ── 15: minerai de charbon ────────────────────────────────────
paint(15,(x,y)=>{
  const n=fn2(x/7,y/7,4);
  const stone=mix([130,132,138],[160,162,168],n);
  if(fn2(x/3.5,y/3.5,44)<0.13) return [stone[0]-30,stone[1]-30,stone[2]-28];
  if(fn2(x/4+3,y/4,30)<0.24) return mix([18,18,22],[42,42,48],fn2(x/2,y/2,30));
  return stone;
});

// ── 16: établi (dessus) ───────────────────────────────────────
paint(16,(x,y)=>{
  const grain=fn2(x/10,y/4,40);
  const base=mix([188,150,86],[160,124,68],grain*0.6);
  if(x%10<1||y%10<1) return [88,60,34];
  return base;
});

// ── 17: établi (côté) ────────────────────────────────────────
paint(17,(x,y)=>{
  const grain=fn2(x/10,y/4,41);
  const base=mix([164,128,72],[140,108,58],grain*0.55);
  if(y>=T*0.44&&y<T*0.5) return [66,46,26];
  if(y%12<1) return [108,80,46];
  return base;
});

// ── 18: charbon (item) ───────────────────────────────────────
paint(18,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.38);
  if(d>1) return null;
  if(d>0.84) return [14,14,18];
  return mix([20,20,26],[50,50,58],fn2(x/4,y/4,42)*(1-d*0.5));
});

// ── 19: bâton (item) ─────────────────────────────────────────
paint(19,(x,y)=>{
  if(x<T/2-3||x>T/2+3||y<4||y>T-4) return null;
  return mix([160,114,58],[128,86,42],fn2(x/2,y/4,43));
});

// ── Outils ───────────────────────────────────────────────────
function hnd(x,y){ return (x>=T/2-2&&x<=T/2+1&&y>=T*0.42)?mix([148,100,50],[118,76,38],fn2(x/2,y/3,80)):null; }
const mkPick=(hc)=>(x,y)=>{ const h=hnd(x,y); if(h) return h; if(y>=5&&y<=10&&x>=4&&x<=28) return hc; if(y>=10&&y<=14&&(x<=8||x>=24)&&x>=4&&x<=28) return hc; return null; };
const mkShovel=(hc)=>(x,y)=>{ const h=hnd(x,y); if(h) return h; if(x>=11&&x<=20&&y>=3&&y<=12) return hc; return null; };
const mkAxe=(hc)=>(x,y)=>{ const h=hnd(x,y); if(h) return h; if(x>=14&&x<=28&&y>=3&&y<=14&&((x-14)+(14-y)<15)) return hc; return null; };
const WHEAD=[202,164,100],SHEAD=[132,134,142],IHEAD=[220,226,234],GHEAD=[232,194,64];
paint(20,mkPick(WHEAD)); paint(21,mkShovel(WHEAD)); paint(22,mkAxe(WHEAD));
paint(23,mkPick(SHEAD)); paint(24,mkShovel(SHEAD)); paint(25,mkAxe(SHEAD));
paint(33,mkPick(IHEAD)); paint(34,mkShovel(IHEAD)); paint(35,mkAxe(IHEAD));

// ── 26: viande crue ──────────────────────────────────────────
paint(26,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.40);
  if(d>1) return null;
  if(d>0.84) return [158,42,42];
  const n=fn2(x/3,y/3,50);
  if(n>0.72) return [240,200,200];
  return mix([198,56,52],[168,36,36],n*(1-d*0.4));
});

// ── 27: minerai de fer ───────────────────────────────────────
paint(27,(x,y)=>{
  const n=fn2(x/7,y/7,4);
  const stone=mix([130,132,138],[160,162,168],n);
  if(fn2(x/3.5,y/3.5,44)<0.13) return [stone[0]-30,stone[1]-30,stone[2]-28];
  if(fn2(x/4+9,y/4,31)>0.62) return mix([212,162,118],[234,186,146],fn2(x/3,y/3,70));
  return stone;
});

// ── 28: four (face) ──────────────────────────────────────────
paint(28,(x,y)=>{
  const n=fn2(x/6,y/6,32);
  const base=mix([78,78,86],[104,104,112],n);
  if(x%10<1||y%10<1) return [48,50,56];
  const cx=T/2,ox=x-cx,oy=y-T*0.64;
  const aW=10,aH=9;
  const inArch=Math.abs(ox)<aW&&oy>-aH&&(oy>=0||ox*ox/(aW*aW)+oy*oy/(aH*aH)<1);
  if(inArch){
    const heat=(y-T*0.55)/(T*0.4);
    if(heat<0.15) return [28,18,14];
    return mix([200,78,18],[255,210,40],Math.min(1,heat));
  }
  return base;
});

// ── 29: four (dessus) ────────────────────────────────────────
paint(29,(x,y)=>{
  const n=fn2(x/6,y/6,32);
  const base=mix([78,78,86],[104,104,112],n);
  if(x%10<1||y%10<1) return [48,50,56];
  return base;
});

// ── 30: fer brut ──────────────────────────────────────────────
paint(30,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.40);
  if(d>1) return null;
  if(d>0.84) return [108,86,74];
  const n=fn2(x/3,y/3,33);
  return n>0.58 ? mix([212,170,128],[234,192,152],n) : mix([142,120,102],[172,148,124],n);
});

// ── 31: lingot de fer ────────────────────────────────────────
paint(31,(x,y)=>{
  if(x<5||x>T-5||y<9||y>T-9) return null;
  const shine=x>=T/2-2&&x<=T/2+2&&y>=13&&y<=20;
  if(shine) return [244,248,254];
  return mix([198,202,210],[222,226,234],fn2(x/5,y/5,34));
});

// ── 32: viande cuite ─────────────────────────────────────────
paint(32,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.40);
  if(d>1) return null;
  if(d>0.84) return [86,48,26];
  const n=fn2(x/3,y/3,35);
  if(fn2(x/2,y/6,40)>0.68) return [58,32,14];
  return mix([152,92,48],[122,66,30],n*(1-d*0.4));
});

// ── 36: neige ─────────────────────────────────────────────────
paint(36,(x,y)=>{
  const n=fn2(x/6,y/6,60);
  if(h2(x,y,66)>0.95) return [255,255,255];
  return mix([224,234,248],[252,255,255],n);
});

// ── 37: gravier (NOUVEAU) ────────────────────────────────────
paint(37,(x,y)=>{
  const gx=Math.floor(x/8),gy=Math.floor(y/8);
  const lx=x%8,ly=y%8;
  const px=2.5+h2(gx,gy,102)*2, py=2.5+h2(gx,gy,103)*2;
  const pr=2.2+h2(gx,gy,104)*1.4;
  const d=Math.sqrt((lx-px)*(lx-px)+(ly-py)*(ly-py));
  if(d<pr-0.3){
    const col=mix([108,110,118],[136,138,146],h2(gx,gy,101));
    return mix(col,[144,146,154],fn2(x/4,y/4,37));
  }
  return [70,72,78];
});

// ── 38: cactus (côté) ────────────────────────────────────────
paint(38,(x,y)=>{
  const n=fn2(x/6,y/4,61);
  const base=mix([66,128,54],[90,158,68],n);
  if(x<3||x>=T-3) return [50,104,40];
  if(x%10<2&&y%8<2) return [208,194,144];
  return base;
});

// ── 39: cactus (dessus) ───────────────────────────────────────
paint(39,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.45);
  if(d>1) return [50,104,40];
  return mix([66,128,54],[96,164,78],fn2(x/5,y/5,62)*(1-d*0.3));
});

// ── 40: pavé moussu (NOUVEAU) ────────────────────────────────
paint(40,(x,y)=>{
  const gx=x<17?0:1,gy=y<17?0:1;
  const lx=gx===0?x:x-17,ly=gy===0?y:y-17;
  if(lx<=0||lx>=16||ly<=0||ly>=16) return [58,72,52];
  const n=fn2(x/6,y/6,5+gx*3+gy*5);
  const stone=mix([114,116,122],[140,142,148],n);
  const moss=fn2(x/4+11,y/4+11,90);
  if(moss>0.60) return mix([50,88,40],[72,114,56],moss);
  return stone;
});

// ── 41: bibliothèque (côté) (NOUVEAU) ────────────────────────
paint(41,(x,y)=>{
  if(y<3||y>=T-3||(y>=T/2-2&&y<T/2+2)) return [78,54,28];
  if(x%bookW(x)<1) return [52,36,18];
  const bi=Math.floor(x/4)%8;
  const cols=[[176,38,38],[38,38,176],[38,118,38],[176,138,38],[118,58,138],[38,138,158],[176,78,38],[88,88,88]];
  const bc=cols[bi];
  return mix(bc,[bc[0]+28,bc[1]+28,bc[2]+28],fn2(x/3,y/3,41+bi)*0.28);
});
function bookW(x){ return 4; } // each book 4px wide

// ── 42: minerai d'or (NOUVEAU) ───────────────────────────────
paint(42,(x,y)=>{
  const n=fn2(x/7,y/7,4);
  const stone=mix([130,132,138],[160,162,168],n);
  if(fn2(x/3.5,y/3.5,44)<0.13) return [stone[0]-30,stone[1]-30,stone[2]-28];
  if(fn2(x/4+17,y/4+7,52)>0.60) return mix([226,190,30],[250,220,62],fn2(x/3,y/3,71));
  return stone;
});

// ── 43: or brut (item, NOUVEAU) ──────────────────────────────
paint(43,(x,y)=>{
  const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.38);
  if(d>1) return null;
  if(d>0.84) return [158,128,18];
  return mix([232,192,38],[250,220,78],fn2(x/3,y/3,53)*(1-d*0.5));
});

// ── 44: lingot d'or (item, NOUVEAU) ─────────────────────────
paint(44,(x,y)=>{
  if(x<5||x>T-5||y<9||y>T-9) return null;
  const shine=x>=T/2-2&&x<=T/2+2&&y>=13&&y<=20;
  if(shine) return [255,248,172];
  return mix([224,184,34],[246,210,66],fn2(x/5,y/5,54));
});

// ── 45: échelle (transparent entre les barreaux) ─────────────
paint(45,(x,y)=>{
  const rail=(x>=4&&x<=7)||(x>=T-8&&x<=T-5);
  const rung=(y%9<3)&&x>7&&x<T-8;
  if(rail||rung) return mix([150,104,52],[120,80,40],fn2(x/3,y/3,45));
  return null;
});

// ── 46: porte (bas) ──────────────────────────────────────────
paint(46,(x,y)=>{
  if(x<2||x>=T-2) return [66,44,22];                 // cadre
  const panel=mix([170,126,72],[142,102,56],fn2(x/9,y/7,46));
  if(Math.abs(x-T/2)<1) return [98,68,36];           // séparation des deux battants
  if(y<3||y>=T-3) return [98,68,36];                  // bords haut/bas
  if(Math.abs(x-(T-8))<2&&Math.abs(y-T/2)<3) return [46,46,52];  // poignée
  return panel;
});

// ── 47: porte (haut, avec fenêtre) ──────────────────────────
paint(47,(x,y)=>{
  if(x<2||x>=T-2) return [66,44,22];
  const panel=mix([170,126,72],[142,102,56],fn2(x/9,y/7,47));
  if(Math.abs(x-T/2)<1) return [98,68,36];
  if(y<3||y>=T-3) return [98,68,36];
  if(x>=6&&x<=T-7&&y>=7&&y<=16){                       // fenêtre vitrée
    if((x-6)%5<1||(y-7)%5<1) return [98,68,36];        // croisillons
    return mix([150,196,220],[186,222,238],fn2(x/4,y/4,71));
  }
  return panel;
});

// ── 48: coffre (dessus) ──────────────────────────────────────
paint(48,(x,y)=>{
  if(x<2||y<2||x>=T-2||y>=T-2) return [86,58,30];               // bord
  const wood=mix([162,116,62],[136,96,50],fn2(x/9,y/5,48));
  if(y<6) return mix([122,86,46],[102,70,38],fn2(x/4,y/3,48));   // bande avant (charnière)
  if(Math.abs(x-T/2)<3&&y<5) return [64,64,70];                  // ferrure de la charnière
  return wood;
});

// ── 49: coffre (côté/avant) ─────────────────────────────────
paint(49,(x,y)=>{
  if(x<2||x>=T-2) return [72,48,24];                             // bords verticaux
  if(y<3||y>=T-3) return [98,68,36];                             // bandes haut/bas
  const wood=mix([162,116,62],[136,96,50],fn2(x/8,y/6,49));
  if(Math.abs(x-T/2)<4&&y>=T*0.42&&y<=T*0.62) return mix([78,78,86],[126,126,134],fn2(x/3,y/3,72)); // ferrure
  if(Math.abs(x-T/2)<2&&Math.abs(y-T*0.58)<2) return [38,38,44]; // serrure
  return wood;
});

// ──────────────────────────────────────────────────────────────
// Rendu 32×32 → downscale 16×16 → PNG
// ──────────────────────────────────────────────────────────────
const cl=v=>Math.max(0,Math.min(255,v|0));
function render32(fn){
  const b=new Uint8Array(T*T*4);
  for(let y=0;y<T;y++) for(let x=0;x<T;x++){
    const c=fn(x,y),i=(y*T+x)*4;
    if(!c){ b[i+3]=0; continue; }
    b[i]=cl(c[0]); b[i+1]=cl(c[1]); b[i+2]=cl(c[2]); b[i+3]=(c[3]==null?255:Math.round(c[3]*255));
  }
  return b;
}
function downscale(src){
  const out=Buffer.alloc(16*16*4);
  for(let oy=0;oy<16;oy++) for(let ox=0;ox<16;ox++){
    let r=0,g=0,b=0,a=0;
    for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++){ const i=((oy*2+dy)*32+(ox*2+dx))*4,sa=src[i+3]/255; r+=src[i]*sa; g+=src[i+1]*sa; b+=src[i+2]*sa; a+=src[i+3]; }
    const oa=a/4,oi=(oy*16+ox)*4;
    if(oa>0.5){ const k=4*(oa/255); out[oi]=cl(r/k); out[oi+1]=cl(g/k); out[oi+2]=cl(b/k); out[oi+3]=Math.round(oa); }
    else{ out[oi]=out[oi+1]=out[oi+2]=out[oi+3]=0; }
  }
  return out;
}
const crcTable=(()=>{ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=crcTable[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function pchunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type),data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len,td,crc]); }
function encodePNG(rgba,w,h){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6;
  const raw=Buffer.alloc(h*(w*4+1));
  for(let y=0;y<h;y++){ raw[y*(w*4+1)]=0; rgba.copy(raw,y*(w*4+1)+1,y*w*4,y*w*4+w*4); }
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig,pchunk('IHDR',ihdr),pchunk('IDAT',idat),pchunk('IEND',Buffer.alloc(0))]);
}

const dir=path.join(__dirname,'assets');
fs.mkdirSync(dir,{recursive:true});
let n=0;
for(const t in TILE_FILES){
  if(!painters[t]){ console.warn('  no painter for tile '+t); continue; }
  const png=encodePNG(downscale(render32(painters[t])),16,16);
  fs.writeFileSync(path.join(dir,TILE_FILES[t]+'.png'),png); n++;
}
console.log(n+' textures 16×16 générées dans assets/');
