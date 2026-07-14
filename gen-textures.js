// gen-textures.js — génère assets/*.png (32×32) pour BlockCraft (v30, textures HD)
// Rendu interne 64×64 puis réduit en 32×32 (anti-crénelage). Lancer : node gen-textures.js
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const T = 64, OUT = 32;   // T = rendu interne, OUT = taille finale

const TILE_FILES = {
  0:'grass_top', 1:'grass_side', 2:'dirt', 3:'stone', 4:'cobblestone', 5:'sand',
  6:'wood_top', 7:'wood_side', 8:'leaves', 9:'planks', 10:'water', 11:'brick',
  12:'glass', 13:'bedrock', 14:'torch', 15:'coal_ore', 16:'craft_table_top',
  17:'craft_table_side', 18:'coal', 19:'stick', 20:'wood_pickaxe', 21:'wood_shovel',
  22:'wood_axe', 23:'stone_pickaxe', 24:'stone_shovel', 25:'stone_axe', 26:'raw_meat',
  27:'iron_ore', 28:'furnace_front', 29:'furnace_top', 30:'raw_iron', 31:'iron_ingot',
  32:'cooked_meat', 33:'iron_pickaxe', 34:'iron_shovel', 35:'iron_axe', 36:'snow',
  37:'gravel', 38:'cactus_side', 39:'cactus_top', 40:'mossy_cobblestone', 41:'bookshelf_side',
  42:'gold_ore', 43:'raw_gold', 44:'gold_ingot', 45:'ladder', 46:'door_lower', 47:'door_upper',
  48:'chest_top', 49:'chest_side', 50:'andesite', 51:'granite', 52:'diorite', 53:'stone_bricks',
  54:'obsidian', 55:'diamond_ore', 56:'emerald_ore', 57:'redstone_ore', 58:'lapis_ore',
  59:'sandstone', 60:'red_sand', 61:'red_sandstone', 62:'terracotta', 63:'ice', 64:'packed_ice',
  65:'podzol_top', 66:'coarse_dirt', 67:'birch_log_top', 68:'birch_log_side', 69:'birch_planks', 70:'birch_leaves',
  71:'spruce_log_top', 72:'spruce_log_side', 73:'spruce_planks', 74:'spruce_leaves',
  75:'jungle_log_top', 76:'jungle_log_side', 77:'jungle_planks', 78:'jungle_leaves',
  79:'acacia_log_top', 80:'acacia_log_side', 81:'acacia_planks', 82:'acacia_leaves',
  83:'tall_grass', 84:'flower_red', 85:'flower_yellow', 86:'dead_bush', 87:'glowstone',
  88:'diamond', 89:'emerald', 90:'redstone', 91:'lapis', 92:'diamond_pickaxe', 93:'diamond_shovel', 94:'diamond_axe'
};

// ─── helpers ───────────────────────────────────────────────
const lerp = (a,b,t)=>a+t*(b-a);
const mix  = (c1,c2,t)=>[lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t),c1[3]];
const mul  = (c,f)=>[c[0]*f,c[1]*f,c[2]*f,c[3]];
function vn(x,y,seed){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const h=(a,b)=>{ let n=(Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(seed,2246822519))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; };
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(h(xi,yi),h(xi+1,yi),u),lerp(h(xi,yi+1),h(xi+1,yi+1),u),v); }
function fbm(x,y,s){ return 0.55*vn(x,y,s)+0.27*vn(x*2.1+5,y*2.1+5,s+1)+0.13*vn(x*4.3,y*4.3,s+2)+0.05*vn(x*8.4,y*8.4,s+3); }
function H(x,y,s){ let n=(Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,2246822519))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; }
const TS = y => 1.07 - 0.14*(y/T);   // léger éclairage du haut (donne du volume)
const painters = {};
const paint = (t,fn)=>{ painters[t]=fn; };

// ─── terrain ───────────────────────────────────────────────
function stoneBase(x,y){ const n=fbm(x/13,y/13,4); let c=mix([120,123,131],[152,155,163],n);
  if(fbm(x/6,y/6,40)<0.20) c=mul(c,0.80); if(H(x,y,41)>0.93) c=mul(c,1.10); return mul(c,TS(y)); }

