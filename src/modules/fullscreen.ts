import { app, _fsGuard } from '../store';
import { showToast } from '../utils';
import { fitToScreen, renderCanvas } from './canvas';

// ── 공통 fullscreen 진입/해제 ─────────────────────────────────
function enterFullscreen(el: Element): void {
  const req = (el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }).requestFullscreen
    ?? (el as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen
    ?? (el as { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen
    ?? (el as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen;
  if (req) req.call(el).catch(e => console.warn('전체화면 실패:', e));
}

function exitFullscreen(): void {
  const doc = document as Document & {
    webkitExitFullscreen?: () => void;
    mozCancelFullScreen?: () => void;
    msExitFullscreen?: () => void;
  };
  (doc.exitFullscreen ?? doc.webkitExitFullscreen ?? doc.mozCancelFullScreen ?? doc.msExitFullscreen)?.call(doc);
}

export function getFullscreenElement(): Element | null {
  return (document as Document & {
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
  }).fullscreenElement
    ?? (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement
    ?? (document as { mozFullScreenElement?: Element }).mozFullScreenElement
    ?? (document as { msFullscreenElement?: Element }).msFullscreenElement
    ?? null;
}

// ── 창 전체화면 (F11 동일, documentElement) ───────────────────
export function toggleFullscreen(): void {
  const isFs = !!getFullscreenElement();
  if (isFs) {
    exitFullscreen();
    showToast('⛶ 전체화면 해제');
  } else {
    enterFullscreen(document.documentElement);
    showToast('⛶ 전체화면 모드');
  }
}

export function toggleAppFullscreen(): void { toggleFullscreen(); }

// ── 이미지 전체화면 (documentElement 기준 — 화면 꽉 채움) ───
export function toggleImageFullscreen(): void {
  const fsEl = getFullscreenElement();
  if (fsEl) {
    exitFullscreen();
  } else {
    enterFullscreen(document.documentElement);
    // 전체화면 진입 후 이미지 비율 맞춤 (약간의 지연으로 크기 확정 후 호출)
    setTimeout(() => {
      if (app.currentImage) fitToScreen();
    }, 100);
  }
}

// ── 비디오 전체화면 (videoWrapper 기준 — 창 없는 진짜 FS) ────
export function doFullscreen(): void {
  const videoWrapper = document.getElementById('videoWrapper');
  const videoPlayer  = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  if (!videoWrapper) return;

  const fsEl = getFullscreenElement();

  if (fsEl === videoWrapper) {
    // 이미 비디오 FS → 해제
    clearFsGuard();
    exitFullscreen();
    return;
  }

  const enterVideoFs = () => {
    const rot    = app.videoRotation || 0;
    const norm   = ((rot % 360) + 360) % 360;
    const isPort90  = norm === 90;
    const isPort270 = norm === 270;
    const angleStr  = `${rot}deg`;

    videoWrapper.style.setProperty('--rotation-angle', angleStr);
    if (videoPlayer) videoPlayer.style.setProperty('--rotation-angle', angleStr);

    videoWrapper.classList.remove('fs-landscape', 'fs-portrait', 'fs-portrait-270');
    if (isPort90)       videoWrapper.classList.add('fs-portrait');
    else if (isPort270) videoWrapper.classList.add('fs-portrait-270');
    else                videoWrapper.classList.add('fs-landscape');

    enterFullscreen(videoWrapper);
  };

  if (fsEl && fsEl !== videoWrapper) {
    // 다른 FS 해제 후 재진입
    const doc = document as Document & { exitFullscreen: () => Promise<void> };
    doc.exitFullscreen().then(() => setTimeout(enterVideoFs, 80)).catch(() => setTimeout(enterVideoFs, 80));
  } else {
    enterVideoFs();
  }
}

// ── fullscreenchange 이벤트 핸들러 ───────────────────────────
export function onFullscreenChange(): void {
  const videoPlayer  = document.getElementById('videoPlayer')  as HTMLVideoElement | null;
  const videoWrapper = document.getElementById('videoWrapper');
  const isFullscreen = !!getFullscreenElement();

  const rot        = app.videoRotation || 0;
  const norm       = ((rot % 360) + 360) % 360;
  const isPort90   = norm === 90;
  const isPort270  = norm === 270;
  const isPortrait = isPort90 || isPort270;

  clearFsGuard();

  if (isFullscreen) {
    videoWrapper?.classList.remove('fs-landscape', 'fs-portrait', 'fs-portrait-270', 'portrait-mode');

    if (isPort90)       videoWrapper?.classList.add('fs-portrait',     'portrait-mode');
    else if (isPort270) videoWrapper?.classList.add('fs-portrait-270', 'portrait-mode');
    else                videoWrapper?.classList.add('fs-landscape');

    if (videoPlayer) {
      videoPlayer.style.objectFit  = 'contain';
      videoPlayer.style.background = '#000';
    }

    // TV WebView 방어: 100ms 간격으로 class 감시 (최대 3초)
    let guardCount = 0;
    _fsGuard.interval = window.setInterval(() => {
      guardCount++;
      if (!getFullscreenElement() || guardCount > 30) { clearFsGuard(); return; }
      if (isPort90  && !videoWrapper?.classList.contains('fs-portrait'))     reapplyFsClasses();
      if (isPort270 && !videoWrapper?.classList.contains('fs-portrait-270')) reapplyFsClasses();
      if (!isPortrait && !videoWrapper?.classList.contains('fs-landscape'))  reapplyFsClasses();
    }, 100);

    function reapplyFsClasses(): void {
      videoWrapper?.classList.remove('fs-landscape', 'fs-portrait', 'fs-portrait-270');
      if (isPort90)       videoWrapper?.classList.add('fs-portrait');
      else if (isPort270) videoWrapper?.classList.add('fs-portrait-270');
      else                videoWrapper?.classList.add('fs-landscape');
    }

  } else {
    // 해제 → 일반 모드 복원
    videoWrapper?.classList.remove('fs-landscape', 'fs-portrait', 'fs-portrait-270');
    if (isPortrait) {
      videoWrapper?.classList.add('portrait-mode');
      if (videoPlayer) {
        videoPlayer.style.transform  = `rotate(${rot}deg)`;
        videoPlayer.style.maxWidth   = '75vh';
        videoPlayer.style.maxHeight  = '80vw';
        videoPlayer.style.width      = 'auto';
        videoPlayer.style.height     = 'auto';
        videoPlayer.style.objectFit  = 'contain';
      }
    } else {
      videoWrapper?.classList.remove('portrait-mode');
      if (videoPlayer) {
        videoPlayer.style.transform  = rot !== 0 ? `rotate(${rot}deg)` : '';
        videoPlayer.style.maxWidth   = '100%';
        videoPlayer.style.maxHeight  = 'calc(100% - 52px)';
        videoPlayer.style.width      = 'auto';
        videoPlayer.style.height     = 'auto';
        videoPlayer.style.objectFit  = 'contain';
      }
    }
  }
}

// ── 이미지 뷰어 appFsBtn 아이콘 동기화 ───────────────────────
export function _onFullscreenChange(): void {
  const fsEl    = getFullscreenElement();
  const canvas  = document.getElementById('mainCanvas');
  const appBtn  = document.getElementById('appFsBtn');
  const imgBtn  = document.getElementById('imgFsBtn');
  if (appBtn) appBtn.innerHTML = fsEl ? '✕' : '&#x26F6;';
  if (imgBtn) {
    const icon = imgBtn.querySelector('.tool-icon');
    if (icon) icon.textContent = fsEl ? '✕' : '⛶';
  }
  // 이미지 모드: 전체화면 진입/해제 시 화면 맞춤
  if (app.currentImage && !app.currentVideo) {
    setTimeout(() => fitToScreen(), 150);
  }
}

function clearFsGuard(): void {
  if (_fsGuard.interval) { clearInterval(_fsGuard.interval); _fsGuard.interval = null; }
}

// ── 이벤트 등록 ──────────────────────────────────────────────
export function setupFullscreenEvents(): void {
  document.addEventListener('fullscreenchange',       () => { onFullscreenChange(); _onFullscreenChange(); });
  document.addEventListener('webkitfullscreenchange', () => { onFullscreenChange(); _onFullscreenChange(); });
  document.addEventListener('mozfullscreenchange',    () => { onFullscreenChange(); _onFullscreenChange(); });
  document.addEventListener('MSFullscreenChange',     () => { onFullscreenChange(); _onFullscreenChange(); });
}
