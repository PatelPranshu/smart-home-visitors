/**
 * theme.js — Blinkdrop Dark/Light Mode Toggle
 * Matches the logic described in the master prompt.
 * Switches hero background between light.jpg and dark.jpg.
 */

(function () {
  const STORAGE_KEY = 'blinkdrop-theme';
  const html = document.documentElement;
  const icon = document.getElementById('theme-icon');
  const btn  = document.getElementById('theme-toggle');
  const navLinks = document.getElementById('nav-links');
  const hamburger = document.getElementById('hamburger');

  // ── Apply saved theme or system preference ──
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  // ── Toggle on button click ──
  btn && btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    updateIcon(theme);
    updateHeroBackground(theme);
  }

  function updateIcon(theme) {
    if (!icon) return;
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  function updateHeroBackground(theme) {
    // Use CSS variable approach — visitor.css handles the actual url() swap
    // This also allows smooth JS-driven class toggle if needed
    const hero = document.querySelector('.hero');
    if (hero) {
      // No-op: CSS [data-theme="dark"] .hero uses var(--hero-bg-url) automatically
    }
  }

  // ── Navbar scroll effect ──
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.boxShadow = window.scrollY > 20
        ? '0 2px 24px rgba(0,0,0,0.14)'
        : 'none';
    }, { passive: true });
  }

  // ── Mobile hamburger toggle ──
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = !navLinks.classList.contains('open');
      navLinks.classList.toggle('open', open);
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Counter animation for stats ──
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = el.getAttribute('data-count');
      if (!target) return;
      const isPercent = target.includes('%');
      const isPlus = target.includes('+');
      const num = parseFloat(target);
      let start = 0;
      const duration = 1600;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const value = Math.floor(easeOut(progress) * num);
        el.textContent = value + (isPlus ? '+' : '') + (isPercent ? '%' : '');
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
      statsObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-number[data-count]').forEach(el => {
    statsObserver.observe(el);
  });

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ── Fade-in on scroll ──
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(
      '.product-card, .feature-card, .step, .testimonial-card'
    ).forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
      fadeObserver.observe(el);
    });
  });

})();