paint(0,(x,y)=>{ const n=fbm(x/12,y/12,1); let c=mix([86,150,46],[126,196,74],n);
  if(fbm(x/4.5,y/4.5,7)>0.60) c=mix(c,[154,214,98],0.55);
  if(H(x,y,3)>0.94) c=mul(c,0.80); return mul(c,TS(y)); });                                   // herbe (dessus)
paint(1,(x,y)=>{ const edge=Math.round(T*0.26+(vn(x/7,0,9)-0.5)*T*0.16);
  if(y<edge){ const n=fbm(x/9,y/7,1); return mul(mix([84,148,44],[126,196,74],n),TS(y)); }
  if(y<edge+T*0.16 && H((x/3)|0,0,4)>0.62){ return mul(mix([80,140,40],[112,178,66],fbm(x/4,y/4,1)),0.95); }
  const n=fbm(x/10,y/10,3); let c=mix([116,84,52],[150,112,72],n); if(H(x,y,5)>0.92) c=mul(c,0.84); return mul(c,TS(y)); }); // herbe (côté)
paint(2,(x,y)=>{ const n=fbm(x/10,y/10,3); let c=mix([116,82,50],[152,112,72],n);
  if(fbm(x/4,y/4,33)>0.74) c=mix(c,[96,66,40],0.5); if(H(x,y,34)>0.92) c=mul(c,1.10); return mul(c,TS(y)); }); // terre
paint(3,stoneBase);
paint(4,(x,y)=>{ const g=T/2,gx=(x/g)|0,gy=(y/g)|0,lx=x-gx*g,ly=y-gy*g,o=(H(gx,gy,12)-0.5)*0.18*g;
  const cx=g/2+o,cy=g/2-o,dx=lx-cx,dy=ly-cy,d=Math.sqrt(dx*dx+dy*dy)/(g*0.52);
  if(d>1) return [66,67,72];                                    // mortier
  const base=mix([112,114,121],[150,152,160],fbm((x+gx*9)/7,(y+gy*9)/7,13));
  return mul(base, Math.max(0.62,1.04-d*0.34-ly/g*0.12)); });   // pavé bombé
paint(5,(x,y)=>{ const n=fbm(x/11,y/10,6); let c=mix([224,208,152],[244,230,184],n);
  const r=Math.sin(x*0.55+y*0.3+fbm(x/7,y/7,61)*3)*0.5+0.5; c=mul(c,0.94+0.07*r);
  if(H(x,y,62)>0.9) c=mul(c,1.05); return mul(c,TS(y)); });     // sable
paint(6,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy);
  const ring=Math.sin(d*0.42+fbm(x/16,y/16,7)*0.7)*0.5+0.5; let c=mix([176,128,70],[126,88,46],ring*0.7+fbm(x/7,y/7,7)*0.12);
  if(d<3) c=mul(c,0.8); return mul(c,TS(y)); });                // bois (dessus)
paint(7,(x,y)=>{ const g=Math.sin(x*0.5+fbm(x/10,y/10,8)*2.2)*0.5+0.5; let c=mix([158,112,60],[116,80,42],g*0.6);
  const kx=T*0.45,ky=T*0.58,kd=Math.sqrt((x-kx)*(x-kx)+(y-ky)*(y-ky)); if(kd<5) c=mul(mix([98,66,34],[78,52,28],fbm(x/3,y/3,8)),1); return mul(c,TS(y)); }); // bois (côté)
paint(8,(x,y)=>leaf([54,118,40],[94,164,68],8)(x,y));          // feuilles chêne
paint(9,plank([178,140,86],[148,114,66],9));                   // planches chêne
paint(10,(x,y)=>{ const w=Math.sin((x+y)*0.30+fbm(x/9,y/9,11)*3)*0.5+0.5,w2=Math.sin((x*0.5-y*0.7)+fbm(x/6,y/6,12)*4)*0.5+0.5;
  let c=mix([38,104,196],[64,150,226],w*0.65+w2*0.35); if(w2>0.86) c=mix(c,[160,206,242],0.55); return [c[0],c[1],c[2],0.80]; }); // eau
paint(11,(x,y)=>{ const bh=T*0.25,row=(y/bh)|0,off=(row%2)*T*0.5; const ly=y%bh,lx=(x+off)%(T*0.5);
  if(ly<T*0.06||lx<T*0.06) return [196,188,176];               // mortier clair
  let c=mix([176,62,48],[202,86,64],fbm(x/6,y/6,12+row)); return mul(c,TS(y)); }); // brique
