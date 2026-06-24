(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const menu = document.getElementById('menu');
  const seedInput = document.getElementById('seedInput');
  const seedLabel = document.getElementById('seedLabel');
  const themeLabel = document.getElementById('themeLabel');
  const fogSlider = document.getElementById('fogSlider');
  const sensSlider = document.getElementById('sensSlider');
  const startButton = document.getElementById('startButton');
  const resumeButton = document.getElementById('resumeButton');

  const SIZE = 91, FOV = Math.PI / 3, MAX_DIST = 24;
  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
  const THEME_KEYS = ['yellow','industrial','mall','office','storage'];
  const themes = {
    yellow:{name:'Yellow Office Maze',wall:'#cbb354',wallpaper:'#bca44b',floor:'#5b422b',ceil:'#d8cf8d',accent:'#8e7935',decor:['cubicle','filing cabinet','water stain','lost chair']},
    industrial:{name:'Industrial Utility Area',wall:'#77736a',wallpaper:'#66635e',floor:'#42413e',ceil:'#56534e',accent:'#34535d',decor:['pipe cluster','breaker box','warning sign','miner helmet']},
    mall:{name:'Empty Mall',wall:'#b9a99d',wallpaper:'#cfb9a8',floor:'#83776c',ceil:'#d9d2c8',accent:'#4b6d7c',decor:['closed storefront','food tray','bench','dead plant']},
    office:{name:'Office Complex',wall:'#b8b7aa',wallpaper:'#a8ac9b',floor:'#4a565f',ceil:'#dadbd2',accent:'#8d6f50',decor:['desk','meeting table','copier','coffee cups']},
    storage:{name:'Storage Facility',wall:'#8b8a83',wallpaper:'#777870',floor:'#53514a',ceil:'#6c6b65',accent:'#9a5f38',decor:['metal shelf','crate stack','pallet jack','tarp']},
    transition:{name:'Transition Room',wall:'#4c4a44',wallpaper:'#3b3d38',floor:'#242626',ceil:'#383933',accent:'#b0a36c',decor:['elevator','stairwell','service door','dark tunnel']}
  };
  let grid, player, keys = {}, seed = '', rng, running = false, paused = true, showMap = false, notice = '';
  let last = 0, audio, ambienceGain, buzzGain;

  function hashSeed(s){let h=2166136261; for(const ch of s){h^=ch.charCodeAt(0); h=Math.imul(h,16777619);} return h>>>0;}
  function mulberry32(a){return () => {let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296;};}
  const rand = (a,b) => a + rng() * (b-a);
  const choice = a => a[Math.floor(rng()*a.length)];
  const inBounds = (x,y) => x > 1 && y > 1 && x < SIZE - 2 && y < SIZE - 2;
  const cell = (x,y) => grid[y]?.[x];
  const solid = (x,y) => !cell(Math.floor(x),Math.floor(y))?.open;

  function blankCell(){return {open:false,theme:'yellow',type:'wall',decor:[],light:1,flicker:false,wallpaper:false};}
  function openCell(x,y,theme,type='corridor',landmark=false){
    if(!inBounds(x,y)) return;
    const t = themes[theme];
    grid[y][x] = {open:true,theme,type,landmark,decor:[],light:rand(.72,1.14),flicker:rng()<.07,wallpaper:rng()<.55};
    if(rng()<.18) grid[y][x].decor.push(choice(t.decor));
    if(type==='door') grid[y][x].decor.push('new door');
  }
  function carveRoom(cx,cy,w,h,theme,landmark=false){
    for(let y=cy-h;y<=cy+h;y++) for(let x=cx-w;x<=cx+w;x++) openCell(x,y,theme,'room',landmark);
    if(rng()<.7) openCell(cx,cy,theme,'door',landmark);
  }
  function carveHall(x1,y1,x2,y2,theme){
    let x=x1,y=y1; openCell(x,y,theme,'door');
    while(x!==x2){x += Math.sign(x2-x); openCell(x,y,theme,'corridor'); if(rng()<.12) openCell(x,y+choice([-1,1]),theme,'corridor');}
    while(y!==y2){y += Math.sign(y2-y); openCell(x,y,theme,'corridor'); if(rng()<.12) openCell(x+choice([-1,1]),y,theme,'corridor');}
    openCell(x,y,theme,'door');
  }
  function connectedRoomMaze(){
    grid = Array.from({length:SIZE},()=>Array.from({length:SIZE},blankCell));
    const rooms = [{x:SIZE>>1,y:SIZE>>1,w:3,h:3,theme:'yellow'}];
    carveRoom(rooms[0].x,rooms[0].y,3,3,'yellow');
    for(let i=1;i<75;i++){
      const base = choice(rooms), d = choice(DIRS), dist = Math.floor(rand(8,15));
      const x = Math.max(5, Math.min(SIZE-6, base.x + d[0]*dist + Math.floor(rand(-4,5))));
      const y = Math.max(5, Math.min(SIZE-6, base.y + d[1]*dist + Math.floor(rand(-4,5))));
      const transition = rng()<.16;
      const theme = transition ? 'transition' : (base.theme==='transition'||rng()<.24 ? choice(THEME_KEYS) : base.theme);
      const room = {x,y,w:Math.floor(rand(2,5)),h:Math.floor(rand(2,5)),theme};
      carveHall(base.x,base.y,x,y,transition?'transition':theme);
      carveRoom(x,y,room.w,room.h,theme,rng()<.1);
      rooms.push(room);
      if(i%9===0){const other=choice(rooms); carveHall(x,y,other.x,other.y,theme);} // loops keep dead ends from dominating
    }
    for(let i=0;i<6;i++){
      const base=choice(rooms), d=choice(DIRS), x=Math.max(8,Math.min(SIZE-9,base.x+d[0]*Math.floor(rand(10,18)))), y=Math.max(8,Math.min(SIZE-9,base.y+d[1]*Math.floor(rand(10,18))));
      carveHall(base.x,base.y,x,y,'transition');
      carveRoom(x,y,Math.floor(rand(5,9)),Math.floor(rand(4,8)),choice(THEME_KEYS),true);
      cell(x,y).decor.push(choice(['vast atrium','abandoned sale display','collapsed shelving','wallpapered showroom']));
    }
  }
  function generate(){
    connectedRoomMaze();
    player = {x:SIZE/2+.5,y:SIZE/2+.5,a:0,z:0,crouch:0,bob:0};
    notice = 'Find a wall seam or door outline and press E to keep going.';
  }

  function expandThroughDoor(){
    const dx=Math.round(Math.cos(player.a)), dy=Math.round(Math.sin(player.a));
    const px=player.x|0, py=player.y|0;
    for(let step=1;step<=3;step++){
      const doorX=px+dx*step, doorY=py+dy*step;
      if(!inBounds(doorX,doorY) || cell(doorX,doorY).open) continue;
      const cx=doorX+dx*4, cy=doorY+dy*4;
      if(!inBounds(cx,cy)) return;
      const from=cell(px,py)?.theme || 'yellow';
      const theme=rng()<.28?'transition':(from==='transition'||rng()<.35?choice(THEME_KEYS):from);
      openCell(doorX,doorY,theme,'door');
      carveHall(doorX,doorY,cx,cy,theme);
      carveRoom(cx,cy,Math.floor(rand(2,6)),Math.floor(rand(2,5)),theme,rng()<.18);
      cell(doorX,doorY).decor.push('freshly opened doorway');
      notice = `A ${themes[theme].name.toLowerCase()} opens beyond the door.`;
      return;
    }
    notice = 'No usable door seam in front of you.';
  }

  function resize(){canvas.width=Math.floor(innerWidth/2);canvas.height=Math.floor(innerHeight/2);}
  function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255; r*=k;g*=k;b*=k; return `rgb(${r|0},${g|0},${b|0})`;}
  function cast(angle){const sin=Math.sin(angle), cos=Math.cos(angle); for(let d=.05;d<MAX_DIST;d+=.035){const x=player.x+cos*d,y=player.y+sin*d;if(solid(x,y)) return {d,x:Math.floor(x),y:Math.floor(y),wx:x,wy:y};} return {d:MAX_DIST,x:0,y:0};}
  function render(){
    const w=canvas.width,h=canvas.height, cur=cell(player.x|0,player.y|0)||{theme:'yellow',decor:[]}, th=themes[cur.theme];
    ctx.fillStyle=shade(th.ceil,.65); ctx.fillRect(0,0,w,h/2); ctx.fillStyle=shade(th.floor,.72); ctx.fillRect(0,h/2,w,h/2);
    for(let i=0;i<w;i+=2){
      const a=player.a-FOV/2+FOV*i/w, hit=cast(a), dist=hit.d*Math.cos(a-player.a), c=cell(hit.x,hit.y)||cur, tt=themes[c.theme];
      const fog=1-Math.min(1,dist/MAX_DIST)*Number(fogSlider.value), flick=c.flicker?(Math.sin(performance.now()/70+hit.x)*.08):0, wallH=Math.min(h,h/(dist+.05));
      ctx.fillStyle=shade(c.wallpaper&&i%10<4?tt.wallpaper:tt.wall, Math.max(.08,fog*(c.light||1)+flick));
      ctx.fillRect(i,(h-wallH)/2+player.z,2,wallH);
      if(c.type==='door' && i%18<6){ctx.fillStyle=shade(tt.accent,fog*.85);ctx.fillRect(i,(h-wallH)/2+player.z,2,wallH*.9);}
      if(c.landmark && i%14<2){ctx.fillStyle=shade(tt.accent,fog*.75);ctx.fillRect(i,(h-wallH)/2+player.z,2,wallH*.25);}
    }
    drawDecor(cur, th); if(showMap) drawMap();
    seedLabel.textContent=`Seed: ${seed}`;
    themeLabel.textContent=`${th.name}${cur.type==='door'?' · doorway':''}${cur.decor?.length?' · '+cur.decor.join(', '):''} · ${notice}`;
  }
  function drawDecor(cur, th){
    const w=canvas.width,h=canvas.height;
    for(let i=0;i<(cur.decor||[]).length;i++){
      const label=cur.decor[i], x=w*.35+i*44, y=h*.55+(i%2)*16;
      ctx.fillStyle=shade(th.accent,.75); ctx.fillRect(x,y,34,42);
      ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(x+5,y+7,24,5); ctx.fillRect(x+8,y+22,18,4);
      if(label.includes('pipe')||label.includes('miner')){ctx.fillStyle='#d1b64a';ctx.fillRect(x+10,y-8,14,8);}
    }
  }
  function drawMap(){ctx.save();ctx.globalAlpha=.76; const s=3; for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(cell(x,y).open){ctx.fillStyle=cell(x,y).type==='door'?'#eee':themes[cell(x,y).theme].wall;ctx.fillRect(10+x*s,10+y*s,s,s);} ctx.fillStyle='#f00';ctx.fillRect(10+player.x*s-2,10+player.y*s-2,4,4);ctx.restore();}
  function update(dt){
    const speed=(keys.ShiftLeft||keys.ShiftRight?4.2:2.4)*(keys.ControlLeft||keys.KeyC ? .5 : 1);
    player.crouch += (((keys.ControlLeft||keys.KeyC)?1:0)-player.crouch)*8*dt; player.z=player.crouch*28+Math.sin(player.bob)*4;
    let f=(keys.KeyW?1:0)-(keys.KeyS?1:0), r=(keys.KeyD?1:0)-(keys.KeyA?1:0);
    if(f||r){const len=Math.hypot(f,r);f/=len;r/=len; const nx=player.x+(Math.cos(player.a)*f+Math.cos(player.a+Math.PI/2)*r)*speed*dt; const ny=player.y+(Math.sin(player.a)*f+Math.sin(player.a+Math.PI/2)*r)*speed*dt; if(!solid(nx,player.y))player.x=nx;if(!solid(player.x,ny))player.y=ny; player.bob+=dt*speed*5;}
    updateAudio();
  }
  function loop(t){if(!running)return; const dt=Math.min(.05,(t-last)/1000); last=t; if(!paused){update(dt);render();} requestAnimationFrame(loop);}
  function initAudio(){audio=audio||new (window.AudioContext||window.webkitAudioContext)(); ambienceGain=audio.createGain(); buzzGain=audio.createGain(); ambienceGain.gain.value=.025; buzzGain.gain.value=.015; ambienceGain.connect(audio.destination); buzzGain.connect(audio.destination); for(const [freq,gain] of [[60,ambienceGain],[180,buzzGain],[43,ambienceGain]]){const o=audio.createOscillator(); o.type='sawtooth'; o.frequency.value=freq; o.connect(gain); o.start();}}
  function updateAudio(){if(!audio)return; buzzGain.gain.value=.012+Math.sin(performance.now()/500)*.004;}
  function start(){seed=seedInput.value.trim()||String(Date.now()); rng=mulberry32(hashSeed(seed)); generate(); paused=false; running=true; menu.hidden=true; initAudio(); audio.resume(); canvas.requestPointerLock(); last=performance.now(); requestAnimationFrame(loop);}
  startButton.onclick=start; resumeButton.onclick=()=>{paused=false;menu.hidden=true;canvas.requestPointerLock();};
  addEventListener('resize',resize); resize();
  addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Escape'){paused=true;menu.hidden=false;resumeButton.hidden=false;} if(e.code==='KeyM')showMap=!showMap; if(e.code==='KeyE'&&!paused)expandThroughDoor();});
  addEventListener('keyup',e=>keys[e.code]=false);
  addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!paused) player.a += e.movementX*.0025*Number(sensSlider.value);});
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&running){paused=true;menu.hidden=false;resumeButton.hidden=false;}});
})();
