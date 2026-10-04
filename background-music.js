document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('background-music');
  const toggle = document.getElementById('music-toggle');
  if (!audio) return;

  audio.volume = 0.5;
  let userPaused = false;
  let interactionFallbackActive = true;

  // Plan 1: Waveform Equalizer SVG for playing state
  const equalizerIcon = `
    <div class="audio-equalizer">
      <span class="bar bar-1"></span>
      <span class="bar bar-2"></span>
      <span class="bar bar-3"></span>
      <span class="bar bar-4"></span>
    </div>`;

  const volumeOffIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z"></path>
      <path d="m15.5 10 5 5"></path>
      <path d="m20.5 10-5 5"></path>
    </svg>`;

  function showMusicToast(msg) {
    let toast = document.getElementById('music-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'music-toast';
      toast.className = 'music-info-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-music"></i> <span>${msg}</span>`;
    toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function updateButton() {
    if (!toggle) return;
    const isPlaying = !audio.paused;
    toggle.innerHTML = isPlaying ? equalizerIcon : volumeOffIcon;
    toggle.classList.toggle('is-playing', isPlaying);
    toggle.title = isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-pressed', String(isPlaying));
  }

  async function playMusic() {
    try {
      await audio.play();
      interactionFallbackActive = false;
      showMusicToast('Đang phát: Nhạc Nền Tốt Nghiệp');
    } catch {
      interactionFallbackActive = true;
    }
    updateButton();
  }

  function playAfterFirstInteraction(event) {
    if (!interactionFallbackActive || userPaused || event.target.closest('#music-toggle')) return;
    playMusic();
  }

  toggle?.addEventListener('click', async () => {
    if (audio.paused) {
      userPaused = false;
      await playMusic();
    } else {
      userPaused = true;
      audio.pause();
      showMusicToast('Đã tạm dừng nhạc nền');
    }
    updateButton();
  });

  audio.addEventListener('play', updateButton);
  audio.addEventListener('pause', updateButton);
  document.addEventListener('pointerdown', playAfterFirstInteraction);
  document.addEventListener('keydown', playAfterFirstInteraction);
  document.addEventListener('touchstart', playAfterFirstInteraction, { passive: true });

  updateButton();
  playMusic();
});