paint(12,(x,y)=>{ const b=T*0.10; if(x<b||y<b||x>=T-b||y>=T-b) return [210,234,244,0.92];
  if(Math.abs(x-y)<2||Math.abs(x-(T-y))<3) return [228,244,250,0.42]; return [206,232,244,0.07]; }); // verre
paint(13,(x,y)=>{ const n=fbm(x/6,y/6,13); let c=mix([34,34,40],[60,60,68],n); if(fbm(x/3,y/3,33)<0.16) c=[18,18,22,c[3]]; return c; }); // bedrock
paint(14,(x,y)=>{ const cx=T/2; if(x>=cx-2&&x<=cx+1&&y>=T*0.46) return mul(mix([142,96,50],[110,72,38],fbm(x/3,y/4,14)),1);
  const fd=Math.sqrt((x-cx)*(x-cx)+(y-T*0.30)*(y-T*0.30)); if(fd<10) return mix([255,236,90],[255,250,180],Math.max(0,1-fd/10)); if(fd<13) return [255,180,40,0.6]; return null; }); // torche
paint(15,ore(20,[26,26,30],[58,58,66],0.24));                  // charbon
paint(16,(x,y)=>{ const g=T*0.5; let c=mix([186,150,90],[156,124,70],fbm(x/9,y/5,40)); if(x%g<2||y%g<2) c=mul(c,0.6); if(H(x,y,41)>0.9) c=mul(c,1.1); return mul(c,TS(y)); }); // établi (dessus)
paint(17,(x,y)=>{ let c=plank([168,132,76],[140,108,60],41)(x,y); if(y>T*0.42&&y<T*0.5) c=mul([110,80,46,1],1); // bande outils
  if(y>T*0.55){ if(Math.abs(x-T*0.3)<3&&y<T*0.8) c=[150,150,156,1]; if(Math.abs(x-T*0.62)<2&&y<T*0.85) c=[120,84,46,1]; } return c; }); // établi (côté)
paint(18,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=(Math.abs(dx)*1.1+Math.abs(dy))/(T*0.42); if(d>1) return null; let c=mix([24,24,30],[58,58,66],fbm(x/4,y/4,42)); if(d>0.8) c=mul(c,0.6); return c; }); // charbon (item)
paint(19,(x,y)=>{ if(x<T/2-3||x>T/2+3||y<6||y>T-6) return null; return mul(mix([162,116,60],[128,86,44],fbm(x/3,y/5,43)),TS(y)); }); // bâton

// outils
function hnd(x,y){ return (x>=T/2-3&&x<=T/2+2&&y>=T*0.42)?mul(mix([150,102,52],[118,78,40],fbm(x/2,y/4,80)),TS(y)):null; }
const head=(hc,x,y)=>mul(hc,1.0 - ((x+y)/(2*T))*0.25 + 0.12);   // métal : reflet haut-gauche
const mkPick =hc=>(x,y)=>{ const h=hnd(x,y); if(h) return h; if(y>=10&&y<=20&&x>=8&&x<=56) return head(hc,x,y); if(y>=20&&y<=28&&(x<=16||x>=48)&&x>=8&&x<=56) return head(hc,x,y); return null; };
const mkShovel=hc=>(x,y)=>{ const h=hnd(x,y); if(h) return h; if(x>=22&&x<=40&&y>=6&&y<=24) return head(hc,x,y); return null; };
const mkAxe   =hc=>(x,y)=>{ const h=hnd(x,y); if(h) return h; if(x>=28&&x<=56&&y>=6&&y<=28&&((x-28)+(28-y)<30)) return head(hc,x,y); return null; };
const WH=[202,164,100],SH=[136,138,146],IH=[222,228,236],DH=[120,232,236];
paint(20,mkPick(WH)); paint(21,mkShovel(WH)); paint(22,mkAxe(WH));
paint(23,mkPick(SH)); paint(24,mkShovel(SH)); paint(25,mkAxe(SH));
paint(33,mkPick(IH)); paint(34,mkShovel(IH)); paint(35,mkAxe(IH));
paint(92,mkPick(DH)); paint(93,mkShovel(DH)); paint(94,mkAxe(DH));

