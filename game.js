"use strict";
/* =====================================================================
   MiniCraft — moteur (chargé par game.html) — v10
   + vie/faim (dégâts de chute, régén, manger, mort/respawn)
   + fer & four (fonte avec combustible) + outils en fer
   + grottes (bruit 3D) + textures perso via atlas.png
   ===================================================================== */

// ---------- Monde + sauvegarde ----------
const params=new URLSearchParams(location.search);
const worldName=params.get('w')||'Monde';
const registry=JSON.parse(localStorage.getItem('minicraft_worlds')||'[]');
const entry=registry.find(w=>w.name===worldName);
const SEED=entry?entry.seed:1337;
const SAVE_KEY='minicraft_save_'+worldName;
const save=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
const worldEdits=save.edits||{};
const settings=JSON.parse(localStorage.getItem('minicraft_settings')||'{}');

// ---------- Constantes & réglages ----------
const CHUNK=16, HEIGHT=48, SEA=22, M=14, STACK=64, TORCH_LIGHT=10, COOK_TIME=4;
let R=settings.render||5;
let soundOn=settings.soundOn!==false, soundVol=(settings.soundVol!=null?settings.soundVol:0.6), mouseSens=settings.sens||0.0022, FOV=settings.fov||75;
let mode=save.mode||'survival';   // 'survival' | 'creative' | 'spectator'
function saveSettings(){ try{ localStorage.setItem('minicraft_settings',JSON.stringify({soundOn,soundVol,sens:mouseSens,render:R,fov:FOV})); }catch(e){} }

// ---------- Blocs et objets ----------
const AIR=0, GRASS=1, DIRT=2, STONE=3, COBBLE=4, SAND=5, WOOD=6, LEAVES=7, PLANKS=8,
      WATER=9, BRICK=10, GLASS=11, BEDROCK=12, TORCH=13, COAL_ORE=14, CRAFT_TABLE=15,
      IRON_ORE=16, FURNACE=17, SNOW=18, CACTUS=19;
const GRAVEL=20, MOSSY_COBBLE=21, BOOKSHELF=22, GOLD_ORE=23;
const STICK=100, COAL=101, WOOD_PICK=102, WOOD_SHOVEL=103, WOOD_AXE=104,
      STONE_PICK=105, STONE_SHOVEL=106, STONE_AXE=107, VIANDE=110,
      IRON_RAW=111, IRON_INGOT=112, VIANDE_CUITE=113, IRON_PICK=114, IRON_SHOVEL=115, IRON_AXE=116,
      GOLD_RAW=117, GOLD_INGOT=118;

const BLOCKS={
  [GRASS]:{name:'Herbe',top:0,side:1,bottom:2}, [DIRT]:{name:'Terre',top:2,side:2,bottom:2},
  [STONE]:{name:'Pierre',top:3,side:3,bottom:3}, [COBBLE]:{name:'Pavé',top:4,side:4,bottom:4},
  [SAND]:{name:'Sable',top:5,side:5,bottom:5}, [WOOD]:{name:'Bois',top:6,side:7,bottom:6},
  [LEAVES]:{name:'Feuilles',top:8,side:8,bottom:8}, [PLANKS]:{name:'Planches',top:9,side:9,bottom:9},
  [WATER]:{name:'Eau',top:10,side:10,bottom:10,transparent:true,fluid:true},
  [BRICK]:{name:'Brique',top:11,side:11,bottom:11}, [GLASS]:{name:'Verre',top:12,side:12,bottom:12,transparent:true},
  [BEDROCK]:{name:'Bedrock',top:13,side:13,bottom:13},
  [TORCH]:{name:'Torche',top:14,side:14,bottom:14,transparent:true,noCube:true,light:TORCH_LIGHT},
  [COAL_ORE]:{name:'Minerai de charbon',top:15,side:15,bottom:15},
  [CRAFT_TABLE]:{name:'Établi',top:16,side:17,bottom:9},
  [IRON_ORE]:{name:'Minerai de fer',top:27,side:27,bottom:27},
  [FURNACE]:{name:'Four',top:29,side:28,bottom:29},
  [SNOW]:{name:'Neige',top:36,side:36,bottom:36}, [CACTUS]:{name:'Cactus',top:39,side:38,bottom:39},
  [GRAVEL]:{name:'Gravier',top:37,side:37,bottom:37},
  [MOSSY_COBBLE]:{name:'Pavé moussu',top:40,side:40,bottom:40},
  [BOOKSHELF]:{name:'Bibliothèque',top:9,side:41,bottom:9},
  [GOLD_ORE]:{name:'Minerai d\'or',top:42,side:42,bottom:42},
  [STICK]:{name:'Bâton',side:19,item:true}, [COAL]:{name:'Charbon',side:18,item:true},
  [WOOD_PICK]:{name:'Pioche en bois',side:20,item:true,maxStack:1},
  [WOOD_SHOVEL]:{name:'Pelle en bois',side:21,item:true,maxStack:1},
  [WOOD_AXE]:{name:'Hache en bois',side:22,item:true,maxStack:1},
  [STONE_PICK]:{name:'Pioche en pierre',side:23,item:true,maxStack:1},
  [STONE_SHOVEL]:{name:'Pelle en pierre',side:24,item:true,maxStack:1},
  [STONE_AXE]:{name:'Hache en pierre',side:25,item:true,maxStack:1},
  [VIANDE]:{name:'Viande crue',side:26,item:true},
  [IRON_RAW]:{name:'Fer brut',side:30,item:true}, [IRON_INGOT]:{name:'Lingot de fer',side:31,item:true},
  [VIANDE_CUITE]:{name:'Viande cuite',side:32,item:true},
  [IRON_PICK]:{name:'Pioche en fer',side:33,item:true,maxStack:1},
  [IRON_SHOVEL]:{name:'Pelle en fer',side:34,item:true,maxStack:1},
  [IRON_AXE]:{name:'Hache en fer',side:35,item:true,maxStack:1},
  [GOLD_RAW]:{name:'Or brut',side:43,item:true},
  [GOLD_INGOT]:{name:'Lingot d\'or',side:44,item:true},
};
const HARD={ [GRASS]:0.4,[DIRT]:0.4,[SAND]:0.45,[LEAVES]:0.2,[WOOD]:0.7,[PLANKS]:0.7,
  [STONE]:1.3,[COBBLE]:1.3,[BRICK]:1.3,[GLASS]:0.3,[TORCH]:0.1,[COAL_ORE]:1.6,[CRAFT_TABLE]:0.7,
  [IRON_ORE]:2.2,[FURNACE]:1.6,[SNOW]:0.25,[CACTUS]:0.4,[WATER]:9999,[BEDROCK]:9999,
  [GRAVEL]:0.4,[MOSSY_COBBLE]:1.3,[BOOKSHELF]:0.7,[GOLD_ORE]:2.4 };
const DROPS={ [STONE]:COBBLE,[GRASS]:DIRT,[COAL_ORE]:COAL,[IRON_ORE]:IRON_RAW,[GOLD_ORE]:GOLD_RAW,[MOSSY_COBBLE]:COBBLE };
const dropOf=id=>DROPS[id]!=null?DROPS[id]:id;
const maxStackOf=id=>(BLOCKS[id]&&BLOCKS[id].maxStack)||STACK;
const TOOL={ [WOOD_PICK]:{k:'pick',m:2.5},[STONE_PICK]:{k:'pick',m:4.5},[IRON_PICK]:{k:'pick',m:7},
  [WOOD_SHOVEL]:{k:'shovel',m:2.5},[STONE_SHOVEL]:{k:'shovel',m:4.5},[IRON_SHOVEL]:{k:'shovel',m:7},
  [WOOD_AXE]:{k:'axe',m:2.5},[STONE_AXE]:{k:'axe',m:4.5},[IRON_AXE]:{k:'axe',m:7} };
const BLOCK_TOOL={ [STONE]:'pick',[COBBLE]:'pick',[COAL_ORE]:'pick',[IRON_ORE]:'pick',[BRICK]:'pick',[FURNACE]:'pick',
  [MOSSY_COBBLE]:'pick',[GOLD_ORE]:'pick',
  [WOOD]:'axe',[PLANKS]:'axe',[CRAFT_TABLE]:'axe',[CACTUS]:'axe',[BOOKSHELF]:'axe',
  [DIRT]:'shovel',[GRASS]:'shovel',[SAND]:'shovel',[SNOW]:'shovel',[GRAVEL]:'shovel' };
function mineMult(id){ const h=inv[selected]; if(!h) return 1; const t=TOOL[h.id]; if(!t) return 1; return BLOCK_TOOL[id]===t.k?t.m:1; }
const SMELT={ [IRON_RAW]:IRON_INGOT, [GOLD_RAW]:GOLD_INGOT, [VIANDE]:VIANDE_CUITE, [SAND]:GLASS, [COBBLE]:STONE };
const FUEL={ [COAL]:8, [PLANKS]:2, [WOOD]:2, [STICK]:1 };
const EAT={ [VIANDE]:4, [VIANDE_CUITE]:8 };

const isTransparent=id=>id!==AIR&&BLOCKS[id]&&BLOCKS[id].transparent;
const isOpaque=id=>id!==AIR&&!(BLOCKS[id]&&BLOCKS[id].transparent);
const isSolid=id=>id!==AIR&&id!==WATER&&id!==TORCH;

// ---------- Atlas de textures (procédural, remplaçable par atlas.png) ----------
const TILE=16, ATLAS_TILES=8, ATLAS_PX=TILE*ATLAS_TILES;
const atlas=document.createElement('canvas'); atlas.width=atlas.height=ATLAS_PX;
const actx=atlas.getContext('2d');
function lerp(a,b,t){ return a+t*(b-a); }
function mix(c1,c2,t){ return [lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t),c1[3]]; }
function vn(x,y,seed){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const h=(a,b)=>{ let n=(Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(seed,2246822519))|0; n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; };
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(h(xi,yi),h(xi+1,yi),u),lerp(h(xi,yi+1),h(xi+1,yi+1),u),v); }
function fnoise(x,y,s){ return 0.6*vn(x,y,s)+0.3*vn(x*2+5,y*2+5,s+1)+0.1*vn(x*4,y*4,s+2); }
function paint(t,fn){ const col=t%ATLAS_TILES,row=(t/ATLAS_TILES)|0,ox=col*TILE,oy=row*TILE; actx.clearRect(ox,oy,TILE,TILE);
  for(let y=0;y<TILE;y++) for(let x=0;x<TILE;x++){ const c=fn(x,y); if(!c) continue;
    actx.fillStyle=(c[3]==null)?`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`:`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${c[3]})`; actx.fillRect(ox+x,oy+y,1,1); } }
