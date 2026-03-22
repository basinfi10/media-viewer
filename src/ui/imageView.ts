import { app, _iv } from '../store';
import { loadMedia } from '../modules/player';
import { rotate, applyCrop } from '../modules/canvas';
import { showCropMenu } from './menu';

// ── 전체보기 열기/닫기 ────────────────────────────────────────
export function toggleImageView(): void {
  const overlay = document.getElementById('imageViewOverlay');
  if (!overlay) return;
  const isActive = overlay.classList.contains('active');

  if (isActive) {
    overlay.classList.remove('active');
    ivHideToolbar();
    _iv.thumbVisible = false;
    document.getElementById('imageViewThumb')?.classList.remove('visible');
  } else {
    if (!app.currentImage || app.images.length === 0) { alert('이미지를 먼저 열어주세요.'); return; }
    ivResetTransform();
    overlay.classList.add('active');
    updateImageView();
    ivBindEvents();
  }
}

export function updateImageView(): void {
  if (app.currentIndex === null || !app.images[app.currentIndex]) return;
  const img  = document.getElementById('imageViewImg') as HTMLImageElement | null;
  const info = document.getElementById('imageViewInfo');
  const data = app.images[app.currentIndex];
  if (img)  img.src = data.img?.src ?? data.url;
  if (info) info.textContent = `${app.currentIndex + 1} / ${app.images.length}`;
  ivResetTransform();
  ivSyncThumbActive();
}

export function imageViewPrev(): void {
  if (!app.images.length) return;
  app.currentIndex = ((app.currentIndex ?? 0) - 1 + app.images.length) % app.images.length;
  loadMedia(app.currentIndex);
  updateImageView();
}

export function imageViewNext(): void {
  if (!app.images.length) return;
  app.currentIndex = ((app.currentIndex ?? 0) + 1) % app.images.length;
  loadMedia(app.currentIndex);
  updateImageView();
}

// ── 변환 적용 ────────────────────────────────────────────────
function ivResetTransform(): void {
  _iv.scale = 1; _iv.translateX = 0; _iv.translateY = 0;
  ivApplyTransform();
}

function ivApplyTransform(): void {
  const img = document.getElementById('imageViewImg') as HTMLElement | null;
  if (img) img.style.transform = `translate(${_iv.translateX}px, ${_iv.translateY}px) scale(${_iv.scale})`;
}

// ── 미니 툴바 ────────────────────────────────────────────────
export function ivShowToolbar(): void {
  const tb = document.getElementById('imageViewToolbar');
  if (!tb) return;
  tb.classList.add('visible');
  if (_iv.toolbarTimer) clearTimeout(_iv.toolbarTimer);
  _iv.toolbarTimer = window.setTimeout(ivHideToolbar, 3500);
}

export function ivHideToolbar(): void {
  document.getElementById('imageViewToolbar')?.classList.remove('visible');
}

export function ivRotateLeft():  void { rotate(-90); updateImageView(); ivShowToolbar(); }
export function ivRotateRight(): void { rotate(90);  updateImageView(); ivShowToolbar(); }

export function ivCrop(): void {
  toggleImageView();
  showCropMenu();
}

export function ivToggleThumb(): void {
  _iv.thumbVisible = !_iv.thumbVisible;
  const thumb = document.getElementById('imageViewThumb');
  if (!thumb) return;
  if (_iv.thumbVisible) { ivBuildThumb(); thumb.classList.add('visible'); }
  else                  { thumb.classList.remove('visible'); }
  ivShowToolbar();
}

