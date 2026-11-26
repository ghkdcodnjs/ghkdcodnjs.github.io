// 인터랙션 조정 — S1 비율은 0~1, 시간은 밀리초입니다.
const MOTION = {
  chile: { x: .594, y: .575 }, zoom: 3, zoomEnd: .55, photoEnd: .85, rise: 24,
  introEnd: .44, satelliteSwap: [.51,.59], satelliteExit: [.65,.69],
  groundFade: [.69,.78], groundSwap: [.83,.88], lastCaption: [.93,.98],
  closetWait: 7000, closetHint: 7000, waterStep: 520, slide: 1100,
  loadingTick: 380, loadingCycles: 3
};
const chapters = Object.fromEntries([...document.querySelectorAll('main > section')].map(section => [section.id, section]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const view = name => document.querySelector('[data-view="'+name+'"]');
const ease = (value,start,end) => {
  const t = Math.max(0,Math.min(1,(value-start)/(end-start)));
  return t*t*(3-2*t);
};
function animate(element,frames,duration,delay=0) {
  if (!reducedMotion.matches) element.animate(frames,{duration,delay,easing:'cubic-bezier(.45,0,.25,1)',fill:'backwards'});
}
function showView(section, name) {
  const current = section.querySelector('.frame:not([hidden])');
  const next = section.querySelector('[data-view="' + name + '"]');
  if (!next || next === current) return;
  current.hidden = true;
  next.hidden = false;
  if (current.contains(document.activeElement)) {
    next.tabIndex = -1;
    next.focus({preventScroll: true});
  }
}

const intro = chapters.intro;
const earth = intro.querySelector('.earth');
const titles = [...intro.querySelectorAll('.earth-caption')];
const captions = [...intro.querySelectorAll('.desert-caption')];
const satellite = intro.querySelector('.satellite');
const ground = intro.querySelector('.ground');
const alertSpot = intro.querySelector('.alert-location');
let answer;
function paintIntro(p) {
  const m=MOTION;
  const opening=p/m.introEnd;
  const z=ease(opening,0,m.zoomEnd);
  const scale=reducedMotion.matches?1:1+(m.zoom-1)*z;
  const layout=earth.parentNode;
  const x=layout.clientWidth/2-earth.offsetLeft-earth.offsetWidth*m.chile.x;
  const y=layout.clientHeight/2-earth.offsetTop-earth.offsetHeight*m.chile.y;
  earth.style.transformOrigin=(100*m.chile.x)+'% '+(100*m.chile.y)+'%';
  earth.style.transform='translate('+x*z+'px,'+y*z+'px) scale('+scale+')';
  const photo=ease(opening,m.zoomEnd,m.photoEnd);
  earth.style.opacity=1-photo;
  titles.forEach((el,i)=>{
    const fadeIn=i?ease(opening,(i-1)*.17+.08,(i-1)*.17+.17):1;
    el.style.opacity=fadeIn*(1-ease(opening,i*.17+.08,i===2?m.zoomEnd:i*.17+.17));
  });
  satellite.style.opacity=photo;
  const landscape=ease(p,...m.groundFade);
  ground.style.opacity=landscape;
  const first=ease(opening,m.photoEnd,1), swap=ease(p,...m.satelliteSwap);
  const exit=ease(p,...m.satelliteExit), second=ease(p,...m.groundSwap), last=ease(p,...m.lastCaption);
  alertSpot.style.opacity=swap*(1-landscape);
  // 위성 원본 좌표를 cover 배율로 환산해 세로 화면에서도 표시점을 사진에 고정합니다.
  if(satellite.naturalWidth){
    const ratio=Math.max(satellite.clientWidth/satellite.naturalWidth,satellite.clientHeight/satellite.naturalHeight);
    const anchor=parseFloat(getComputedStyle(satellite).objectPosition)/100;
    alertSpot.style.left=(satellite.clientWidth*anchor+(.34-anchor)*satellite.naturalWidth*ratio)+'px';
    alertSpot.style.top=(satellite.clientHeight/2-.30*satellite.naturalHeight*ratio)+'px';
  }
  const stages=[[first,swap],[swap,exit],[landscape,second],[second,last],[last,0]];
  captions.forEach((el,i)=>{
    const [enter,leave]=stages[i];
    el.style.opacity=enter*(1-leave);
    el.style.transform='translateY('+m.rise*(1-enter-leave)+'px)';
  });
}
function updateScroll(){
  const height=intro.querySelector('.viewport').clientHeight;
  paintIntro(Math.max(0,Math.min(1,-intro.getBoundingClientRect().top/(intro.offsetHeight-height))));
  if(answer){
    const section=chapters.question;
    const step=Math.max(0,Math.min(3,Math.floor(-section.getBoundingClientRect().top/section.querySelector('.viewport').clientHeight+.001)));
    showView(section,'question:'+ [answer,'unknown','discarded','explore'][step]);
  }
}
let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;updateScroll();});
}
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule);
addEventListener('load',schedule);
updateScroll();

