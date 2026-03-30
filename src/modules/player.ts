import { app, defaultFilters } from '../store';
import { showToast } from '../utils';
import { showImageToolbar, showVideoToolbar, showAudioToolbar } from '../ui/toolbar';
import { renderCanvas, fitToScreen, saveHistory, resetHistory } from './canvas';
import { loadAudio } from './audio';

// ── 미디어 로드 진입점 (타입에 따라 분기) ────────────────────
export function loadMedia(index: number): void {
  const data = app.images[index];
  if (!data) return;

  app.currentIndex = index;
  updateThumbnailActive(index);

  if (data.type === 'audio') {
    hideImageContainer();
    hideVideoWrapper();
    loadAudio(index);
    return;
  }

  if (data.type === 'video') {
    hideImageContainer();
    hideAudioWrapper();
    app.audioMode = false;
    loadVideo(index);
    updateStatus();
    return;
  }

  // 이미지
  hideAudioWrapper();
  hideVideoWrapper();
  app.audioMode = false;
  loadImage(index);
  updateStatus();
}

// ── 이미지 로드 ───────────────────────────────────────────────
export function loadImage(index: number): void {
  const data = app.images[index];
  if (!data || data.type !== 'image') return;

  showImageToolbar();

  // image-container 복원
  const ic = document.querySelector('.image-container') as HTMLElement | null;
  if (ic) { ic.classList.remove('hidden'); }

  // 캔버스에 이미지 그리기
  if (!data.img) return;

  // cloneNode()는 일부 구형 브라우저(Smart TV 등)에서 불안정할 수 있으므로 
  // 원본을 참조하거나 필요 시에만 새 Image를 생성합니다.
  app.currentImage  = data.img;
  app.originalImage = data.img; 
  app.zoom     = 1;
  app.pan      = { x: 0, y: 0 };
  app.rotation = 0;
  app.filters  = defaultFilters();
  app.canvas.style.display = 'block';

  // 캔버스 크기 = 이미지 크기
  app.canvas.width  = data.img.naturalWidth || 800;
  app.canvas.height = data.img.naturalHeight || 600;

  // 줌 버튼 표시
  ['zoomOutBtn','zoomLevel','zoomInBtn','fitScreenBtn','actualSizeBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });

  // 슬라이더 UI 초기화
  const sliderReset: Array<[string, string, string]> = [
    ['brightness', '0', '0'], ['contrast', '0', '0'],
    ['saturation', '0', '0'], ['hue',       '0', '0°'],
    ['sharpness',  '0', '0'],
  ];
  sliderReset.forEach(([id, val, label]) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const vl = document.getElementById(`${id}Value`);
    if (el) el.value = val;
    if (vl) vl.textContent = label;
  });

  fitToScreen();
  renderCanvas();
  updateStatus();
  resetHistory();
  saveHistory();
}

// ── 비디오 로드 ───────────────────────────────────────────────
export function loadVideo(index: number): void {
  const data = app.images[index];
  if (!data || data.type !== 'video') return;

  showVideoToolbar();
  app.currentVideo = data;
  app.videoRotation = 0;
  app.videoOrientation = 'landscape';

  const videoPlayer  = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  const videoWrapper = document.getElementById('videoWrapper');
  if (!videoPlayer || !videoWrapper) return;

  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load();
  videoPlayer.src = data.url;

  videoWrapper.classList.add('active');
  videoWrapper.classList.remove('portrait-mode');
  videoPlayer.style.transform = 'rotate(0deg)';
  videoPlayer.style.setProperty('--rotation-angle', '0deg');
  videoWrapper.style.setProperty('--rotation-angle', '0deg');
  videoPlayer.classList.remove('rotated');

  // 줌 버튼 숨김
  ['zoomOutBtn','zoomLevel','zoomInBtn','fitScreenBtn','actualSizeBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  videoPlayer.load();
  if (app.repeatAll) {
    videoPlayer.play().catch(() => {});
  }

  app.videoElement = videoPlayer;
  app.currentVideo  = data;

  if (!videoPlayer.hasAttribute('_events')) {
    videoPlayer.setAttribute('_events', '1');
    attachVideoEvents(videoPlayer);
  }
}

// ── 비디오 이벤트 연결 ────────────────────────────────────────
function attachVideoEvents(vp: HTMLVideoElement): void {
  vp.addEventListener('timeupdate',      updateProgressUI);
  vp.addEventListener('durationchange',  updateProgressUI);
  vp.addEventListener('play',   () => updatePlayBtn(false));
  vp.addEventListener('pause',  () => updatePlayBtn(true));
  vp.addEventListener('ended',  () => { updatePlayBtn(true); handleVideoEnded(); });
  vp.addEventListener('click',  togglePlay);
}

function handleVideoEnded(): void {
  if (app.repeatOne && app.videoElement) {
    app.videoElement.currentTime = 0;
    app.videoElement.play().catch(() => {});
    return;
  }
  if (app.repeatAll) {
    nextVideo();
  }
}

// ── 재생/정지 ─────────────────────────────────────────────────
export function togglePlay(): void {
  const vp = app.videoElement;
  if (!vp) return;
  if (vp.paused) vp.play().catch(() => {});
  else           vp.pause();
}

export function updatePlayBtn(paused: boolean): void {
  const btn = document.getElementById('videoPlayBtn');
  if (btn) btn.textContent = paused ? '▶' : '⏸';
}

export function updateProgressUI(): void {
  const vp = app.videoElement;
  if (!vp || !vp.duration) return;
  const pct = (vp.currentTime / vp.duration) * 100;
  const fill  = document.getElementById('videoFill');
  const thumb = document.getElementById('videoThumb');
  const cur   = document.getElementById('videoCurTime');
  const dur   = document.getElementById('videoDurTime');
  if (fill)  fill.style.width = pct + '%';
  if (thumb) thumb.style.left = pct + '%';
  if (cur)   cur.textContent  = fmtVideoTime(vp.currentTime);
  if (dur)   dur.textContent  = fmtVideoTime(vp.duration);
}

function fmtVideoTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── 이전/다음 비디오 ──────────────────────────────────────────
export function nextVideo(): void {
  const videos = app.images
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type === 'video');
  if (!videos.length) return;
  const cur = videos.findIndex(v => v.idx === app.currentIndex);
  const next = videos[(cur + 1) % videos.length];
  loadMedia(next.idx);
}