paint(0,(x,y)=>mix([100,156,58],[124,178,74],fnoise(x/7,y/7,1)));
paint(1,(x,y)=>{ const e=9+Math.round((fnoise(x/9,0,2)-0.5)*6); return y<e?mix([100,156,58],[124,178,74],fnoise(x/7,y/7,1)):mix([122,86,58],[152,112,80],fnoise(x/7,y/7,3)); });
paint(2,(x,y)=>mix([122,86,58],[152,112,80],fnoise(x/7,y/7,3)));
paint(3,(x,y)=>mix([124,126,131],[152,154,159],fnoise(x/8,y/8,4)));
paint(4,(x,y)=>{ const cx=(x%16)-8,cy=(y%16)-8,d=Math.min(1,Math.sqrt(cx*cx+cy*cy)/8.5); const b=mix([116,116,122],[146,148,153],fnoise(x/5,y/5,5)); if(d>0.92) return [78,78,84]; const s=1-d*0.3; return [b[0]*s,b[1]*s,b[2]*s]; });
paint(5,(x,y)=>mix([220,210,162],[238,230,190],fnoise(x/7,y/7,6)));
paint(6,(x,y)=>{ const dx=x-16,dy=y-16,d=Math.sqrt(dx*dx+dy*dy),r=Math.sin(d*1.05)*0.5+0.5; return mix([150,112,66],[120,86,48],r*0.7+fnoise(x/6,y/6,7)*0.2); });
paint(7,(x,y)=>{ const g=Math.sin(x*0.85+fnoise(x/9,y/9,8)*2.2)*0.5+0.5; return mix([140,102,60],[110,78,46],g*0.55); });
paint(8,(x,y)=>mix([58,116,44],[92,156,68],fnoise(x/4.5,y/4.5,9)));
paint(9,(x,y)=>{ const p=Math.floor(y/8),s=(y%8<1)?0.72:1,vs=((x+(p%2)*16)%16<1)?0.82:1; const c=mix([172,136,82],[150,116,68],fnoise(x/8,y/3,10+p)*0.7); return [c[0]*s*vs,c[1]*s*vs,c[2]*s*vs]; });
paint(10,(x,y)=>{ const w=Math.sin((x+y)*0.35+fnoise(x/6,y/6,11)*3)*0.5+0.5; const c=mix([46,110,200],[64,142,226],w); return [c[0],c[1],c[2],0.72]; });
paint(11,(x,y)=>{ const row=Math.floor(y/8),off=(row%2)*8; if(y%8<1||(x+off)%16<1) return [206,201,191]; return mix([162,68,54],[180,86,68],fnoise(x/6,y/6,12)); });
paint(12,(x,y)=>{ if(x<2||y<2||x>=TILE-2||y>=TILE-2) return [216,239,246,0.95]; return [182,222,239,((x+y)%18<2)?0.32:0.12]; });
paint(13,(x,y)=>mix([40,40,46],[72,72,80],fnoise(x/5,y/5,13)));
paint(14,(x,y)=>{ const cx=TILE/2; if(x>=cx-2&&x<=cx+1&&y>=TILE*0.45) return [120,80,45]; const dx=x-cx,dy=y-TILE*0.32; if(dx*dx+dy*dy<26) return mix([255,176,40],[255,232,120],fnoise(x/3,y/3,14)); return null; });
paint(15,(x,y)=>{ const base=mix([124,126,131],[152,154,159],fnoise(x/8,y/8,4)); return fnoise(x/4,y/4,30)>0.6?[30,30,34]:base; });
paint(16,(x,y)=>{ const base=mix([176,140,86],[150,116,68],fnoise(x/8,y/8,40)); if(x<2||y<2||x>=TILE-2||y>=TILE-2||Math.abs(x-TILE/2)<1||Math.abs(y-TILE/2)<1) return [95,68,40]; return base; });
paint(17,(x,y)=>{ const base=mix([150,116,68],[128,98,56],fnoise(x/8,y/4,41)); if(y>=TILE*0.5&&y<TILE*0.5+2) return [70,70,76]; return base; });
paint(18,(x,y)=>{ const dx=x-TILE/2,dy=y-TILE/2,d=Math.sqrt(dx*dx+dy*dy)/(TILE*0.4); if(d>1) return null; return mix([20,20,24],[64,64,70],fnoise(x/3,y/3,42)*(1-d*0.6)); });
paint(19,(x,y)=>{ const cx=TILE/2; if(x>=cx-2&&x<=cx+2&&y>=4&&y<=TILE-4) return mix([120,84,46],[150,110,66],fnoise(x/2,y/4,43)); return null; });
function thandle(x,y){ return (x>=14&&x<=17&&y>=8&&y<=28)?[120,82,44]:null; }
const tpick=hc=>(x,y)=>{ const h=thandle(x,y); if(h) return h; if(y>=5&&y<=8&&x>=6&&x<=25) return hc; if((x<=8||x>=23)&&x>=6&&x<=25&&y>=8&&y<=12) return hc; return null; };
const tshovel=hc=>(x,y)=>{ const h=thandle(x,y); if(h) return h; if(x>=10&&x<=21&&y>=4&&y<=11) return hc; return null; };
const taxe=hc=>(x,y)=>{ const h=thandle(x,y); if(h) return h; if(x>=16&&x<=26&&y>=4&&y<=13&&((x-16)+(13-y)<13)) return hc; return null; };
const WHEAD=[196,158,100], SHEAD=[130,130,136], IHEAD=[226,226,232];
paint(20,tpick(WHEAD)); paint(21,tshovel(WHEAD)); paint(22,taxe(WHEAD));
paint(23,tpick(SHEAD)); paint(24,tshovel(SHEAD)); paint(25,taxe(SHEAD));
paint(26,(x,y)=>{ const dx=x-TILE/2,dy=y-TILE/2,d=Math.sqrt(dx*dx+dy*dy)/(TILE*0.42); if(d>1) return null; return mix([184,74,72],[150,40,40],fnoise(x/3,y/3,50)*(1-d*0.5)); });
paint(27,(x,y)=>{ const base=mix([124,126,131],[152,154,159],fnoise(x/8,y/8,4)); return fnoise(x/4+9,y/4,31)>0.62?[214,176,140]:base; });   // minerai de fer
paint(28,(x,y)=>{ const base=mix([96,96,100],[122,122,128],fnoise(x/6,y/6,32)); if(x>=8&&x<=23&&y>=14&&y<=27){ const g=(y>24)?[255,150,40]:[30,24,20]; return g; } return base; }); // four (face)
paint(29,(x,y)=>mix([96,96,100],[122,122,128],fnoise(x/6,y/6,32)));   // four (dessus/dessous)
paint(30,(x,y)=>{ const dx=x-TILE/2,dy=y-TILE/2,d=Math.sqrt(dx*dx+dy*dy)/(TILE*0.4); if(d>1) return null; const n=fnoise(x/3,y/3,33); return n>0.6?mix([210,172,138],[230,196,160],n):mix([120,118,120],[150,148,150],n); }); // fer brut
paint(31,(x,y)=>{ if(x<6||x>25||y<11||y>20) return null; return mix([210,210,218],[236,236,242],fnoise(x/4,y/4,34)); });  // lingot de fer
paint(32,(x,y)=>{ const dx=x-TILE/2,dy=y-TILE/2,d=Math.sqrt(dx*dx+dy*dy)/(TILE*0.42); if(d>1) return null; return mix([150,96,56],[120,70,40],fnoise(x/3,y/3,35)*(1-d*0.4)); }); // viande cuite
paint(33,tpick(IHEAD)); paint(34,tshovel(IHEAD)); paint(35,taxe(IHEAD));
paint(36,(x,y)=>mix([232,238,245],[255,255,255],fnoise(x/6,y/6,60)));   // neige
paint(38,(x,y)=>{ const r=(x%8<1)?0.78:1; const c=mix([60,120,52],[84,150,70],fnoise(x/6,y/4,61)); return [c[0]*r,c[1]*r,c[2]*r]; });  // cactus (côté)
paint(39,(x,y)=>mix([70,134,60],[96,164,80],fnoise(x/5,y/5,62)));   // cactus (dessus)

const texture=new THREE.CanvasTexture(atlas);
texture.magFilter=THREE.NearestFilter; texture.minFilter=THREE.NearestFilter; texture.generateMipmaps=false;
function tileUV(t){ const s=1/ATLAS_TILES,col=t%ATLAS_TILES,row=(t/ATLAS_TILES)|0,ins=0.5/ATLAS_PX; return [col*s+ins,1-(row+1)*s+ins,(col+1)*s-ins,1-row*s-ins]; }
// textures : un fichier 16x16 par tuile dans assets/ (écrase le procédural si présent)
const TILE_FILES={
  0:'grass_top',1:'grass_side',2:'dirt',3:'stone',4:'cobblestone',5:'sand',6:'wood_top',7:'wood_side',
  8:'leaves',9:'planks',10:'water',11:'brick',12:'glass',13:'bedrock',14:'torch',15:'coal_ore',
  16:'craft_table_top',17:'craft_table_side',18:'coal',19:'stick',20:'wood_pickaxe',21:'wood_shovel',22:'wood_axe',23:'stone_pickaxe',
  24:'stone_shovel',25:'stone_axe',26:'raw_meat',27:'iron_ore',28:'furnace_front',29:'furnace_top',30:'raw_iron',31:'iron_ingot',
  32:'cooked_meat',33:'iron_pickaxe',34:'iron_shovel',35:'iron_axe',36:'snow',37:'gravel',38:'cactus_side',39:'cactus_top',
  40:'mossy_cobblestone',41:'bookshelf_side',42:'gold_ore',43:'raw_gold',44:'gold_ingot'
};
let _assetsLeft=Object.keys(TILE_FILES).length;
function finishAssets(){ texture.needsUpdate=true; for(const c of chunks.values()) c.dirty=true; renderHotbar(); if(invOpen) renderInvScreen(); }
// Textures intégrées (textures.js, base64) : aucun fichier externe → marche en double-clic
// et dans Bubble, sans serveur. Repli sur assets/ ou le procédural si textures.js est absent.
(function loadAssets(){
  for(const t in TILE_FILES){ const tile=+t, name=TILE_FILES[tile], img=new Image();
    img.onload=()=>{ const col=tile%ATLAS_TILES,row=(tile/ATLAS_TILES)|0; actx.clearRect(col*TILE,row*TILE,TILE,TILE); actx.imageSmoothingEnabled=false; actx.drawImage(img,col*TILE,row*TILE,TILE,TILE); if(--_assetsLeft<=0) finishAssets(); };
    img.onerror=()=>{ if(--_assetsLeft<=0) finishAssets(); };
    img.src=(window.TEX&&window.TEX[name]) ? window.TEX[name] : ('assets/'+name+'.png');
  }
})();

// ---------- Fissures ----------
const crackMats=[];
for(let s=0;s<5;s++){ const cv=document.createElement('canvas'); cv.width=cv.height=16; const cx=cv.getContext('2d');
  cx.strokeStyle='rgba(0,0,0,0.55)'; cx.lineWidth=1; let seed=s*7+1; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
  for(let i=0;i<(s+1)*3;i++){ cx.beginPath(); const x=rnd()*16,y=rnd()*16; cx.moveTo(x,y); cx.lineTo(x+(rnd()-0.5)*7,y+(rnd()-0.5)*7); cx.stroke(); }
  const tx=new THREE.CanvasTexture(cv); tx.magFilter=THREE.NearestFilter; tx.minFilter=THREE.NearestFilter; tx.generateMipmaps=false;
  crackMats.push(new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})); }

// ---------- Scène ----------
const scene=new THREE.Scene();
const SKY_DAY=new THREE.Color(0x87ceeb), SKY_NIGHT=new THREE.Color(0x0a0c18);
scene.background=SKY_DAY.clone(); scene.fog=new THREE.Fog(SKY_DAY.getHex(),(R-1.5)*CHUNK,R*CHUNK);
const camera=new THREE.PerspectiveCamera(FOV,innerWidth/innerHeight,0.1,1000); camera.rotation.order='YXZ';
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('game'),antialias:false,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const lightU={ map:{value:texture}, uSky:{value:1.0}, fogColor:{value:new THREE.Color(0x87ceeb)}, fogNear:{value:(R-1.5)*CHUNK}, fogFar:{value:R*CHUNK} };
const VS=`attribute vec3 light3; varying vec2 vUv; varying vec3 vC; varying float vFog;
void main(){ vUv=uv; vC=light3; vec4 mv=modelViewMatrix*vec4(position,1.0); vFog=-mv.z; gl_Position=projectionMatrix*mv; }`;
const FS=`uniform sampler2D map; uniform float uSky; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
varying vec2 vUv; varying vec3 vC; varying float vFog;
void main(){ vec4 t=texture2D(map,vUv); float lvl=max(vC.y*uSky,vC.z); float bri=(0.08+0.92*clamp(lvl,0.0,1.0))*vC.x;
  vec3 col=t.rgb*bri; float f=clamp((vFog-fogNear)/(fogFar-fogNear),0.0,1.0); col=mix(col,fogColor,f); gl_FragColor=vec4(col,t.a); }`;
const matOpaque=new THREE.ShaderMaterial({uniforms:lightU,vertexShader:VS,fragmentShader:FS});
const matWater=new THREE.ShaderMaterial({uniforms:lightU,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,side:THREE.DoubleSide});
const matItem=new THREE.MeshBasicMaterial({map:texture});
const highlight=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001,1.001,1.001)),new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:0.4}));
highlight.visible=false; scene.add(highlight);
const breakBox=new THREE.Mesh(new THREE.BoxGeometry(1.003,1.003,1.003),crackMats[0]); breakBox.visible=false; breakBox.renderOrder=2; scene.add(breakBox);

// ---------- Perlin / terrain / bruit 3D ----------
function makePerlin(seed){ const perm=[]; for(let i=0;i<256;i++) perm[i]=i;
  let s=seed>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  for(let i=255;i>0;i--){ const j=(rnd()*(i+1))|0; const t=perm[i]; perm[i]=perm[j]; perm[j]=t; }
  const p=new Uint8Array(512); for(let i=0;i<512;i++) p[i]=perm[i&255];
  const fade=t=>t*t*t*(t*(t*6-15)+10),L=(a,b,t)=>a+t*(b-a),grad=(h,x,y)=>((h&1)?x:-x)+((h&2)?y:-y);
  return (x,y)=>{ const X=Math.floor(x)&255,Y=Math.floor(y)&255; x-=Math.floor(x); y-=Math.floor(y);
    const u=fade(x),v=fade(y),aa=p[p[X]+Y],ab=p[p[X]+Y+1],ba=p[p[X+1]+Y],bb=p[p[X+1]+Y+1];
    return L(L(grad(aa,x,y),grad(ba,x-1,y),u),L(grad(ab,x,y-1),grad(bb,x-1,y-1),u),v); }; }