function ivBuildThumb(): void {
  const thumb = document.getElementById('imageViewThumb');
  if (!thumb) return;
  thumb.innerHTML = '';
  app.images.forEach((item, idx) => {
    if (item.type !== 'image') return;
    const t = document.createElement('img');
    t.className = `iv-thumb-item${idx === app.currentIndex ? ' active' : ''}`;
    t.src   = item.img?.src ?? item.url;
    t.title = item.name;
    t.onclick = () => { app.currentIndex = idx; loadMedia(idx); updateImageView(); };
    thumb.appendChild(t);
  });
  setTimeout(() => {
    thumb.querySelector('.iv-thumb-item.active')?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, 50);
}

function ivSyncThumbActive(): void {
  const thumb = document.getElementById('imageViewThumb');
  if (!thumb) return;
  thumb.querySelectorAll('.iv-thumb-item').forEach((el, idx) => {
    el.classList.toggle('active', idx === app.currentIndex);
  });
}

// ── 터치 이벤트 (핀치줌 + 더블탭 + 중앙탭) ──────────────────
export function ivBindEvents(): void {
  const container = document.getElementById('imageViewContainer');
  if (!container || (container as HTMLElement & { _ivBound?: boolean })._ivBound) return;
  (container as HTMLElement & { _ivBound?: boolean })._ivBound = true;

  let lastTap = 0, tapX = 0, tapY = 0;
  let panStart: { x: number; y: number; startX: number; startY: number } | null = null;

  container.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      _iv.pinchActive      = true;
      _iv.pinchStartDist   = ivDist(e.touches[0], e.touches[1]);
      _iv.pinchStartScale  = _iv.scale;
      panStart = null;
    } else if (e.touches.length === 1) {
      _iv.pinchActive = false;
      const t = e.touches[0];
      panStart = { x: t.clientX - _iv.translateX, y: t.clientY - _iv.translateY, startX: t.clientX, startY: t.clientY };
      // 더블탭
      const now = Date.now();
      if (now - lastTap < 280 && Math.abs(t.clientX - tapX) < 40 && Math.abs(t.clientY - tapY) < 40) {
        e.preventDefault();
        if (_iv.scale > 1.2) { ivResetTransform(); }
        else {
          _iv.scale      = 2.5;
          _iv.translateX = (window.innerWidth  / 2 - t.clientX) * 1.5;
          _iv.translateY = (window.innerHeight / 2 - t.clientY) * 1.5;
          ivApplyTransform();
        }
        lastTap = 0; return;
      }
      lastTap = now; tapX = t.clientX; tapY = t.clientY;
    }
  }, { passive: false });

  container.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length === 2 && _iv.pinchActive) {
      e.preventDefault();
      const dist  = ivDist(e.touches[0], e.touches[1]);
      _iv.scale   = Math.max(_iv.minScale, Math.min(_iv.maxScale, _iv.pinchStartScale * (dist / _iv.pinchStartDist)));
      ivApplyTransform();
    } else if (e.touches.length === 1 && !_iv.pinchActive && panStart && _iv.scale > 1.05) {
      e.preventDefault();
      const t = e.touches[0];
      _iv.translateX = t.clientX - panStart.x;
      _iv.translateY = t.clientY - panStart.y;
      ivApplyTransform();
    }
  }, { passive: false });

  container.addEventListener('touchend', (e: TouchEvent) => {
    if (_iv.pinchActive && e.touches.length < 2) _iv.pinchActive = false;
    if (e.changedTouches.length === 1 && panStart) {
      const t  = e.changedTouches[0];
      const dx = Math.abs(t.clientX - panStart.startX);
      const dy = Math.abs(t.clientY - panStart.startY);
      if (dx < 15 && dy < 15) {
        const cx = window.innerWidth  / 2;
        const cy = window.innerHeight / 2;
        const inCenter = Math.abs(t.clientX - cx) < window.innerWidth/3
                      && Math.abs(t.clientY - cy) < window.innerHeight/3;
        if (inCenter) {
          const tb = document.getElementById('imageViewToolbar');
          if (tb?.classList.contains('visible')) ivHideToolbar();
          else ivShowToolbar();
        }
      }
    }
    panStart = null;
  });
}

function ivDist(t1: Touch, t2: Touch): number {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}