export function prevVideo(): void {
  const videos = app.images
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type === 'video');
  if (!videos.length) return;
  const cur = videos.findIndex(v => v.idx === app.currentIndex);
  const prev = videos[(cur - 1 + videos.length) % videos.length];
  loadMedia(prev.idx);
}

// ── 전체 이전/다음 ────────────────────────────────────────────
export function prevImage(): void {
  if (app.currentIndex === null || app.images.length === 0) return;
  const newIdx = (app.currentIndex - 1 + app.images.length) % app.images.length;
  loadMedia(newIdx);
}

export function nextImage(): void {
  if (app.currentIndex === null || app.images.length === 0) return;
  const newIdx = (app.currentIndex + 1) % app.images.length;
  loadMedia(newIdx);
}

// ── 상태바 업데이트 ───────────────────────────────────────────
export function updateStatus(): void {
  if (app.currentIndex === null || !app.images[app.currentIndex]) return;
  const data = app.images[app.currentIndex];
  const idx  = document.getElementById('statusIndex');
  const dim  = document.getElementById('statusDimensions');
  const size = document.getElementById('statusSize');
  const fmt  = document.getElementById('statusFormat');
  // 이전 호환성
  const name = document.getElementById('statusName');
  const info = document.getElementById('statusInfo');

  if (idx)  idx.textContent  = `${app.currentIndex + 1}/${app.images.length}`;
  if (name) name.textContent = data.name;
  if (size) size.textContent = data.size > 1024*1024
    ? `${(data.size/1024/1024).toFixed(1)}MB`
    : `${(data.size/1024).toFixed(0)}KB`;
  if (fmt)  fmt.textContent  = data.format || '';
  if (dim && data.width && data.height)
    dim.textContent = `${data.width} × ${data.height}`;
  if (info && data.width && data.height)
    info.textContent = `${data.width}×${data.height}`;
}