const perlin=makePerlin(SEED);
function fbm(x,z){ let a=0,amp=1,fr=0.012,n=0; for(let i=0;i<4;i++){ a+=perlin(x*fr,z*fr)*amp; n+=amp; amp*=0.5; fr*=2; } return a/n; }
function heightAt(x,z){ return Math.floor(24+fbm(x,z)*11); }
function hash2(x,z){ let n=(x*374761393+z*668265263)|0; n=(n^(n>>13))*1274126177; n=n^(n>>16); return (n>>>0)/4294967295; }
function hash3(x,y,z){ let n=(x*374761393+y*668265263+z*1103515245)|0; n=(n^(n>>13))*1274126177; n=n^(n>>16); return (n>>>0)/4294967295; }
function noise3(x,y,z){ const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf),L=(a,b,t)=>a+t*(b-a),h=(a,b,c)=>hash3(a,b,c)*2-1;
  const x00=L(h(xi,yi,zi),h(xi+1,yi,zi),u),x10=L(h(xi,yi+1,zi),h(xi+1,yi+1,zi),u);
  const x01=L(h(xi,yi,zi+1),h(xi+1,yi,zi+1),u),x11=L(h(xi,yi+1,zi+1),h(xi+1,yi+1,zi+1),u);
  return L(L(x00,x10,v),L(x01,x11,v),w); }

// ---------- Monde ----------
const chunks=new Map(); const torches=new Set();
const ckey=(cx,cz)=>cx+','+cz; const vidx=(x,y,z)=>x+CHUNK*(z+CHUNK*y);
function getBlock(wx,wy,wz){ if(wy<0||wy>=HEIGHT) return AIR; const cx=Math.floor(wx/CHUNK),cz=Math.floor(wz/CHUNK); const c=chunks.get(ckey(cx,cz)); if(!c) return AIR; return c.blocks[vidx(wx-cx*CHUNK,wy,wz-cz*CHUNK)]; }
function markDirty(cx,cz){ const c=chunks.get(ckey(cx,cz)); if(c) c.dirty=true; }
function setBlock(wx,wy,wz,id){ if(wy<0||wy>=HEIGHT) return; const cx=Math.floor(wx/CHUNK),cz=Math.floor(wz/CHUNK); const c=chunks.get(ckey(cx,cz)); if(!c) return;
  const lx=wx-cx*CHUNK,lz=wz-cz*CHUNK; c.blocks[vidx(lx,wy,lz)]=id; c.dirty=true;
  if(lx===0) markDirty(cx-1,cz); if(lx===CHUNK-1) markDirty(cx+1,cz); if(lz===0) markDirty(cx,cz-1); if(lz===CHUNK-1) markDirty(cx,cz+1);
  markDirty(cx-1,cz-1); markDirty(cx+1,cz-1); markDirty(cx-1,cz+1); markDirty(cx+1,cz+1); }
function editBlock(wx,wy,wz,id){ const prev=getBlock(wx,wy,wz); setBlock(wx,wy,wz,id);
  const cx=Math.floor(wx/CHUNK),cz=Math.floor(wz/CHUNK),k=ckey(cx,cz); (worldEdits[k]||(worldEdits[k]={}))[(wx-cx*CHUNK)+','+wy+','+(wz-cz*CHUNK)]=id;
  const tk=wx+','+wy+','+wz; if(prev===TORCH) torches.delete(tk); if(id===TORCH) torches.add(tk);
  if(id===AIR) activateWater(wx,wy,wz); scheduleSave(); }

// ---------- Eau qui coule (propagation) ----------
const waterLevel=new Map(); const waterQueue=[];
function activateWater(wx,wy,wz){ if(waterQueue.length>4000) return;
  if(getBlock(wx,wy+1,wz)===WATER) waterQueue.push([wx,wy+1,wz]);
  if(getBlock(wx+1,wy,wz)===WATER) waterQueue.push([wx+1,wy,wz]); if(getBlock(wx-1,wy,wz)===WATER) waterQueue.push([wx-1,wy,wz]);
  if(getBlock(wx,wy,wz+1)===WATER) waterQueue.push([wx,wy,wz+1]); if(getBlock(wx,wy,wz-1)===WATER) waterQueue.push([wx,wy,wz-1]); }
function wlevel(x,y,z){ const l=waterLevel.get(x+','+y+','+z); return l==null?0:l; }
function spreadWater(x,y,z,lvl){ if(getBlock(x,y,z)!==AIR) return; waterLevel.set(x+','+y+','+z,lvl); editBlock(x,y,z,WATER); waterQueue.push([x,y,z]); }
function flowTick(){ let budget=24;
  while(budget>0 && waterQueue.length){ const c=waterQueue.shift(); if(getBlock(c[0],c[1],c[2])!==WATER) continue; budget--;
    const lvl=wlevel(c[0],c[1],c[2]);
    if(getBlock(c[0],c[1]-1,c[2])===AIR) spreadWater(c[0],c[1]-1,c[2],0);
    else if(lvl<7){ spreadWater(c[0]+1,c[1],c[2],lvl+1); spreadWater(c[0]-1,c[1],c[2],lvl+1); spreadWater(c[0],c[1],c[2]+1,lvl+1); spreadWater(c[0],c[1],c[2]-1,lvl+1); } } }

function plantTree(blocks,lx,baseY,lz){ const th=4+(hash2(lx*7+baseY,lz*13)*3|0);
  for(let i=0;i<th;i++){ const y=baseY+i; if(y<HEIGHT) blocks[vidx(lx,y,lz)]=WOOD; }
  const top=baseY+th-1;
  for(let dy=-1;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++){ const x=lx+dx,y=top+dy,z=lz+dz;
    if(x<0||x>=CHUNK||z<0||z>=CHUNK||y<0||y>=HEIGHT) continue; if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)<=3&&blocks[vidx(x,y,z)]===AIR) blocks[vidx(x,y,z)]=LEAVES; } }
// biomes : neige / désert / forêt / plaines (bruit lent)
function biomeAt(x,z){ const T=perlin(x*0.005+100,z*0.005+100); if(T<-0.34) return 'snow'; if(T>0.34) return 'desert';
  return perlin(x*0.01+700,z*0.01+700)>0.2 ? 'forest' : 'plains'; }
// structures
function setL(blocks,lx,y,lz,id){ if(lx<0||lx>=CHUNK||lz<0||lz>=CHUNK||y<0||y>=HEIGHT) return; blocks[vidx(lx,y,lz)]=id; }
function buildHut(blocks,lx,gy,lz){
  for(let dx=0;dx<5;dx++) for(let dz=0;dz<5;dz++) setL(blocks,lx+dx,gy,lz+dz,COBBLE);
  for(let dy=1;dy<=2;dy++) for(let dx=0;dx<5;dx++) for(let dz=0;dz<5;dz++) if(dx===0||dx===4||dz===0||dz===4) setL(blocks,lx+dx,gy+dy,lz+dz,PLANKS);
  setL(blocks,lx+2,gy+1,lz,AIR); setL(blocks,lx+2,gy+2,lz,AIR);                 // porte
  for(let dx=0;dx<5;dx++) for(let dz=0;dz<5;dz++) setL(blocks,lx+dx,gy+3,lz+dz,PLANKS);   // toit
  setL(blocks,lx+2,gy+1,lz+2,TORCH);
}
function buildDungeon(blocks,lx,gy,lz){
  for(let dx=0;dx<5;dx++) for(let dy=0;dy<4;dy++) for(let dz=0;dz<5;dz++){ const edge=(dx===0||dx===4||dy===0||dy===3||dz===0||dz===4); setL(blocks,lx+dx,gy+dy,lz+dz,edge?MOSSY_COBBLE:AIR); }
  setL(blocks,lx+1,gy+1,lz+1,TORCH); setL(blocks,lx+3,gy+2,lz+3,TORCH); setL(blocks,lx+2,gy+1,lz+2,GOLD_ORE);
}
function buildBoat(blocks,lx,gy,lz){
  for(let dx=0;dx<3;dx++) for(let dz=0;dz<5;dz++) setL(blocks,lx+dx,gy-1,lz+dz,PLANKS);
  for(let dx=0;dx<3;dx++) for(let dz=0;dz<5;dz++) if(dx===0||dx===2||dz===0||dz===4) setL(blocks,lx+dx,gy,lz+dz,PLANKS);
}
function buildStructures(blocks,cx,cz){
  const wx0=cx*CHUNK,wz0=cz*CHUNK;
  if(hash2(cx*131+7,cz*131+13)<0.04){ const lx=2+((hash2(cx,cz)*6)|0),lz=2+((hash2(cz,cx)*6)|0),wx=wx0+lx,wz=wz0+lz,bi=biomeAt(wx,wz),h=heightAt(wx,wz);
    if((bi==='plains'||bi==='forest')&&h>SEA+1) buildHut(blocks,lx,h,lz); }
  if(hash2(cx*271+91,cz*271+37)<0.05){ const lx=2+((hash2(cx+5,cz)*6)|0),lz=2+((hash2(cz+5,cx)*6)|0),dy=6+((hash2(cx,cz+9)*10)|0); buildDungeon(blocks,lx,dy,lz); }
  if(hash2(cx*373+3,cz*373+19)<0.04){ const lx=2+((hash2(cx+2,cz+2)*8)|0),lz=2+((hash2(cz+2,cx+2)*7)|0),wx=wx0+lx,wz=wz0+lz; if(heightAt(wx,wz)<SEA-1) buildBoat(blocks,lx,SEA+1,lz); }
}
function genChunk(cx,cz){
  const blocks=new Uint8Array(CHUNK*CHUNK*HEIGHT);
  for(let lx=0;lx<CHUNK;lx++) for(let lz=0;lz<CHUNK;lz++){ const wx=cx*CHUNK+lx,wz=cz*CHUNK+lz,h=heightAt(wx,wz),bi=biomeAt(wx,wz);
    for(let y=0;y<HEIGHT;y++){ let id=AIR;
      if(y===0) id=BEDROCK;
      else if(y<h-3){
        if(y<=9&&hash3(wx*3+5,y,wz*3+5)<0.004) id=GOLD_ORE;
        else if(y>1&&y<h-6&&hash3(wx*2+7,y,wz*2+7)<0.006) id=IRON_ORE;
        else if(y>2&&hash3(wx,y,wz)<0.02) id=COAL_ORE;
        else if(y>h-9&&hash3(wx+51,y+7,wz+51)<0.04) id=GRAVEL;
        else id=STONE;
      }
      else if(y<h) id=(bi==='desert'&&y>=h-4)?SAND:DIRT;
      else if(y===h) id=(h<=SEA+1)?SAND:(bi==='desert')?SAND:(bi==='snow')?SNOW:GRASS;
      else if(y<=SEA) id=WATER;
      blocks[vidx(lx,y,lz)]=id; }
    for(let y=2;y<h-1;y++){ const id=blocks[vidx(lx,y,lz)];
      if(id!==STONE&&id!==DIRT&&id!==COAL_ORE&&id!==IRON_ORE) continue;
      // tunnels = intersection de deux nappes de bruit 3D (~14% d'air, galeries connectées)
      const a=noise3(wx*0.05,y*0.07,wz*0.05), b=noise3(wx*0.05+71,y*0.07+19,wz*0.05+43);
      if(a*a+b*b < 0.28) blocks[vidx(lx,y,lz)]=AIR;
    }
    // entrée de grotte : à des endroits clairsemés, si une grotte passe près du sol, on ouvre un puits jusqu'à la surface
    if(h>SEA+1 && perlin(wx*0.07+900,wz*0.07+900)>0.58){
      for(let y=h-1;y>3;y--){ if(blocks[vidx(lx,y,lz)]===AIR){ for(let yy=h;yy>y;yy--) blocks[vidx(lx,yy,lz)]=AIR; break; } }
    }
    const top=blocks[vidx(lx,h,lz)];
    if(h>SEA+1){
      if(bi==='desert'){ if(top===SAND&&hash2(wx,wz)<0.02){ const ch=1+(hash2(wx*3,wz*3)*3|0); for(let i=1;i<=ch;i++) if(h+i<HEIGHT) blocks[vidx(lx,h+i,lz)]=CACTUS; } }
      else if(top===GRASS){ const dens=(bi==='forest')?0.06:0.012; if(hash2(wx,wz)<dens) plantTree(blocks,lx,h+1,lz); }
    }
  }
  buildStructures(blocks,cx,cz);
  const e=worldEdits[ckey(cx,cz)]; if(e) for(const k in e){ const a=k.split(','); blocks[vidx(+a[0],+a[1],+a[2])]=e[k]; }
  for(let y=0;y<HEIGHT;y++) for(let z=0;z<CHUNK;z++) for(let x=0;x<CHUNK;x++) if(blocks[vidx(x,y,z)]===TORCH) torches.add((cx*CHUNK+x)+','+y+','+(cz*CHUNK+z));
  const c={x:cx,z:cz,blocks,dirty:true,mesh:null,water:null,torchG:null}; chunks.set(ckey(cx,cz),c);
  markDirty(cx-1,cz); markDirty(cx+1,cz); markDirty(cx,cz-1); markDirty(cx,cz+1); return c;
}

