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
    <label>Event title<input id="themeTitle" type="text" placeholder="Type the event title"></label>
    <label>Event logo (optional)<input id="themeLogo" type="file" accept="image/*"></label>
    <img id="themeLogoPreview" alt="Event logo preview" style="display:none;width:100%;max-height:80px;object-fit:contain;background:#fff;border-radius:8px">
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
    .eventCustomTitle{display:block;width:100%;max-width:100%;white-space:normal;overflow-wrap:anywhere;font-family:"Instrument Serif",serif;font-weight:400;line-height:1.08;letter-spacing:.015em;text-shadow:0 0 18px var(--theme-glow,transparent)}
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
    body[data-adaptive-theme="on"] #shotLbl,body[data-adaptive-theme="on"] #count{color:#fff!important}
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
  const titleInput=document.getElementById('themeTitle'), logoInput=document.getElementById('themeLogo'), logoPreview=document.getElementById('themeLogoPreview');
  const titleEl=document.querySelector('.title'), brandEl=document.querySelector('.brand'), logosEl=document.querySelectorAll('.logos');
  const originalTitle=titleEl?titleEl.innerHTML:'', originalBrand=brandEl?brandEl.textContent:'', originalLogos=Array.from(logosEl).map(el=>el.innerHTML);
  let pending = null, objectUrl = null, pendingLogo = null;
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
    const colors=palette.map(rgb), avg=colors.reduce((s,c)=>s+lum(c),0)/colors.length;
    const dark=avg>.56, accent=colors[0].map(v=>clamp(v,35,235));
    const sorted=[...colors].sort((a,b)=>lum(a)-lum(b)), posterDark=sorted[0], posterLight=sorted[sorted.length-1];
    const neutralDark=[24,22,25], neutralLight=[247,244,238];
    const base=dark?mix(neutralDark,posterDark,.48):mix(neutralLight,posterLight,.48);
    const text=dark?neutralLight:neutralDark, button=accent.map(v=>clamp(v+(dark?0:28),0,255));
    const highlight=colors[1]||mix(accent,[255,255,255],.25);
    const bg=mix(base,accent,.22), panel=mix(bg,highlight,.24);
    return {ink:hex(bg),cream:hex(text),accent:hex(accent),highlight:hex(highlight),button:hex(button),buttonText:hex(dark?[20,20,22]:[255,255,255]),panel:hex(panel),muted:hex(mix(text,bg,.38)),glow:hex(mix(accent,bg,.58)),dark};
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
    root.setProperty('--theme-accent',t.accent);root.setProperty('--theme-highlight',t.highlight);root.setProperty('--theme-title',contrastColor(t.ink));
    root.setProperty('--theme-button',t.button);root.setProperty('--theme-button-text',t.buttonText);
    root.setProperty('--theme-panel',t.panel);root.setProperty('--theme-text',t.cream);root.setProperty('--theme-muted',t.muted);
    root.setProperty('--theme-border',t.accent);root.setProperty('--theme-glow',t.glow);
    root.setProperty('--theme-screen', 'linear-gradient(155deg,'+t.panel+','+t.ink+')');
    root.setProperty('--theme-idle','radial-gradient(ellipse at 10% 6%,'+t.glow+',transparent 52%),radial-gradient(ellipse at 92% 96%,'+t.accent+'55,transparent 50%),linear-gradient(160deg,'+t.panel+','+t.ink+')');
    document.body.dataset.adaptiveTheme='on';
    if(typeof CFG!=='undefined') CFG.BG=t.ink;
    if(persist) localStorage.setItem('adaptivePhotoboothTheme',JSON.stringify(t));
  }
  function contrastColor(hexColor){
    const c=rgb(hexColor),L=lum(c);
    return L>.52?'#211f26':'#ffffff';
  }
  function fitEventTitle(){
    const node=titleEl?.querySelector('.eventCustomTitle');if(!node)return;
    const text=node.textContent||'',box=titleEl.parentElement,available=Math.max(120,(box?.clientWidth||innerWidth*.45)-12);
    const maxSize=Math.min(innerHeight*.16,innerWidth*.16,150),minSize=24;
    const measure=document.createElement('canvas').getContext('2d');
    measure.font='400 '+maxSize+'px "Instrument Serif"';
    const measured=Math.max(1,measure.measureText(text).width),size=clamp(maxSize*available/measured,minSize,maxSize);
    node.style.fontSize=size+'px';node.style.maxWidth=available+'px';node.style.color=document.documentElement.style.getPropertyValue('--theme-title')||'#fff';
  }
  function applyBranding(title,logo,persist=false){
    if(titleEl){if(title){titleEl.innerHTML='<span class="eventCustomTitle"></span>';const node=titleEl.querySelector('.eventCustomTitle');node.textContent=title;node.style.fontSize='clamp(24px,12vw,150px)';fitEventTitle();}else titleEl.innerHTML=originalTitle;}
    if(brandEl)brandEl.textContent=title?'':originalBrand;
    document.body.dataset.eventTitle=title||'';
    if(logo)logosEl.forEach(el=>{el.innerHTML='';const im=document.createElement('img');im.src=logo;im.alt='Event logo';im.style.cssText='max-height:clamp(42px,9vh,100px);max-width:min(70vw,360px);object-fit:contain';el.appendChild(im);});
    else logosEl.forEach((el,i)=>el.innerHTML=originalLogos[i]||originalLogos[0]||'');
    if(persist)localStorage.setItem('adaptivePhotoboothBranding',JSON.stringify({title,logo}));
  }
  window.addEventListener('resize',fitEventTitle);
  function reset(){
    document.body.removeAttribute('data-adaptive-theme');
    ['--theme-accent','--theme-highlight','--theme-button','--theme-button-text','--theme-panel','--theme-text','--theme-muted','--theme-border','--theme-glow','--theme-screen','--theme-idle','--theme-title'].forEach(v=>document.documentElement.style.removeProperty(v));
    document.documentElement.style.setProperty('--ink','#2c0e10');document.documentElement.style.setProperty('--cream','#fff1ea');
    document.documentElement.style.setProperty('--red','#d63c30');document.documentElement.style.setProperty('--rose','#a9524f');
    document.documentElement.style.setProperty('--amber','#ff9d8a');document.documentElement.style.setProperty('--sun','#ff9d8a');document.documentElement.style.setProperty('--mute','rgba(255,241,234,.82)');
    if(typeof CFG!=='undefined')CFG.BG='#2c0e10';
    localStorage.removeItem('adaptivePhotoboothTheme');localStorage.removeItem('adaptivePhotoboothBranding');applyBranding('',null,false);titleInput.value='';logoInput.value='';logoPreview.style.display='none';pendingLogo=null;pending=null;applyBtn.disabled=true;status.textContent='Original photobooth theme restored.';
  }
  titleInput.addEventListener('input',()=>applyBranding(titleInput.value.trim(),pendingLogo,false));
  logoInput.addEventListener('change',()=>{const file=logoInput.files&&logoInput.files[0];if(!file)return;if(!file.type.startsWith('image/')){status.textContent='Choose an image file for the logo.';return;}const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{try{const cv=document.createElement('canvas'),s=Math.min(1,700/im.width,300/im.height);cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);pendingLogo=cv.toDataURL('image/png');logoPreview.src=pendingLogo;logoPreview.style.display='block';applyBranding(titleInput.value.trim(),pendingLogo,false);}catch(e){status.textContent='Could not process logo.';}URL.revokeObjectURL(url);};im.onerror=()=>{status.textContent='Could not load logo image.';URL.revokeObjectURL(url);};im.src=url;});
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
  applyBtn.addEventListener('click',()=>{if(!pending)return;apply(pending,true);applyBranding(titleInput.value.trim(),pendingLogo,true);status.textContent='Theme, event title, and logo saved on this kiosk.';});
  document.getElementById('themeReset').addEventListener('click',reset);
  try{const saved=JSON.parse(localStorage.getItem('adaptivePhotoboothTheme')||'null');if(saved){apply(saved);renderSwatches(saved);status.textContent='Saved adaptive theme restored. Upload a new image to change it.';}const branding=JSON.parse(localStorage.getItem('adaptivePhotoboothBranding')||'null');if(branding){titleInput.value=branding.title||'';pendingLogo=branding.logo||null;if(pendingLogo){logoPreview.src=pendingLogo;logoPreview.style.display='block';}applyBranding(branding.title||'',pendingLogo,false);}}
  catch(e){localStorage.removeItem('adaptivePhotoboothTheme');}
})();