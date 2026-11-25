// B for Baking — motion system (GSAP + ScrollTrigger + Lenis + Three.js cake)
const SCROLL_MAP = {
  heroHold: 0,          // hero is not pinned; the cake travels as it scrolls away
  sliceVh: 280,         // see CSS .slice height
  layersVh: 360,        // see CSS .layers height
  wallVh: 520,          // horizontal track travel
};

const html = document.documentElement;
const reduced = html.classList.contains('reduced');
const touch = html.classList.contains('touch');
const mobile = () => innerWidth < 760;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

// shared scroll progress read by the cake
const P = { intro: reduced ? 1 : 0, hero: 0, slice: 0, layers: 0, exit: 0 };
let cake = null;

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.95 });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); const el = id === '#top' ? document.body : $(id); if (!el) return;
  e.preventDefault(); closeDrawer();
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 }); else el.scrollIntoView();
});

/* ---------------- split helpers ---------------- */
function splitWords(el) {
  if (el.dataset.split) return $$('.w > i', el);
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
          const i = document.createElement('i'); i.textContent = part; w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
    });
  };
  walk(el); el.dataset.split = 1;
  return $$('.w > i', el);
}
// hero title already has .w spans; give them inner <i>
$$('.hero__title .w').forEach(w => { if (!w.querySelector('i')) { const i = document.createElement('i'); i.textContent = w.textContent; w.textContent = ''; w.append(i); } });

/* ---------------- blossom branch ---------------- */
(function buildBlossoms() {
  const g = $('.blossom__flowers'); if (!g) return;
  const spots = [[468, 32, 1.1], [410, 58, .9], [356, 112, 1.2], [372, 214, .8], [330, 150, .7], [268, 204, 1], [214, 142, .85], [176, 236, .75], [126, 262, 1], [206, 300, .8], [300, 178, .6], [448, 60, .6]];
  const ns = 'http://www.w3.org/2000/svg';
  spots.forEach(([x, y, s]) => {
    const fl = document.createElementNS(ns, 'g'); fl.setAttribute('class', 'fl');
    fl.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
    for (let k = 0; k < 5; k++) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', 'M0 0 C-9 -8 -8 -20 0 -22 C8 -20 9 -8 0 0Z');
      p.setAttribute('transform', `rotate(${k * 72})`); fl.append(p);
    }
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('r', 3.6); fl.append(c);
    g.append(fl);
  });
})();

/* ---------------- loader ---------------- */
const countEl = $('#ldCount');
let loadProgress = 0;
function setCount(v) { countEl.textContent = String(Math.round(v)).padStart(3, '0'); }

