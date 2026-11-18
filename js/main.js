/* LE MIRZA — interactions (vanilla, sans dépendance) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Horaires (affiche de sept. 2026) ---------------- */
  // 0 = dimanche … 6 = samedi ; [ouverture, fermeture] en minutes (1440 = minuit)
  const DAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const HOURS = { 1:[600,1440], 2:[600,1440], 3:[600,1440], 4:[600,1440], 5:[600,1440], 6:[1020,1440], 0:[1020,1440] };
  const ORDER = [1,2,3,4,5,6,0];
  const fmt = m => (m >= 1440 ? '00' : String(Math.floor(m/60)).padStart(2,'0')) + 'H';
  const fmtLong = m => m >= 1440 ? 'minuit' : `${Math.floor(m/60)}h${m%60 ? String(m%60).padStart(2,'0') : ''}`;

  function parisNow(){
    try{
      const p = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
      const g = t => p.find(x => x.type === t).value;
      const wd = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[g('weekday')];
      return { day: wd, min: (+g('hour') % 24) * 60 + +g('minute') };
    }catch(e){ const d = new Date(); return { day:d.getDay(), min:d.getHours()*60+d.getMinutes() }; }
  }

  function status(){
    const { day, min } = parisNow();
    const [o, c] = HOURS[day];
    if (min >= o && min < c) return { open:true, text:`Ouvert · jusqu'à ${fmtLong(c)}` };
    if (min < o) return { open:false, text:`Fermé · ouvre à ${fmtLong(o)}` };
    const next = (day + 1) % 7;
    return { open:false, text:`Fermé · demain ${fmtLong(HOURS[next][0])}` };
  }

  function renderHours(){
    const { day } = parisNow();
    const s = status();
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-closed', !s.open);
      $('[data-status-text]', el).textContent = s.text;
    });
    const t = HOURS[day];
    $$('[data-today-hours]').forEach(el => el.textContent = `${DAYS[day]} · ${fmtLong(t[0])} → ${fmtLong(t[1])}`);

    const dl = $('#hoursList');
    if (dl){
      dl.innerHTML = ORDER.map((d,i) => {
        const cls = d === day ? ' class="today"' : '';
        const gap = i === 5 ? '<div class="gap" aria-hidden="true"></div>' : '';
        return `${gap}<dt${cls}>${DAYS[d]}</dt><dd${cls}>${fmt(HOURS[d][0])} &gt; ${fmt(HOURS[d][1])}</dd>`;
      }).join('');
    }
    const mini = $('#miniHours');
    if (mini){
      mini.innerHTML =
        `<span${[1,2,3,4,5].includes(day)?' class="today"':''}>Lun → Ven</span><span>10h → minuit</span>` +
        `<span${[6,0].includes(day)?' class="today"':''}>Sam &amp; Dim</span><span>17h → minuit</span>`;
    }
  }
  renderHours();
  setInterval(renderHours, 60000);

  /* ---------------- Titres découpés en mots ---------------- */
  $$('[data-split]').forEach(el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3){
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
    $$('.w > span', el).forEach((s, i) => s.style.transitionDelay = `${i * 55}ms`);
    el.classList.add('split');
  });

  /* ---------------- Apparitions au scroll ---------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  const observeAll = () => $$('[data-reveal],[data-dmask],[data-split]').forEach(el => {
    if (el.closest('.hero')) return; // le hero est piloté par l'intro
    io.observe(el);
  });

  /* ---------------- Header / dock ---------------- */
  const hdr = $('#hdr'), dock = $('#dock'), hero = $('#accueil');
  let lastY = 0;
  function onScroll(){
    const y = scrollY;
    const heroH = hero.offsetHeight;
    hdr.classList.toggle('is-solid', y > heroH - 80);
    hdr.classList.toggle('is-hidden', y > heroH && y > lastY + 4 && !document.body.classList.contains('menu-open'));
    if (y < lastY - 4) hdr.classList.remove('is-hidden');
    dock && dock.classList.toggle('is-on', y > heroH * 0.6 && y < document.body.scrollHeight - innerHeight - 140);
    lastY = y;
  }

  /* ---------------- Parallaxe légère ---------------- */
  const par = $$('[data-parallax]');
  function onParallax(){
    par.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height/2 - innerHeight/2) / innerHeight; // -1 … 1
      img.style.transform = `translate3d(0, ${(-8 + p * -10).toFixed(2)}%, 0)`;
    });
  }

  /* ---------------- Rail des vins : progression ---------------- */
  const rail = $('#rail'), railBar = $('#railBar');
  if (rail && railBar){
    const upd = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const p = max > 0 ? rail.scrollLeft / max : 0;
      railBar.style.transform = `translateX(${(p * (100/0.3 - 100)).toFixed(1)}%)`;
    };
    rail.addEventListener('scroll', upd, { passive:true }); upd();
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { onScroll(); if (!reduce) onParallax(); ticking = false; });
  }, { passive:true });

  /* ---------------- Menu ---------------- */
  const menuBtn = $('#menuBtn'), menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    menuBtn.setAttribute('aria-expanded', open);
    $('[data-menu-label]').textContent = open ? 'Fermer' : 'Menu';
  };
  menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- INTRO : le losange s'imprime puis s'ouvre ---------------- */
  const intro = $('#intro');
  // lien direct vers une section (#vins…) : on y va sans l'intro
  const deep = location.hash.length > 1 && document.getElementById(location.hash.slice(1));

  function start(){
    if (!deep) scrollTo(0,0);
    document.body.classList.add('ready');
    $$('.hero [data-split]').forEach(el => el.classList.add('in'));
    observeAll(); onScroll(); onParallax();
  }
  function finish(){
    intro.classList.add('is-gone');
    document.body.classList.remove('is-locked');
  }

  if (!intro || deep || !intro.animate){
    intro && intro.classList.add('is-gone');
    start();
    return;
  }

  try { history.scrollRestoration = 'manual'; } catch(e){}
  document.body.classList.add('is-locked');
  scrollTo(0,0);
  addEventListener('load', () => scrollTo(0,0), { once:true });

  const svg = $('.intro__logo', intro);
  const ring = $('.i-ring', svg), fill = $('.i-fill', svg), dots = $('.i-dots', svg);
  const letters = $$('.i-l', svg), cap = $('.intro__cap', intro);
  const E = 'cubic-bezier(.65,0,.35,1)', OUT = 'cubic-bezier(.2,.8,.2,1)';
  const anims = [];
  const A = (el, k, o) => { const a = el.animate(k, { fill:'forwards', ...o }); anims.push(a); return a; };

  A(ring, [{ strokeDashoffset:1 }, { strokeDashoffset:0 }], { duration:900, easing:E });
  A(fill, [{ transform:'scaleX(0)' }, { transform:'scaleX(1)' }], { duration:520, delay:620, easing:E });
  A(dots, [{ opacity:0 }, { opacity:1 }], { duration:500, delay:900 });
  letters.forEach((l, i) => A(l, [
    { opacity:0, transform:'translateY(-34px) scale(1.4)' },
    { opacity:1, transform:'translateY(3px) scale(.98)', offset:.72 },
    { opacity:1, transform:'none' }
  ], { duration:460, delay:1050 + i * 75, easing:OUT }));
  A(cap, [{ opacity:0, transform:'translateY(8px)' }, { opacity:1, transform:'none' }], { duration:600, delay:1600, easing:OUT });

  let exiting = false;
  function exit(){
    if (exiting) return; exiting = true;
    anims.forEach(a => a.finish());
    // fenêtre en losange : le cadre orange se troue et la photo apparaît derrière
    const r = fill.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    const cx = r.left + r.width/2, cy = r.top + r.height/2, w = r.width/2, h = r.height/2;
    const k = ((vw/2 + Math.abs(cx - vw/2)) / w + (vh/2 + Math.abs(cy - vh/2)) / h) * 1.08;
    const poly = s => `polygon(0px 0px, ${vw}px 0px, ${vw}px ${vh}px, 0px ${vh}px, 0px ${cy}px, ${cx - w*s}px ${cy}px, ${cx}px ${cy + h*s}px, ${cx + w*s}px ${cy}px, ${cx}px ${cy - h*s}px, ${cx - w*s}px ${cy}px, 0px ${cy}px)`;
    const D = 1050, ease = 'cubic-bezier(.76,0,.24,1)';

    letters.concat([dots, cap]).forEach(el => el.animate([{ opacity:1 }, { opacity:0 }], { duration:220, fill:'forwards' }));
    fill.animate([{ opacity:1 }, { opacity:0 }], { duration:260, fill:'forwards' });
    $('#introSkip').style.opacity = 0;

    intro.animate([{ clipPath: poly(1) }, { clipPath: poly(k) }], { duration:D, delay:160, easing:ease, fill:'both' });
    svg.style.transformOrigin = `${cx - svg.getBoundingClientRect().left}px ${cy - svg.getBoundingClientRect().top}px`;
    svg.animate([{ transform:'scale(1)' }, { transform:`scale(${k})` }], { duration:D, delay:160, easing:ease, fill:'both' });

    setTimeout(start, 380);
    setTimeout(finish, D + 220);
  }

  if (reduce){
    anims.forEach(a => a.finish());
    setTimeout(() => { start(); intro.animate([{opacity:1},{opacity:0}],{duration:500,fill:'forwards'}); setTimeout(finish, 520); }, 1200);
    return;
  }
  const auto = setTimeout(exit, 2650);
  const skip = () => { clearTimeout(auto); exit(); };
  $('#introSkip').addEventListener('click', skip);
  intro.addEventListener('click', skip);
})();
