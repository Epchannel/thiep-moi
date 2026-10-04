/* ==========================================================================
   GRADUATION LANDING PAGE - DYNAMIC JAVASCRIPT LOGIC
   Features: Particle Engine, Countdown Timer, Smooth Scroll, RSVP Form, Wish Wall
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initParticleEngine();
  initCountdownTimer();
  initNavbarScroll();
  initWishSortAndLikes();
  loadWishes();
  initRSVPForm();
  initCalendarAction();
  initEnvelopeModal();
  initScrollRevealAnimations();
  init3DParallaxEffects();
  initCustomGlowCursor();
});

let currentWishSort = 'newest';

function initWishSortAndLikes() {
  const tabs = document.querySelectorAll('.sort-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentWishSort = tab.dataset.sort || 'newest';
      loadWishes();
    });
  });
}

function initCalendarAction() {
  const btn = document.getElementById('add-to-calendar-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const title = encodeURIComponent('Lễ Tốt Nghiệp 2026 - Lễ Trao Bằng Kỹ Sư');
    const details = encodeURIComponent('Trân trọng mời bạn tham dự Lễ Tốt Nghiệp và chụp ảnh kỷ niệm cùng Tân Kỹ Sư!');
    const location = encodeURIComponent('Hội Trường Đại Học Kỷ Yếu, 123 Đường Thanh Xuân, Cầu Giấy, Hà Nội');
    // Start: 20261010T003000Z (7:30 AM UTC+7) / End: 20261010T043000Z (11:30 AM UTC+7)
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20261010T003000Z/20261010T043000Z&details=${details}&location=${location}`;
    window.open(googleCalUrl, '_blank', 'noopener,noreferrer');
  });
}

function initEnvelopeModal() {
  const overlay = document.getElementById('envelope-overlay');
  const openBtn = document.getElementById('open-envelope-btn');
  const envCard = document.getElementById('envelope-3d-card');
  const waxSeal = document.getElementById('wax-seal');

  if (!overlay || !envCard) return;

  // 3D Parallax Tilt Effect on Mouse Move (Desktop only)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
  if (!isTouchDevice) {
    overlay.addEventListener('mousemove', (e) => {
      if (envCard.classList.contains('opening')) return;
      const rect = envCard.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateX = -((e.clientY - centerY) / rect.height) * 18;
      const rotateY = ((e.clientX - centerX) / rect.width) * 18;

      envCard.style.animation = 'none';
      envCard.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    overlay.addEventListener('mouseleave', () => {
      if (envCard.classList.contains('opening')) return;
      envCard.style.animation = 'floatEnvelope 5s ease-in-out infinite alternate';
      envCard.style.transform = '';
    });
  }

  // Unboxing Handler
  let isOpening = false;
  const triggerUnboxing = () => {
    if (isOpening) return;
    isOpening = true;

    // Step 1: Flap flips 180deg & Light burst triggers
    envCard.classList.add('opening');

    // Fire Confetti bursts
    if (typeof triggerSubmitConfetti === 'function') {
      triggerSubmitConfetti();
      setTimeout(triggerSubmitConfetti, 400);
      setTimeout(triggerSubmitConfetti, 800);
    }

    // Step 2: Smooth Fade Out Modal Overlay to reveal main page
    setTimeout(() => {
      overlay.classList.add('opened');
    }, 1800);
  };

  if (openBtn) openBtn.addEventListener('click', triggerUnboxing);
  if (waxSeal) waxSeal.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerUnboxing();
  });
  envCard.addEventListener('click', triggerUnboxing);
}


/* --- 1. Canvas Glow Particles & Confetti Engine --- */
function initParticleEngine() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }, { passive: true });

  const particles = [];
  const particleCount = isMobile ? 20 : 45;
  const colors = ['#ffd200', '#ffffff', '#7aaeff', '#ffa800', '#d32f2f'];

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * (isMobile ? 2.2 : 3.2) + 1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.speedY = Math.random() * 0.8 + 0.2;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.7 + 0.2;
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 2;
      this.isStar = Math.random() > 0.6;
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.rotation += this.rotationSpeed;

      if (this.y < -15) {
        this.y = height + 15;
        this.x = Math.random() * width;
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0.1, Math.min(1, this.opacity));
      ctx.fillStyle = this.color;

      if (!isMobile) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
      }

      if (this.isStar) {
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(Math.cos((i * Math.PI) / 2) * this.size * 2, Math.sin((i * Math.PI) / 2) * this.size * 2);
          ctx.lineTo(Math.cos(((i + 0.5) * Math.PI) / 2) * (this.size * 0.6), Math.sin(((i + 0.5) * Math.PI) / 2) * (this.size * 0.6));
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
      }
      ctx.restore();
    }
  }

  function drawLightBeams() {
    if (isMobile) return;
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 0, height * 0.8);
    grad.addColorStop(0, 'rgba(8, 85, 255, 0.2)');
    grad.addColorStop(0.5, 'rgba(255, 210, 0, 0.04)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.arc(width / 2, 0, height * 0.9, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    drawLightBeams();
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
}