// ── 썸네일 활성 표시 ──────────────────────────────────────────
function updateThumbnailActive(index: number): void {
  document.querySelectorAll('.thumbnail-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

// ── 래퍼 show/hide ────────────────────────────────────────────
export function hideImageContainer(): void {
  const ic = document.querySelector('.image-container');
  ic?.classList.add('hidden');
}

export function hideVideoWrapper(): void {
  const vw = document.getElementById('videoWrapper');
  vw?.classList.remove('active');
  const vp = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  if (vp) { vp.pause(); }
}

export function hideAudioWrapper(): void {
  const aw = document.getElementById('audioWrapper');
  aw?.classList.remove('active');
  // audio 정지는 audio 모듈에서 처리 (순환 의존 방지)
  const audioEl = document.getElementById('audioPlayer') as HTMLAudioElement | null;
  if (audioEl) audioEl.pause();
}

// ── 볼륨 제어 (비디오) ───────────────────────────────────────
export function toggleMute(): void {
  const vp = app.videoElement;
  if (!vp) return;
  vp.muted = !vp.muted;
  const btn = document.getElementById('vVolBtn');
  if (btn) btn.textContent = vp.muted ? '🔇' : '🔊';
  const slider = document.getElementById('vVolSlider') as HTMLInputElement | null;
  if (slider) slider.value = String(vp.muted ? 0 : vp.volume);
}

export function setVolume(v: number): void {
  const vp = app.videoElement;
  if (!vp) return;
  vp.volume = v;
  vp.muted  = v === 0;
  const btn = document.getElementById('vVolBtn');
  if (btn) btn.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
}

export function seekBackward(): void {
  const vp = app.videoElement;
  if (!vp) return;
  vp.currentTime = Math.max(0, vp.currentTime - 5);
  showToast('⏪ 5초 뒤로');
}

export function seekForward(): void {
  const vp = app.videoElement;
  if (!vp) return;
  vp.currentTime = Math.min(vp.duration, vp.currentTime + 5);
  showToast('⏩ 5초 앞으로');
}

// ── 비디오 반복 모드 ─────────────────────────────────────────
export function toggleRepeatOne(): void {
  app.repeatOne = !app.repeatOne;
  if (app.repeatOne) app.repeatAll = false;
  const btn = document.getElementById('vRepeatOneBtn');
  if (btn) btn.style.background = app.repeatOne ? 'rgba(0,120,215,0.8)' : '';
  showToast(app.repeatOne ? '🔂 한 영상 반복' : '반복 끔');
}

export function toggleRepeatAll(): void {
  app.repeatAll = !app.repeatAll;
  if (app.repeatAll) app.repeatOne = false;
  const btn = document.getElementById('vRepeatAllBtn');
  if (btn) btn.style.background = app.repeatAll ? 'rgba(0,120,215,0.8)' : '';
  showToast(app.repeatAll ? '🔁 전체 연속 재생' : '반복 끔');
}

export function toggleOrientation(): void {
  const current = app.videoOrientation;
  setVideoOrientation(current === 'landscape' ? 'portrait' : 'landscape');
}

export function setVideoOrientation(mode: 'landscape' | 'portrait'): void {
  const vp = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  const vw = document.getElementById('videoWrapper');
  if (!vp || !vw) return;
  app.videoOrientation = mode;
  if (mode === 'portrait') {
    app.videoRotation = 90;
    vw.classList.add('portrait-mode');
    vp.style.transform = 'rotate(90deg)';
    vp.style.maxWidth  = '75vh';
    vp.style.maxHeight = '80vw';
    showToast('⬛ 세로 재생 모드');
  } else {
    app.videoRotation = 0;
    vw.classList.remove('portrait-mode');
    vp.style.transform = 'rotate(0deg)';
    vp.style.maxWidth  = '100%';
    vp.style.maxHeight = '100%';
    showToast('⬜ 가로 재생 모드');
  }
  const angleStr = `${app.videoRotation}deg`;
  vp.style.setProperty('--rotation-angle', angleStr);
  vw.style.setProperty('--rotation-angle', angleStr);
}

export function toggleVideoActualSize(): void {
  const vp = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  if (!vp) return;
  const isActual = vp.style.objectFit === 'fill';
  vp.style.objectFit = isActual ? 'contain' : 'fill';
  showToast(isActual ? '📐 비율 유지' : '📐 원본 크기');
}

export function rotateVideo(degrees: number): void {
  const vp = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  const vw = document.getElementById('videoWrapper');
  if (!vp || !vw) return;
  app.videoRotation = (app.videoRotation + degrees) % 360;
  const norm = ((app.videoRotation % 360) + 360) % 360;
  const angleStr = `${app.videoRotation}deg`;
  vp.style.setProperty('--rotation-angle', angleStr);
  vw.style.setProperty('--rotation-angle', angleStr);
  vp.style.transform = `rotate(${app.videoRotation}deg)`;
  if (norm === 90 || norm === 270) {
    vw.classList.add('portrait-mode');
    app.videoOrientation = 'portrait';
  } else {
    vw.classList.remove('portrait-mode');
    app.videoOrientation = 'landscape';
  }
  showToast(`${degrees > 0 ? '⟳' : '⟲'} 회전 (${app.videoRotation}°)`);
}

// ── 비디오 오버레이 표시 ──────────────────────────────────────
export function setupVideoOverlay(): void {
  const vw = document.getElementById('videoWrapper');
  const vo = document.getElementById('videoOverlay');
  if (!vw || !vo || (vw as HTMLElement & {_overlayBound?: boolean})._overlayBound) return;
  (vw as HTMLElement & {_overlayBound?: boolean})._overlayBound = true;

  let overlayTimer: number | null = null;
  const showOverlay = () => {
    vo.classList.add('visible');
    if (overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = window.setTimeout(() => vo.classList.remove('visible'), 3000);
  };
  vw.addEventListener('mousemove',  showOverlay);
  vw.addEventListener('touchstart', showOverlay, { passive: true });
  vw.addEventListener('touchmove',  showOverlay, { passive: true });
}
