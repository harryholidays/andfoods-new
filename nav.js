// Shared nav behavior: scroll-state class + mobile menu toggle.
(function () {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const backdrop = document.querySelector('.mobile-menu-backdrop');
  const closeBtn = document.querySelector('.mobile-menu__close');

  function onScroll() {
    if (!header) return;
    if (window.scrollY > 24) header.classList.add('site-header--scrolled');
    else header.classList.remove('site-header--scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    if (!mobileMenu) return;
    mobileMenu.classList.toggle('mobile-menu--open', open);
    if (backdrop) backdrop.classList.toggle('mobile-menu-backdrop--open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (menuToggle) menuToggle.addEventListener('click', () => setMenu(true));
  if (closeBtn) closeBtn.addEventListener('click', () => setMenu(false));
  if (backdrop) backdrop.addEventListener('click', () => setMenu(false));

  // Scroll-sync feature: crossfade sticky images + dim non-active text.
  const scrollTexts = document.querySelectorAll('.scroll-feature__text');
  const scrollImages = document.querySelectorAll('.scroll-feature__image');
  if (scrollTexts.length && scrollImages.length) {
    const setActive = (idx) => {
      scrollTexts.forEach((t) => {
        t.setAttribute('data-active', t.getAttribute('data-scroll-text') === idx ? 'true' : 'false');
      });
      scrollImages.forEach((img) => {
        img.style.opacity = img.getAttribute('data-scroll-image') === idx ? '1' : '0';
      });
    };
    const observer = new IntersectionObserver((entries) => {
      // Pick the entry with highest intersection ratio at the top band.
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const idx = visible[0].target.getAttribute('data-scroll-text');
      setActive(idx);
    }, {
      rootMargin: '-40% 0px -40% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });
    scrollTexts.forEach((el) => observer.observe(el));
  }

  // Recipe filters: toggle pills to multi-select categories (no pill = show all).
  const recipeFilters = document.querySelectorAll('.recipe-filters .pill--filter');
  const recipeCards = document.querySelectorAll('.recipe-card');
  if (recipeFilters.length && recipeCards.length) {
    const applyFilter = () => {
      const active = Array.from(recipeFilters)
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.getAttribute('data-filter'));
      recipeCards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        card.hidden = active.length > 0 && !active.includes(cat);
      });
    };
    recipeFilters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        applyFilter();
      });
    });
  }

  // Page loader: fade out once the page is fully ready.
  const loader = document.querySelector('.page-loader');
  const dismissLoader = () => {
    if (!loader) return;
    loader.classList.add('page-loader--hidden');
    setTimeout(() => loader.remove(), 700);
  };
  if (loader) {
    if (document.readyState === 'complete') {
      requestAnimationFrame(() => setTimeout(dismissLoader, 120));
    } else {
      window.addEventListener('load', () => setTimeout(dismissLoader, 120));
    }
    // Safety net — never trap the page behind the loader.
    setTimeout(dismissLoader, 3500);
  }

  // Reveal-on-scroll: elegant fade + rise for every major block.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll(
    'main > section, main > section > .container > *, .sub-hero__content, .cta-banner > *, .recipe-card, .recipe-grid > *, .applications-marquee, .story-grid > *'
  );
  revealTargets.forEach((el) => el.classList.add('reveal'));
  if (prefersReduced) {
    revealTargets.forEach((el) => el.classList.add('reveal--in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealTargets.forEach((el) => io.observe(el));
    // Staggered delay for sibling groups (cards, grid items).
    document.querySelectorAll('.recipe-grid, .story-grid, .cta-banner').forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        child.style.transitionDelay = `${Math.min(i * 60, 360)}ms`;
      });
    });
  } else {
    revealTargets.forEach((el) => el.classList.add('reveal--in'));
  }

  // Mark the current nav link as active.
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('[data-route]').forEach((el) => {
    const route = el.getAttribute('data-route');
    if (route === path) {
      el.classList.add('site-nav__link--active');
      el.classList.add('mobile-menu__link--active');
    }
  });
})();
