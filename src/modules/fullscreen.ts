import { app, _fsGuard } from '../store';
import { showToast } from '../utils';
import { fitToScreen } from './canvas';
import { prevImage, nextImage } from './player';

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

// ── 창 전체화면 (상단 ⛶ 버튼 / F11 동일) ─────────────────────
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

// ── 이미지 FULL 전체화면 (메뉴/툴바 없이 이미지만) ────────────
let _imgFsActive = false;
let _navHideTimer: number | null = null;

export function toggleImageFullscreen(): void {
  if (_imgFsActive) {
    _exitImageFullscreen();
  } else {
    _enterImageFullscreen();
  }
}

function _enterImageFullscreen(): void {
  if (!app.currentImage) return;
  _imgFsActive = true;

  enterFullscreen(document.documentElement);

  // 메뉴바 + 툴바 + 썸네일 패널 숨김
  (document.querySelector('.menubar') as HTMLElement | null)?.style.setProperty('display', 'none');
  (document.querySelector('.toolbar') as HTMLElement | null)?.style.setProperty('display', 'none');
  const thumbPanel = document.getElementById('thumbnailPanel');
  if (thumbPanel) thumbPanel.style.display = 'none';

  // viewerArea를 전체 화면으로 고정
  const viewerArea = document.getElementById('viewerArea');
  if (viewerArea) {
    viewerArea.style.position = 'fixed';
    viewerArea.style.inset = '0';
    viewerArea.style.zIndex = '99990';
    viewerArea.style.background = '#000';
  }

  document.querySelector('.image-container')?.classList.remove('hidden');

  setTimeout(() => fitToScreen(), 150);

  _createNavOverlay();

  const icon = document.getElementById('imgFsBtn')?.querySelector('.tool-icon');
  if (icon) icon.textContent = '✕';
}

function _exitImageFullscreen(): void {
  _imgFsActive = false;

  if (getFullscreenElement()) exitFullscreen();

  (document.querySelector('.menubar') as HTMLElement | null)?.style.removeProperty('display');
  (document.querySelector('.toolbar') as HTMLElement | null)?.style.removeProperty('display');
  const thumbPanel = document.getElementById('thumbnailPanel');
  if (thumbPanel) thumbPanel.style.display = '';

  const viewerArea = document.getElementById('viewerArea');
  if (viewerArea) {
    viewerArea.style.position = '';
    viewerArea.style.inset = '';
    viewerArea.style.zIndex = '';
    viewerArea.style.background = '';
  }

  _removeNavOverlay();

  setTimeout(() => fitToScreen(), 150);

  const icon = document.getElementById('imgFsBtn')?.querySelector('.tool-icon');
  if (icon) icon.textContent = '⛶';
}

// ── 전체화면 네비게이션 오버레이 (< >) ────────────────────────
function _createNavOverlay(): void {
  _removeNavOverlay();

  const overlay = document.createElement('div') as HTMLDivElement & {
    _clickHandler?: EventListener;
    _keyHandler?: (e: KeyboardEvent) => void;
  };
  overlay.id = '_imgFsNavOverlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:99995;',
    'display:flex;align-items:center;justify-content:space-between;',
    'pointer-events:none;opacity:0;transition:opacity 0.3s ease;',
  ].join('');

  const mkBtn = (html: string, radius: string) => {
    const btn = document.createElement('button');
    btn.innerHTML = html;
    btn.style.cssText = [
      'pointer-events:auto;',
      'background:rgba(0,0,0,0.45);color:#fff;border:none;',
      'font-size:40px;width:60px;height:110px;cursor:pointer;',
      `border-radius:${radius};`,
      'display:flex;align-items:center;justify-content:center;',
      'transition:background 0.2s;user-select:none;flex-shrink:0;',
    ].join('');
    btn.onmouseenter = () => { btn.style.background = 'rgba(0,0,0,0.7)'; };
    btn.onmouseleave = () => { btn.style.background = 'rgba(0,0,0,0.45)'; };
    return btn;
  };

  const prevBtn = mkBtn('&#8249;', '0 8px 8px 0');
  prevBtn.title = '이전 이미지 (←)';
  prevBtn.onclick = (e) => { e.stopPropagation(); prevImage(); _showNavArrows(); };

  const nextBtn = mkBtn('&#8250;', '8px 0 0 8px');
  nextBtn.title = '다음 이미지 (→)';
  nextBtn.onclick = (e) => { e.stopPropagation(); nextImage(); _showNavArrows(); };

  const hint = document.createElement('div');
  hint.style.cssText = [
    'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);',
    'color:rgba(255,255,255,0.5);font-size:12px;pointer-events:none;text-align:center;',
  ].join('');
  hint.textContent = '탭하면 이전/다음 버튼 표시 · ESC로 전체화면 해제';

  overlay.appendChild(prevBtn);
  overlay.appendChild(nextBtn);
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  // 클릭/터치 시 화살표 표시
  const viewerArea = document.getElementById('viewerArea');
  const onClickShow: EventListener = () => _showNavArrows();
  viewerArea?.addEventListener('click', onClickShow);
  viewerArea?.addEventListener('touchend', onClickShow);
  overlay._clickHandler = onClickShow;

  // ESC 키 핸들러
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && _imgFsActive) _exitImageFullscreen();
    if (e.key === 'ArrowLeft')  { prevImage(); _showNavArrows(); }
    if (e.key === 'ArrowRight') { nextImage(); _showNavArrows(); }
  };
  document.addEventListener('keydown', onKey);
  overlay._keyHandler = onKey;
}

