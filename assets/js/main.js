(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ── theme ── */
  try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
  if (root.dataset.theme !== 'light' && root.dataset.theme !== 'dark') root.dataset.theme = 'dark';

  function syncTheme() {
    const light = root.dataset.theme === 'light';
    $$('.theme').forEach(b => {
      b.setAttribute('aria-pressed', light ? 'true' : 'false');
      b.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f5f3ef' : '#1a1816');
  }
  function setTheme(t, persist) {
    root.dataset.theme = t;
    if (persist) { try { localStorage.setItem('theme', t); } catch (e) {} }
    syncTheme();
  }
  syncTheme();

  $$('.theme').forEach(b => b.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true);
  }));
  addEventListener('storage', e => {
    if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) setTheme(e.newValue, false);
  });

  /* ── smooth scroll ── */
  const lenis = window.Lenis ? new Lenis({ lerp: .09, smoothWheel: !reduce }) : null;
  if (lenis && window.gsap) {
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ── mobile menu ── */
  const menu = $('.menu');
  const mbtn = $('.mbtn');
  let open = false;

  function setMenu(v) {
    if (v === open || !menu) return;
    open = v;
    mbtn.setAttribute('aria-expanded', v);
    mbtn.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !v);
    if (v) {
      lenis?.stop();
      gsap?.to(menu, { autoAlpha: 1, duration: .3 });
      if (!reduce && window.gsap) {
        gsap.fromTo('.mlinks a, .mfoot > *',
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: .6, ease: 'power3.out', stagger: .05, delay: .08 });
      }
    } else {
      lenis?.start();
      gsap?.to(menu, { autoAlpha: 0, duration: .25 });
    }
  }

  if (mbtn) mbtn.addEventListener('click', () => setMenu(!open));
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 800) setMenu(false); });

  /* ── typewriter ── */
  function type(el) {
    if (!el.dataset.type) return;
    const txt = el.dataset.type;
    el.innerHTML = '<span></span><i></i>';
    const s = $('span', el);
    if (reduce) { s.textContent = txt; return; }
    let n = 0;
    (function tick() {
      s.textContent = txt.slice(0, ++n);
      if (n < txt.length) setTimeout(tick, 50 + Math.random() * 40);
    })();
  }

  /* ── per-page setup ── */
  function mount() {
    const page = document.body.dataset.page || '';
    const current = page.split('/')[0];
    $$('nav a, .menu a').forEach(a => a.classList.toggle('on', a.dataset.nav === current));

    const pond = $('#pond');
    if (pond) {
      if (page === 'home') {
        pond.style.display = '';
        window.Pond?.start(pond);
        gsap?.to(pond, { opacity: 1, duration: 1.2 });
      } else {
        window.Pond?.stop();
        pond.style.display = 'none';
        pond.style.opacity = 0;
      }
    }

    $$('[data-type]').forEach(el => setTimeout(() => type(el), 400));

    if (!reduce && window.gsap) {
      gsap.from($$('[data-in]'), {
        opacity: 0, y: 14, duration: .9, ease: 'power3.out', stagger: .08, delay: .1
      });
    }

    const rail = $('.rail');
    if (rail) {
      rail.addEventListener('wheel', e => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          rail.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }
  }

  /* ── clean-URL page transitions ── */
  let busy = false;
  async function go(url, push = true) {
    if (busy) return;
    busy = true;
    setMenu(false);
    try {
      const fade = (reduce || !window.gsap)
        ? Promise.resolve()
        : gsap.to('main', { opacity: 0, y: -8, duration: .25, ease: 'power2.in' });
      const [res] = await Promise.all([fetch(url), fade]);
      if (!res.ok) throw 0;

      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const newMain = doc.querySelector('main');
      if (!newMain) throw 0;

      $('main').innerHTML = newMain.innerHTML;
      document.title = doc.title;
      document.body.dataset.page = doc.body.dataset.page || '';
      if (push) history.pushState({}, '', url);
      lenis?.scrollTo(0, { immediate: true });
      mount();
      if (!reduce && window.gsap) {
        gsap.fromTo('main', { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: .5, ease: 'power2.out' });
      }
      syncTheme();
    } catch (e) {
      location.href = url;
    }
    busy = false;
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
    if (a.origin !== location.origin) return;
    if (a.pathname === location.pathname && (!a.hash || a.hash === location.hash)) return;
    if (a.pathname === location.pathname && a.hash) return; // let in-page hash scroll
    e.preventDefault();
    go(a.pathname);
  });
  addEventListener('popstate', () => go(location.pathname, false));

  mount();
})();