/* --- 2. Countdown Timer --- */
function initCountdownTimer() {
  // Set Graduation Target Date (Default: 10 October 2026 07:30 AM)
  const targetDate = new Date('October 10, 2026 07:30:00').getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      document.getElementById('days').innerText = '00';
      document.getElementById('hours').innerText = '00';
      document.getElementById('minutes').innerText = '00';
      document.getElementById('seconds').innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').innerText = String(days).padStart(2, '0');
    document.getElementById('hours').innerText = String(hours).padStart(2, '0');
    document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
    document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* --- 3. Navbar Glassmorphism Scroll & Mobile Menu Engine --- */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links') || document.querySelector('.nav-links');

  if (!navbar) return;

  // Scroll handler for navbar background
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 40) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Mobile Hamburger Menu Handler
  if (!toggleBtn || !navLinks) return;

  // Create backdrop element dynamically if not present
  let backdrop = document.querySelector('.mobile-menu-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';
    document.body.appendChild(backdrop);
  }

  function toggleMobileMenu(open) {
    const shouldOpen = open !== undefined ? open : !navLinks.classList.contains('mobile-open');
    toggleBtn.classList.toggle('is-active', shouldOpen);
    navLinks.classList.toggle('mobile-open', shouldOpen);
    backdrop.classList.toggle('is-visible', shouldOpen);
    toggleBtn.setAttribute('aria-expanded', String(shouldOpen));
    document.body.classList.toggle('mobile-menu-lock', shouldOpen);
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileMenu();
  });

  backdrop.addEventListener('click', () => {
    toggleMobileMenu(false);
  });

  // Close menu when clicking any nav link
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggleMobileMenu(false);
    });
  });

  // Close menu on ESC key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
      toggleMobileMenu(false);
    }
  });
}

/* --- 4. RSVP Form & Dynamic Wish Post Engine --- */
function initRSVPForm() {
  const form = document.getElementById('rsvp-form');
  const wishesGrid = document.getElementById('wishes-grid');
  const formMessage = document.getElementById('form-message');
  if (!form || !wishesGrid) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('guest-name').value.trim();
    const wish = document.getElementById('guest-wish').value.trim();
    const submitButton = form.querySelector('button[type="submit"]');

    if (!name || !wish) return;

    submitButton.disabled = true;
    setFormMessage(formMessage, 'Đang lưu lời chúc...', '');

    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName: name, message: wish }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể gửi lời chúc.');
      }

      const emptyState = wishesGrid.querySelector('.wishes-state');
      if (emptyState) emptyState.remove();

      const newCard = createWishCard(data.wish);
      newCard.style.opacity = '0';
      newCard.style.transform = 'translateY(20px)';
      wishesGrid.prepend(newCard);

      requestAnimationFrame(() => {
        newCard.style.transition = 'all 0.5s ease';
        newCard.style.opacity = '1';
        newCard.style.transform = 'translateY(0)';
      });

      triggerSubmitConfetti();
      form.reset();
      setFormMessage(formMessage, `Cảm ơn ${name}! Lời chúc đã được lưu thành công.`, 'success');
    } catch (error) {
      setFormMessage(formMessage, error.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function loadWishes() {
  const wishesGrid = document.getElementById('wishes-grid');
  if (!wishesGrid) return;

  try {
    const response = await fetch(`/api/wishes?limit=50&sort=${currentWishSort}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Không thể tải lời chúc.');
    }

    wishesGrid.replaceChildren();

    if (data.wishes.length === 0) {
      wishesGrid.appendChild(createStateMessage('Hãy là người đầu tiên gửi lời chúc!'));
      return;
    }

    data.wishes.forEach((wish) => wishesGrid.appendChild(createWishCard(wish)));
  } catch (_error) {
    wishesGrid.replaceChildren(createStateMessage('Chưa thể tải lời chúc. Vui lòng thử lại sau.'));
  }
}

function createWishCard(wish) {
  const card = document.createElement('div');
  card.className = 'glass-card wish-card';

  const message = document.createElement('p');
  message.className = 'wish-text';
  message.textContent = `“${wish.message}”`;

  const author = document.createElement('div');
  author.className = 'wish-author';

  const avatar = document.createElement('div');
  avatar.className = 'wish-avatar';
  avatar.textContent = getInitials(wish.guestName);

  const info = document.createElement('div');
  info.className = 'wish-author-info';

  const name = document.createElement('h4');
  name.textContent = wish.guestName;

  const time = document.createElement('span');
  time.textContent = `Đã xác nhận • ${formatRelativeTime(wish.createdAt)}`;

  info.append(name, time);
  author.append(avatar, info);

  // Wish Footer with Like Button & Counter
  const footer = document.createElement('div');
  footer.className = 'wish-footer';

  const likeBtn = document.createElement('button');
  likeBtn.className = 'btn-like-wish';
  likeBtn.type = 'button';
  const wishLikesKey = `wish_liked_${wish.id}`;
  let isLiked = Boolean(localStorage.getItem(wishLikesKey));
  let currentLikes = wish.likes || 0;

  likeBtn.innerHTML = `<i class="fas fa-heart"></i> <span class="likes-count">${currentLikes}</span>`;
  if (isLiked) likeBtn.classList.add('liked');

  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (isLiked) return;

    likeBtn.classList.add('liked');
    isLiked = true;
    localStorage.setItem(wishLikesKey, 'true');

    // Trigger Flying Heart Animation
    createFlyingHeart(e.clientX, e.clientY);

    try {
      const res = await fetch(`/api/wishes/${wish.id}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        likeBtn.querySelector('.likes-count').textContent = data.likes;
      }
    } catch (_err) {
      // Fallback UI
      likeBtn.querySelector('.likes-count').textContent = currentLikes + 1;
    }
  });

  footer.append(author, likeBtn);
  card.append(message, footer);
  return card;
}

