/**
 * Ferula Art — Main JS
 * Theme · Nav · Reveal · Gallery · Testimonials · Lightbox
 * Page Loader · Scroll-to-Top · Showcase Modal · Contact Form
 */
document.addEventListener('DOMContentLoaded', () => {

  // ─── Page Loader ─────────────────────────────────────────────────
  const loader = document.getElementById('pageLoader');
  const fill   = document.getElementById('loaderFill');
  if (loader) {
    // Animate the bar then fade out
    if (fill) {
      fill.style.transition = 'width 0.8s ease';
      fill.style.width = '70%';
    }
    window.addEventListener('load', () => {
      if (fill) { fill.style.width = '100%'; }
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
      }, 300);
    });
    // Fallback if load never fires
    setTimeout(() => {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.5s ease';
      setTimeout(() => { loader.style.display = 'none'; }, 500);
    }, 3000);
  }

  // ─── Theme ───────────────────────────────────────────────────────
  const root        = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon   = document.getElementById('themeIcon');

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem('fa-theme', t);
    if (themeIcon) themeIcon.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
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
    updateScrollTop();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── Active nav link ─────────────────────────────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
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
    hamburger?.setAttribute('aria-expanded', 'false');
  }));

  // ─── Scroll-to-Top ───────────────────────────────────────────────
  const scrollTopBtn = document.getElementById('scrollTop');
  function updateScrollTop() {
    scrollTopBtn?.classList.toggle('visible', window.scrollY > 400);
  }
  scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ─── Magnetic buttons ────────────────────────────────────────────
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r   = btn.getBoundingClientRect();
      const cx  = r.left + r.width  / 2;
      const cy  = r.top  + r.height / 2;
      const dx  = (e.clientX - cx) * 0.25;
      const dy  = (e.clientY - cy) * 0.25;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

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

  // ─── Gallery filter ───────────────────────────────────────────────
  const filterBtns = document.querySelectorAll('.filter-btn');
  let lbImages = [];
  let lbIndex  = 0;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.gallery-item').forEach(item => {
        item.classList.toggle('hidden', f !== 'all' && item.dataset.category !== f);
      });
    });
  });

  window.initGallery = () => {
    const items = document.querySelectorAll('.gallery-item');
    lbImages = Array.from(items).map(i => i.querySelector('img')?.src).filter(Boolean);
    items.forEach((item, idx) => {
      item.addEventListener('click',   () => openLightbox(idx));
      item.addEventListener('keydown', e => e.key === 'Enter' && openLightbox(idx));
    });
  };

  // ─── Lightbox ────────────────────────────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lbImg');

  function openLightbox(idx) {
    lbIndex = idx;
    if (lbImg) lbImg.src = lbImages[lbIndex];
    lightbox?.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }
  function lbPrev() { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; if (lbImg) lbImg.src = lbImages[lbIndex]; }
  function lbNext() { lbIndex = (lbIndex + 1) % lbImages.length; if (lbImg) lbImg.src = lbImages[lbIndex]; }

  document.getElementById('lbClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lbPrev')?.addEventListener('click',  lbPrev);
  document.getElementById('lbNext')?.addEventListener('click',  lbNext);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

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
    if (dotsWrap) dotsWrap.innerHTML = '';
    testiItems = items;
    testiDots  = [];

    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'testi-card';
      card.setAttribute('role', 'listitem');
      card.innerHTML = `
        <div class="testi-stars">★★★★★</div>
        <p class="testi-text">"${item.text}"</p>
        <p class="testi-author">${item.author}</p>
        <p class="testi-role">${item.role}</p>`;
      track.appendChild(card);

      if (dotsWrap) {
        const dot = document.createElement('button');
        dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Yorum ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
        testiDots.push(dot);
      }
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

  let tsX = 0;
  track?.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; }, { passive: true });
  track?.addEventListener('touchend',   e => {
    const diff = tsX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(testiIndex + (diff > 0 ? 1 : -1)); startAutoPlay(); }
  });

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

  // ─── Showcase Detail Modal ────────────────────────────────────────
  const scModal    = document.getElementById('scModal');
  const scClose    = document.getElementById('scClose');
  const scBackdrop = document.getElementById('scBackdrop');
  const scMainImg  = document.getElementById('scMainImg');
  const scThumbs   = document.getElementById('scThumbs');
  const scImgPrev  = document.getElementById('scImgPrev');
  const scImgNext  = document.getElementById('scImgNext');
  let scImages = [];
  let scImgIdx = 0;

  function openScModal(card) {
    const d = card.dataset;
    scImages = [];
    try { scImages = JSON.parse(d.images || '[]'); } catch {}
    if (!scImages.length && d.image) scImages.push(d.image);
    scImgIdx = 0;

    // Populate info
    if (document.getElementById('scModalCat'))   document.getElementById('scModalCat').textContent   = d.cat   || '';
    if (document.getElementById('scModalTitle'))  document.getElementById('scModalTitle').textContent  = d.title || '';
    if (document.getElementById('scModalDesc'))   document.getElementById('scModalDesc').textContent   = d.desc  || '';
    if (document.getElementById('scModalPrice'))  document.getElementById('scModalPrice').textContent  = d.price || '';

    // WhatsApp
    const waBtn = document.getElementById('scModalWA');
    if (waBtn) {
      const msg = `Merhaba! Ferula Art'ta "${d.title}" ürününüzü inceledim. Bilgi almak istiyorum.`;
      waBtn.href = `https://wa.me/905469660256?text=${encodeURIComponent(msg)}`;
    }

    // Etsy
    const etsyBtn = document.getElementById('scModalEtsy');
    if (etsyBtn) {
      etsyBtn.style.display = d.link ? '' : 'none';
      etsyBtn.href = d.link || '#';
    }

    renderScImages();
    scModal?.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    scClose?.focus();
  }

  function renderScImages() {
    if (scMainImg) {
      scMainImg.src = scImages[scImgIdx] || '';
      scMainImg.alt = document.getElementById('scModalTitle')?.textContent || '';
    }
    if (scThumbs) {
      scThumbs.innerHTML = scImages.length > 1
        ? scImages.map((url, i) =>
            `<button class="sc-thumb${i === scImgIdx ? ' active' : ''}" data-idx="${i}" aria-label="Görsel ${i+1}">
               <img src="${url}" alt="Görsel ${i+1}" loading="lazy" />
             </button>`).join('')
        : '';
      scThumbs.querySelectorAll('.sc-thumb').forEach(btn => {
        btn.addEventListener('click', () => {
          scImgIdx = +btn.dataset.idx;
          renderScImages();
        });
      });
    }
    const showNav = scImages.length > 1;
    if (scImgPrev) scImgPrev.style.display = showNav ? '' : 'none';
    if (scImgNext) scImgNext.style.display = showNav ? '' : 'none';
  }

  function closeScModal() {
    scModal?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  scClose?.addEventListener('click', closeScModal);
  scBackdrop?.addEventListener('click', closeScModal);
  scImgPrev?.addEventListener('click', () => {
    scImgIdx = (scImgIdx - 1 + scImages.length) % scImages.length;
    renderScImages();
  });
  scImgNext?.addEventListener('click', () => {
    scImgIdx = (scImgIdx + 1) % scImages.length;
    renderScImages();
  });

  // Called by firebase-loader after showcase renders
  window.initShowcase = () => {
    document.querySelectorAll('.showcase-card[data-title]').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => openScModal(card));
      card.addEventListener('keydown', e => e.key === 'Enter' && openScModal(card));
    });
  };

  // ─── Keyboard: close modals ───────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!lightbox?.hasAttribute('hidden')) closeLightbox();
      if (!scModal?.hasAttribute('hidden'))  closeScModal();
    }
    if (!lightbox?.hasAttribute('hidden')) {
      if (e.key === 'ArrowLeft')  lbPrev();
      if (e.key === 'ArrowRight') lbNext();
    }
    if (!scModal?.hasAttribute('hidden') && scImages.length > 1) {
      if (e.key === 'ArrowLeft')  { scImgIdx = (scImgIdx - 1 + scImages.length) % scImages.length; renderScImages(); }
      if (e.key === 'ArrowRight') { scImgIdx = (scImgIdx + 1) % scImages.length; renderScImages(); }
    }
  });

  // ─── Contact Form ─────────────────────────────────────────────────
  const contactForm = document.getElementById('contactForm');
  const cfSubmit    = document.getElementById('cfSubmit');
  const cfSuccess   = document.getElementById('cfSuccess');
  const cfErrorMsg  = document.getElementById('cfErrorMsg');

  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = document.getElementById('cfName')?.value.trim();
    const email   = document.getElementById('cfEmail')?.value.trim();
    const message = document.getElementById('cfMessage')?.value.trim();

    if (!name || !email || !message) return;

    // Show loading state
    if (cfSubmit) { cfSubmit.disabled = true; cfSubmit.classList.add('loading'); }
    if (cfSuccess)  { cfSuccess.textContent  = ''; cfSuccess.style.display = 'none'; }
    if (cfErrorMsg) { cfErrorMsg.textContent = ''; cfErrorMsg.style.display = 'none'; }

    try {
      await db.collection('messages').add({
        name, email, message,
        status:    'unread',
        lang:      window.i18n?.currentLang || 'tr',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      contactForm.reset();
      if (cfSuccess) {
        const msg = window.i18n?.currentLang === 'en'
          ? '✓ Message sent! We will get back to you soon.'
          : '✓ Mesajınız iletildi! En kısa sürede dönüş yapacağız.';
        cfSuccess.textContent = msg;
        cfSuccess.style.display = 'block';
      }
    } catch (err) {
      console.error('Contact form error:', err);
      if (cfErrorMsg) {
        const msg = window.i18n?.currentLang === 'en'
          ? 'Failed to send message. Please try again.'
          : 'Mesaj gönderilemedi. Lütfen tekrar deneyin.';
        cfErrorMsg.textContent = msg;
        cfErrorMsg.style.display = 'block';
      }
    } finally {
      if (cfSubmit) { cfSubmit.disabled = false; cfSubmit.classList.remove('loading'); }
    }
  });

});