async function boot() {
  // cake
  if (!reduced) {
    try {
      const mod = await import('./cake.js');
      cake = mod.initCake({ canvas: $('#cakeCanvas'), P, onProgress: p => { loadProgress = Math.max(loadProgress, p); } });
    } catch (e) { $('#stage').classList.add('no-webgl'); }
  }
  if (reduced) { html.classList.add('ready'); initAll(); return; }

  const drawn = gsap.timeline();
  $$('.loader__svg path, .loader__svg circle').forEach(p => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
  drawn.to('.ld-ring', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' })
       .to('.ld-b', { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0.15)
       .to('.loader__word', { opacity: 1, y: 0, duration: .8 }, 1.0);

  const counter = { v: 0 };
  const start = performance.now();
  const failsafe = new Promise(r => setTimeout(r, 4200));
  const cakeReady = cake ? cake.ready.catch(() => {}) : Promise.resolve();
  let finished = false;
  Promise.race([Promise.all([cakeReady, new Promise(r => setTimeout(r, 1700))]), failsafe]).then(() => { finished = true; });
  await new Promise(resolve => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const target = finished ? 100 : Math.min(92, 20 + loadProgress * 60 + elapsed * 12);
      counter.v += (target - counter.v) * 0.12;
      setCount(counter.v);
      if (finished && counter.v > 99.4) { setCount(100); resolve(); return; }
      requestAnimationFrame(tick);
    };
    tick();
  });
  const out = gsap.timeline({ onComplete: () => { $('#loader').remove(); } });
  out.to('.loader__mark, .loader__count, .loader__note', { y: -40, opacity: 0, duration: .6, ease: 'power3.in', stagger: .05 })
     .to('#loader', { yPercent: -112, duration: 1.15, ease: 'expo.inOut' }, '-=.15')
     .add(() => {
       html.classList.add('ready'); lenis?.start(); initAll(); heroIntro();
       // slow network: the GLB may still be loading; fade the cake in when it lands
       if (cake && !cake.isReady) { gsap.set('#stage', { opacity: 0 }); cake.ready.then(() => gsap.to('#stage', { opacity: 1, duration: 1.2 })); }
     }, '-=.75');
}

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title .w > i', { yPercent: 115, rotate: 6, duration: 1.3, stagger: .08 })
    .from('.hero__eyebrow', { y: 20, opacity: 0, duration: .9 }, .1)
    .from('.hero__lede, .hero__ctas', { y: 30, opacity: 0, duration: 1, stagger: .1 }, .35)
    .to(P, { intro: 1, duration: 2.0, ease: 'power3.out' }, 0)
    .from('.blossom__branch', { strokeDasharray: 1400, strokeDashoffset: 1400, duration: 1.8, ease: 'power2.inOut' }, .2)
    .from('.blossom .fl', { scale: 0, rotate: -90, duration: 1.1, ease: 'back.out(2.2)', stagger: { each: .06, from: 'random' } }, .7)
    .from('.note', { opacity: 0, y: 14, duration: .8, stagger: .15 }, 1.1)
    .from('.note path', { strokeDasharray: 200, strokeDashoffset: 200, duration: 1, stagger: .15, ease: 'power2.out' }, 1.15)
    .from('.ticker', { yPercent: 120, duration: 1.2 }, .6)
    .from('.hero__scroll', { opacity: 0, duration: .8 }, 1.4)
    .from('.nav__inner', { yPercent: -140, duration: 1, clearProps: 'transform' }, .3);
}

/* ---------------- everything after load ---------------- */
function initAll() {
  initNav(); initTray(); initMotionToggle(); initTitle();
  if (reduced) { initStaticVideos(); return; }
  initCursor(); initMagnetic();
  initBlossomLife(); initMarquees();
  initStory(); initStatement(); initWall(); initOccasions(); initMoments(); initReels(); initOrder(); initFooter(); initSplits();
  // section-level triggers created after every pinned/sticky section
  initStageToggle();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------------- nav ---------------- */
function initNav() {
  const nav = $('#nav'); let lastY = 0;
  const onScroll = y => {
    nav.classList.toggle('is-solid', y > 60);
    nav.classList.toggle('is-hidden', y > lastY + 4 && y > 400 && !$('#drawer').classList.contains('open'));
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
    $('#trayBtn').classList.toggle('show', y > innerHeight * 0.8);
    $('.mbar')?.classList.toggle('show', y > innerHeight * 0.6);
  };
  if (lenis) lenis.on('scroll', e => onScroll(e.scroll)); else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  $('#burger').addEventListener('click', () => {
    const d = $('#drawer'); const open = !d.classList.contains('open');
    if (open) { d.hidden = false; requestAnimationFrame(() => d.classList.add('open')); lenis?.stop(); }
    else closeDrawer();
    $('#burger').setAttribute('aria-expanded', open);
  });
}
function closeDrawer() {
  const d = $('#drawer'); if (!d || !d.classList.contains('open')) return;
  d.classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false'); lenis?.start();
  setTimeout(() => { if (!d.classList.contains('open')) d.hidden = true; }, 700);
}

/* ---------------- cursor + magnetic ---------------- */
function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return;
  html.classList.add('has-cursor');
  const c = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: .12 }), dy = gsap.quickTo(dot, 'y', { duration: .12 });
  const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  addEventListener('pointermove', e => { c.classList.add('on'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor]');
    if (t) { label.textContent = t.dataset.cursor; c.classList.add('is-label'); } else c.classList.remove('is-label');
  });
}
function initMagnetic() {
  if (!matchMedia('(pointer: fine)').matches) return;
  $$('[data-magnetic]').forEach(el => {
    const x = gsap.quickTo(el, 'x', { duration: .8, ease: 'elastic.out(1,.4)' }), y = gsap.quickTo(el, 'y', { duration: .8, ease: 'elastic.out(1,.4)' });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .3); y((e.clientY - r.top - r.height / 2) * .35); });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

