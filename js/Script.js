// 각 장면에서 하나의 시안만 표시한다. 이미지와 본문은 index.html에서 수정한다.
const chapters = Object.fromEntries([...document.querySelectorAll('main > section')].map(section => [section.id, section]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let answer = null;
let activeIntro = -1;
let receiptTimer;

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

function goTo(section) {
  section.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
}

function storyProgress(section) {
  const viewHeight = section.querySelector('.viewport').clientHeight;
  return Math.max(0, -section.getBoundingClientRect().top / viewHeight);
}

function updateScroll() {
  const progress = storyProgress(chapters.intro);
  const step = Math.min(7, Math.floor(progress + .001));
  if (step !== activeIntro) {
    activeIntro = step;
    showView(chapters.intro, step ? 'intro:' + step : 'intro');
  }
  if (step === 2) {
    const earth = chapters.intro.querySelector('.glow');
    const zoom = reducedMotion.matches ? 0 : Math.max(0, (progress - 2.45) / .55);
    earth.style.transformOrigin = '47% 69%';
    earth.style.transform = 'scale(' + (1 + zoom * zoom * 6) + ')';
    earth.parentElement.querySelector('.copy').style.opacity = String(1 - Math.min(1,zoom));
  }
  if (answer) {
    const sequence = [answer, 'unknown', 'discarded', 'explore'];
    showView(chapters.question, 'question:' + sequence[Math.min(3, Math.floor(storyProgress(chapters.question) + .001))]);
  }
  if (!chapters.receipt.hidden) {
    const caption = chapters.receipt.querySelector('.receipt-caption');
    caption.style.opacity = chapters.receipt.getBoundingClientRect().top < -70 ? 0 : 1;
  }
}
let queued = false;
function scheduleUpdate() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; updateScroll(); });
}
addEventListener('scroll', scheduleUpdate, {passive:true});
addEventListener('resize', scheduleUpdate);
updateScroll();

const baseViews = {world:'map', wardrobe:'closet:open', ecosystem:'ecosystem', solutions:'solutions'};
function dismissHint(section) {
  section.classList.add('hint-dismissed');
}

document.addEventListener('click', event => {
  const section = event.target.closest('section');
  if (!section) return;
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'yes' || action === 'no') {
    answer = action;
    chapters.question.classList.add('answered');
    updateScroll();
  } else if (action === 'map') {
    goTo(chapters.world);
  } else if (action === 'open') {
    showView(section,'closet:open');
  } else if (action?.startsWith('country-')) {
    showView(section,'map:' + action.slice(8));
  } else if (action?.startsWith('garment-')) {
    showView(section,'closet:' + action.slice(8));
  } else if (action === 'eco-back' || action === 'role-back') {
    showView(section,baseViews[section.id]);
  } else if (action?.startsWith('eco-')) {
    showView(section,'ecosystem:' + action.slice(4));
  } else if (action?.startsWith('role-')) {
    showView(section,'solutions:' + action.slice(5));
  } else if (section.id in baseViews && !event.target.closest('button')) {
    const frame = section.querySelector('.frame:not([hidden])');
    if (frame.dataset.view.includes(':') && frame.dataset.view !== 'closet:open') showView(section,baseViews[section.id]);
  }
  if (action !== 'open' || section.classList.contains('hint-dismissed')) dismissHint(section);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const section = document.elementFromPoint(innerWidth/2, innerHeight/2)?.closest('section');
  if (section && section.id in baseViews) {
    showView(section,baseViews[section.id]);
    dismissHint(section);
  }
});

for (const button of document.querySelectorAll('.garment-hit')) {
  const {left,top,width,height} = button.style;
  const x = parseFloat(left)*19.2, y = parseFloat(top)*10.8;
  const w = parseFloat(width)*19.2, h = parseFloat(height)*10.8;
  button.style.setProperty('--closet-size', (1717/w*100)+'% '+(966.3/h*100)+'%');
  button.style.setProperty('--closet-position', ((x-101.5)/(1717-w)*100)+'% '+((y-56.8)/(966.3-h)*100)+'%');
}
document.addEventListener('pointerover', event => {
  const control = event.target.closest('.map-pin,.garment-hit,.eco-hit,.role-hit');
  if (control && event.pointerType !== 'touch') dismissHint(control.closest('section'));
});

// 원본 영수증의 빈 칸에 수량, 구매액, 합산 분해 시간을 표시한다.
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
document.querySelector('#purchase-form').addEventListener('submit', event => {
  event.preventDefault();
  const counts = [...event.currentTarget.querySelectorAll('input')].map(input=>Number(input.value || 0));
  fillReceipt(counts);
  showView(chapters.purchases,'purchase:loading');
  const status = chapters.purchases.querySelector('[data-view="purchase:loading"] p');
  let ticks=0;
  clearInterval(receiptTimer);
  status.textContent='계산 중.';
  receiptTimer=setInterval(()=>{
    if (++ticks < 3) { status.textContent='계산 중'+'.'.repeat(ticks+1); return; }
    clearInterval(receiptTimer);
    chapters.receipt.hidden=false;
    showView(chapters.purchases,'purchase');
    goTo(chapters.receipt);
  },300);
});