paint(26,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.42); if(d>1) return null; let c=mix([200,58,54],[166,38,38],fbm(x/4,y/4,50)); if(fbm(x/2.5,y/2.5,51)>0.74) c=[238,200,200,1]; if(d>0.82) c=mul(c,0.7); return c; }); // viande crue
paint(27,ore(31,[206,160,116],[234,192,150],0.62));            // fer
paint(28,(x,y)=>{ let c=stoneBase(x,y); const g=T*0.5; if(x%g<2||y%g<2) c=mul(c,0.62); const ox=x-T/2,oy=y-T*0.66,aW=T*0.30,aH=T*0.30;
  if(Math.abs(ox)<aW&&oy>-aH&&(oy>=0||ox*ox/(aW*aW)+oy*oy/(aH*aH)<1)){ const heat=(y-T*0.55)/(T*0.42); return heat<0.18?[26,18,14,1]:mix([210,80,18],[255,214,60],Math.min(1,heat)); } return c; }); // four (face)
paint(29,(x,y)=>{ let c=stoneBase(x,y); const g=T*0.5; if(x%g<2||y%g<2) c=mul(c,0.62); return c; }); // four (dessus)
paint(30,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.4); if(d>1) return null; const n=fbm(x/4,y/4,33); return n>0.55?mix([210,170,128],[236,198,156],n):mul(mix([120,118,120],[150,148,150],n),TS(y)); }); // fer brut
paint(31,(x,y)=>{ if(x<T*0.18||x>T*0.82||y<T*0.32||y>T*0.66) return null; let c=mix([208,210,218],[238,240,246],fbm(x/5,y/5,34)); if(y<T*0.42) c=mul(c,1.08); return c; }); // lingot fer
paint(32,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.42); if(d>1) return null; let c=mix([150,92,50],[120,68,38],fbm(x/4,y/4,35)); if(fbm(x/2,y/6,40)>0.7) c=[64,36,16,1]; if(d>0.82) c=mul(c,0.7); return c; }); // viande cuite
paint(36,(x,y)=>{ const n=fbm(x/9,y/9,60); let c=mix([226,234,246],[252,254,255],n); if(H(x,y,66)>0.95) c=[255,255,255,1]; else if(fbm(x/5,y/5,67)<0.2) c=mix(c,[210,222,240],0.5); return mul(c,TS(y)*0.99); }); // neige
paint(37,(x,y)=>{ const g=T/4,gx=(x/g)|0,gy=(y/g)|0,lx=x%g,ly=y%g,px=g/2+(H(gx,gy,102)-0.5)*g*0.4,py=g/2+(H(gx,gy,103)-0.5)*g*0.4,pr=g*(0.4+H(gx,gy,104)*0.18);
  if(Math.sqrt((lx-px)*(lx-px)+(ly-py)*(ly-py))<pr) return mul(mix([108,108,116],[146,148,156],H(gx,gy,101)),TS(y)); return [66,66,72]; }); // gravier
paint(38,(x,y)=>{ const n=fbm(x/7,y/5,61); let c=mix([62,124,52],[92,162,72],n); if(x<3||x>=T-3) c=mul(c,0.78); if((x%(T*0.62)|0)<2&&y%9<2) c=[210,200,150,1]; return mul(c,TS(y)); }); // cactus côté
paint(39,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.46); if(d>1) return [48,100,40]; return mul(mix([66,128,54],[100,168,80],fbm(x/5,y/5,62)*(1-d*0.3)),TS(y)); }); // cactus dessus
paint(40,(x,y)=>{ let c=painters[4](x,y); const m=fbm(x/5+11,y/5+11,90); if(m>0.58&&c[0]>80) c=mix(c,[64,108,52],Math.min(1,(m-0.58)*3)); return c; }); // pavé moussu
paint(41,(x,y)=>{ if(y<T*0.1||y>=T*0.9||(y>=T*0.46&&y<T*0.54)) return mul([88,60,30,1],TS(y)); const bw=T*0.125,bi=((x/bw)|0)%8; if(x%bw<2) return [56,38,18,1];
  const cols=[[182,46,46],[46,72,182],[46,140,60],[196,156,46],[130,64,150],[46,150,168],[196,96,46],[120,120,128]]; return mul(mix(cols[bi],[cols[bi][0]+30,cols[bi][1]+30,cols[bi][2]+30],fbm(x/3,y/4,41+bi)*0.3),TS(y)); }); // bibliothèque