function _showNavArrows(): void {
  const overlay = document.getElementById('_imgFsNavOverlay') as HTMLElement | null;
  if (!overlay) return;
  overlay.style.opacity = '1';
  if (_navHideTimer) clearTimeout(_navHideTimer);
  _navHideTimer = window.setTimeout(() => {
    if (overlay) overlay.style.opacity = '0';
  }, 3000);
}

function _removeNavOverlay(): void {
  if (_navHideTimer) { clearTimeout(_navHideTimer); _navHideTimer = null; }
  const overlay = document.getElementById('_imgFsNavOverlay') as (HTMLElement & {
    _clickHandler?: EventListener;
    _keyHandler?: (e: KeyboardEvent) => void;
  }) | null;
  if (!overlay) return;
  const viewerArea = document.getElementById('viewerArea');
  if (overlay._clickHandler) {
    viewerArea?.removeEventListener('click', overlay._clickHandler);
    viewerArea?.removeEventListener('touchend', overlay._clickHandler);
  }
  if (overlay._keyHandler) document.removeEventListener('keydown', overlay._keyHandler);
  overlay.remove();
}

// ── 비디오 전체화면 (videoWrapper) ────────────────────────────
export function doFullscreen(): void {
  const videoWrapper = document.getElementById('videoWrapper');
  const videoPlayer  = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  if (!videoWrapper) return;

  const fsEl = getFullscreenElement();

  if (fsEl === videoWrapper) { clearFsGuard(); exitFullscreen(); return; }

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
    const doc = document as Document & { exitFullscreen: () => Promise<void> };
    doc.exitFullscreen().then(() => setTimeout(enterVideoFs, 80)).catch(() => setTimeout(enterVideoFs, 80));
  } else {
    enterVideoFs();
  }
}

// ── fullscreenchange 이벤트 핸들러 ────────────────────────────
export function onFullscreenChange(): void {
  const videoPlayer  = document.getElementById('videoPlayer') as HTMLVideoElement | null;
  const videoWrapper = document.getElementById('videoWrapper');
  const isFullscreen = !!getFullscreenElement();

  const rot        = app.videoRotation || 0;
  const norm       = ((rot % 360) + 360) % 360;
  const isPort90   = norm === 90;
  const isPort270  = norm === 270;
  const isPortrait = isPort90 || isPort270;

  clearFsGuard();

  // 이미지 FS 중 브라우저 FS가 해제되면 이미지 FS도 정리
  if (_imgFsActive && !isFullscreen) {
    _exitImageFullscreen();
    return;
  }

  if (isFullscreen) {
    videoWrapper?.classList.remove('fs-landscape', 'fs-portrait', 'fs-portrait-270', 'portrait-mode');
    if (isPort90)       videoWrapper?.classList.add('fs-portrait', 'portrait-mode');
    else if (isPort270) videoWrapper?.classList.add('fs-portrait-270', 'portrait-mode');
    else                videoWrapper?.classList.add('fs-landscape');

    if (videoPlayer) {
      videoPlayer.style.objectFit  = 'contain';
      videoPlayer.style.background = '#000';
    }

    let guardCount = 0;
    _fsGuard.interval = window.setInterval(() => {
      guardCount++;
      if (!getFullscreenElement() || guardCount > 30) { clearFsGuard(); return; }
      if (isPort90  && !videoWrapper?.classList.contains('fs-portrait'))     reapply();
      if (isPort270 && !videoWrapper?.classList.contains('fs-portrait-270')) reapply();
      if (!isPortrait && !videoWrapper?.classList.contains('fs-landscape'))  reapply();
    }, 100);

    function reapply(): void {
      videoWrapper?.classList.remove('fs-landscape', 'fs-portrait', 'fs-portrait-270');
      if (isPort90)       videoWrapper?.classList.add('fs-portrait');
      else if (isPort270) videoWrapper?.classList.add('fs-portrait-270');
      else                videoWrapper?.classList.add('fs-landscape');
    }
  } else {
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

// ── appFsBtn 아이콘 동기화 ────────────────────────────────────
export function _onFullscreenChange(): void {
  const fsEl   = getFullscreenElement();
  const appBtn = document.getElementById('appFsBtn');
  if (appBtn) appBtn.innerHTML = (fsEl && !_imgFsActive) ? '✕' : '&#x26F6;';
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