// S3·S6·S7 — 상세 상자를 하나의 레이어로 묶어 위에서 아래로 엽니다.
function preparePanel(frame){
  const panel=frame.querySelector('.panel');
  const group=document.createElement('div');
  group.className='panel-content';
  for(const el of [...frame.children].slice([...frame.children].indexOf(panel))){
    if(!el.matches('button') && !(frame.closest('#solutions') && parseFloat(el.style.left)<30)) group.append(el);
  }
  frame.append(group);
  return group;
}
const percent=(el,key)=>parseFloat(el.style[key]);
for(const frame of document.querySelectorAll('#world .frame:has(.panel),#solutions .frame:has(.panel),#ecosystem .frame:has(.panel)')){
  const group=preparePanel(frame);
  if(!frame.closest('#world'))continue;
  const pin=frame.querySelector('[data-action="country-'+frame.dataset.view.split(':')[1]+'"]');
  const box=group.querySelector('.panel'), labels=group.querySelectorAll('.size-18');
  const x=percent(pin,'left')+percent(pin,'width')/2,y=percent(pin,'top')+percent(pin,'height')/2;
  const px=Math.min(Math.max(x,percent(box,'left')),percent(box,'left')+percent(box,'width'));
  const py=Math.min(Math.max(y,percent(box,'top')),percent(box,'top')+percent(box,'height'));
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),line=document.createElementNS(ns,'line');
  svg.classList.add('map-connector');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');
  for(const [key,value] of Object.entries({x1:x,y1:y,x2:px,y2:py,stroke:'white','vector-effect':'non-scaling-stroke'}))line.setAttribute(key,value);
  svg.append(line);frame.insertBefore(svg,group);
  const divider=document.createElement('i');divider.className='map-divider';
  divider.style.left=(percent(labels[1],'left')-1.6)+'%';divider.style.top=labels[0].style.top;
  divider.style.height=(percent(labels[4],'top')-percent(labels[0],'top')+1.8)+'%';group.append(divider);
}