paint(42,ore(52,[226,190,40],[252,224,80],0.6));               // or
paint(43,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.4); if(d>1) return null; let c=mix([228,190,40],[252,224,84],fbm(x/4,y/4,53)); if(d>0.82) c=mul(c,0.7); else if(d<0.4) c=mul(c,1.08); return c; }); // or brut
paint(44,(x,y)=>{ if(x<T*0.18||x>T*0.82||y<T*0.32||y>T*0.66) return null; let c=mix([226,188,46],[250,220,92],fbm(x/5,y/5,54)); if(y<T*0.42) c=mul(c,1.08); return c; }); // lingot or
paint(45,(x,y)=>{ const rail=(x>=T*0.14&&x<=T*0.26)||(x>=T*0.74&&x<=T*0.86),rung=(y%(T*0.28)<T*0.10)&&x>T*0.22&&x<T*0.78; if(rail||rung) return mul(mix([152,106,54],[122,82,42],fbm(x/3,y/3,45)),TS(y)); return null; }); // échelle
paint(46,(x,y)=>{ if(x<T*0.06||x>=T*0.94) return [66,44,22]; let c=mix([176,132,76],[146,108,60],fbm(x/9,y/7,46)); if(Math.abs(x-T/2)<1) c=[96,66,34,1]; if(y<T*0.09||y>=T*0.91) c=[96,66,34,1]; if(Math.abs(x-T*0.78)<3&&Math.abs(y-T/2)<4) c=[44,44,50,1]; return mul(c,TS(y)); }); // porte bas
paint(47,(x,y)=>{ if(x<T*0.06||x>=T*0.94) return [66,44,22]; let c=mix([176,132,76],[146,108,60],fbm(x/9,y/7,47)); if(Math.abs(x-T/2)<1) c=[96,66,34,1]; if(y<T*0.09) c=[96,66,34,1];
  if(x>=T*0.2&&x<=T*0.8&&y>=T*0.22&&y<=T*0.52){ if((x-T*0.2)%(T*0.3)<2||(y-T*0.22)%(T*0.3)<2) return [96,66,34,1]; return mix([150,200,224],[190,226,242],fbm(x/4,y/4,71)); } return mul(c,TS(y)); }); // porte haut (fenêtre)
paint(48,(x,y)=>{ if(x<T*0.06||y<T*0.06||x>=T*0.94||y>=T*0.94) return [86,58,30]; let c=mix([166,120,64],[140,100,52],fbm(x/9,y/5,48)); if(y<T*0.2) c=mul(c,0.88); if(Math.abs(x-T/2)<4&&y<T*0.16) c=[66,66,72,1]; return mul(c,TS(y)); }); // coffre dessus
paint(49,(x,y)=>{ if(x<T*0.06||x>=T*0.94) return [72,48,24]; let c=mix([166,120,64],[140,100,52],fbm(x/8,y/6,49)); if(y<T*0.1||y>=T*0.9) c=[98,68,36,1];
  if(Math.abs(x-T/2)<5&&y>=T*0.42&&y<=T*0.64) c=mix([80,80,88],[128,128,136],fbm(x/3,y/3,72)); if(Math.abs(x-T/2)<3&&Math.abs(y-T*0.58)<3) c=[40,40,46,1]; return mul(c,TS(y)); }); // coffre côté

