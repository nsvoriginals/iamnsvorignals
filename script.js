(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap) { root.classList.remove('js'); return; }

  // ---------- Intro ----------
  gsap.timeline({ defaults: { ease: 'power2.out' } })
    .fromTo('#glasses', { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.9 })
    .fromTo('.hero .reveal', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, '-=0.5')
    .to('.bar', { opacity: 1, duration: 0.8 }, '-=0.6');

  // ---------- Continuous ripple ----------
  const art  = document.getElementById('art');
  const disp = document.querySelector('#ripple feDisplacementMap');
  const turb = document.querySelector('#ripple feTurbulence');

  if (art && disp && turb) {
    turb.setAttribute('seed', '7');
    art.setAttribute('filter', 'url(#ripple)');

    const start = performance.now();
    let paused = false;

    const tick = (now) => {
      if (!paused) {
        const t = (now - start) / 1000;
        const wave =
          Math.sin(t * 0.9)       * 0.5 +
          Math.sin(t * 1.3 + 0.7) * 0.3 +
          Math.sin(t * 0.5 + 2.1) * 0.2;
        const scale = 5 + 3 * wave;
        const freq  = 0.005 + 0.001 * Math.sin(t * 0.2);
        disp.setAttribute('scale', scale.toFixed(3));
        turb.setAttribute('baseFrequency', `${freq.toFixed(4)} ${(freq * 1.1).toFixed(4)}`);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Pause filter while scrolling to keep scroll smooth.
    let idle;
    window.addEventListener('scroll', () => {
      if (!paused) {
        paused = true;
        art.removeAttribute('filter');
      }
      clearTimeout(idle);
      idle = setTimeout(() => {
        paused = false;
        art.setAttribute('filter', 'url(#ripple)');
      }, 150);
    }, { passive: true });
  }

  // ---------- Cursor preview for works list ----------
  const preview = document.querySelector('.preview');
  const previewImg = preview?.querySelector('img');
  const works = [...document.querySelectorAll('.work')];

  if (preview && previewImg && works.length && !reduce) {
    let px = 0, py = 0;   // target
    let cx = 0, cy = 0;   // current (lerped)

    window.addEventListener('pointermove', (e) => {
      px = e.clientX;
      py = e.clientY;
    }, { passive: true });

    const follow = () => {
      // ease toward target for that smooth "magnetic" feel
      cx += (px - cx) * 0.18;
      cy += (py - cy) * 0.18;
      preview.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(${preview.classList.contains('is-on') ? 1 : 0.96})`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);

    works.forEach((row) => {
      const url = row.getAttribute('data-preview');
      if (!url) return;

      row.addEventListener('pointerenter', () => {
        previewImg.src = url;
        preview.classList.add('is-on');
      });
      row.addEventListener('pointerleave', () => {
        preview.classList.remove('is-on');
      });
      // If the preview image fails, don't show a broken box
      previewImg.addEventListener('error', () => {
        preview.classList.remove('is-on');
      }, { once: true });
    });
  }

  // ---------- Scroll-in reveal for works + footer ----------
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.to(entry.target, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' });
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    document.querySelectorAll('.works .reveal, .foot .reveal, .work').forEach((el) => {
      gsap.set(el, { opacity: 0, y: 12 });
      io.observe(el);
    });
  }

  // ---------- Year ----------
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();