// ---------- Lumière ----------
const PW=CHUNK+2*M; const lightSky=new Uint8Array(PW*PW*HEIGHT),lightBlk=new Uint8Array(PW*PW*HEIGHT),lq=new Int32Array(PW*PW*HEIGHT);
const pidx=(px,py,pz)=>px+PW*(pz+PW*py);
function computeLight(c){ const ox=c.x*CHUNK,oz=c.z*CHUNK,cache={};
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const cc=chunks.get(ckey(c.x+dx,c.z+dz)); cache[dx+','+dz]=cc?cc.blocks:null; }
  const blk=(wx,wy,wz)=>{ if(wy<0) return STONE; if(wy>=HEIGHT) return AIR; const ccx=Math.floor(wx/CHUNK)-c.x,ccz=Math.floor(wz/CHUNK)-c.z; const arr=cache[ccx+','+ccz]; if(!arr) return AIR; return arr[vidx(((wx%CHUNK)+CHUNK)%CHUNK,wy,((wz%CHUNK)+CHUNK)%CHUNK)]; };
  const prop=(arr,tail)=>{ for(let head=0;head<tail;head++){ const i=lq[head],l=arr[i]; if(l<=1) continue;
    const py=(i/(PW*PW))|0,rem=i-py*PW*PW,pz=(rem/PW)|0,px=rem-pz*PW,nl=l-1;
    const tN=(nx,ny,nz)=>{ if(nx<0||nx>=PW||nz<0||nz>=PW||ny<0||ny>=HEIGHT) return; const wx=ox-M+nx,wz=oz-M+nz; if(isOpaque(blk(wx,ny,wz))) return; const ni=pidx(nx,ny,nz); if(arr[ni]<nl){ arr[ni]=nl; lq[tail++]=ni; } };
    tN(px-1,py,pz); tN(px+1,py,pz); tN(px,py-1,pz); tN(px,py+1,pz); tN(px,py,pz-1); tN(px,py,pz+1); } };
  lightSky.fill(0); let t1=0;
  for(let px=0;px<PW;px++) for(let pz=0;pz<PW;pz++){ const wx=ox-M+px,wz=oz-M+pz; for(let y=HEIGHT-1;y>=0;y--){ if(isOpaque(blk(wx,y,wz))) break; const i=pidx(px,y,pz); lightSky[i]=15; lq[t1++]=i; } }
  prop(lightSky,t1);
  lightBlk.fill(0); let t2=0;
  for(const t of torches){ const a=t.split(','),wx=+a[0],wy=+a[1],wz=+a[2],px=wx-(ox-M),pz=wz-(oz-M); if(px<0||px>=PW||pz<0||pz>=PW||wy<0||wy>=HEIGHT) continue; const i=pidx(px,wy,pz); if(lightBlk[i]<TORCH_LIGHT){ lightBlk[i]=TORCH_LIGHT; lq[t2++]=i; } }
  prop(lightBlk,t2);
}
function sampleLight(lx,y,lz,d){ const ny=y+d[1]; if(ny<0) return [0,0]; if(ny>=HEIGHT) return [15,0]; const i=pidx(lx+d[0]+M,ny,lz+d[2]+M); return [lightSky[i],lightBlk[i]]; }

// ---------- Maillage ----------
const FACES=[ {dir:[-1,0,0],corners:[[0,1,0,0,1],[0,0,0,0,0],[0,1,1,1,1],[0,0,1,1,0]]},
  {dir:[1,0,0],corners:[[1,1,1,0,1],[1,0,1,0,0],[1,1,0,1,1],[1,0,0,1,0]]},
  {dir:[0,-1,0],corners:[[1,0,1,1,0],[0,0,1,0,0],[1,0,0,1,1],[0,0,0,0,1]]},
  {dir:[0,1,0],corners:[[0,1,1,1,1],[1,1,1,0,1],[0,1,0,1,0],[1,1,0,0,0]]},
  {dir:[0,0,-1],corners:[[1,0,0,0,0],[0,0,0,1,0],[1,1,0,0,1],[0,1,0,1,1]]},
  {dir:[0,0,1],corners:[[0,0,1,0,0],[1,0,1,1,0],[0,1,1,0,1],[1,1,1,1,1]]} ];
const FACE_BRIGHT=[0.6,0.6,0.5,1.0,0.8,0.8];
function faceTile(id,f){ const d=BLOCKS[id]; return f===3?d.top:f===2?d.bottom:d.side; }
function buildMesh(c){ computeLight(c);
  const op={pos:[],l3:[],uv:[],idx:[]},tr={pos:[],l3:[],uv:[],idx:[]},ox=c.x*CHUNK,oz=c.z*CHUNK,torchPos=[];
  for(let y=0;y<HEIGHT;y++) for(let z=0;z<CHUNK;z++) for(let x=0;x<CHUNK;x++){ const id=c.blocks[vidx(x,y,z)]; if(id===AIR) continue;
    if(BLOCKS[id].noCube){ if(id===TORCH) torchPos.push([x,y,z]); continue; }
    const target=isTransparent(id)?tr:op;
    for(let f=0;f<6;f++){ const d=FACES[f].dir,nb=getBlock(ox+x+d[0],y+d[1],oz+z+d[2]); if(isOpaque(nb)||nb===id) continue;
      const [u0,v0,u1,v1]=tileUV(faceTile(id,f)),ls=sampleLight(x,y,z,d),fb=FACE_BRIGHT[f],base=target.pos.length/3;
      for(const cr of FACES[f].corners){ target.pos.push(x+cr[0],y+cr[1],z+cr[2]); target.l3.push(fb,ls[0]/15,ls[1]/15); target.uv.push(u0+cr[3]*(u1-u0),v0+cr[4]*(v1-v0)); }
      target.idx.push(base,base+1,base+2,base+2,base+1,base+3); } }
  c.mesh=swapMesh(c.mesh,op,matOpaque,ox,oz); c.water=swapMesh(c.water,tr,matWater,ox,oz);
  if(c.torchG){ scene.remove(c.torchG); } c.torchG=null;
  if(torchPos.length){ const g=new THREE.Group(); for(const [x,y,z] of torchPos) g.add(makeTorch(ox+x,y,oz+z)); scene.add(g); c.torchG=g; }
  c.dirty=false; }
function swapMesh(old,data,mat,ox,oz){ if(old){ scene.remove(old); old.geometry.dispose(); } if(data.pos.length===0) return null;
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(data.pos,3));
  g.setAttribute('light3',new THREE.Float32BufferAttribute(data.l3,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
  g.setIndex(data.idx); const m=new THREE.Mesh(g,mat); m.position.set(ox,0,oz); scene.add(m); return m; }
const _matStick=new THREE.MeshBasicMaterial({color:0x6b4a2b}),_matFlame=new THREE.MeshBasicMaterial({color:0xffcc44});
const _stickGeo=new THREE.BoxGeometry(0.14,0.55,0.14),_flameGeo=new THREE.BoxGeometry(0.20,0.20,0.20);
function makeTorch(wx,y,wz){ const g=new THREE.Group(); const s=new THREE.Mesh(_stickGeo,_matStick); s.position.set(wx+0.5,y+0.28,wz+0.5); g.add(s);
  const f=new THREE.Mesh(_flameGeo,_matFlame); f.position.set(wx+0.5,y+0.62,wz+0.5); g.add(f); return g; }

// ---------- Chunks ----------
function updateChunks(){ const pcx=Math.floor(player.pos.x/CHUNK),pcz=Math.floor(player.pos.z/CHUNK); let toGen=[];
  for(let dz=-R;dz<=R;dz++) for(let dx=-R;dx<=R;dx++){ const cx=pcx+dx,cz=pcz+dz; if(!chunks.has(ckey(cx,cz))) toGen.push([dx*dx+dz*dz,cx,cz]); }
  toGen.sort((a,b)=>a[0]-b[0]); for(let i=0;i<3&&i<toGen.length;i++) genChunk(toGen[i][1],toGen[i][2]);
  let toMesh=[]; for(const c of chunks.values()) if(c.dirty){ const dx=c.x-pcx,dz=c.z-pcz; toMesh.push([dx*dx+dz*dz,c]); }
  toMesh.sort((a,b)=>a[0]-b[0]); for(let i=0;i<3&&i<toMesh.length;i++) buildMesh(toMesh[i][1]);
  for(const [k,c] of chunks){ if(Math.abs(c.x-pcx)>R+1||Math.abs(c.z-pcz)>R+1){ if(c.mesh){ scene.remove(c.mesh); c.mesh.geometry.dispose(); } if(c.water){ scene.remove(c.water); c.water.geometry.dispose(); } if(c.torchG){ scene.remove(c.torchG); } chunks.delete(k); } } }

// ---------- Joueur & physique ----------
const player={ pos:{x:8,y:40,z:8}, vel:{x:0,y:0,z:0}, yaw:0, pitch:0, onGround:false, fly:false,
  hp:(save.hp!=null?save.hp:20), food:(save.food!=null?save.food:20), foodTimer:0, regenT:0, starveT:0, eatT:0, fallStart:null, dead:false };
player.fly=(mode!=='survival');
const HW=0.3, PH=1.8, EYE=1.62, EPS=1e-3, G=28, JUMP=8.6;
function solidLayer(by,minX,maxX,minZ,maxZ){ for(let bx=Math.floor(minX);bx<=Math.floor(maxX);bx++) for(let bz=Math.floor(minZ);bz<=Math.floor(maxZ);bz++) if(isSolid(getBlock(bx,by,bz))) return true; return false; }
function collideXZ(axis,amount){ player.pos[axis]+=amount;
  const minX=player.pos.x-HW,maxX=player.pos.x+HW,minZ=player.pos.z-HW,maxZ=player.pos.z+HW,y0=Math.floor(player.pos.y),y1=Math.floor(player.pos.y+PH-EPS);
  for(let by=y0;by<=y1;by++) for(let bx=Math.floor(minX);bx<=Math.floor(maxX);bx++) for(let bz=Math.floor(minZ);bz<=Math.floor(maxZ);bz++) if(isSolid(getBlock(bx,by,bz))){
    if(axis==='x') player.pos.x=amount>0?bx-HW-EPS:bx+1+HW+EPS; else player.pos.z=amount>0?bz-HW-EPS:bz+1+HW+EPS; player.vel[axis]=0; return; } }
function collideY(amount){ player.pos.y+=amount; const minX=player.pos.x-HW,maxX=player.pos.x+HW,minZ=player.pos.z-HW,maxZ=player.pos.z+HW;
  if(amount<0){ const by=Math.floor(player.pos.y); if(solidLayer(by,minX,maxX,minZ,maxZ)){ player.pos.y=by+1+EPS; player.vel.y=0; player.onGround=true; } }
  else if(amount>0){ const by=Math.floor(player.pos.y+PH); if(solidLayer(by,minX,maxX,minZ,maxZ)){ player.pos.y=by-PH-EPS; player.vel.y=0; } } }
function intersectsPlayer(bx,by,bz){ return bx<player.pos.x+HW&&bx+1>player.pos.x-HW&&by<player.pos.y+PH&&by+1>player.pos.y&&bz<player.pos.z+HW&&bz+1>player.pos.z-HW; }

// ===================== INVENTAIRE / CRAFT / FOUR =====================
function padTo(a,n){ const r=(a||[]).slice(0,n); while(r.length<n) r.push(null); return r; }
let inv=padTo(save.inv,9), storage=padTo(save.storage,27);
let selected=0, cursor=null, craft=[], gridW=2, outputItem=null, recipeIdx=0, tableMode=false, furnaceMode=false, invOpen=false;
let furnace=save.furnace||{input:null,fuel:null,output:null,burn:0,burnMax:0,cook:0}; let frRenderT=0;
let lastMouse={x:0,y:0};
const hotbarEl=document.getElementById('hotbar'), invScreen=document.getElementById('invScreen'), invRoot=document.getElementById('invRoot'), cursorEl=document.getElementById('cursorItem');
function iconFor(id,size){ const cv=document.createElement('canvas'); cv.width=cv.height=size; const g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
  const t=BLOCKS[id].side,c=t%ATLAS_TILES,r=(t/ATLAS_TILES)|0; g.drawImage(atlas,c*TILE,r*TILE,TILE,TILE,0,0,size,size); return cv; }
function zoneArr(z){ return z==='hotbar'?inv:z==='storage'?storage:z==='craft'?craft:null; }
function getSlot(z,i){ if(z==='output') return outputItem; if(z==='finput') return furnace.input; if(z==='ffuel') return furnace.fuel; if(z==='foutput') return furnace.output; return zoneArr(z)[i]; }
function setSlot(z,i,v){ if(z==='finput') furnace.input=v; else if(z==='ffuel') furnace.fuel=v; else if(z==='foutput') furnace.output=v; else zoneArr(z)[i]=v; }
function addItemToPlayer(id,n){ const max=maxStackOf(id);
  for(const arr of [inv,storage]) for(const s of arr) if(s&&s.id===id&&s.count<max){ const a=Math.min(max-s.count,n); s.count+=a; n-=a; if(n<=0){ refreshInv(); return true; } }
  for(const arr of [inv,storage]) for(let i=0;i<arr.length;i++) if(!arr[i]){ const a=Math.min(max,n); arr[i]={id,count:a}; n-=a; if(n<=0){ refreshInv(); return true; } }
  refreshInv(); return n<=0; }
function countPlayer(id){ let n=0; for(const arr of [inv,storage]) for(const s of arr) if(s&&s.id===id) n+=s.count; return n; }
function removeOneFromPlayer(id){ for(const arr of [inv,storage]) for(let i=0;i<arr.length;i++){ const s=arr[i]; if(s&&s.id===id){ s.count--; if(s.count<=0) arr[i]=null; return true; } } return false; }
function renderHotbar(){ hotbarEl.innerHTML='';
  for(let i=0;i<9;i++){ const slot=document.createElement('div'); slot.className='slot'+(i===selected?' sel':'');
    const num=document.createElement('div'); num.className='num'; num.textContent=i+1; slot.appendChild(num); const it=inv[i];
    if(it){ const ic=iconFor(it.id,38); ic.style.width=ic.style.height='38px'; slot.appendChild(ic); if(it.count>1){ const cnt=document.createElement('div'); cnt.className='cnt'; cnt.textContent=it.count; slot.appendChild(cnt); } }
    hotbarEl.appendChild(slot); } }
function selectSlot(i){ selected=i; renderHotbar(); }

const RECIPES=[
  {result:{id:PLANKS,count:4},shapeless:[WOOD]},
  {result:{id:STICK,count:4},shape:[[PLANKS],[PLANKS]]},
  {result:{id:CRAFT_TABLE,count:1},shape:[[PLANKS,PLANKS],[PLANKS,PLANKS]]},
  {result:{id:TORCH,count:4},shape:[[COAL],[STICK]]},
  {result:{id:BRICK,count:2},shape:[[COBBLE,COBBLE],[COBBLE,COBBLE]]},
  {result:{id:FURNACE,count:1},shape:[[COBBLE,COBBLE,COBBLE],[COBBLE,0,COBBLE],[COBBLE,COBBLE,COBBLE]]},
  {result:{id:WOOD_PICK,count:1},shape:[[PLANKS,PLANKS,PLANKS],[0,STICK,0],[0,STICK,0]]},
  {result:{id:WOOD_AXE,count:1},shape:[[PLANKS,PLANKS],[PLANKS,STICK],[0,STICK]]},
  {result:{id:WOOD_SHOVEL,count:1},shape:[[PLANKS],[STICK],[STICK]]},
  {result:{id:STONE_PICK,count:1},shape:[[COBBLE,COBBLE,COBBLE],[0,STICK,0],[0,STICK,0]]},
  {result:{id:STONE_AXE,count:1},shape:[[COBBLE,COBBLE],[COBBLE,STICK],[0,STICK]]},
  {result:{id:STONE_SHOVEL,count:1},shape:[[COBBLE],[STICK],[STICK]]},
  {result:{id:IRON_PICK,count:1},shape:[[IRON_INGOT,IRON_INGOT,IRON_INGOT],[0,STICK,0],[0,STICK,0]]},
  {result:{id:IRON_AXE,count:1},shape:[[IRON_INGOT,IRON_INGOT],[IRON_INGOT,STICK],[0,STICK]]},
  {result:{id:IRON_SHOVEL,count:1},shape:[[IRON_INGOT],[STICK],[STICK]]},
  {result:{id:BOOKSHELF,count:1},shape:[[PLANKS,PLANKS,PLANKS],[COAL,COAL,COAL],[PLANKS,PLANKS,PLANKS]]},
];
function recipeFits(r,W){ if(r.shapeless) return true; if(r.shape.length>W) return false; for(const row of r.shape) if(row.length>W) return false; return true; }
function availRecipes(){ return RECIPES.filter(r=>recipeFits(r,gridW)); }
function gridPattern(cells,W){ const H=cells.length/W; let minR=99,maxR=-1,minC=99,maxC=-1;
  for(let r=0;r<H;r++) for(let c=0;c<W;c++) if(cells[r*W+c]){ minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c); }
  if(maxR<0) return null; const pat=[]; for(let r=minR;r<=maxR;r++){ const row=[]; for(let c=minC;c<=maxC;c++){ const cell=cells[r*W+c]; row.push(cell?cell.id:0); } pat.push(row); } return pat; }