// roches
paint(50,(x,y)=>{ const n=fbm(x/9,y/9,50); let c=mix([134,136,140],[162,164,168],n); if(H(x,y,150)>0.85) c=mul(c,0.86); return mul(c,TS(y)); }); // andésite
paint(51,(x,y)=>{ const n=fbm(x/9,y/9,51); let c=mix([170,122,106],[196,150,134],n); if(H(x,y,151)>0.8) c=mul(c,0.84); else if(H(x,y,152)>0.9) c=[210,176,160,1]; return mul(c,TS(y)); }); // granite
paint(52,(x,y)=>{ const n=fbm(x/9,y/9,52); let c=mix([202,202,206],[232,232,236],n); if(H(x,y,153)>0.78) c=mul(c,0.86); return mul(c,TS(y)); }); // diorite
paint(53,(x,y)=>{ const bh=T*0.25,row=(y/bh)|0,off=(row%2)*T*0.5,ly=y%bh,lx=(x+off)%(T*0.5); if(ly<T*0.05||lx<T*0.05) return [92,94,98]; return mul(mix([140,142,148],[120,122,128],fbm(x/6,y/6,53)),TS(y)); }); // pierre taillée
paint(54,(x,y)=>{ const n=fbm(x/7,y/7,54); let c=mix([26,22,40],[48,42,68],n); if(H(x,y,154)>0.82) c=[72,62,104,1]; if(Math.abs(x-y)%17<2) c=mul(c,1.2); return c; }); // obsidienne
paint(55,ore(60,[96,228,232],[188,252,254],0.66));             // diamant
paint(56,ore(64,[40,190,90],[110,236,150],0.66));              // émeraude
paint(57,ore(58,[200,30,30],[244,80,66],0.6));                 // redstone
paint(58,ore(70,[40,70,200],[90,128,242],0.62));               // lapis
paint(59,(x,y)=>{ const b=y%(T*0.5); let c=mix([224,212,162],[240,230,188],fbm(x/10,y/6,59)); if(b<T*0.06) c=mul(c,0.82); if(y<3||y>=T-3) c=[206,192,140,1]; return mul(c,TS(y)); }); // grès
paint(60,(x,y)=>{ let c=mix([198,110,56],[226,140,80],fbm(x/10,y/9,60)); if(H(x,y,160)>0.9) c=mul(c,1.08); return mul(c,TS(y)); }); // sable rouge
paint(61,(x,y)=>{ const b=y%(T*0.5); let c=mix([184,100,50],[210,124,70],fbm(x/10,y/6,61)); if(b<T*0.06) c=mul(c,0.82); if(y<3||y>=T-3) c=[160,84,40,1]; return mul(c,TS(y)); }); // grès rouge
paint(62,(x,y)=>{ let c=mix([168,98,68],[194,124,90],fbm(x/8,y/8,62)); if(y%(T*0.28)<2) c=mul(c,0.8); return mul(c,TS(y)); }); // terre cuite
paint(63,(x,y)=>{ const n=fbm(x/8,y/8,63); let c=mix([150,196,232],[192,226,248],n); if(Math.abs(x-y*1.3)%23<2||Math.abs(x*0.7+y)%29<2) c=mul(c,1.12); return [c[0],c[1],c[2],0.86]; }); // glace
paint(64,(x,y)=>{ const n=fbm(x/8,y/8,64); return mul(mix([150,192,224],[184,216,242],n),TS(y)); }); // glace compacte
paint(65,(x,y)=>{ const n=fbm(x/9,y/9,65); let c=mix([96,68,36],[128,94,52],n); if(H(x,y,165)>0.78) c=mix(c,[74,110,46],0.6); return mul(c,TS(y)); }); // podzol
paint(66,(x,y)=>{ const n=fbm(x/8,y/8,66); let c=mix([116,80,46],[148,106,62],n); if(H(x,y,166)>0.7) c=mul(c,0.82); else if(H(x,y,167)>0.88) c=mul(c,1.12); return mul(c,TS(y)); }); // terre grossière

// bois (4 essences)
function logTop(bark,core,s){ return (x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy); if(d>T*0.46) return mul(bark,TS(y)); const ring=Math.sin(d*0.5+fbm(x/14,y/14,s)*0.6)*0.5+0.5; return mul(mix(core,[core[0]-30,core[1]-26,core[2]-18],ring*0.6),TS(y)); }; }
function logSide(bark,dark,s){ return (x,y)=>{ const g=Math.sin(x*0.5+fbm(x/9,y/9,s)*2)*0.5+0.5; return mul(mix(bark,dark,g*0.5),TS(y)); }; }
function plank(c1,c2,s){ return (x,y)=>{ const ph=T*0.25,board=(y/ph)|0; let c=mix(c1,c2,fbm(x/14,(y%ph)/5,s+board));
  c=mul(c,0.96+0.06*Math.sin(x*0.45+fbm(x/8,y/8,s)*4)); if(y%ph<1.5) c=mul(c,0.6); if(((x+board*23)%(T*0.5))<1.5) c=mul(c,0.8);
  if((y%ph<4||y%ph>ph-4)&&(x%(T*0.5)<4||x%(T*0.5)>T*0.5-4)) c=mul(c,1.12); return mul(c,TS(y)); }; }