const openCloset=view('closet:open');
const instruction=openCloset.querySelector('.overlay-hint');
instruction.hidden=true;
const garments=[...openCloset.querySelectorAll('.garment-hit')];
function addImage(button,src){
  const img=new Image();img.alt='';img.src='images/'+src+'.png';button.prepend(img);
}
garments.forEach((b,i)=>{b.hidden=true;addImage(b,['4-3_shirt1','4-4_blouse1','4-5_jeans1'][i]);});
for(const [i,b] of [...view('ecosystem').querySelectorAll('.eco-hit')].entries()){
  const detail=view('ecosystem:'+i),layer=detail.querySelector('.dim-screen + img');
  b.style.left=(percent(layer,'left')+percent(view('ecosystem').firstElementChild,'left')-percent(detail.firstElementChild,'left'))+'%';
  for(const key of ['top','width','height'])b.style[key]=layer.style[key];
  addImage(b,['6-1_air','6-2_soil','6-3_ocean'][i]);
}
let opened=false;
function openWardrobe(){
  showView(chapters.wardrobe,'closet:open');
  if(opened)return;
  opened=true;
  setTimeout(()=>{
    instruction.hidden=false;
    setTimeout(()=>{instruction.classList.add('dismissed');garments.forEach(b=>b.hidden=false);},MOTION.closetHint);
  },MOTION.closetWait);
}
function moveFrom(el,source,duration){
  const end=el.getBoundingClientRect();
  const dx=source.left+source.width/2-end.left-end.width/2,dy=source.top+source.height/2-end.top-end.height/2;
  animate(el,[{transform:'translate('+dx+'px,'+dy+'px) scale('+source.width/end.width+','+source.height/end.height+')'},{transform:'none'}],duration);
}
function garmentDetails(key,button){
  const start=button.getBoundingClientRect();
  const frame=view('closet:'+key);
  showView(chapters.wardrobe,frame.dataset.view);
  if(key.endsWith('-time'))return;
  if(button.matches('.garment-hit'))moveFrom(frame.querySelector('.outline + img'),start,MOTION.slide);
  const groups=['img[src$="water1.png"]','.size-28:first-of-type','img[src$="water2.png"]','.size-28','img[src$="water3.png"]','.size-36','.size-36 span'];
  const labels=frame.querySelectorAll('.size-28');
  groups.forEach((selector,i)=>{
    const elements=i===1?[labels[0]]:i===3?[labels[1]]:frame.querySelectorAll(selector);
    for(const el of elements)animate(el,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],700,(i+1)*MOTION.waterStep);
  });
}
function openDetail(section,name,i){
  const base=view(name),frame=view(name+':'+i);
  const original=name==='ecosystem'?base.firstElementChild:base.querySelectorAll('img')[i];
  const start=original.getBoundingClientRect();
  showView(section,frame.dataset.view);
  moveFrom(frame.firstElementChild,start,MOTION.slide);
  if(name==='ecosystem'){
    for(const el of frame.querySelectorAll('.dim-screen,.dim-screen + img')){
      const dx=start.left-frame.firstElementChild.offsetLeft-frame.getBoundingClientRect().left;
      animate(el,[{translate:dx+'px 0'},{translate:'0 0'}],MOTION.slide);
    }
  }
}
const baseViews={world:'map',wardrobe:'closet:open',ecosystem:'ecosystem',solutions:'solutions'};
function activeHint(section){return [...section.querySelectorAll('.overlay-hint:not(.dismissed):not([hidden])')].find(el=>el.getClientRects().length);}
document.addEventListener('click',event=>{
  const section=event.target.closest('section') || [...Object.values(chapters)].find(s=>{const b=s.getBoundingClientRect();return b.height&&event.clientY>=b.top&&event.clientY<b.bottom;});
  if(!section)return;
  const hint=activeHint(section);
  if(hint){
    if(!hint.contains(event.target))hint.classList.add('dismissed');
    return;
  }
  const button=event.target.closest('[data-action]'),action=button?.dataset.action || '';
  if(action==='yes'||action==='no'){
    answer=action;section.classList.add('answered');updateScroll();
  }else if(action==='map'){
    // 마지막 질문만 접습니다. 다음 장면은 사용자가 스크롤해서 진입합니다.
    button.disabled=true;
    button.setAttribute('aria-pressed','true');
  }else if(action==='open')openWardrobe();
  else if(action.startsWith('garment-'))garmentDetails(action.slice(8),button);
  else if(action.startsWith('country-'))showView(section,'map:'+action.slice(8));
  else if(action==='eco-back'||action==='role-back')showView(section,baseViews[section.id]);
  else if(action.startsWith('eco-'))openDetail(section,'ecosystem',action.slice(4));
  else if(action.startsWith('role-'))openDetail(section,'solutions',action.slice(5));
  else if(section.id in baseViews && !button){
    const current=section.querySelector('.frame:not([hidden])');
    if(current.dataset.view.includes(':') && current!==openCloset)showView(section,baseViews[section.id]);
  }
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const section=document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('section');
  if(!section)return;
  const hint=activeHint(section);
  if(hint)hint.classList.add('dismissed');
  else if(section.id in baseViews && (section!==chapters.wardrobe||opened))showView(section,baseViews[section.id]);
});
function fillReceipt(counts) {
  const fields = chapters.receipt.querySelector('.receipt-numbers');
  fields.replaceChildren();
  function number(x,y,value,total=false) {
    const field = document.createElement('output');
    field.style.left = x+'%';
    field.style.top = y+'%';
    if (total) field.className='sum';
    field.textContent = value;
    fields.append(field);
  }
  const prices = [35000,27000,6000];
  const months = [5,6,3];
  const format = value => value.toLocaleString('ko-KR');
  counts.forEach((count,i) => {
    number(40,24.35+i*3.19,count);
    number(88.4,24.35+i*3.19,format(prices[i]*count)+'원');
    number(39.1,68.84+i*2.71,count);
    number(87.9,68.84+i*2.71,months[i]*count);
  });
  number(89.5,34.3,format(counts.reduce((s,n,i)=>s+n*prices[i],0)),true);
  number(88.5,59.0,'70,939',true);
  number(89.5,77.4,(counts.reduce((s,n,i)=>s+n*months[i],0)/12).toFixed(2),true);
}
const form=document.querySelector('#purchase-form');
const inputs=[...form.querySelectorAll('input')];
const complete=form.querySelector('button');
function validate(){complete.hidden=!inputs.every(el=>el.value!==''&&el.validity.valid);}
form.addEventListener('input',validate);addEventListener('pageshow',validate);validate();
let calculating=false;
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(calculating||!form.checkValidity())return;
  calculating=true;
  fillReceipt(inputs.map(el=>el.valueAsNumber));
  showView(chapters.purchases,'purchase:loading');
  const status=view('purchase:loading').querySelector('p');
  let tick=0;status.textContent='계산 중.';
  const timer=setInterval(()=>{
    tick++;
    if(tick<MOTION.loadingCycles*3){status.textContent='계산 중'+'.'.repeat(1+tick%3);return;}
    clearInterval(timer);calculating=false;
    // 같은 S5 위치에 영수증을 펼칩니다. 다음 생태계 장면까지는 일반 스크롤입니다.
    chapters.receipt.hidden=false;
    chapters.receipt.querySelector('.overlay-hint').classList.remove('dismissed');
    chapters.purchases.hidden=true;
  },MOTION.loadingTick);
});