function createFlyingHeart(x, y) {
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  heart.innerHTML = '❤️';
  heart.style.left = `${x - 12}px`;
  heart.style.top = `${y - 12}px`;
  document.body.appendChild(heart);

  setTimeout(() => heart.remove(), 1000);
}

function createStateMessage(text) {
  const message = document.createElement('p');
  message.className = 'wishes-state';
  message.textContent = text;
  return message;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase('vi-VN');
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Gần đây';

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (elapsedSeconds < 60) return 'Vừa xong';
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} phút trước`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} giờ trước`;
  return `${Math.floor(elapsedSeconds / 86400)} ngày trước`;
}

function setFormMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message${type ? ` ${type}` : ''}`;
}

/* Confetti Burst Simulation */
function triggerSubmitConfetti() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  for (let i = 0; i < 80; i++) {
    const p = {
      x: width / 2,
      y: height / 2 + 100,
      size: Math.random() * 6 + 2,
      color: ['#ffd200', '#ffffff', '#ff4081', '#00e5ff'][Math.floor(Math.random() * 4)],
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 14,
      gravity: 0.2,
      opacity: 1,
    };

    function drawBurst() {
      if (p.opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.opacity -= 0.015;

      if (p.opacity > 0) {
        requestAnimationFrame(drawBurst);
      }
    }
    drawBurst();
  }
}

/* --- 5. Scroll Reveal Animations (Xuất hiện mượt mà khi cuộn trang) --- */
function initScrollRevealAnimations() {
  const revealElements = document.querySelectorAll('.timeline-item, .info-item, .glass-card:not(.hero-badge-float), .section-title, .hero-text-content, .hero-visual');

  revealElements.forEach((el) => {
    el.classList.add('reveal-hidden');
  });

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px',
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach((el) => revealObserver.observe(el));
}

/* --- 7. 3D Parallax Tilt & Mouse Hover Tracking --- */
function init3DParallaxEffects() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
  if (isTouchDevice) return;

  const cards = document.querySelectorAll('.glass-card, .time-unit, .portrait-img');

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 12;
      const rotateY = (centerX - x) / 12;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
    });
  });

  // Hero Section Parallax Background Floating Elements
  const heroVisual = document.querySelector('.hero-visual');
  const schoolVector = document.getElementById('school-vector-bg');

  window.addEventListener('mousemove', (e) => {
    const moveX = (e.clientX - window.innerWidth / 2) * 0.02;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.02;
    if (heroVisual) heroVisual.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    if (schoolVector) schoolVector.style.transform = `translate3d(${-moveX * 0.8}px, ${-moveY * 0.8}px, 0)`;
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (schoolVector) {
          const scrollY = window.scrollY;
          schoolVector.style.opacity = Math.max(0.08, 0.22 - scrollY * 0.0002);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* --- 8. Custom Glowing Golden Cursor Follower --- */
function initCustomGlowCursor() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768;
  if (isTouchDevice) return;

  const cursor = document.createElement('div');
  cursor.className = 'glow-cursor-follower';
  document.body.appendChild(cursor);

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function renderCursor() {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;

    cursor.style.transform = `translate3d(${cursorX - 12}px, ${cursorY - 12}px, 0)`;
    requestAnimationFrame(renderCursor);
  }

  renderCursor();

  // Scale cursor up when hovering over buttons, cards or links
  const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .glass-card');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
  });
}