function leaf(c1,c2,s){ return (x,y)=>{ const n=fbm(x/6,y/6,s); if(n<0.28) return null; let c=mix(c1,c2,fbm(x/3.5,y/3.5,s+1)); if(H(x,y,s+9)>0.82) c=mul(c,1.18); else if(H(x,y,s+19)>0.86) c=mul(c,0.76); return mul(c,TS(y)*1.02); }; }
paint(67,logTop([226,228,220],[234,232,218],67)); paint(68,(x,y)=>{ const g=Math.sin(x*0.5+fbm(x/9,y/9,68)*2)*0.5+0.5; let c=mix([228,230,220],[198,200,190],g*0.5); if(H((x/4)|0,(y/7)|0,168)>0.86) c=[64,64,58,1]; return mul(c,TS(y)); }); paint(69,plank([216,200,152],[196,178,128],69)); paint(70,leaf([116,168,68],[152,198,98],70)); // bouleau
paint(71,logTop([66,48,32],[100,74,46],71)); paint(72,logSide([84,58,34],[56,40,24],72)); paint(73,plank([112,84,52],[88,64,40],73)); paint(74,leaf([38,84,56],[64,114,78],74)); // sapin
paint(75,logTop([92,76,46],[124,100,60],75)); paint(76,logSide([108,86,50],[76,60,34],76)); paint(77,plank([154,112,76],[126,90,58],77)); paint(78,leaf([52,126,40],[86,166,60],78)); // jungle
paint(79,logTop([98,92,84],[132,84,50],79)); paint(80,logSide([100,94,88],[68,64,58],80)); paint(81,plank([190,112,60],[158,88,46],81)); paint(82,leaf([110,152,52],[146,186,80],82)); // acacia

// plantes (croix, fond transparent)
paint(83,(x,y)=>{ for(const cx of [T*0.25,T*0.5,T*0.75]){ const w=T*0.05+(H(cx|0,0,83)>0.5?T*0.02:0); if(Math.abs(x-cx)<=w&&y>T*0.2+H(cx|0,1,83)*T*0.2) return mul(mix([72,138,52],[114,184,82],fbm(x/3,y/3,83)),1-((T-y)/T)*0.2); } return null; }); // herbe haute
paint(84,(x,y)=>{ const cx=T/2; if(Math.abs(x-cx)<2&&y>T*0.48) return [58,118,44]; const dx=x-cx,dy=y-T*0.34,d=Math.sqrt(dx*dx+dy*dy); if(d<T*0.2) return d<T*0.06?[60,40,24]:mix([202,42,42],[240,86,74],fbm(x/3,y/3,84)); return null; }); // coquelicot
paint(85,(x,y)=>{ const cx=T/2; if(Math.abs(x-cx)<2&&y>T*0.48) return [58,118,44]; const dx=x-cx,dy=y-T*0.36,d=Math.sqrt(dx*dx+dy*dy); if(d<T*0.17) return mix([242,212,42],[255,238,98],fbm(x/3,y/3,85)); return null; }); // pissenlit
paint(86,(x,y)=>{ const cx=T/2; if(Math.abs(x-cx)<2&&y>T*0.3) return [120,84,44]; if(y>T*0.34&&y<T*0.5&&Math.abs(x-cx)<T*0.28&&((x+y)%5<2)) return [134,96,52]; if(y>T*0.46&&y<T*0.68&&Math.abs(x-cx)<T*0.22&&((x-y)%5<2)) return [118,82,42]; return null; }); // buisson mort
paint(87,(x,y)=>{ const g=T*0.25,lx=x%g,ly=y%g,n=fbm(x/6,y/6,87); let c=mix([176,146,68],[230,204,116],n); if(lx<2||ly<2) c=mul(c,0.78); if(Math.abs(lx-g/2)<g*0.25&&Math.abs(ly-g/2)<g*0.25) c=[255,240,168,1]; return c; }); // glowstone