function patEqual(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++){ if(a[i].length!==b[i].length) return false; for(let j=0;j<a[i].length;j++) if((a[i][j]||0)!==(b[i][j]||0)) return false; } return true; }
function matchRecipe(cells,W){ const present=cells.filter(c=>c); if(present.length===0) return null;
  for(const r of RECIPES){ if(r.shapeless){ if(present.length===r.shapeless.length){ const a=present.map(c=>c.id).sort(),b=r.shapeless.slice().sort(); if(a.every((v,i)=>v===b[i])) return r.result; } }
    else { const pat=gridPattern(cells,W); if(pat&&patEqual(pat,r.shape)) return r.result; } } return null; }
function recomputeOutput(){ outputItem=matchRecipe(craft,gridW); }

function clickSlot(zone,i,right){
  if(zone==='output'){ takeOutput(); return; }
  if(zone==='foutput'){ takeFurnaceOut(); return; }
  const slot=getSlot(zone,i);
  if(!right){
    if(!cursor){ if(slot){ cursor=slot; setSlot(zone,i,null); } }
    else if(!slot){ setSlot(zone,i,cursor); cursor=null; }
    else if(slot.id===cursor.id){ const a=Math.min(maxStackOf(slot.id)-slot.count,cursor.count); slot.count+=a; cursor.count-=a; if(cursor.count<=0) cursor=null; }
    else { setSlot(zone,i,cursor); cursor=slot; }
  } else {
    if(cursor){ if(!slot){ setSlot(zone,i,{id:cursor.id,count:1}); cursor.count--; if(cursor.count<=0) cursor=null; }
                else if(slot.id===cursor.id&&slot.count<maxStackOf(slot.id)){ slot.count++; cursor.count--; if(cursor.count<=0) cursor=null; } }
    else if(slot){ const half=Math.ceil(slot.count/2); cursor={id:slot.id,count:half}; slot.count-=half; if(slot.count<=0) setSlot(zone,i,null); }
  }
  if(zone==='craft') recomputeOutput();
  refreshInv();
}
function takeOutput(){ if(!outputItem) return; if(cursor&&(cursor.id!==outputItem.id||cursor.count+outputItem.count>maxStackOf(outputItem.id))) return;
  for(let k=0;k<craft.length;k++) if(craft[k]){ craft[k].count--; if(craft[k].count<=0) craft[k]=null; }
  if(!cursor) cursor={id:outputItem.id,count:outputItem.count}; else cursor.count+=outputItem.count; recomputeOutput(); refreshInv(); }
function takeFurnaceOut(){ const o=furnace.output; if(!o) return;
  if(!cursor){ cursor=o; furnace.output=null; } else if(cursor.id===o.id){ const a=Math.min(maxStackOf(o.id)-cursor.count,o.count); cursor.count+=a; o.count-=a; if(o.count<=0) furnace.output=null; } refreshInv(); }
function autofill(r){ const need=[];
  if(r.shapeless){ r.shapeless.forEach((id,k)=>need.push({cell:k,id})); }
  else { for(let rr=0;rr<r.shape.length;rr++) for(let cc=0;cc<r.shape[rr].length;cc++){ const id=r.shape[rr][cc]; if(id){ if(cc>=gridW||rr>=gridW) return; need.push({cell:rr*gridW+cc,id}); } } }
  const want={}; need.forEach(n=>want[n.id]=(want[n.id]||0)+1);
  for(const id in want) if(countPlayer(+id)<want[id]) return;
  for(let k=0;k<craft.length;k++) if(craft[k]){ addItemToPlayer(craft[k].id,craft[k].count); craft[k]=null; }
  for(const n of need){ removeOneFromPlayer(n.id); if(!craft[n.cell]) craft[n.cell]={id:n.id,count:1}; else craft[n.cell].count++; }
  recomputeOutput(); refreshInv(); }

function makeSlot(zone,i,cls){ const d=document.createElement('div'); d.className='slot2 '+cls; d.dataset.zone=zone; d.dataset.i=i;
  const v=getSlot(zone,i); if(v){ const ic=iconFor(v.id,42); ic.style.width=ic.style.height='42px'; d.appendChild(ic); if(v.count>1){ const c=document.createElement('span'); c.className='cnt'; c.textContent=v.count; d.appendChild(c); } }
  d.onmousedown=(e)=>{ e.preventDefault(); clickSlot(zone,i,e.button===2); }; return d; }
function buildCraftArea(){ const area=document.createElement('div'); area.className='craftArea';
  const g=document.createElement('div'); g.className='cgrid'; g.style.gridTemplateColumns='repeat('+gridW+',60px)';
  for(let i=0;i<gridW*gridW;i++) g.appendChild(makeSlot('craft',i,'tan'));
  const ar=document.createElement('div'); ar.className='cArrow'; ar.textContent='➜';
  area.appendChild(g); area.appendChild(ar); area.appendChild(makeSlot('output',0,'out')); return area; }
function buildFurnaceArea(){ const area=document.createElement('div'); area.className='craftArea';
  const col=document.createElement('div'); col.style.cssText='display:flex;flex-direction:column;align-items:center;gap:10px;';
  col.appendChild(makeSlot('finput',0,'tan'));
  const fl=document.createElement('div'); fl.textContent='🔥'; fl.style.cssText='font-size:24px;opacity:'+(furnace.burn>0?1:0.3); col.appendChild(fl);
  col.appendChild(makeSlot('ffuel',0,'tan'));
  const ar=document.createElement('div'); ar.className='cArrow'; ar.textContent='➜';
  area.appendChild(col); area.appendChild(ar); area.appendChild(makeSlot('foutput',0,'out')); return area; }
function miniGrid(r){ const m=document.createElement('div'); m.className='rbMini';
  if(r.shapeless){ m.style.gridTemplateColumns='repeat('+r.shapeless.length+',22px)'; for(const id of r.shapeless){ const c=document.createElement('div'); c.className='rbCell'; const ic=iconFor(id,20); ic.style.width=ic.style.height='20px'; c.appendChild(ic); m.appendChild(c); } }
  else { const w=r.shape[0].length; m.style.gridTemplateColumns='repeat('+w+',22px)'; for(const rowArr of r.shape) for(const id of rowArr){ const c=document.createElement('div'); c.className='rbCell'; if(id){ const ic=iconFor(id,20); ic.style.width=ic.style.height='20px'; c.appendChild(ic); } m.appendChild(c); } } return m; }
function makeRecipeBook(){ const list=availRecipes(); const wrap=document.createElement('div'); wrap.className='recipeBook'; if(!list.length) return wrap;
  recipeIdx=((recipeIdx%list.length)+list.length)%list.length;
  const prev=document.createElement('button'); prev.className='arrow'; prev.textContent='◀'; prev.onclick=()=>{ recipeIdx=(recipeIdx-1+list.length)%list.length; renderInvScreen(); };
  const next=document.createElement('button'); next.className='arrow'; next.textContent='▶'; next.onclick=()=>{ recipeIdx=(recipeIdx+1)%list.length; renderInvScreen(); };
  const r=list[recipeIdx]; const card=document.createElement('div'); card.className='rbCard'; card.title='Cliquer pour préparer';
  const res=document.createElement('div'); res.className='rbRes'; const ic=iconFor(r.result.id,32); ic.style.width=ic.style.height='32px'; res.appendChild(ic);
  const rc=document.createElement('span'); rc.textContent=r.result.count; res.appendChild(rc);
  const ar=document.createElement('div'); ar.className='rbArrow'; ar.textContent='→';
  const nm=document.createElement('span'); nm.className='rbName'; nm.textContent=BLOCKS[r.result.id].name;
  card.appendChild(res); card.appendChild(ar); card.appendChild(miniGrid(r)); card.appendChild(nm); card.onclick=()=>autofill(r);
  wrap.appendChild(prev); wrap.appendChild(card); wrap.appendChild(next); return wrap; }
function inventoryGrids(host){ const grid=document.createElement('div'); grid.className='storeGrid'; for(let i=0;i<27;i++) grid.appendChild(makeSlot('storage',i,'light')); host.appendChild(grid);
  const bar=document.createElement('div'); bar.className='hotRow'; for(let i=0;i<9;i++) bar.appendChild(makeSlot('hotbar',i,'dark'+(i===selected?' sel':''))); host.appendChild(bar); }
