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
    <label>Event subtitle / details<input id="themeSubtitle" type="text" placeholder="e.g. ELEB1G Worship Day · October Praise 2026"></label>
    <label>Event date / time<input id="themeDate" type="text" placeholder="e.g. October 24, 2 PM"></label>
    <label>Event location<input id="themeLocation" type="text" placeholder="e.g. CCF Angono, Level 3, SM Center Angono"></label>
    <label>Event logo (optional)<input id="themeLogo" type="file" accept="image/*"></label>
    <img id="themeLogoPreview" alt="Event logo preview" style="display:none;width:100%;max-height:80px;object-fit:contain;background:#fff;border-radius:8px">
    <div id="themeSwatches" style="display:flex;gap:6px;flex-wrap:wrap"></div>
    <button id="themeShuffle" type="button" disabled>Shuffle colors</button>
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
    body[data-adaptive-theme="on"] #idle button,body[data-adaptive-theme="on"] #review button,body[data-adaptive-theme="on"] #thanks button{background:var(--theme-button)!important;color:var(--theme-button-text)!important;box-shadow:0 0 28px var(--theme-glow)!important}
    body[data-adaptive-theme="on"] #idle button.ghost,body[data-adaptive-theme="on"] #review button.ghost,body[data-adaptive-theme="on"] #thanks button.ghost{background:transparent!important;color:var(--theme-text)!important;border-color:var(--theme-text)!important;box-shadow:none!important}
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
    body[data-adaptive-theme="on"] #idle p,body[data-adaptive-theme="on"] #idle small,body[data-adaptive-theme="on"] #review p,body[data-adaptive-theme="on"] #review small,body[data-adaptive-theme="on"] #thanks p,body[data-adaptive-theme="on"] #thanks small{color:var(--theme-muted)!important}
  `;
  document.head.appendChild(style);
  const input = document.getElementById('themeImage');
  const preview = document.getElementById('themeReference');
  const swatches = document.getElementById('themeSwatches');
  const status = document.getElementById('themeStatus');
  const applyBtn = document.getElementById('themeApply');
  const titleInput=document.getElementById('themeTitle'), subtitleInput=document.getElementById('themeSubtitle'), dateInput=document.getElementById('themeDate'), locationInput=document.getElementById('themeLocation'), logoInput=document.getElementById('themeLogo'), logoPreview=document.getElementById('themeLogoPreview');
  const titleEl=document.querySelector('.title'), brandEl=document.querySelector('.brand'), logosEl=document.querySelectorAll('.logos');
  const originalTitle=titleEl?titleEl.innerHTML:'', originalBrand=brandEl?brandEl.textContent:'', originalFoot=document.querySelector('.foot')?.textContent||'', originalFootParts=originalFoot.split('|').map(v=>v.trim()), originalDate=originalFootParts[0]||'', originalLocation=originalFootParts.slice(1).join(' | '), originalLogos=Array.from(logosEl).map(el=>el.innerHTML);
  let pending = null, objectUrl = null, pendingLogo = null, extractedPalette = null;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rgb = h => { const m = h.match(/[\da-f]{2}/gi); return m ? m.map(x => parseInt(x,16)) : [0,0,0]; };
  const lum = c => { const a=c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return .2126*a[0]+.7152*a[1]+.0722*a[2]; };
  const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
  function extractPalette(img){
    const canvas=document.createElement('canvas'),max=160;
    canvas.width=max;canvas.height=Math.max(1,Math.round(img.height*max/img.width));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,bins=new Map();
    // Sample aligned RGBA pixels and include neutrals (cream, white, gray, black) in the palette.
    for(let i=0;i<data.length;i+=32){
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];if(a<160)continue;
      const key=[r,g,b].map(v=>Math.floor(v/24)*24+12).join(',');
      const item=bins.get(key)||{r:0,g:0,b:0,n:0};item.r+=r;item.g+=g;item.b+=b;item.n++;bins.set(key,item);
    }
    const ranked=[...bins.values()].map(v=>({c:[v.r/v.n,v.g/v.n,v.b/v.n],n:v.n})).sort((a,b)=>b.n-a.n);
    if(!ranked.length)return [[44,14,16],[255,241,234],[214,60,48],[255,157,138]];
    // Keep most frequent poster colors, weighted by occurrence, not saturation.
    const palette=ranked.slice(0,6).map(v=>v.c);
    return palette;
  }
  function buildTheme(palette, shuffle=false){
    const colors=palette,average=colors.reduce((s,c)=>s+lum(c),0)/Math.max(1,colors.length),dark=average>.5;
    const posterDark=[...colors].sort((a,b)=>lum(a)-lum(b))[0],posterLight=[...colors].sort((a,b)=>lum(b)-lum(a))[0];
    const chromatic=[...colors].sort((a,b)=>(Math.max(...b)-Math.min(...b))-(Math.max(...a)-Math.min(...a)));
    let accent=chromatic[0],highlight=chromatic[1]||posterLight,background,panel;
    if(shuffle){
      const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
      const candidates=[...colors];
      const randomized=[...candidates].sort(()=>Math.random()-.5);
      background=pick(randomized);
      accent=pick(randomized.filter(c=>c!==background));
      highlight=pick(randomized.filter(c=>c!==background&&c!==accent));
      const bgIsDark=lum(background)<.45;
      background=bgIsDark?mix(background,[18,18,24],.18):mix(background,[255,250,245],.16);
      panel=mix(background,highlight,.20);
    }else{
      background=dark?mix(posterDark,[22,20,24],.18):mix(posterLight,[255,250,245],.12);
      panel=dark?mix(posterDark,posterLight,.22):mix(posterLight,posterDark,.14);
    }
    const text=lum(background)>.5?[28,25,29]:[255,250,245];
    const buttonText=lum(accent)>.52?[25,22,25]:[255,255,255];
    return {ink:hex(background),cream:hex(text),accent:hex(accent),highlight:hex(highlight),button:hex(accent),buttonText:hex(buttonText),panel:hex(panel),muted:hex(mix(text,background,.28)),glow:hex(mix(accent,background,.48)),dark:lum(background)>.5};
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
    root.setProperty('--theme-idle','radial-gradient(ellipse at 10% 6%,'+t.accent+'bb,transparent 58%),radial-gradient(ellipse at 92% 96%,'+t.highlight+'99,transparent 55%),linear-gradient(145deg,'+t.accent+','+t.panel+' 48%,'+t.ink+')');
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
    const left=titleEl.parentElement, available=Math.max(160,(left?.clientWidth||innerWidth*.42)-8);
    const text=(node.textContent||'').trim(),lineHeight=1.08, maxHeight=Math.max(110,innerHeight*.34);
    const ctx=document.createElement('canvas').getContext('2d');
    let size=Math.min(innerHeight*.17,available*.22,150),minSize=36;
    function linesAt(fontSize){ctx.font='400 '+fontSize+'px "Instrument Serif"';let count=1,line='';for(const word of text.split(/\\s+/)){const candidate=line?line+' '+word:word;if(line&&ctx.measureText(candidate).width>available){count++;line=word;}else line=candidate;}return count;}
    let lines=linesAt(size);
    while(size>minSize&&lines*size*lineHeight>maxHeight){size-=2;lines=linesAt(size);}
    titleEl.style.width=available+'px';titleEl.style.maxWidth=available+'px';node.style.display='block';node.style.width='100%';node.style.maxWidth=available+'px';node.style.fontSize=size+'px';node.style.lineHeight=lineHeight;node.style.color=document.documentElement.style.getPropertyValue('--theme-title')||'#fff';
  }
  function applyBranding(title,logo,subtitle='',date='',location='',persist=false){
    if(titleEl){if(title){titleEl.innerHTML='<span class="eventCustomTitle"></span>';const node=titleEl.querySelector('.eventCustomTitle');node.textContent=title;node.style.fontSize='clamp(24px,12vw,150px)';fitEventTitle();}else titleEl.innerHTML=originalTitle;}
    if(brandEl){brandEl.textContent=subtitle||(title?'':originalBrand);brandEl.style.display=brandEl.textContent?'':'none';brandEl.style.width='100%';brandEl.style.maxWidth='100%';brandEl.style.whiteSpace='normal';brandEl.style.overflowWrap='anywhere';brandEl.style.fontSize=subtitle?'clamp(12px,2.1vh,22px)':'';
}
    const foot=document.querySelector('.foot');if(foot)foot.textContent=[date||originalDate,location||originalLocation].filter(Boolean).join(' | ');
    document.body.dataset.eventDate=date||originalDate;document.body.dataset.eventLocation=location||originalLocation;
    document.body.dataset.eventTitle=title||'';
    if(logo)logosEl.forEach(el=>{el.innerHTML='';const im=document.createElement('img');im.src=logo;im.alt='Event logo';im.style.cssText='max-height:clamp(42px,9vh,100px);max-width:min(70vw,360px);object-fit:contain';el.appendChild(im);});
    else logosEl.forEach((el,i)=>el.innerHTML=originalLogos[i]||originalLogos[0]||'');
    if(persist)localStorage.setItem('adaptivePhotoboothBranding',JSON.stringify({title,logo,subtitle,date,location}));
  }
  window.addEventListener('resize',fitEventTitle);
  function reset(){
    document.body.removeAttribute('data-adaptive-theme');
    ['--theme-accent','--theme-highlight','--theme-button','--theme-button-text','--theme-panel','--theme-text','--theme-muted','--theme-border','--theme-glow','--theme-screen','--theme-idle','--theme-title'].forEach(v=>document.documentElement.style.removeProperty(v));
    document.documentElement.style.setProperty('--ink','#2c0e10');document.documentElement.style.setProperty('--cream','#fff1ea');
    document.documentElement.style.setProperty('--red','#d63c30');document.documentElement.style.setProperty('--rose','#a9524f');
    document.documentElement.style.setProperty('--amber','#ff9d8a');document.documentElement.style.setProperty('--sun','#ff9d8a');document.documentElement.style.setProperty('--mute','rgba(255,241,234,.82)');
    if(typeof CFG!=='undefined')CFG.BG='#2c0e10';
    localStorage.removeItem('adaptivePhotoboothTheme');localStorage.removeItem('adaptivePhotoboothBranding');applyBranding('',null,'','','',false);titleInput.value='';subtitleInput.value='';dateInput.value='';locationInput.value='';logoInput.value='';logoPreview.style.display='none';pendingLogo=null;pending=null;extractedPalette=null;applyBtn.disabled=true;document.getElementById('themeShuffle').disabled=true;status.textContent='Original photobooth theme restored.';
  }
  titleInput.addEventListener('input',()=>applyBranding(titleInput.value.trim(),pendingLogo,subtitleInput.value.trim(),dateInput.value.trim(),locationInput.value.trim(),false));
  subtitleInput.addEventListener('input',()=>applyBranding(titleInput.value.trim(),pendingLogo,subtitleInput.value.trim(),dateInput.value.trim(),locationInput.value.trim(),false));
  dateInput.addEventListener('input',()=>applyBranding(titleInput.value.trim(),pendingLogo,subtitleInput.value.trim(),dateInput.value.trim(),locationInput.value.trim(),false));
  locationInput.addEventListener('input',()=>applyBranding(titleInput.value.trim(),pendingLogo,subtitleInput.value.trim(),dateInput.value.trim(),locationInput.value.trim(),false));
  logoInput.addEventListener('change',()=>{const file=logoInput.files&&logoInput.files[0];if(!file)return;if(!file.type.startsWith('image/')){status.textContent='Choose an image file for the logo.';return;}const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{try{const cv=document.createElement('canvas'),s=Math.min(1,700/im.width,300/im.height);cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);pendingLogo=cv.toDataURL('image/png');logoPreview.src=pendingLogo;logoPreview.style.display='block';applyBranding(titleInput.value.trim(),pendingLogo,subtitleInput.value.trim(),dateInput.value.trim(),locationInput.value.trim(),false);}catch(e){status.textContent='Could not process logo.';}URL.revokeObjectURL(url);};im.onerror=()=>{status.textContent='Could not load logo image.';URL.revokeObjectURL(url);};im.src=url;});
  input.addEventListener('change',()=>{
    const file=input.files&&input.files[0];if(!file)return;
    if(!file.type.startsWith('image/')){status.textContent='Please choose an image file.';return;}
    if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);
    preview.src=objectUrl;preview.style.display='block';
    const img=new Image();
    img.onload=()=>{
      try{extractedPalette=extractPalette(img);pending=buildTheme(extractedPalette);renderSwatches(pending);apply(pending,false);applyBtn.disabled=false;document.getElementById('themeShuffle').disabled=extractedPalette.length<2;status.textContent='Theme preview is live. Shuffle colors to explore combinations, then Apply theme to save.';}
      catch(e){status.textContent='Could not analyze that image. Try another image.';console.warn('Theme extraction failed',e);}
    };
    img.onerror=()=>status.textContent='Could not load that image.';
    img.src=objectUrl;
  });
  document.getElementById('themeShuffle').addEventListener('click',()=>{if(!extractedPalette||extractedPalette.length<2)return;pending=buildTheme(extractedPalette,true);renderSwatches(pending);apply(pending,false);status.textContent='New color combination previewed. Shuffle again or Apply theme to save.';});
  applyBtn.addEventListener('click',()=>{if(!pending)return;apply(pending,true);applyBranding(titleInput.value.trim(),pendingLogo,subtitleInput.value.trim(),dateInput.value.trim(),locationInput.value.trim(),true);status.textContent='Theme, event title, and logo saved on this kiosk.';});
  document.getElementById('themeReset').addEventListener('click',reset);
  try{const saved=JSON.parse(localStorage.getItem('adaptivePhotoboothTheme')||'null');if(saved){apply(saved);renderSwatches(saved);status.textContent='Saved adaptive theme restored. Upload a new image to change it.';}const branding=JSON.parse(localStorage.getItem('adaptivePhotoboothBranding')||'null');if(branding){titleInput.value=branding.title||'';subtitleInput.value=branding.subtitle||'';dateInput.value=branding.date||'';locationInput.value=branding.location||'';pendingLogo=branding.logo||null;if(pendingLogo){logoPreview.src=pendingLogo;logoPreview.style.display='block';}applyBranding(branding.title||'',pendingLogo,branding.subtitle||'',branding.date||'',branding.location||'',false);}}
  catch(e){localStorage.removeItem('adaptivePhotoboothTheme');}
})();