// gemmes (items)
function gem(c1,c2,s){ return (x,y)=>{ const dx=Math.abs(x-T/2),dy=Math.abs(y-T/2),d=(dx+dy)/(T*0.46); if(d>1) return null; let c=mix(c1,c2,fbm(x/4,y/4,s)*(1-d*0.4)); if(x-T/2+ (y-T/2) < -T*0.12) c=mul(c,1.18); return c; }; }
paint(88,gem([100,228,232],[188,252,254],88));                 // diamant
paint(89,gem([40,190,90],[120,238,158],89));                   // émeraude
paint(90,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.42); if(d>1||H(x,y,90)>0.45) return null; return mix([180,20,20],[242,70,56],fbm(x/2,y/2,90)); }); // redstone (poudre)
paint(91,(x,y)=>{ const dx=x-T/2,dy=y-T/2,d=Math.sqrt(dx*dx+dy*dy)/(T*0.42); if(d>1) return null; const n=fbm(x/3,y/3,91); return n>0.5?mix([40,70,200],[90,132,244],n):[28,48,148,1]; }); // lapis

// minerai générique : pierre + pépites colorées
function ore(seed,c1,c2,thr){ return (x,y)=>{ let s=stoneBase(x,y); const o=fbm(x/4+seed,y/4+(seed%7),seed+200); if(o>thr){ let g=mix(c1,c2,fbm(x/3,y/3,seed+1)); const dx=(x%6)-3,dy=(y%6)-3; if(dx*dx+dy*dy>5) g=mul(g,0.7); return g; } return s; }; }

// ─── rendu T×T → réduction OUT×OUT → PNG ───────────────────
const cl=v=>Math.max(0,Math.min(255,v|0));
function render(fn){ const b=new Uint8Array(T*T*4);
  for(let y=0;y<T;y++) for(let x=0;x<T;x++){ const c=fn(x,y),i=(y*T+x)*4; if(!c){ b[i+3]=0; continue; }
    b[i]=cl(c[0]); b[i+1]=cl(c[1]); b[i+2]=cl(c[2]); b[i+3]=(c[3]==null?255:Math.round(c[3]*255)); } return b; }
function downscale(src){ const f=T/OUT,out=Buffer.alloc(OUT*OUT*4);
  for(let oy=0;oy<OUT;oy++) for(let ox=0;ox<OUT;ox++){ let r=0,g=0,b=0,a=0;
    for(let dy=0;dy<f;dy++) for(let dx=0;dx<f;dx++){ const i=((oy*f+dy)*T+(ox*f+dx))*4,sa=src[i+3]/255; r+=src[i]*sa; g+=src[i+1]*sa; b+=src[i+2]*sa; a+=src[i+3]; }
    const n=f*f,oa=a/n,oi=(oy*OUT+ox)*4;
    if(oa>0.5){ const k=n*(oa/255); out[oi]=cl(r/k); out[oi+1]=cl(g/k); out[oi+2]=cl(b/k); out[oi+3]=Math.round(oa); } else { out[oi]=out[oi+1]=out[oi+2]=out[oi+3]=0; } }
  return out; }
const crcTable=(()=>{ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=crcTable[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function pchunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length); const td=Buffer.concat([Buffer.from(type),data]); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len,td,crc]); }
function encodePNG(rgba,w,h){ const sig=Buffer.from([137,80,78,71,13,10,26,10]); const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6;
  const raw=Buffer.alloc(h*(w*4+1)); for(let y=0;y<h;y++){ raw[y*(w*4+1)]=0; rgba.copy(raw,y*(w*4+1)+1,y*w*4,y*w*4+w*4); }
  const idat=zlib.deflateSync(raw,{level:9}); return Buffer.concat([sig,pchunk('IHDR',ihdr),pchunk('IDAT',idat),pchunk('IEND',Buffer.alloc(0))]); }

const dir=path.join(__dirname,'assets'); fs.mkdirSync(dir,{recursive:true});
let n=0; for(const t in TILE_FILES){ if(!painters[t]){ console.warn('  (pas de painter pour tuile '+t+' = '+TILE_FILES[t]+')'); continue; }
  fs.writeFileSync(path.join(dir,TILE_FILES[t]+'.png'),encodePNG(downscale(render(painters[t])),OUT,OUT)); n++; }
console.log(n+' textures '+OUT+'×'+OUT+' générées dans assets/');
