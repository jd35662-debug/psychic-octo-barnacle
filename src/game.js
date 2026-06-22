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

  const SIZE = 81, CELL = 1, FOV = Math.PI / 3, MAX_DIST = 22;
  const themes = {
    yellow:{name:'Yellow Office Maze',wall:'#cbb354',floor:'#5b422b',ceil:'#d8cf8d',accent:'#8e7935',hum:110},
    industrial:{name:'Industrial Utility Area',wall:'#77736a',floor:'#42413e',ceil:'#56534e',accent:'#34535d',hum:72},
    mall:{name:'Empty Mall',wall:'#b9a99d',floor:'#83776c',ceil:'#d9d2c8',accent:'#4b6d7c',hum:165},
    office:{name:'Office Complex',wall:'#b8b7aa',floor:'#4a565f',ceil:'#dadbd2',accent:'#8d6f50',hum:132},
    storage:{name:'Storage Facility',wall:'#8b8a83',floor:'#53514a',ceil:'#6c6b65',accent:'#9a5f38',hum:86},
    transition:{name:'Transition Room',wall:'#4c4a44',floor:'#242626',ceil:'#383933',accent:'#b0a36c',hum:55}
  };
  let grid, player, keys = {}, seed = '', rng, running = false, paused = true, showMap = false;
  let last = 0, audio, ambienceGain, buzzGain;

  function hashSeed(s){let h=2166136261; for(const ch of s){h^=ch.charCodeAt(0); h=Math.imul(h,16777619);} return h>>>0;}
  function mulberry32(a){return () => {let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296;};}
  const rand = (a,b) => a + rng() * (b-a);
  const choice = a => a[Math.floor(rng()*a.length)];
  const cell = (x,y) => grid[y]?.[x];
  const solid = (x,y) => !cell(Math.floor(x),Math.floor(y))?.open;

  function carveRoom(cx, cy, w, h, theme, landmark=false){
    for(let y=cy-h;y<=cy+h;y++) for(let x=cx-w;x<=cx+w;x++) if(grid[y]?.[x]) grid[y][x]={open:true,theme,landmark,decor:[]};
  }
  function generate(){
    grid = Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>({open:false,theme:'yellow',decor:[]})));
    let x=SIZE>>1, y=SIZE>>1, theme='yellow'; carveRoom(x,y,3,3,theme);
    const stack=[[x,y]]; const dirs=[[2,0],[-2,0],[0,2],[0,-2]];
    while(stack.length){
      [x,y]=stack[stack.length-1];
      const opts=dirs.map(d=>[x+d[0],y+d[1],d]).filter(([nx,ny])=>nx>2&&ny>2&&nx<SIZE-3&&ny<SIZE-3&&!cell(nx,ny).open);
      if(!opts.length){stack.pop(); continue;}
      const [nx,ny,d]=choice(opts); const mx=x+d[0]/2,my=y+d[1]/2;
      if(rng()<0.13){ theme='transition'; } else if(theme==='transition'||rng()<0.08) theme=choice(['yellow','industrial','mall','office','storage']);
      carveRoom(mx,my, rng()<0.35?2:1, rng()<0.35?2:1, theme);
      carveRoom(nx,ny, rng()<0.18?3:1, rng()<0.18?3:1, theme, rng()<0.06);
      stack.push([nx,ny]);
    }
    for(let i=0;i<18;i++) carveRoom(Math.floor(rand(8,SIZE-8)),Math.floor(rand(8,SIZE-8)),Math.floor(rand(3,7)),Math.floor(rand(3,7)),choice(['yellow','industrial','mall','office','storage']),true);
    for(let yy=1;yy<SIZE-1;yy++) for(let xx=1;xx<SIZE-1;xx++) if(cell(xx,yy).open){
      const t=cell(xx,yy).theme; const dec=[];
      if(rng()<0.22) dec.push(t==='industrial'?'pipe':t==='mall'?'storefront':t==='storage'?'shelf':t==='office'?'desk':'cubicle');
      if(rng()<0.035) dec.push(choice(['elevator','stairwell','dark hallway','loading dock','odd red room','vast atrium']));
      cell(xx,yy).decor=dec; cell(xx,yy).light=rand(.72,1.12); cell(xx,yy).flicker=rng()<0.08;
    }
    player = {x:SIZE/2+.5,y:SIZE/2+.5,a:0,z:0, crouch:0, bob:0};
  }

  function resize(){canvas.width=Math.floor(innerWidth/2);canvas.height=Math.floor(innerHeight/2);}
  function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255; r*=k;g*=k;b*=k; return `rgb(${r|0},${g|0},${b|0})`;}
  function cast(angle){let sin=Math.sin(angle), cos=Math.cos(angle); for(let d=.05;d<MAX_DIST;d+=.035){let x=player.x+cos*d,y=player.y+sin*d;if(solid(x,y)) return {d,x:Math.floor(x),y:Math.floor(y)};} return {d:MAX_DIST,x:0,y:0};}
  function render(){
    const w=canvas.width,h=canvas.height, cur=cell(player.x|0,player.y|0)||{theme:'yellow'}; const th=themes[cur.theme];
    ctx.fillStyle=shade(th.ceil,.65); ctx.fillRect(0,0,w,h/2); ctx.fillStyle=shade(th.floor,.72); ctx.fillRect(0,h/2,w,h/2);
    for(let i=0;i<w;i+=2){const a=player.a-FOV/2+FOV*i/w; const hit=cast(a); const dist=hit.d*Math.cos(a-player.a); const c=cell(hit.x,hit.y)||cur; const tt=themes[c.theme]; const fog=1-Math.min(1,dist/MAX_DIST)*Number(fogSlider.value); const flick=c.flicker?(Math.sin(performance.now()/70+hit.x)*.08):0; const wallH=Math.min(h, h/(dist+.05));
      ctx.fillStyle=shade(tt.wall, Math.max(.08,fog*(c.light||1)+flick)); ctx.fillRect(i,(h-wallH)/2+player.z,2,wallH);
      if(c.landmark && i%12<2){ctx.fillStyle=shade(tt.accent, fog*.8);ctx.fillRect(i,(h-wallH)/2+player.z,2,wallH*.25);}
    }
    drawDecor(cur, th); if(showMap) drawMap();
    seedLabel.textContent=`Seed: ${seed}`; themeLabel.textContent=`${th.name}${cur.decor?.length?' · '+cur.decor.join(', '):''}`;
  }
  function drawDecor(cur, th){const w=canvas.width,h=canvas.height; ctx.fillStyle=shade(th.accent,.75); for(let i=0;i<(cur.decor||[]).length;i++){const x=w*.42+i*38,y=h*.54;ctx.fillRect(x,y,28,40);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(x+4,y+7,20,4);ctx.fillStyle=shade(th.accent,.75);} }
  function drawMap(){ctx.save();ctx.globalAlpha=.75; const s=3; for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(cell(x,y).open){ctx.fillStyle=themes[cell(x,y).theme].wall;ctx.fillRect(10+x*s,10+y*s,s,s);} ctx.fillStyle='#f00';ctx.fillRect(10+player.x*s-2,10+player.y*s-2,4,4);ctx.restore();}
  function update(dt){
    const speed=(keys.ShiftLeft||keys.ShiftRight?4.2:2.4)*((keys.ControlLeft||keys.KeyC)?.5:1); player.crouch += (((keys.ControlLeft||keys.KeyC)?1:0)-player.crouch)*8*dt; player.z=player.crouch*28+Math.sin(player.bob)*4;
    let f=(keys.KeyW?1:0)-(keys.KeyS?1:0), r=(keys.KeyD?1:0)-(keys.KeyA?1:0); if(f||r){const len=Math.hypot(f,r);f/=len;r/=len; const nx=player.x+(Math.cos(player.a)*f+Math.cos(player.a+Math.PI/2)*r)*speed*dt; const ny=player.y+(Math.sin(player.a)*f+Math.sin(player.a+Math.PI/2)*r)*speed*dt; if(!solid(nx,player.y))player.x=nx;if(!solid(player.x,ny))player.y=ny; player.bob+=dt*speed*5;}
    updateAudio();
  }
  function loop(t){if(!running)return; const dt=Math.min(.05,(t-last)/1000); last=t; if(!paused){update(dt);render();} requestAnimationFrame(loop);}
  function initAudio(){audio=audio||new (window.AudioContext||window.webkitAudioContext)(); ambienceGain=audio.createGain(); buzzGain=audio.createGain(); ambienceGain.gain.value=.025; buzzGain.gain.value=.015; ambienceGain.connect(audio.destination); buzzGain.connect(audio.destination); for(const [freq,gain] of [[60,ambienceGain],[180,buzzGain],[43,ambienceGain]]){const o=audio.createOscillator(); o.type='sawtooth'; o.frequency.value=freq; o.connect(gain); o.start();}}
  function updateAudio(){if(!audio)return; const th=themes[(cell(player.x|0,player.y|0)||{}).theme||'yellow']; buzzGain.gain.value=.012+Math.sin(performance.now()/500)*.004;}
  function start(){seed=seedInput.value.trim()||String(Date.now()); rng=mulberry32(hashSeed(seed)); generate(); paused=false; running=true; menu.hidden=true; initAudio(); audio.resume(); canvas.requestPointerLock(); last=performance.now(); requestAnimationFrame(loop);}
  startButton.onclick=start; resumeButton.onclick=()=>{paused=false;menu.hidden=true;canvas.requestPointerLock();};
  addEventListener('resize',resize); resize();
  addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Escape'){paused=true;menu.hidden=false;resumeButton.hidden=false;} if(e.code==='KeyM')showMap=!showMap;});
  addEventListener('keyup',e=>keys[e.code]=false);
  addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!paused) player.a += e.movementX*.0025*Number(sensSlider.value);});
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&running){paused=true;menu.hidden=false;resumeButton.hidden=false;}});
})();
