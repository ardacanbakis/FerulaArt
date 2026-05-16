/**
 * Ferula Art — Main JS (revamped)
 * Theme, Nav, Reveal, Gallery, Testimonials, Lightbox, Stats
 */
document.addEventListener('DOMContentLoaded', () => {

  // ─── Theme ───────────────────────────────────────────────────────
  const root        = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon   = document.getElementById('themeIcon');

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem('fa-theme', t);
    themeIcon.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
  applyTheme(localStorage.getItem('fa-theme') || 'dark');
  themeToggle?.addEventListener('click', () =>
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
  );

  // ─── Language ────────────────────────────────────────────────────
  const langToggle = document.getElementById('langToggle');
  const langLabel  = document.getElementById('langLabel');
  langToggle?.addEventListener('click', () => {
    if (window.i18n) {
      const next = window.i18n.currentLang === 'tr' ? 'en' : 'tr';
      window.i18n.setLang(next);
      if (langLabel) langLabel.textContent = next.toUpperCase();
    }
  });
  if (langLabel && window.i18n) {
    langLabel.textContent = (window.i18n.currentLang || 'tr').toUpperCase();
  }

  // ─── Navbar scroll effect ────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 40);
    updateActiveLink();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── Active nav link ─────────────────────────────────────────────
  const navLinks  = document.querySelectorAll('.nav-link');
  const sections  = document.querySelectorAll('section[id]');
  function updateActiveLink() {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navLinks.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === `#${current}`);
    });
  }

  // ─── Mobile nav ──────────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navList   = document.getElementById('navLinks');
  hamburger?.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  navLinks.forEach(l => l.addEventListener('click', () => {
    navList.classList.remove('open');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', false);
  }));

  // ─── Scroll-reveal ───────────────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  // ─── Animated counters ───────────────────────────────────────────
  const statNums = document.querySelectorAll('.stat-num[data-target]');
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target;
      const target = +el.dataset.target;
      const dur    = 1800;
      const step   = 16;
      const inc    = target / (dur / step);
      let cur      = 0;
      const t      = setInterval(() => {
        cur = Math.min(cur + inc, target);
        el.textContent = Math.round(cur);
        if (cur >= target) clearInterval(t);
      }, step);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  statNums.forEach(n => counterObs.observe(n));

  // ─── Gallery ─────────────────────────────────────────────────────
  const galleryGrid = document.getElementById('galleryGrid');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  let lbImages = [];
  let lbIndex  = 0;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.gallery-item').forEach(item => {
        const show = f === 'all' || item.dataset.category === f;
        item.classList.toggle('hidden', !show);
      });
    });
  });

  // Called by firebase-loader when gallery loads
  window.initGallery = () => {
    const items = document.querySelectorAll('.gallery-item');
    lbImages = Array.from(items).map(i => i.querySelector('img')?.src).filter(Boolean);
    items.forEach((item, idx) => {
      item.addEventListener('click', () => openLightbox(idx));
      item.addEventListener('keydown', e => e.key === 'Enter' && openLightbox(idx));
    });
  };

  // ─── Lightbox ────────────────────────────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lbImg');
  const lbClose  = document.getElementById('lbClose');
  const lbPrev   = document.getElementById('lbPrev');
  const lbNext   = document.getElementById('lbNext');

  function openLightbox(idx) {
    lbIndex = idx;
    lbImg.src = lbImages[lbIndex];
    lightbox?.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }
  function prevImage() {
    lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
    lbImg.src = lbImages[lbIndex];
  }
  function nextImage() {
    lbIndex = (lbIndex + 1) % lbImages.length;
    lbImg.src = lbImages[lbIndex];
  }
  lbClose?.addEventListener('click', closeLightbox);
  lbPrev?.addEventListener('click', prevImage);
  lbNext?.addEventListener('click', nextImage);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lightbox?.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });

  // ─── Testimonials carousel ───────────────────────────────────────
  const track    = document.getElementById('testiTrack');
  const dotsWrap = document.getElementById('testiDots');
  const prevBtn  = document.getElementById('testiPrev');
  const nextBtn  = document.getElementById('testiNext');
  let testiIndex = 0;
  let testiItems = [];
  let testiDots  = [];
  let autoPlay;

  function buildTestimonials(items) {
    if (!track || !items?.length) return;
    track.innerHTML = '';
    dotsWrap.innerHTML = '';
    testiItems = items;

    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'testi-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="testi-stars">★★★★★</div>
        <p class="testi-text">"${item.text}"</p>
        <p class="testi-author">${item.author}</p>
        <p class="testi-role">${item.role}</p>
      `;
      track.appendChild(card);

      const dot = document.createElement('button');
      dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Yorum ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      testiDots.push(dot);
    });

    goTo(0);
    startAutoPlay();
  }

  function goTo(idx) {
    testiIndex = (idx + testiItems.length) % testiItems.length;
    if (track) track.style.transform = `translateX(-${testiIndex * 100}%)`;
    testiDots.forEach((d, i) => d.classList.toggle('active', i === testiIndex));
  }

  function startAutoPlay() {
    clearInterval(autoPlay);
    autoPlay = setInterval(() => goTo(testiIndex + 1), 5000);
  }

  prevBtn?.addEventListener('click', () => { goTo(testiIndex - 1); startAutoPlay(); });
  nextBtn?.addEventListener('click', () => { goTo(testiIndex + 1); startAutoPlay(); });

  // Touch swipe
  let tsX = 0;
  track?.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; }, { passive: true });
  track?.addEventListener('touchend',   e => {
    const diff = tsX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(testiIndex + (diff > 0 ? 1 : -1)); startAutoPlay(); }
  });

  // Expose so i18n can rebuild after language switch
  window.buildTestimonials = buildTestimonials;

  // ─── Footer credit ───────────────────────────────────────────────
  const fc = document.getElementById('footerCredit');
  if (fc) {
    fc.innerHTML = `Made with ❤️ by <a href="https://instagram.com/ferula.art" target="_blank" rel="noopener">Ferula Art</a> © ${new Date().getFullYear()}`;
  }

  // ─── WhatsApp i18n-aware link ────────────────────────────────────
  function updateWALink() {
    const wa  = document.getElementById('whatsappBtn');
    if (!wa) return;
    const msg = window.i18n?.currentLang === 'en'
      ? 'Hello! I am interested in your handmade art products.'
      : 'Merhaba! El yapımı ürünlerinizle ilgileniyorum.';
    wa.href = `https://wa.me/905469660256?text=${encodeURIComponent(msg)}`;
  }
  updateWALink();
  document.addEventListener('langChanged', updateWALink);

});
