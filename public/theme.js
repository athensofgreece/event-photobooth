/* Adaptive Theme Engine — local image palette extraction, no API required */
(() => {
  const admin = document.getElementById('admin');
  if (!admin) return;
  const section = document.createElement('section');
  section.id = 'adaptiveTheme';
  section.innerHTML = `
    <div style="font-weight:700;margin-bottom:4px">Adaptive theme</div>
    <label>Reference image (poster, invitation, logo)
      <input id="themeImage" type="file" accept="image/*">
    </label>
    <img id="themeReference" alt="Theme reference preview" style="display:none;width:100%;max-height:110px;object-fit:contain;background:#fff;border-radius:8px">
    <div id="themeSwatches" style="display:flex;gap:6px"></div>
    <small id="themeStatus">Upload an image to extract its colors and preview a matching booth theme.</small>
    <div style="display:flex;gap:8px">
      <button id="themeApply" type="button" style="flex:1" disabled>Apply theme</button>
      <button id="themeReset" type="button" style="flex:1">Reset</button>
    </div>`;
  admin.insertBefore(section, document.getElementById('test'));
  const style = document.createElement('style');
  style.textContent = `
    #adaptiveTheme{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid rgba(80,50,40,.25)}
    #adaptiveTheme input[type=file]{font-size:12px;padding:5px}
    #adaptiveTheme button{font-size:13px;padding:8px 10px}
    #admin{max-height:calc(100vh - 76px);overflow:auto}
    body[data-adaptive-theme="on"] #idle{background:var(--theme-idle)!important}
    body[data-adaptive-theme="on"] #review,body[data-adaptive-theme="on"] #thanks{background:var(--theme-screen)!important}
    body[data-adaptive-theme="on"] .how{background:var(--theme-panel)!important;border-color:var(--theme-border)!important}
    body[data-adaptive-theme="on"] button:not(#gear){background:var(--theme-button)!important;color:var(--theme-button-text)!important;box-shadow:0 0 28px var(--theme-glow)!important}
    body[data-adaptive-theme="on"] button.ghost{background:transparent!important;color:var(--theme-text)!important;border-color:var(--theme-text)!important;box-shadow:none!important}
    body[data-adaptive-theme="on"] #gear{background:var(--theme-panel)!important;color:var(--theme-text)!important;border-color:var(--theme-border)!important}
    body[data-adaptive-theme="on"] #result{border-color:var(--theme-accent)!important}
    body[data-adaptive-theme="on"] #strip{border-color:var(--theme-accent)!important}
    body[data-adaptive-theme="on"] #dots i{border-color:var(--theme-accent)!important}
    body[data-adaptive-theme="on"] #dots i.done{background:var(--theme-accent)!important}
    body[data-adaptive-theme="on"] #dots i.now{background:var(--theme-highlight)!important;border-color:var(--theme-highlight)!important}
    body[data-adaptive-theme="on"] .how li::before{background:var(--theme-button)!important;color:var(--theme-button-text)!important}
    body[data-adaptive-theme="on"] .how li b{color:var(--theme-text)!important}
    body[data-adaptive-theme="on"] .script,body[data-adaptive-theme="on"] .love{color:var(--theme-text)!important;text-shadow:0 0 24px var(--theme-glow)!important}
    body[data-adaptive-theme="on"] #shotLbl{color:var(--theme-text)!important}
    body[data-adaptive-theme="on"] #count{color:var(--theme-text)!important}
    body[data-adaptive-theme="on"] .thx{color:var(--theme-text)!important}
    body[data-adaptive-theme="on"] .foot,body[data-adaptive-theme="on"] .verse{color:var(--theme-text)!important}
    body[data-adaptive-theme="on"] p,body[data-adaptive-theme="on"] small{color:var(--theme-muted)!important}
  `;
  document.head.appendChild(style);
  const input = document.getElementById('themeImage');
  const preview = document.getElementById('themeReference');
  const swatches = document.getElementById('themeSwatches');
  const status = document.getElementById('themeStatus');
  const applyBtn = document.getElementById('themeApply');
  let pending = null, objectUrl = null;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rgb = h => { const m = h.match(/[\da-f]{2}/gi); return m ? m.map(x => parseInt(x,16)) : [0,0,0]; };
  const lum = c => { const a=c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return .2126*a[0]+.7152*a[1]+.0722*a[2]; };
  const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
  function extractPalette(img){
    const c=document.createElement('canvas'), max=120; c.width=max; c.height=Math.max(1,Math.round(img.height*max/img.width));
    const g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0,c.width,c.height);
    const data=g.getImageData(0,0,c.width,c.height).data, bins=new Map();
    for(let i=0;i<data.length;i+=16){
      const r=data[i],gg=data[i+1],b=data[i+2],a=data[i+3]; if(a<150)continue;
      if(Math.max(r,gg,b)-Math.min(r,gg,b)<16)continue;
      const key=[r,gg,b].map(v=>Math.floor(v/32)*32+16).join(',');
      const item=bins.get(key)||{r:0,g:0,b:0,n:0,s:0};
      item.r+=r;item.g+=gg;item.b+=b;item.n++;item.s+=Math.max(r,gg,b)-Math.min(r,gg,b);bins.set(key,item);
    }
    const list=[...bins.values()].map(v=>[v.r/v.n,v.g/v.n,v.b/v.n]).sort((a,b)=>0);
    if(!list.length)return ['#2c0e10','#fff1ea','#d63c30','#ff9d8a'];
    const ranked=[...bins.values()].map(v=>({c:[v.r/v.n,v.g/v.n,v.b/v.n],n:v.n,s:v.s/v.n})).sort((a,b)=>b.n-a.n);
    const accent=ranked.filter(v=>v.s>45).sort((a,b)=>b.s-a.s)[0]?.c||ranked[0].c;
    const other=ranked.filter(v=>v.c!==accent).slice(0,4).map(v=>v.c);
    return [accent,...other];
  }
  function buildTheme(palette){
    const accent=palette[0], avg=palette.reduce((s,c)=>s+lum(c),0)/palette.length;
    const dark=avg>.56;
    const base=dark?[22,20,25]:[247,245,240], text=dark?[247,244,238]:[34,31,38];
    const acc=accent.map(v=>clamp(v,35,235));
    const button=acc.map(v=>clamp(v+(dark?0:40),0,255));
    const highlight=palette[1]||mix(acc,[255,255,255],.25);
    const bg=dark?mix(base,acc,.20):mix(base,acc,.08);
    const panel=mix(bg,acc,dark?.22:.12);
    return {ink:hex(bg),cream:hex(text),accent:hex(acc),highlight:hex(highlight),button:hex(button),buttonText:hex(dark?[20,20,22]:[255,255,255]),panel:hex(panel),muted:hex(mix(text,bg,.38)),glow:hex(mix(acc,bg,.58)),dark};
  }
  function renderSwatches(t){
    swatches.innerHTML='';
    [t.ink,t.panel,t.accent,t.highlight,t.button,t.cream].forEach(color=>{
      const sw=document.createElement('span');sw.title=color;sw.style.cssText='width:28px;height:22px;border-radius:6px;border:1px solid rgba(0,0,0,.12);background:'+color;swatches.appendChild(sw);
    });
  }
  function apply(t, persist = true){
    const root=document.documentElement.style;
    root.setProperty('--ink',t.ink);root.setProperty('--cream',t.cream);root.setProperty('--red',t.accent);root.setProperty('--rose',t.accent);
    root.setProperty('--amber',t.highlight);root.setProperty('--sun',t.highlight);root.setProperty('--mute',t.muted);
    root.setProperty('--theme-accent',t.accent);root.setProperty('--theme-highlight',t.highlight);
    root.setProperty('--theme-button',t.button);root.setProperty('--theme-button-text',t.buttonText);
    root.setProperty('--theme-panel',t.panel);root.setProperty('--theme-text',t.cream);root.setProperty('--theme-muted',t.muted);
    root.setProperty('--theme-border',t.accent);root.setProperty('--theme-glow',t.glow);
    root.setProperty('--theme-screen', 'linear-gradient(155deg,'+t.panel+','+t.ink+')');
    root.setProperty('--theme-idle','radial-gradient(ellipse at 10% 6%,'+t.glow+',transparent 52%),radial-gradient(ellipse at 92% 96%,'+t.accent+'55,transparent 50%),linear-gradient(160deg,'+t.panel+','+t.ink+')');
    document.body.dataset.adaptiveTheme='on';
    if(typeof CFG!=='undefined') CFG.BG=t.ink;
    if(persist) localStorage.setItem('adaptivePhotoboothTheme',JSON.stringify(t));
  }
  function reset(){
    document.body.removeAttribute('data-adaptive-theme');
    ['--theme-accent','--theme-highlight','--theme-button','--theme-button-text','--theme-panel','--theme-text','--theme-muted','--theme-border','--theme-glow','--theme-screen','--theme-idle'].forEach(v=>document.documentElement.style.removeProperty(v));
    document.documentElement.style.setProperty('--ink','#2c0e10');document.documentElement.style.setProperty('--cream','#fff1ea');
    document.documentElement.style.setProperty('--red','#d63c30');document.documentElement.style.setProperty('--rose','#a9524f');
    document.documentElement.style.setProperty('--amber','#ff9d8a');document.documentElement.style.setProperty('--sun','#ff9d8a');document.documentElement.style.setProperty('--mute','rgba(255,241,234,.82)');
    if(typeof CFG!=='undefined')CFG.BG='#2c0e10';
    localStorage.removeItem('adaptivePhotoboothTheme');pending=null;applyBtn.disabled=true;status.textContent='Original photobooth theme restored.';
  }
  input.addEventListener('change',()=>{
    const file=input.files&&input.files[0];if(!file)return;
    if(!file.type.startsWith('image/')){status.textContent='Please choose an image file.';return;}
    if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);
    preview.src=objectUrl;preview.style.display='block';
    const img=new Image();
    img.onload=()=>{
      try{const p=extractPalette(img),t=buildTheme(p);pending=t;renderSwatches(t);apply(t,false);applyBtn.disabled=false;status.textContent='Theme preview is live. Tap Apply theme to save it for this kiosk.';}
      catch(e){status.textContent='Could not analyze that image. Try another image.';console.warn('Theme extraction failed',e);}
    };
    img.onerror=()=>status.textContent='Could not load that image.';
    img.src=objectUrl;
  });
  applyBtn.addEventListener('click',()=>{if(!pending)return;apply(pending,true);status.textContent='Theme applied and saved on this kiosk.';});
  document.getElementById('themeReset').addEventListener('click',reset);
  try{const saved=JSON.parse(localStorage.getItem('adaptivePhotoboothTheme')||'null');if(saved){apply(saved);renderSwatches(saved);status.textContent='Saved adaptive theme restored. Upload a new image to change it.';}}
  catch(e){localStorage.removeItem('adaptivePhotoboothTheme');}
})();