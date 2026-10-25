(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !window.gsap) { root.classList.remove('js'); return; }

  // One orchestrated moment: the sketch appears, then the text lands.
  gsap.timeline({ defaults: { ease: 'power2.out' } })
    .fromTo('#glasses', { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.9 })
    .fromTo('.reveal', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, '-=0.5')
    .to('.bar', { opacity: 1, duration: 0.8 }, '-=0.6');

  // Continuous ripple: always animating while hovering, independent of mouse movement
  const art = document.getElementById('art');
  const face = document.querySelector('.face');
  const disp = document.querySelector('#ripple feDisplacementMap');
  const turb = document.querySelector('#ripple feTurbulence');
  let rafId = null;
  let hovering = false;
  let time = 0;
  let intensity = 0;

  const tick = () => {
    time += 1/60;

    // Smooth intensity ramp
    intensity += (hovering ? 1 : -1) * 0.02;
    intensity = Math.max(0, Math.min(1, intensity));

    if (!hovering && intensity <= 0.001) {
      art.removeAttribute('filter');
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    // Continuous organic animation - no mouse dependency
    const baseFreq = 0.003 + 0.004 * intensity;
    const freqX = baseFreq * (0.9 + Math.sin(time * 0.15) * 0.1);
    const freqY = baseFreq * (0.9 + Math.cos(time * 0.12) * 0.1);

    // Smooth multi-wave scale
    const wave =
      Math.sin(time * 0.8) * 0.4 +
      Math.sin(time * 1.1 + 0.7) * 0.25 +
      Math.sin(time * 0.5 + 2.1) * 0.15;
    const scale = intensity * 16 * (1 + wave);

    // Slow seed rotation
    const seed = 7 + Math.sin(time * 0.06) * 5;

    disp.setAttribute('scale', scale);
    turb.setAttribute('baseFrequency', `${freqX} ${freqY}`);
    turb.setAttribute('seed', Math.round(seed));

    rafId = requestAnimationFrame(tick);
  };

  face.addEventListener('pointerenter', () => {
    hovering = true;
    art.setAttribute('filter', 'url(#ripple)');
    if (!rafId) tick();
  });

  face.addEventListener('pointerleave', () => {
    hovering = false;
  });

  face.addEventListener('click', () => {
    gsap.to({ v: 0.005 }, {
      v: 0.018, duration: 0.1, ease: 'power2.out',
      yoyo: true, repeat: 1,
      onUpdate: function() {
        const v = this.targets()[0].v;
        turb.setAttribute('baseFrequency', `${v} ${v * 1.4}`);
      }
    });
  });
})();