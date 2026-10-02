document.addEventListener('DOMContentLoaded', () => {
  const avatar = document.getElementById('guest-avatar');
  avatar?.addEventListener('error', () => {
    if (avatar.src !== new URL(avatar.dataset.fallback, window.location.origin).href) {
      avatar.src = avatar.dataset.fallback;
    }
  });

  // Custom Toast Notification System
  function showToast(message, icon = 'fa-check-circle') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  }

  // Share Invitation Link Button
  const shareBtn = document.getElementById('share-invite-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: document.title,
            text: 'Thiệp mời tham dự Lễ Tốt Nghiệp 2026',
            url: shareUrl,
          });
        } catch (_err) {
          // User cancelled share dialog
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast('Đã sao chép liên kết thiệp mời!', 'fa-link');
        } catch (_err) {
          showToast('Không thể tự động sao chép liên kết.', 'fa-exclamation-triangle');
        }
      }
    });
  }

  // RSVP Form Handler
  const form = document.getElementById('invitation-rsvp');
  const partyGroup = document.getElementById('party-size-group');
  const statusMessage = document.getElementById('rsvp-message');
  const heroStatusIndicator = document.getElementById('hero-status-indicator');

  if (!form) return;

  function updatePartySize() {
    const attending = form.elements.attendanceStatus.value === 'attending';
    if (partyGroup) {
      partyGroup.style.display = attending ? 'block' : 'none';
      form.elements.partySize.disabled = !attending;
    }
  }

  form.querySelectorAll('[name="attendanceStatus"]').forEach((radio) => radio.addEventListener('change', updatePartySize));
  updatePartySize();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    if (statusMessage) {
      statusMessage.className = 'form-message';
      statusMessage.textContent = 'Đang lưu phản hồi...';
    }

    const body = Object.fromEntries(new FormData(form));

    try {
      const slug = document.body.dataset.slug;
      const response = await fetch(`/api/invitations/${encodeURIComponent(slug)}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể lưu phản hồi.');

      if (statusMessage) {
        statusMessage.className = 'form-message success';
        statusMessage.textContent = data.message;
      }

      showToast('Cảm ơn bạn! Phản hồi tham dự đã được cập nhật.', 'fa-heart');

      // Dynamic Update Hero RSVP Status Indicator without reload
      if (heroStatusIndicator) {
        if (body.attendanceStatus === 'attending') {
          heroStatusIndicator.className = 'rsvp-status-badge attending';
          heroStatusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> Đã xác nhận tham dự (${body.partySize || 1} người)`;
        } else {
          heroStatusIndicator.className = 'rsvp-status-badge declined';
          heroStatusIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Đã báo không thể tham dự';
        }
      }

      // Trigger Confetti Celebration if Attending!
      if (body.attendanceStatus === 'attending' && typeof triggerSubmitConfetti === 'function') {
        triggerSubmitConfetti();
      }

      // If guest wrote a wish message, reload the wishes wall dynamically
      if (body.message && typeof loadWishes === 'function') {
        loadWishes();
      }

      form.elements.message.value = '';
    } catch (error) {
      if (statusMessage) {
        statusMessage.className = 'form-message error';
        statusMessage.textContent = error.message;
      }
      showToast(error.message || 'Có lỗi xảy ra', 'fa-exclamation-circle');
    } finally {
      button.disabled = false;
    }
  });
});