/* ---------------- hero life ---------------- */
function initBlossomLife() {
  $$('.blossom .fl').forEach((f, i) => gsap.to(f, { rotate: gsap.utils.random(-14, 14), duration: gsap.utils.random(2.2, 3.4), yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * .1 }));
  gsap.to('.blossom', { rotate: 2, transformOrigin: '100% 0%', duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  // drifting petals
  const hero = $('.hero');
  for (let i = 0; i < (mobile() ? 6 : 12); i++) {
    const p = document.createElement('i');
    p.style.cssText = 'position:absolute;z-index:4;width:12px;height:9px;border-radius:9px 0 9px 0;background:#F2C3C8;pointer-events:none;top:-20px;opacity:.9';
    hero.append(p);
    const fall = () => gsap.fromTo(p, { x: gsap.utils.random(innerWidth * .45, innerWidth), y: -20, rotate: gsap.utils.random(0, 360) },
      { x: `-=${gsap.utils.random(120, 360)}`, y: innerHeight + 40, rotate: `+=${gsap.utils.random(180, 540)}`, duration: gsap.utils.random(7, 12), ease: 'none', onComplete: fall });
    gsap.delayedCall(gsap.utils.random(0, 8), fall);
  }
  // hero content parallax out
  gsap.to('.hero__inner', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.note', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '70% top', scrub: true } });
  gsap.to('.ticker', { yPercent: 160, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '30% top', scrub: true } });
  gsap.to('.blossom', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------------- velocity marquees ---------------- */
function initMarquees() {
  $$('[data-velocity]').forEach(row => {
    row.innerHTML += row.innerHTML; // duplicate for loop
    const dir = +(row.dataset.dir || 1);
    let x = 0, vis = true, w = 0;
    const measure = () => { w = row.scrollWidth / 2; };
    measure(); addEventListener('resize', measure);
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(row);
    let skew = 0, flip = 1;
    gsap.ticker.add((t, dt) => {
      if (!vis) return;
      const v = lenis ? lenis.velocity : 0;
      if (Math.abs(v) > 0.5) flip = v > 0 ? 1 : -1;
      x -= (0.9 + Math.min(Math.abs(v) * 0.35, 14)) * dir * flip * (dt / 16.7);
      if (x <= -w) x += w; if (x > 0) x -= w;
      skew += ((-v * 0.25) - skew) * 0.1;
      row.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(skew, -10, 10)}deg)`;
    });
  });
}

/* ---------------- cake story ---------------- */
function initStory() {
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: s => { P.hero = s.progress; } });
  ScrollTrigger.create({ trigger: '#slice', start: 'top top', end: 'bottom bottom', onUpdate: s => { P.slice = s.progress; } });
  ScrollTrigger.create({ trigger: '#layers', start: 'top top', end: 'bottom bottom', onUpdate: s => { P.layers = s.progress; } });
  ScrollTrigger.create({ trigger: '#statement', start: 'top bottom', end: 'top 15%', onUpdate: s => { P.exit = s.progress; } });

  // slice: words part to make room for the slice, badges orbit
  const sl = gsap.timeline({ scrollTrigger: { trigger: '#slice', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  sl.fromTo('.slice__l', { x: () => mobile() ? 0 : innerWidth * .06, opacity: 0 }, { x: () => mobile() ? 0 : -innerWidth * .02, opacity: 1, duration: .25 }, 0)
    .fromTo('.slice__r', { x: () => mobile() ? 0 : -innerWidth * .06, opacity: 0 }, { x: () => mobile() ? 0 : innerWidth * .02, opacity: 1, duration: .25 }, .03)
    .fromTo('.slice__copy', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .2 }, .2)
    .to('.slice__title, .slice__copy', { opacity: 0, y: -40, duration: .15 }, .85);

  const badges = $$('#orbitBack .badge'); const back = $('#orbitBack'), front = $('#orbitFront');
  const orbit = { a: 0 };
  ScrollTrigger.create({
    trigger: '#slice', start: 'top top', end: 'bottom bottom',
    onUpdate: s => { orbit.p = s.progress; },
  });
  let counted = false;
  gsap.ticker.add(() => {
    const p = P.slice; if (p <= 0 || p >= 1) { badges.forEach(b => b.style.opacity = 0); return; }
    const show = smooth(.18, .32, p) * (1 - smooth(.86, .97, p));
    const R = mobile() ? Math.min(innerWidth * .36, 170) : Math.min(innerWidth * .21, 330);
    const Ry = mobile() ? R * 1.05 : R * .62;
    badges.forEach((b, i) => {
      const a = i / badges.length * Math.PI * 2 + p * Math.PI * 1.6 + performance.now() * 0.00008;
      const x = Math.cos(a) * R, y = Math.sin(a) * Ry + (mobile() ? innerHeight * .04 : 0);
      const depth = (Math.sin(a) + 1) / 2;            // front when lower
      b.style.transform = `translate3d(${x}px,${y}px,0) scale(${(.75 + depth * .35) * (.4 + show * .6)}) rotate(${Math.cos(a) * 8}deg)`;
      b.style.opacity = show;
      const want = depth > .5 ? front : back;            // pass in front of / behind the 3D cake
      if (b.parentNode !== want) want.append(b);
    });
    if (!counted && show > .5) {
      counted = true;
      const el = $('[data-count]'), o = { v: 0 };
      gsap.to(o, { v: +el.dataset.count, duration: 1.8, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('en-IN') });
    }
  });

  // layers: labels follow the exploded cake
  const labels = $$('.labels li');
  let heights = labels.map(li => li.offsetHeight);
  addEventListener('resize', () => { heights = labels.map(li => li.offsetHeight); });
  const bakeFill = $('#bakeFill'), bakeNum = $('#bakeNum');
  gsap.ticker.add(() => {
    const l = P.layers;
    if (l <= 0 || l >= 1 || !cake) { labels.forEach(li => li.style.opacity = 0); return; }
    const ex = cake.ex;
    const dys = { deco: 0.3, top: -0.12 };
    let prevY = -Infinity;
    labels.forEach((li, i) => {
      const pos = cake.project(li.dataset.layer, dys[li.dataset.layer] || 0, mobile() ? 1.05 : 1.25);
      if (!pos) return;
      const hgt = heights[i] || 30;
      let y = pos.y - hgt / 2;
      y = Math.max(y, prevY + hgt + 8); prevY = y;          // never let two labels overlap
      const o = smooth(.5 + i * .05, .75 + i * .04, ex);
      li.style.opacity = o;
      li.style.transform = `translate3d(${pos.x}px,${y}px,0) translateX(${(1 - o) * 30}px)`;
      // walk through the layers one at a time while the cake is apart
      const k = (l - .4) / .28;
      const act = k >= 0 && k < 1 ? Math.floor(k * labels.length) : -1;
      li.classList.toggle('is-active', act === i);
      li.classList.toggle('is-dim', act >= 0 && act !== i);
    });
    const b = smooth(.1, .9, l);
    bakeFill.style.transform = `scaleX(${b})`;
    bakeNum.textContent = String(Math.round(b * 100)).padStart(3, '0');
  });
  const ly = gsap.timeline({ scrollTrigger: { trigger: '#layers', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  ly.fromTo('.layers__kicker', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .08 }, .08)
    .fromTo('.bake', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .08 }, .1)
    .to('.layers__kicker, .bake', { opacity: 0, duration: .06 }, .84)
    .fromTo('.layers__big', { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .12 }, .86)
    .fromTo('.layers__big span:first-child', { xPercent: -30 }, { xPercent: 0, duration: .14 }, .86)
    .fromTo('.layers__big span:last-child', { xPercent: 30 }, { xPercent: 0, duration: .14 }, .86);
}

function initStageToggle() {
  const stage = $('#stage');
  ScrollTrigger.create({
    trigger: '#statement', start: 'top top',
    onEnter: () => { stage.classList.add('is-off'); cake?.setVisible(false); },
    onLeaveBack: () => { stage.classList.remove('is-off'); cake?.setVisible(true); },
  });
}

/* ---------------- statement ---------------- */
function initStatement() {
  const p = $('#statementText');
  // wrap words; chips stay one unit
  const units = [];
  [...p.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return; if (/^\s+$/.test(part)) { frag.append(part); return; }
        const s = document.createElement('span'); s.className = 'sw'; s.textContent = part; frag.append(s); units.push(s);
      });
      n.replaceWith(frag);
    } else { n.classList.add('sw'); units.push(n); }
  });
  p.setAttribute('aria-label', p.textContent.replace(/\s+/g, ' ').trim());
  gsap.to(units, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top 70%', end: 'bottom 75%', scrub: true } });
  gsap.from($$('.chip', p), { scale: .6, rotate: -12, ease: 'back.out(3)', stagger: .2, scrollTrigger: { trigger: p, start: 'top 75%', end: 'bottom 45%', scrub: true } });
  $$('.doodle').forEach((d, i) => {
    const L = $('path', d).getTotalLength();
    gsap.fromTo($('path', d), { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top 80%', end: 'center center', scrub: true } });
    gsap.to(d, { y: (i % 2 ? -1 : 1) * 120, rotate: (i % 2 ? 18 : -14), ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.cherry', { rotate: -30, y: 80 }, { rotate: 25, y: -60, ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.cherry svg', { rotate: 8, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '70% 10%' });
}

/* ---------------- horizontal cake wall ---------------- */
function initWall() {
  const track = $('#track'); const cards = $$('.card', track);
  $('#wallTotal').textContent = String(cards.length - 1).padStart(2, '0');
  if (mobile() || touch) {
    // native swipe; update counter from scroll
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / (cards[0].offsetWidth + 16));
      $('#wallIdx').textContent = String(Math.min(cards.length - 1, i + 1)).padStart(2, '0');
    }, { passive: true });
    gsap.from(cards.slice(0, 3), { y: 60, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: track, start: 'top 85%' } });
    return;
  }
  const dist = () => track.scrollWidth - innerWidth;
  const imgs = cards.map(c => $('img', c));
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '#wall', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
      onUpdate: s => {
        $('#wallBar').style.transform = `scaleX(${s.progress})`;
        const i = Math.round(s.progress * (cards.length - 2)) + 1;
        $('#wallIdx').textContent = String(i).padStart(2, '0');
      },
    },
  });
  // inner parallax + gentle swing from the track's motion (only while the wall is on screen)
  let wallOn = false;
  ScrollTrigger.create({ trigger: '#wall', start: 'top bottom', end: 'bottom top', onToggle: s => { wallOn = s.isActive; } });
  gsap.ticker.add(() => {
    if (!wallOn) return;
    const vw = innerWidth;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect(); if (r.right < -100 || r.left > vw + 100) return;
      const k = ((r.left + r.width / 2) / vw - .5);
      if (imgs[i]) imgs[i].style.transform = `translate3d(${k * -40}px,${-8 + k * 4}%,0) scale(1.08)`;
      c.style.transform = `rotate(${k * -3}deg) translateY(${Math.abs(k) * 30}px)`;
    });
  });
  // entrance of first cards
  gsap.from(cards.slice(0, 4), { y: 120, rotate: 6, opacity: 0, stagger: .08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '#wall', start: 'top 70%' } });
  // swap to full-res for the hero card
  imgs.forEach(img => { if (img?.dataset.src) { const im = new Image(); im.src = img.dataset.src; im.onload = () => img.src = img.dataset.src; } });
}

/* ---------------- occasions ---------------- */
function initOccasions() {
  const cards = $$('.occ');
  gsap.from(cards, { y: 100, rotateX: -18, opacity: 0, transformPerspective: 900, transformOrigin: '50% 100%', duration: 1.2, ease: 'expo.out', stagger: { each: .1, grid: 'auto' }, scrollTrigger: { trigger: '.grid', start: 'top 80%' } });
  if (matchMedia('(pointer: fine)').matches) {
    cards.forEach(c => {
      const rx = gsap.quickTo(c, 'rotationX', { duration: .6 }), ry = gsap.quickTo(c, 'rotationY', { duration: .6 });
      gsap.set(c, { transformPerspective: 900 });
      c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 8); rx(-((e.clientY - r.top) / r.height - .5) * 8); });
      c.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }
  // tiramisu layers draw
  $$('.occ__art path').forEach(p => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '.occ--art', start: 'top 80%' } }); });
}

/* ---------------- moments (polaroids) ---------------- */
function initMoments() {
  const pols = $$('.pol');
  const fan = pols.map((_, i) => ({ x: (i - (pols.length - 1) / 2) * (mobile() ? 18 : 34), y: Math.abs(i - (pols.length - 1) / 2) * (mobile() ? 6 : 10), r: (i - (pols.length - 1) / 2) * 6 }));
  const from = pols.map((_, i) => ({ x: (i % 2 ? 1 : -1) * gsap.utils.random(innerWidth * .4, innerWidth * .7), y: gsap.utils.random(-innerHeight * .8, innerHeight * .8), r: gsap.utils.random(-60, 60) }));
  if (mobile()) {
    pols.forEach((p, i) => gsap.set(p, { xPercent: -50, yPercent: -50, x: fan[i].x, y: fan[i].y, rotate: fan[i].r }));
    gsap.from(pols, { x: (i) => from[i].x * .5, y: (i) => from[i].y * .4, rotate: (i) => from[i].r, opacity: 0, stagger: .08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.polaroids', start: 'top 85%' } });
  } else {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#moments', start: 'top top', end: 'bottom bottom', scrub: 1 } });
    pols.forEach((p, i) => {
      tl.fromTo(p, { xPercent: -50, yPercent: -50, x: from[i].x, y: from[i].y, rotate: from[i].r, opacity: 0 },
        { x: fan[i].x, y: fan[i].y, rotate: fan[i].r, opacity: 1, ease: 'power3.out', duration: .3 }, i * .07);
    });
    tl.to(pols, { y: (i) => fan[i].y - 20, rotate: (i) => fan[i].r * 1.4, x: (i) => fan[i].x * 1.6, duration: .25, ease: 'none' }, .75);
  }
  const words = splitWords($('.moments__title'));
  gsap.from(words, { yPercent: 115, rotate: 5, stagger: .06, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.moments__title', start: 'top 85%' } });
  gsap.from('.moments__copy', { y: 30, opacity: 0, duration: 1, scrollTrigger: { trigger: '.moments__copy', start: 'top 90%' } });
}

/* ---------------- reels ---------------- */
function initReels() {
  $$('.phone').forEach(ph => {
    gsap.fromTo(ph, { y: () => +ph.dataset.speed * (mobile() ? .4 : 1) }, { y: () => -ph.dataset.speed * (mobile() ? .4 : 1), ease: 'none', scrollTrigger: { trigger: '.phones', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo($('.phone__screen', ph), { clipPath: 'inset(30% 10% 30% 10% round 30px)', scale: .9 }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', scale: 1, ease: 'expo.out', duration: 1.4, scrollTrigger: { trigger: ph, start: 'top 85%' } });
  });
  initStaticVideos();
  gsap.from('.reels__quote', { x: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.reels__quote', start: 'top 85%' } });
}
function initStaticVideos() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  }), { threshold: .25 });
  $$('.phone video').forEach(v => io.observe(v));
}

/* ---------------- order ---------------- */
function initOrder() {
  const steps = $$('.step');
  $$('.step__icon path').forEach(p => { const L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
  if (mobile()) {
    steps.forEach(s => {
      gsap.from(s, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
      gsap.to($$('.step__icon path', s), { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: s, start: 'top 80%' } });
    });
  } else {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 55%', scrub: 1 } });
    tl.fromTo('#scooter', { opacity: 0 }, { opacity: 1, duration: .05 }, 0)
      .to('#scooter', { motionPath: { path: '#routePath', align: '#routePath', alignOrigin: [.5, .8], autoRotate: false }, ease: 'none', duration: 1 }, 0);
    steps.forEach((s, i) => {
      tl.from(s, { y: 80, opacity: 0, rotate: (i - 1) * 3, duration: .2, ease: 'power3.out' }, .1 + i * .3)
        .to($$('.step__icon path', s), { strokeDashoffset: 0, duration: .25 }, .15 + i * .3);
    });
  }
  gsap.from('.order__cta .btn', { y: 40, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.order__cta', start: 'top 90%' } });
  gsap.from('.festival', { rotate: -12, y: 60, opacity: 0, duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.festival', start: 'top 90%' } });
}

/* ---------------- footer ---------------- */
function initFooter() {
  gsap.from('.footer__word span', { yPercent: 110, rotate: (i) => (i % 2 ? 12 : -12), opacity: 0, stagger: .04, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top 70%', end: 'bottom bottom', scrub: true } });
  // sprinkles
  const cv = $('#sprinkles'), ctx = cv.getContext('2d'); const foot = $('.footer');
  const cols = ['#F2C3C8', '#C24E68', '#C29A55', '#FBF5EC', '#8FA77E', '#F3DFB8'];
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio, 1.5), bits = [], active = false;
  const size = () => { W = foot.offsetWidth; H = foot.offsetHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const burst = (x, y, n = 36) => { for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 2, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], l: 8 + Math.random() * 6, rest: false }); if (bits.length > 900) bits.splice(0, bits.length - 900); };
  foot.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; const r = foot.getBoundingClientRect(); burst(e.clientX - r.left, e.clientY - r.top); });
  new IntersectionObserver(([e]) => { active = e.isIntersecting; if (active && !bits.length) { for (let k = 0; k < 5; k++) setTimeout(() => burst(W * (.15 + .7 * Math.random()), 80, 24), k * 260); } }).observe(foot);
  gsap.ticker.add(() => {
    if (!active) return;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      if (!b.rest) { b.vy += .32; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vx *= .99; if (b.y > H - 8) { b.y = H - 8; b.vy *= -.35; b.vx *= .6; if (Math.abs(b.vy) < 1) { b.rest = true; b.vy = 0; } } }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.beginPath(); ctx.roundRect(-b.l / 2, -2, b.l, 4, 2); ctx.fill(); ctx.restore();
    }
  });
}

/* ---------------- generic split reveals ---------------- */
function initSplits() {
  $$('.title.split').forEach(t => {
    const words = splitWords(t);
    gsap.from(words, { yPercent: 115, rotate: 5, stagger: .06, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 85%' } });
  });
  $$('.eyebrow').forEach(e => { if (e.closest('.hero,.loader,.footer')) return; gsap.from(e, { y: 16, opacity: 0, duration: .9, scrollTrigger: { trigger: e, start: 'top 90%' } }); });
}

/* ---------------- enquiry tray ---------------- */
function initTray() {
  const btn = $('#trayBtn'), tray = $('#tray'), list = $('#trayList'), count = $('#trayCount'), send = $('#traySend');
  let items = [];
  try { items = JSON.parse(localStorage.getItem('bfb-enquiry') || '[]'); } catch (e) {}
  const render = () => {
    count.textContent = items.length; btn.classList.toggle('has-items', items.length > 0);
    list.innerHTML = items.length ? items.map((it, i) => `<li>${it}<button aria-label="Remove ${it}" data-rm="${i}">×</button></li>`).join('') : '<li class="tray__empty">Nothing yet. Tap <b>+</b> on an occasion.</li>';
    $$('.occ').forEach(o => o.classList.toggle('added', items.includes(o.dataset.item)));
    try { localStorage.setItem('bfb-enquiry', JSON.stringify(items)); } catch (e) {}
    const date = $('#trayDate').value, notes = $('#trayNotes').value.trim();
    let msg = 'Hi B for Baking! I\'d like to enquire about:\n' + (items.length ? items.map(i => '• ' + i).join('\n') : '• a custom cake');
    if (date) msg += `\nDate needed: ${date}`;
    if (notes) msg += `\nNotes: ${notes}`;
    send.href = 'https://wa.me/917005246168?text=' + encodeURIComponent(msg);
  };
  const toggle = open => {
    const isOpen = open ?? tray.hidden;
    tray.hidden = !isOpen; btn.setAttribute('aria-expanded', isOpen);
    if (isOpen) { if (!reduced) gsap.from(tray, { scale: .85, opacity: 0, y: 20, duration: .5, ease: 'back.out(1.8)' }); setTimeout(() => $('#trayDate').focus(), 60); }
    else btn.focus();
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tray.hidden) toggle(false); });
  const tm = new Date(Date.now() + 864e5); $('#trayDate').min = tm.toISOString().slice(0, 10);
  btn.addEventListener('click', () => toggle());
  $('#trayClose').addEventListener('click', () => toggle(false));
  list.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { items.splice(+b.dataset.rm, 1); render(); } });
  $('#trayDate').addEventListener('input', render); $('#trayNotes').addEventListener('input', render);
  $$('.occ .plus').forEach(p => p.addEventListener('click', () => {
    const occ = p.closest('.occ'), it = occ.dataset.item; const i = items.indexOf(it);
    if (i >= 0) items.splice(i, 1); else {
      items.push(it);
      // fly a sprinkle to the tray button
      if (!reduced) {
        const r = p.getBoundingClientRect(), t = btn.getBoundingClientRect();
        const dot = document.createElement('i'); dot.style.cssText = `position:fixed;z-index:400;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:14px;height:14px;border-radius:50%;background:#C24E68;pointer-events:none`;
        document.body.append(dot);
        gsap.to(dot, { x: t.left + t.width - 20 - (r.left + r.width / 2), y: t.top + 10 - (r.top + r.height / 2), duration: .8, ease: 'power2.in', onComplete: () => { dot.remove(); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); } });
      }
      btn.classList.add('show');
    }
    render();
  }));
  render();
}

/* ---------------- motion toggle ---------------- */
function initMotionToggle() {
  const b = $('#motionToggle');
  b.setAttribute('aria-pressed', String(!reduced)); $('b', b).textContent = reduced ? 'Off' : 'On';
  b.addEventListener('click', () => { try { localStorage.setItem('bfb-motion', reduced ? 'on' : 'off'); } catch (e) {} location.reload(); });
}

/* ---------------- tab title ---------------- */
function initTitle() {
  const base = document.title;
  document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '🍰 Come back, the cake is waiting…' : base; });
}

boot();