function renderInvScreen(){ invRoot.innerHTML=''; invRoot.className='invRoot';
  if(furnaceMode){ const ip=document.createElement('div'); ip.className='ipanel'; const h=document.createElement('h2'); h.textContent='Inventaire'; ip.appendChild(h); inventoryGrids(ip); invRoot.appendChild(ip);
    const fp=document.createElement('div'); fp.className='cpanel'; const h2=document.createElement('h2'); h2.textContent='Four'; fp.appendChild(h2); fp.appendChild(buildFurnaceArea()); invRoot.appendChild(fp); }
  else if(tableMode){ const ip=document.createElement('div'); ip.className='ipanel'; const h1=document.createElement('h2'); h1.textContent='Inventaire'; ip.appendChild(h1); inventoryGrids(ip); invRoot.appendChild(ip);
    const cp=document.createElement('div'); cp.className='cpanel'; const h2=document.createElement('h2'); h2.textContent='Table de craft'; cp.appendChild(h2);
    const col=document.createElement('div'); col.className='craftCol'; col.appendChild(buildCraftArea()); col.appendChild(makeRecipeBook()); cp.appendChild(col); invRoot.appendChild(cp); }
  else { const p=document.createElement('div'); p.className='ipanel big'; const h=document.createElement('h2'); h.textContent='Inventaire'; p.appendChild(h);
    const row=document.createElement('div'); row.className='soloRow'; const left=document.createElement('div'); inventoryGrids(left);
    const col=document.createElement('div'); col.className='craftCol'; col.appendChild(buildCraftArea()); col.appendChild(makeRecipeBook());
    row.appendChild(left); row.appendChild(col); p.appendChild(row); invRoot.appendChild(p); }
  const close=document.createElement('button'); close.className='btn grey'; close.textContent='Fermer (E)'; close.style.cssText='position:absolute; top:16px; right:18px;'; close.onclick=closeInv; invRoot.appendChild(close);
  updateCursorEl(); }
function updateCursorEl(){ if(cursor){ cursorEl.innerHTML=''; const ic=iconFor(cursor.id,42); ic.style.width=ic.style.height='42px'; cursorEl.appendChild(ic);
    if(cursor.count>1){ const c=document.createElement('span'); c.className='cnt'; c.textContent=cursor.count; cursorEl.appendChild(c); } cursorEl.style.display='block'; cursorEl.style.left=(lastMouse.x-22)+'px'; cursorEl.style.top=(lastMouse.y-22)+'px'; }
  else cursorEl.style.display='none'; }
function refreshInv(){ renderHotbar(); if(invOpen) renderInvScreen(); }
function openInv(table){ invOpen=true; tableMode=!!table; furnaceMode=false; gridW=table?3:2; craft=new Array(gridW*gridW).fill(null); outputItem=null; recipeIdx=0;
  invScreen.classList.remove('hidden'); overlay.classList.add('hidden'); document.exitPointerLock(); renderInvScreen(); }
function openFurnace(){ invOpen=true; furnaceMode=true; tableMode=false; invScreen.classList.remove('hidden'); overlay.classList.add('hidden'); document.exitPointerLock(); renderInvScreen(); }
function closeInv(){ for(let k=0;k<craft.length;k++) if(craft[k]){ if(!addItemToPlayer(craft[k].id,craft[k].count)) spawnItem(player.pos.x,player.pos.y+1,player.pos.z,craft[k].id); craft[k]=null; }
  if(cursor){ if(!addItemToPlayer(cursor.id,cursor.count)) spawnItem(player.pos.x,player.pos.y+1,player.pos.z,cursor.id); cursor=null; }
  invOpen=false; furnaceMode=false; invScreen.classList.add('hidden'); updateCursorEl(); lock(); }
function updateFurnace(dt){ const f=furnace; const inId=f.input&&f.input.id; const out=inId!=null?SMELT[inId]:null;
  const canOut = out!=null && (!f.output || (f.output.id===out && f.output.count<STACK));
  if(out!=null && canOut){
    if(f.burn<=0 && f.fuel && FUEL[f.fuel.id]){ f.burnMax=FUEL[f.fuel.id]*COOK_TIME; f.burn=f.burnMax; f.fuel.count--; if(f.fuel.count<=0) f.fuel=null; }
    if(f.burn>0){ f.burn-=dt; f.cook+=dt; if(f.cook>=COOK_TIME){ f.cook=0; if(!f.output) f.output={id:out,count:1}; else f.output.count++; f.input.count--; if(f.input.count<=0) f.input=null; } }
    else f.cook=0;
  } else { f.cook=0; if(f.burn>0) f.burn-=dt; }
  if(invOpen&&furnaceMode){ frRenderT+=dt; if(frRenderT>0.3){ frRenderT=0; renderInvScreen(); } } }

// ---------- Items au sol ----------
let items=[]; const _itemGeo={};
function itemGeo(id){ if(_itemGeo[id]) return _itemGeo[id]; const g=new THREE.BoxGeometry(0.3,0.3,0.3); const [u0,v0,u1,v1]=tileUV(BLOCKS[id].side); const uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++){ uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0)); } uv.needsUpdate=true; _itemGeo[id]=g; return g; }
function spawnItem(x,y,z,id){ if(items.length>300){ const old=items.shift(); scene.remove(old.mesh); } const mesh=new THREE.Mesh(itemGeo(id),matItem); scene.add(mesh);
  items.push({x,y,z,vx:(Math.random()-0.5)*1.2,vy:2.2+Math.random(),vz:(Math.random()-0.5)*1.2,id,age:0,mesh}); }
function updateItems(dt){ for(const it of items){ it.age+=dt; it.vy-=20*dt; it.y+=it.vy*dt;
    if(it.vy<0){ const by=Math.floor(it.y-0.15); if(isSolid(getBlock(Math.floor(it.x),by,Math.floor(it.z)))){ it.y=by+1+0.15; it.vy=0; } }
    it.x+=it.vx*dt; it.z+=it.vz*dt; it.vx*=0.82; it.vz*=0.82;
    const dx=player.pos.x-it.x,dy=(player.pos.y+0.8)-it.y,dz=player.pos.z-it.z,d=Math.hypot(dx,dy,dz)||1;
    if(it.age>0.4&&d<1.5){ if(d<0.7){ if(addItemToPlayer(it.id,1)) it.dead=true; } else { it.x+=dx/d*4.5*dt; it.y+=dy/d*4.5*dt; it.z+=dz/d*4.5*dt; } }
    it.mesh.position.set(it.x,it.y+Math.sin(it.age*3)*0.06,it.z); it.mesh.rotation.y=it.age*2.2; }
  if(items.some(it=>it.dead)) items=items.filter(it=>{ if(it.dead) scene.remove(it.mesh); return !it.dead; }); }

// ---------- Animaux ----------
const MOB_CAP=14; let mobs=[],mobTimer=0; const _mobMat={};
function mobMat(c){ return _mobMat[c]||(_mobMat[c]=new THREE.MeshBasicMaterial({color:c})); }
function mbox(w,h,d,color,x,y,z){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mobMat(color)); m.position.set(x,y,z); return m; }
function makeMobModel(type){ const g=new THREE.Group(); g.userData.legs=[]; const legs=g.userData.legs;
  if(type==='pig'){ g.add(mbox(0.9,0.55,0.6,0xe79a9a,0,0.55,0)); g.add(mbox(0.45,0.45,0.4,0xe79a9a,0,0.62,0.5)); g.add(mbox(0.22,0.16,0.1,0xcf7f7f,0,0.56,0.72));
    for(const p of [[-0.3,-0.2],[0.3,-0.2],[-0.3,0.2],[0.3,0.2]]){ const l=mbox(0.18,0.35,0.18,0xcf7f7f,p[0],0.18,p[1]); g.add(l); legs.push(l); } }
  else if(type==='cow'){ g.add(mbox(1.0,0.7,0.6,0x6b4a32,0,0.72,0)); g.add(mbox(0.5,0.5,0.45,0x6b4a32,0,0.88,0.55)); g.add(mbox(0.08,0.13,0.08,0xeeeeea,-0.15,1.16,0.6)); g.add(mbox(0.08,0.13,0.08,0xeeeeea,0.15,1.16,0.6));
    for(const p of [[-0.32,-0.22],[0.32,-0.22],[-0.32,0.22],[0.32,0.22]]){ const l=mbox(0.2,0.5,0.2,0x4a3424,p[0],0.25,p[1]); g.add(l); legs.push(l); } }
  else { g.add(mbox(0.4,0.4,0.3,0xf2f2f2,0,0.42,0)); g.add(mbox(0.28,0.28,0.26,0xf2f2f2,0,0.64,0.18)); g.add(mbox(0.1,0.07,0.12,0xe2a13a,0,0.62,0.36)); g.add(mbox(0.12,0.1,0.04,0xc0392b,0,0.8,0.16));
    for(const sx of [-0.1,0.1]){ const l=mbox(0.08,0.25,0.08,0xe2a13a,sx,0.12,0); g.add(l); legs.push(l); } }
  return g; }
function spawnMob(x,y,z,type){ const model=makeMobModel(type); scene.add(model);
  const d=type==='cow'?{hw:0.45,h:1.3,sp:1.0,hp:3}:type==='pig'?{hw:0.45,h:0.9,sp:1.1,hp:3}:{hw:0.25,h:0.7,sp:1.4,hp:2};
  mobs.push({type,pos:{x,y,z},vy:0,yaw:Math.random()*6.28,wt:1+Math.random()*2,moving:true,onGround:false,walk:0,model,hw:d.hw,h:d.h,speed:d.sp,hp:d.hp}); }
function trySpawnMob(){ if(mobs.length>=MOB_CAP) return; const ang=Math.random()*6.28,dist=10+Math.random()*12;
  const wx=Math.floor(player.pos.x+Math.cos(ang)*dist),wz=Math.floor(player.pos.z+Math.sin(ang)*dist);
  for(let y=HEIGHT-2;y>1;y--){ if(getBlock(wx,y,wz)===GRASS&&getBlock(wx,y+1,wz)===AIR){ spawnMob(wx+0.5,y+1,wz+0.5,['cow','pig','chicken'][Math.floor(Math.random()*3)]); return; } } }
function mobSolidAt(e,axis,amount){ e.pos[axis]+=amount; const hw=e.hw,h=e.h,y0=Math.floor(e.pos.y),y1=Math.floor(e.pos.y+h-EPS);
  for(let by=y0;by<=y1;by++) for(let bx=Math.floor(e.pos.x-hw);bx<=Math.floor(e.pos.x+hw);bx++) for(let bz=Math.floor(e.pos.z-hw);bz<=Math.floor(e.pos.z+hw);bz++)
    if(isSolid(getBlock(bx,by,bz))){ if(axis==='x') e.pos.x=amount>0?bx-hw-EPS:bx+1+hw+EPS; else e.pos.z=amount>0?bz-hw-EPS:bz+1+hw+EPS; return true; } return false; }
function mobY(e,amount){ e.pos.y+=amount; const hw=e.hw,h=e.h;
  if(amount<0){ const by=Math.floor(e.pos.y); for(let bx=Math.floor(e.pos.x-hw);bx<=Math.floor(e.pos.x+hw);bx++) for(let bz=Math.floor(e.pos.z-hw);bz<=Math.floor(e.pos.z+hw);bz++) if(isSolid(getBlock(bx,by,bz))){ e.pos.y=by+1+EPS; e.vy=0; e.onGround=true; return; } }
  else if(amount>0){ const by=Math.floor(e.pos.y+h); for(let bx=Math.floor(e.pos.x-hw);bx<=Math.floor(e.pos.x+hw);bx++) for(let bz=Math.floor(e.pos.z-hw);bz<=Math.floor(e.pos.z+hw);bz++) if(isSolid(getBlock(bx,by,bz))){ e.pos.y=by-h-EPS; e.vy=0; return; } } }
function updateMobs(dt){ mobTimer+=dt; if(mobTimer>2.5){ mobTimer=0; trySpawnMob(); }
  for(const e of mobs){ e.wt-=dt; if(e.wt<=0){ e.wt=2+Math.random()*3; e.moving=Math.random()<0.7; e.yaw=Math.random()*6.28; }
    let vx=0,vz=0; if(e.moving){ vx=-Math.sin(e.yaw)*e.speed; vz=-Math.cos(e.yaw)*e.speed; }
    e.vy-=G*dt; e.onGround=false; mobY(e,e.vy*dt); const bX=mobSolidAt(e,'x',vx*dt),bZ=mobSolidAt(e,'z',vz*dt); if((bX||bZ)&&e.onGround) e.vy=6;
    if(Math.hypot(e.pos.x-player.pos.x,e.pos.z-player.pos.z)>46){ scene.remove(e.model); e.dead=true; continue; }
    e.model.position.set(e.pos.x,e.pos.y,e.pos.z); e.model.rotation.y=e.yaw+Math.PI; const legs=e.model.userData.legs;
    if(e.moving){ e.walk+=dt*8; const s=Math.sin(e.walk)*0.4; for(let i=0;i<legs.length;i++) legs[i].rotation.x=(i%2?-s:s); } else for(const l of legs) l.rotation.x=0; }
  if(mobs.some(e=>e.dead)) mobs=mobs.filter(e=>!e.dead); }
function mobTarget(){ camera.getWorldDirection(_dir); const o=camera.position; let best=null,bd=4.5;
  for(const e of mobs){ const cx=e.pos.x-o.x,cy=(e.pos.y+e.h*0.5)-o.y,cz=e.pos.z-o.z,d=Math.hypot(cx,cy,cz); if(d>4.5) continue; const dot=(cx*_dir.x+cy*_dir.y+cz*_dir.z)/d; if(dot>0.94&&d<bd){ bd=d; best=e; } } return best; }
function hitMob(e){ e.hp--; const dx=e.pos.x-player.pos.x,dz=e.pos.z-player.pos.z,d=Math.hypot(dx,dz)||1; e.pos.x+=dx/d*0.6; e.pos.z+=dz/d*0.6; e.vy=4;
  if(e.hp<=0){ const n=1+(Math.random()*2|0); for(let i=0;i<n;i++) spawnItem(e.pos.x,e.pos.y+0.4,e.pos.z,VIANDE); scene.remove(e.model); e.dead=true; mobs=mobs.filter(m=>!m.dead); } }

// ---------- Sons (synthétisés, sans fichier audio) ----------
let ACTX=null, MGAIN=null;
function audio(){ if(!ACTX){ try{ ACTX=new (window.AudioContext||window.webkitAudioContext)(); MGAIN=ACTX.createGain(); MGAIN.gain.value=soundOn?soundVol:0; MGAIN.connect(ACTX.destination); }catch(e){} } return ACTX; }
function applySound(){ if(MGAIN) MGAIN.gain.value=soundOn?soundVol:0; }
function tone(freq,dur,type,vol,slideTo){ const a=audio(); if(!a) return; const o=a.createOscillator(),g=a.createGain();
  o.type=type||'square'; o.frequency.value=freq; if(slideTo) o.frequency.linearRampToValueAtTime(slideTo,a.currentTime+dur);
  g.gain.value=vol||0.12; g.gain.exponentialRampToValueAtTime(0.0008,a.currentTime+dur); o.connect(g); g.connect(MGAIN||a.destination); o.start(); o.stop(a.currentTime+dur); }
function noiseBurst(dur,vol,freq){ const a=audio(); if(!a) return; const len=Math.max(1,(a.sampleRate*dur)|0),buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1; const n=a.createBufferSource(); n.buffer=buf; const g=a.createGain(); g.gain.value=vol||0.18;
  g.gain.exponentialRampToValueAtTime(0.0008,a.currentTime+dur); const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq||1000; n.connect(f); f.connect(g); g.connect(MGAIN||a.destination); n.start(); n.stop(a.currentTime+dur); }
const SFX={ dig:()=>noiseBurst(0.13,0.25,900), place:()=>noiseBurst(0.1,0.22,520),
  step:()=>noiseBurst(0.05,0.07,380), hurt:()=>{ tone(220,0.22,'square',0.18,80); noiseBurst(0.1,0.08,600); },
  eat:()=>{ noiseBurst(0.06,0.14,800); noiseBurst(0.04,0.08,1200); },
  splash:()=>noiseBurst(0.25,0.18,1600), pop:()=>tone(740,0.07,'sine',0.14,1100),
  levelup:()=>{ tone(440,0.1,'sine',0.12); tone(550,0.1,'sine',0.1); tone(660,0.15,'sine',0.12); } };

// ---------- Minage / pose ----------
let mouseLeft=false,mouseRight=false; const mining={key:null,t:0};
function matOf(id){
  if(id===STONE||id===COBBLE||id===COAL_ORE||id===IRON_ORE||id===BRICK||id===FURNACE||id===BEDROCK) return 'stone';
  if(id===DIRT||id===GRASS) return 'dirt';
  if(id===SAND) return 'sand'; if(id===SNOW) return 'snow'; if(id===GLASS) return 'glass';
  if(id===LEAVES||id===CACTUS) return 'leaves'; return 'wood';
}
function digSound(id){ switch(matOf(id)){
  case 'stone': noiseBurst(0.12,0.26,480); tone(100,0.08,'square',0.07,70); break;
  case 'dirt':  noiseBurst(0.14,0.24,280); tone(80,0.06,'sine',0.04,60); break;
  case 'sand':  noiseBurst(0.16,0.20,1800); break;
  case 'snow':  noiseBurst(0.14,0.14,2500); tone(600,0.06,'sine',0.03,400); break;
  case 'glass': tone(1400,0.14,'triangle',0.14,2000); noiseBurst(0.07,0.18,4500); break;
  case 'leaves':noiseBurst(0.12,0.16,2800); tone(300,0.05,'sine',0.03,200); break;
  default:      noiseBurst(0.13,0.26,1000); tone(130,0.06,'square',0.04,90); } }
function placeSound(id){ switch(matOf(id)){
  case 'stone': noiseBurst(0.09,0.22,440); tone(120,0.05,'square',0.04,90); break;
  case 'dirt':  noiseBurst(0.10,0.18,300); break;
  case 'sand': case 'snow': noiseBurst(0.11,0.15,1600); break;
  case 'glass': tone(950,0.08,'sine',0.11,1400); break;
  case 'leaves': noiseBurst(0.08,0.11,2500); break;
  default: noiseBurst(0.10,0.22,750); } }
function breakBlock(x,y,z,id){ digSound(id); if(mode!=='creative'&&id!==WATER&&id!==BEDROCK) spawnItem(x+0.5,y+0.55,z+0.5,dropOf(id)); editBlock(x,y,z,AIR); }
function tryPlace(){ const slot=inv[selected]; if(!slot||slot.count<=0) return; if(BLOCKS[slot.id].item) return;
  const hit=raycast(); if(!hit) return; const px=hit.x+hit.nx,py=hit.y+hit.ny,pz=hit.z+hit.nz,cur=getBlock(px,py,pz);
  if((cur===AIR||cur===WATER)&&!intersectsPlayer(px,py,pz)){ editBlock(px,py,pz,slot.id); placeSound(slot.id); if(mode!=='creative'){ slot.count--; if(slot.count<=0) inv[selected]=null; } renderHotbar(); } }

// ---------- Entrées ----------
const keys={};
const canvas=document.getElementById('game'),overlay=document.getElementById('overlay');
function lock(){ const a=audio(); if(a&&a.state==='suspended') a.resume(); const p=canvas.requestPointerLock(); if(p&&p.catch)p.catch(()=>{}); }
addEventListener('keydown',e=>{
  if(e.code==='KeyE'){ if(invOpen) closeInv(); else if(document.pointerLockElement===canvas) openInv(false); return; }
  if(invOpen){ if(e.code==='Escape') closeInv(); return; }
  if(document.pointerLockElement!==canvas) return;
  keys[e.code]=true; if(e.code==='KeyF'){ setMode(mode==='creative'?'survival':'creative'); }
  if(e.code.startsWith('Digit')){ const n=+e.code.slice(5); if(n>=1&&n<=9) selectSlot(n-1); }
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
document.addEventListener('pointerlockchange',()=>{ const playing=document.pointerLockElement===canvas;
  if(playing){ overlay.classList.add('hidden'); } else { for(const k in keys) keys[k]=false; mouseLeft=false; mouseRight=false; mining.key=null; breakBox.visible=false; saveNow(); if(!invOpen&&!player.dead){ overlay.classList.remove('hidden'); refreshPauseInfo(); } } });
addEventListener('mousemove',e=>{ if(invOpen){ lastMouse.x=e.clientX; lastMouse.y=e.clientY; if(cursor){ cursorEl.style.left=(e.clientX-22)+'px'; cursorEl.style.top=(e.clientY-22)+'px'; } return; }
  if(document.pointerLockElement!==canvas) return; player.yaw-=e.movementX*mouseSens; player.pitch-=e.movementY*mouseSens; player.pitch=Math.max(-1.55,Math.min(1.55,player.pitch)); });
addEventListener('mousedown',e=>{ if(document.pointerLockElement!==canvas) return; if(mode==='spectator') return;
  if(e.button===0){ const m=mobTarget(); if(m) hitMob(m); else mouseLeft=true; }
  else if(e.button===2){ mouseRight=true; const hit=raycast(); if(hit){ const tb=getBlock(hit.x,hit.y,hit.z); if(tb===CRAFT_TABLE){ openInv(true); return; } if(tb===FURNACE){ openFurnace(); return; } } tryPlace(); } });
addEventListener('mouseup',e=>{ if(e.button===0){ mouseLeft=false; mining.key=null; breakBox.visible=false; } if(e.button===2){ mouseRight=false; player.eatT=0; } });
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{ if(document.pointerLockElement!==canvas) return; selectSlot((selected+(e.deltaY>0?1:-1)+9)%9); });
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

// ---------- Raycasting ----------
const _dir=new THREE.Vector3();
function raycast(){ const o=camera.position; camera.getWorldDirection(_dir); const d=_dir;
  let x=Math.floor(o.x),y=Math.floor(o.y),z=Math.floor(o.z); const sx=d.x>0?1:-1,sy=d.y>0?1:-1,sz=d.z>0?1:-1;
  const tdx=Math.abs(1/d.x),tdy=Math.abs(1/d.y),tdz=Math.abs(1/d.z);
  let tx=d.x===0?Infinity:tdx*(d.x>0?(x+1-o.x):(o.x-x)),ty=d.y===0?Infinity:tdy*(d.y>0?(y+1-o.y):(o.y-y)),tz=d.z===0?Infinity:tdz*(d.z>0?(z+1-o.z):(o.z-z));
  let nx=0,ny=0,nz=0; const MAX=6;
  for(let i=0;i<80;i++){ const id=getBlock(x,y,z); if(id!==AIR&&id!==WATER) return {x,y,z,nx,ny,nz};
    if(tx<ty&&tx<tz){ if(tx>MAX)break; x+=sx; tx+=tdx; nx=-sx;ny=0;nz=0; } else if(ty<tz){ if(ty>MAX)break; y+=sy; ty+=tdy; nx=0;ny=-sy;nz=0; } else { if(tz>MAX)break; z+=sz; tz+=tdz; nx=0;ny=0;nz=-sz; } }
  return null; }

// ---------- Jour/nuit ----------
let dayTime=(save.dayTime!=null)?save.dayTime:0.30; const DAY_LEN=180;
function updateSky(dt){ dayTime=(dayTime+dt/DAY_LEN)%1; const s=Math.sin(dayTime*Math.PI*2),day=Math.max(0,s),skyLevel=4+11*day;
  lightU.uSky.value=skyLevel/15; scene.background.copy(SKY_NIGHT).lerp(SKY_DAY,day); scene.fog.color.copy(scene.background); lightU.fogColor.value.copy(scene.background); }

// ---------- Vie / faim ----------
const healthCv=document.getElementById('health'),foodCv=document.getElementById('food');
const hctx=healthCv.getContext('2d'),fctx=foodCv.getContext('2d');
function heart(ctx,x,y,s,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(x+s*0.5,y+s*0.82);
  ctx.bezierCurveTo(x+s*0.02,y+s*0.42,x+s*0.12,y+s*0.04,x+s*0.5,y+s*0.30); ctx.bezierCurveTo(x+s*0.88,y+s*0.04,x+s*0.98,y+s*0.42,x+s*0.5,y+s*0.82); ctx.closePath(); ctx.fill(); }
function drum(ctx,x,y,s,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x+s*0.6,y+s*0.42,s*0.3,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+s*0.12,y+s*0.55,s*0.42,s*0.15); }
function renderHUD(){ hctx.clearRect(0,0,200,20); fctx.clearRect(0,0,200,20); const s=18;
  for(let i=0;i<10;i++){ const x=i*19; heart(hctx,x,1,s,'#3a1414'); const fl=Math.max(0,Math.min(2,player.hp-i*2));
    if(fl>=2) heart(hctx,x,1,s,'#e23b3b'); else if(fl>0){ hctx.save(); hctx.beginPath(); hctx.rect(x,0,s*0.5,20); hctx.clip(); heart(hctx,x,1,s,'#e23b3b'); hctx.restore(); } }
  for(let i=0;i<10;i++){ const x=180-i*19; drum(fctx,x,1,s,'#3a2a14'); const fl=Math.max(0,Math.min(2,player.food-i*2));
    if(fl>=2) drum(fctx,x,1,s,'#c8862f'); else if(fl>0){ fctx.save(); fctx.beginPath(); fctx.rect(x+s*0.5,0,s*0.5,20); fctx.clip(); drum(fctx,x,1,s,'#c8862f'); fctx.restore(); } } }
function damage(d){ if(player.dead) return; player.hp=Math.max(0,player.hp-d); SFX.hurt(); if(player.hp<=0) die(); }
function die(){ player.dead=true; document.exitPointerLock(); document.getElementById('deathScreen').classList.remove('hidden'); overlay.classList.add('hidden'); saveNow(); }
function respawn(){ player.dead=false; player.hp=20; player.food=20; player.vel.x=player.vel.y=player.vel.z=0; player.fallStart=null;
  player.pos.x=spawnPoint.x; player.pos.y=spawnPoint.y; player.pos.z=spawnPoint.z;
  document.getElementById('deathScreen').classList.add('hidden'); lock(); }
function updateStats(dt){
  // faim : descend doucement, plus vite si on sprinte/bouge
  const moving=(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight);
  player.foodTimer += dt*((keys.ShiftLeft||keys.ShiftRight)&&moving?1.8:moving?1:0.45);
  if(player.foodTimer>=24){ player.foodTimer=0; if(player.food>0) player.food--; }
  // régénération si bien nourri
  if(player.food>=18 && player.hp<20){ player.regenT+=dt; if(player.regenT>=4){ player.regenT=0; player.hp++; player.foodTimer+=6; } } else player.regenT=0;
  // famine : descend la vie jusqu'à 1
  if(player.food<=0 && player.hp>1){ player.starveT+=dt; if(player.starveT>=4){ player.starveT=0; player.hp--; } } else player.starveT=0;
  // manger (maintien clic droit avec de la nourriture sélectionnée)
  const held=inv[selected];
  if(mouseRight && !invOpen && held && EAT[held.id] && player.food<20){ player.eatT+=dt;
    if(player.eatT>=1.4){ player.eatT=0; SFX.eat(); player.food=Math.min(20,player.food+EAT[held.id]); held.count--; if(held.count<=0) inv[selected]=null; renderHotbar(); } }
  else player.eatT=0;
}

// ---------- Sauvegarde ----------
let saveTimer=null;
function saveNow(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify({ seed:SEED, edits:worldEdits, dayTime, inv, storage, furnace, hp:player.hp, food:player.food, mode,
  player:{x:player.pos.x,y:player.pos.y,z:player.pos.z,yaw:player.yaw,pitch:player.pitch,fly:player.fly} })); }catch(e){} }
function scheduleSave(){ if(saveTimer) return; saveTimer=setTimeout(()=>{ saveTimer=null; saveNow(); },800); }
function downloadWorld(){ saveNow(); const data={format:'blkworld',version:1,name:worldName,seed:SEED,save:JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}; const blob=new Blob([JSON.stringify(data)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=worldName+'.blkworld'; a.click(); URL.revokeObjectURL(a.href); }
addEventListener('beforeunload',saveNow); setInterval(saveNow,15000);

// ---------- Spawn ----------
function findSpawn(){ for(let r=0;r<=48;r++) for(let dx=-r;dx<=r;dx++) for(let dz=-r;dz<=r;dz++){ if(Math.max(Math.abs(dx),Math.abs(dz))!==r) continue; if(heightAt(8+dx,8+dz)>SEA+1) return {x:8+dx,z:8+dz}; } return {x:8,z:8}; }
const _sp=findSpawn(); const spawnPoint={x:_sp.x+0.5,y:heightAt(_sp.x,_sp.z)+2,z:_sp.z+0.5};
if(save.player){ player.pos.x=save.player.x; player.pos.y=save.player.y; player.pos.z=save.player.z; player.yaw=save.player.yaw||0; player.pitch=save.player.pitch||0; player.fly=!!save.player.fly; }
else { player.pos.x=spawnPoint.x; player.pos.y=spawnPoint.y; player.pos.z=spawnPoint.z; }
const _scx=Math.floor(player.pos.x/CHUNK),_scz=Math.floor(player.pos.z/CHUNK);
for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++) if(!chunks.has(ckey(_scx+dx,_scz+dz))) genChunk(_scx+dx,_scz+dz);
renderHotbar(); renderHUD();

// ---------- Menu pause / mort ----------
const $=id=>document.getElementById(id);
function setMode(m){ mode=m; player.fly=(m!=='survival'); player.vel.y=0; if(m==='survival') player.fallStart=null; updateModeButtons(); saveNow(); }
function updateModeButtons(){ for(const [m,id] of [['survival','modeSurv'],['creative','modeCrea'],['spectator','modeSpec']]) $(id) && $(id).classList.toggle('active',mode===m); }
function refreshPauseInfo(){ const b=biomeAt(Math.floor(player.pos.x),Math.floor(player.pos.z)); const nm={plains:'Plaines',forest:'Forêt',desert:'Désert',snow:'Neige'}[b]||b;
  $('biomeVal').textContent='🧭 '+nm+'  ·  X '+player.pos.x.toFixed(0)+' Y '+player.pos.y.toFixed(0)+' Z '+player.pos.z.toFixed(0); }

$('wname').textContent=worldName;
$('resume').addEventListener('click',e=>{ e.stopPropagation(); lock(); });
$('quit').addEventListener('click',e=>{ e.stopPropagation(); saveNow(); location.href='index.html'; });
$('respawnBtn').addEventListener('click',respawn);
overlay.addEventListener('click',e=>{ if(e.target===overlay) lock(); });   // seul le fond reprend
$('optBtn').addEventListener('click',()=>$('optPanel').classList.toggle('hidden'));
$('saveBtn').addEventListener('click',()=>{ saveNow(); const b=$('saveBtn'),t=b.textContent; b.textContent='✅ Sauvegardé !'; setTimeout(()=>b.textContent=t,1100); });
// valeurs initiales des réglages
$('setSound').checked=soundOn; $('setVol').value=Math.round(soundVol*100); $('setSens').value=Math.round(mouseSens/0.0002);
$('setRender').value=R; $('renderVal').textContent=R; $('setFov').value=FOV; $('fovVal').textContent=FOV;
$('setSound').addEventListener('change',e=>{ soundOn=e.target.checked; applySound(); saveSettings(); });
$('setVol').addEventListener('input',e=>{ soundVol=e.target.value/100; applySound(); saveSettings(); });
$('setSens').addEventListener('input',e=>{ mouseSens=Math.max(1,e.target.value)*0.0002; saveSettings(); });
$('setRender').addEventListener('input',e=>{ R=+e.target.value; $('renderVal').textContent=R; scene.fog.near=(R-1.5)*CHUNK; scene.fog.far=R*CHUNK; lightU.fogNear.value=(R-1.5)*CHUNK; lightU.fogFar.value=R*CHUNK; saveSettings(); });
$('setFov').addEventListener('input',e=>{ FOV=+e.target.value; $('fovVal').textContent=FOV; camera.fov=FOV; camera.updateProjectionMatrix(); saveSettings(); });
$('modeSurv').addEventListener('click',()=>setMode('survival'));
$('modeCrea').addEventListener('click',()=>setMode('creative'));
$('modeSpec').addEventListener('click',()=>setMode('spectator'));
$('timeMorning').addEventListener('click',()=>{ dayTime=0.15; });
$('timeDay').addEventListener('click',()=>{ dayTime=0.25; });
$('timeNight').addEventListener('click',()=>{ dayTime=0.75; });
$('seedVal').textContent=SEED;
$('copySeed').addEventListener('click',()=>{ try{ navigator.clipboard.writeText(String(SEED)); }catch(e){} const b=$('copySeed'); b.textContent='copié !'; setTimeout(()=>b.textContent='copier',1000); });
$('dlWorld').addEventListener('click',()=>downloadWorld());
updateModeButtons();
// boutons "pierre" : on utilise notre propre texture de pierre comme fond
if(window.TEX&&window.TEX.stone) document.documentElement.style.setProperty('--stone','url('+window.TEX.stone+')');

// ---------- Boucle ----------
const infoEl=document.getElementById('info');
let last=performance.now(),fpsT=0,frames=0,fps=0,lastHp=-1,lastFood=-1,stepTimer=0,waterT=0;
function frame(now){ requestAnimationFrame(frame); let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05;
  if(!player.dead){
    const fwd=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
    const str=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    const sprint=(keys.ShiftLeft||keys.ShiftRight)?1.6:1,speed=(mode==='spectator'?16:player.fly?10:4.8)*sprint;
    let mx=0,mz=0; if(fwd||str){ const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw); let dxv=(-sy*fwd)+(cy*str),dzv=(-cy*fwd)+(-sy*str); const len=Math.hypot(dxv,dzv)||1; mx=dxv/len*speed; mz=dzv/len*speed; }
    if(mode==='spectator'){   // fantôme : vol libre, traverse les blocs
      const up=(keys.Space?1:0)-((keys.ShiftLeft||keys.ShiftRight)?1:0);
      player.pos.x+=mx*dt; player.pos.z+=mz*dt; player.pos.y+=up*speed*dt; player.onGround=false; player.fallStart=null;
    } else {
      collideXZ('x',mx*dt); collideXZ('z',mz*dt);
      if(player.fly){ const up=(keys.Space?1:0)-((keys.ShiftLeft||keys.ShiftRight)?1:0); collideY(up*speed*dt); player.onGround=false; player.fallStart=null; }
      else {
        const feetW=getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+0.1),Math.floor(player.pos.z))===WATER;
        const eyeW=getBlock(Math.floor(player.pos.x),Math.floor(player.pos.y+1.5),Math.floor(player.pos.z))===WATER;
        const inWater=feetW||eyeW; const wasGround=player.onGround; player.onGround=false;
        if(inWater){ player.vel.y-=G*0.12*dt; player.vel.y*=0.86; if(keys.Space) player.vel.y=eyeW?5.0:JUMP; if(player.vel.y<-4) player.vel.y=-4; player.fallStart=null; }
        else { player.vel.y-=G*dt; if(player.vel.y<-50) player.vel.y=-50; if(player.fallStart==null && !wasGround) player.fallStart=player.pos.y; }
        collideY(player.vel.y*dt);
        if(player.onGround){ if(player.fallStart!=null && !inWater){ const fall=player.fallStart-player.pos.y; const dmg=Math.max(0,Math.floor(fall-3.5)); if(dmg>0) damage(dmg); } player.fallStart=null; }
        if(player.onGround && keys.Space && !inWater) player.vel.y=JUMP;
      }
    }
    stepTimer-=dt; if(player.onGround&&!player.fly&&(mx||mz)&&stepTimer<=0){ stepTimer=0.33; SFX.step(); }
    camera.position.set(player.pos.x,player.pos.y+EYE,player.pos.z); camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;

    const hit=raycast();
    if(hit){ highlight.visible=true; highlight.position.set(hit.x+0.5,hit.y+0.5,hit.z+0.5); } else highlight.visible=false;
    if(mouseLeft && hit && !invOpen && mode!=='spectator'){ const id=getBlock(hit.x,hit.y,hit.z); const need=mode==='creative'?0.001:(HARD[id]||1)/mineMult(id);
      if(id!==AIR&&id!==WATER&&(mode==='creative'||(HARD[id]||1)<9999)){ const k=hit.x+','+hit.y+','+hit.z; if(mining.key!==k){ mining.key=k; mining.t=0; }
        mining.t+=dt; const stage=Math.min(4,Math.floor(mining.t/need*5)); breakBox.visible=true; breakBox.material=crackMats[stage]; breakBox.position.set(hit.x+0.5,hit.y+0.5,hit.z+0.5);
        if(mining.t>=need){ breakBlock(hit.x,hit.y,hit.z,id); mining.key=null; breakBox.visible=false; } } else { mining.key=null; breakBox.visible=false; } }
    else if(!mouseLeft){ breakBox.visible=false; }
    if(mode==='survival') updateStats(dt);
  }

  updateItems(dt); updateMobs(dt); updateFurnace(dt); waterT+=dt; if(waterT>0.1){ waterT=0; flowTick(); } updateChunks(); updateSky(dt);
  if(player.hp!==lastHp||player.food!==lastFood){ renderHUD(); lastHp=player.hp; lastFood=player.food; }
  renderer.render(scene,camera);

  frames++; fpsT+=dt; if(fpsT>=0.5){ fps=Math.round(frames/fpsT); frames=0; fpsT=0; }
  const hh=Math.floor((dayTime*24+6)%24);
  infoEl.innerHTML=`FPS ${fps} &nbsp; Chunks ${chunks.size} &nbsp; Mobs ${mobs.length}<br>`+
    `XYZ ${player.pos.x.toFixed(1)} ${player.pos.y.toFixed(1)} ${player.pos.z.toFixed(1)}<br>`+
    `Heure ${String(hh).padStart(2,'0')}:00 ${mode==='survival'?'🚶 Survie':mode==='creative'?'🕊️ Créatif':'👻 Spectateur'}`;
}
requestAnimationFrame(frame);
