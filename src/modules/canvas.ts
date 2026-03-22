import { app, defaultFilters } from '../store';
import type { CropRect } from '../types';
import { showToast } from '../utils';
import { updateStatus } from './player';

// ── 캔버스 렌더링 ─────────────────────────────────────────────
export function renderCanvas(): void {
  const { canvas, ctx, currentImage, zoom, pan, rotation, filters } = app;
  if (!ctx || !currentImage) return;

  // 캔버스 크기를 viewerArea에 맞춤 (중앙 정렬 + 전체화면 대응)
  const viewerArea = document.getElementById('viewerArea');
  if (viewerArea && viewerArea.clientWidth > 0) {
    canvas.width  = viewerArea.clientWidth;
    canvas.height = viewerArea.clientHeight;
  }

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  ctx.save();

  // 팬 + 줌 + 회전
  ctx.translate(cw / 2 + pan.x, ch / 2 + pan.y);
  ctx.scale(zoom, zoom);
  ctx.rotate((rotation * Math.PI) / 180);

  const iw = currentImage.naturalWidth;
  const ih = currentImage.naturalHeight;

  // 필터 적용
  const f = filters;
  const b = 100 + f.brightness;
  const c = 100 + f.contrast;
  const s = 100 + f.saturation;
  const h = f.hue ?? 0;
  ctx.filter = [
    `brightness(${b}%)`,
    `contrast(${c}%)`,
    `saturate(${s}%)`,
    h !== 0 ? `hue-rotate(${h}deg)` : '',
    f.blur > 0 ? `blur(${f.blur}px)` : '',
  ].filter(Boolean).join(' ') || 'none';

  // 플립
  if (f.flipH || f.flipV) {
    ctx.scale(f.flipH ? -1 : 1, f.flipV ? -1 : 1);
  }

  ctx.drawImage(currentImage, -iw / 2, -ih / 2, iw, ih);
  ctx.filter = 'none';
  ctx.restore();

  // 비네팅
  if (f.vignette > 0) applyVignette(ctx, cw, ch, f.vignette);

  // 자르기 오버레이
  if (app.cropMode && app.cropRect) drawCropOverlay(ctx, cw, ch, app.cropRect);
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number): void {
  const gradient = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.8);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength / 100})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ── 줌 ───────────────────────────────────────────────────────
export function zoomIn(): void  { setZoom(app.zoom * 1.2); }
export function zoomOut(): void { setZoom(app.zoom / 1.2); }
export function actualSize(): void { setZoom(1); app.pan = { x: 0, y: 0 }; renderCanvas(); }

export function fitToScreen(): void {
  if (!app.currentImage || !app.canvas) return;
  const viewerArea = document.getElementById('viewerArea');
  const cw = viewerArea?.clientWidth  || app.canvas.width;
  const ch = viewerArea?.clientHeight || app.canvas.height;
  const scaleX = cw / app.currentImage.naturalWidth;
  const scaleY = ch / app.currentImage.naturalHeight;
  app.zoom = Math.max(0.05, Math.min(scaleX, scaleY, 1));
  const el = document.getElementById('zoomLevel');
  if (el) el.textContent = `${Math.round(app.zoom * 100)}%`;
  app.pan = { x: 0, y: 0 };
  renderCanvas();
}

function setZoom(z: number): void {
  app.zoom = Math.max(0.05, Math.min(20, z));
  const el = document.getElementById('zoomLevel');
  if (el) el.textContent = `${Math.round(app.zoom * 100)}%`;
  renderCanvas();
}

// ── 회전 ─────────────────────────────────────────────────────
export function rotate(degrees: number): void {
  app.rotation = (app.rotation + degrees) % 360;
  renderCanvas();
}

// ── 플립 ─────────────────────────────────────────────────────
export function flipHorizontal(): void { app.filters.flipH = !app.filters.flipH; renderCanvas(); }
export function flipVertical():   void { app.filters.flipV = !app.filters.flipV; renderCanvas(); }

// ── 필터 ─────────────────────────────────────────────────────
export function applyFilters(): void { renderCanvas(); }

export function resetFilters(): void {
  app.filters = defaultFilters();
  app.rotation = 0;
  renderCanvas();
  updateFilterUI();
}

function updateFilterUI(): void {
  // slider ID → value, valueEl ID, 단위
  const fields: Array<[string, number, string]> = [
    ['brightness', app.filters.brightness, ''],
    ['contrast',   app.filters.contrast,   ''],
    ['saturation', app.filters.saturation, ''],
    ['hue',        app.filters.hue,        '°'],
    ['sharpness',  app.filters.sharpness,  ''],
    ['blur',       app.filters.blur,       ''],
    ['temperature',app.filters.temperature,''],
    ['vignette',   app.filters.vignette,   ''],
  ];
  fields.forEach(([key, val, unit]) => {
    // 슬라이더: id="brightness" 또는 id="brightnessSlider" 모두 지원
    const slider = (document.getElementById(key) ??
                    document.getElementById(`${key}Slider`)) as HTMLInputElement | null;
    const valueEl = document.getElementById(`${key}Value`);
    if (slider)  slider.value = String(val);
    if (valueEl) valueEl.textContent = val + unit;
  });
}

// ── 자르기 ───────────────────────────────────────────────────
export function startCropWithRatio(ratio: string): void {
  app.cropRatio = ratio;
  toggleCropMode();
}

export function toggleCropMode(): void {
  app.cropMode = !app.cropMode;
  if (app.cropMode && app.currentImage) {
    // 이미지가 캔버스 상에서 차지하는 실제 영역 계산
    const cw = app.canvas.width;
    const ch = app.canvas.height;
    const iw = app.currentImage.naturalWidth  * app.zoom;
    const ih = app.currentImage.naturalHeight * app.zoom;
    const imgL = cw / 2 + app.pan.x - iw / 2;
    const imgT = ch / 2 + app.pan.y - ih / 2;
    // 초기 크롭: 이미지 영역 중앙 50%
    app.cropRect = {
      x: imgL + iw * 0.25,
      y: imgT + ih * 0.25,
      w: iw * 0.5,
      h: ih * 0.5,
    };
    app.canvas.style.cursor = 'crosshair';
    showToast('✂️ 자르기 모드 — 영역을 드래그하거나 Enter로 적용');
  } else {
    app.cropRect = null;
    app.canvas.style.cursor = 'grab';
  }
  renderCanvas();
}

export function applyCrop(): void {
  if (!app.cropRect || !app.currentImage) return;
  const { x, y, w, h } = app.cropRect;
  if (w < 2 || h < 2) { showToast('자르기 영역이 너무 작습니다.'); return; }

  // 캔버스 좌표 → 이미지 픽셀 좌표 변환
  const cw = app.canvas.width;
  const ch = app.canvas.height;
  const iw = app.currentImage.naturalWidth;
  const ih = app.currentImage.naturalHeight;
  const imgL = cw / 2 + app.pan.x - (iw * app.zoom) / 2;
  const imgT = ch / 2 + app.pan.y - (ih * app.zoom) / 2;

  const srcX = Math.round((x - imgL) / app.zoom);
  const srcY = Math.round((y - imgT) / app.zoom);
  const srcW = Math.round(w / app.zoom);
  const srcH = Math.round(h / app.zoom);

  // 이미지 경계 내로 클램프
  const cx = Math.max(0, Math.min(iw - 1, srcX));
  const cy = Math.max(0, Math.min(ih - 1, srcY));
  const cw2 = Math.max(1, Math.min(iw - cx, srcW));
  const ch2 = Math.max(1, Math.min(ih - cy, srcH));

  const tmp = document.createElement('canvas');
  tmp.width  = cw2;
  tmp.height = ch2;
  const tc = tmp.getContext('2d')!;
  tc.drawImage(app.currentImage, cx, cy, cw2, ch2, 0, 0, cw2, ch2);

  const newImg = new Image();
  newImg.onload = () => {
    app.currentImage = newImg;
    app.pan  = { x: 0, y: 0 };
    app.zoom = 1;
    app.cropMode = false;
    app.cropRect = null;
    app.canvas.style.cursor = 'grab';
    saveHistory();
    fitToScreen();
    renderCanvas();
    updateStatus();
  };
  newImg.src = tmp.toDataURL();
}

function drawCropOverlay(ctx: CanvasRenderingContext2D, cw: number, ch: number, r: CropRect): void {
  ctx.save();
  // evenodd 패스로 오버레이 → clearRect(회색 박스) 없음
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.fill('evenodd');
  // 선택 영역 테두리
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  // 3등분 가이드
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.8;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(r.x + r.w * i/3, r.y); ctx.lineTo(r.x + r.w * i/3, r.y + r.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h * i/3); ctx.lineTo(r.x + r.w, r.y + r.h * i/3); ctx.stroke();
  }
  // 핸들
  const hs = 8;
  const handles: [number, number][] = [
    [r.x, r.y], [r.x + r.w/2, r.y], [r.x + r.w, r.y],
    [r.x, r.y + r.h/2],              [r.x + r.w, r.y + r.h/2],
    [r.x, r.y + r.h], [r.x + r.w/2, r.y + r.h], [r.x + r.w, r.y + r.h],
  ];
  ctx.fillStyle = 'white';
  handles.forEach(([hx, hy]) => ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs));
  ctx.restore();
}

// ── 히스토리 (Undo/Redo) ─────────────────────────────────────
interface HistoryEntry {
  dataUrl: string;
  filters: ReturnType<typeof defaultFilters>;
  rotation: number;
}

let history: HistoryEntry[] = [];
let historyIdx = -1;
const MAX_HISTORY = 20;

export function resetHistory(): void {
  history    = [];
  historyIdx = -1;
}

export function saveHistory(): void {
  const dataUrl = app.canvas.toDataURL('image/png');
  // 필터 상태를 깊은 복사로 저장
  const filters = { ...app.filters };
  const entry: HistoryEntry = { dataUrl, filters, rotation: app.rotation };
  history = history.slice(0, historyIdx + 1);
  history.push(entry);
  if (history.length > MAX_HISTORY) history.shift();
  historyIdx = history.length - 1;
}

export function undo(): void {
  if (historyIdx <= 0) { showToast('더 이상 되돌릴 수 없습니다.'); return; }
  historyIdx--;
  restoreHistory(history[historyIdx]);
}

export function redo(): void {
  if (historyIdx >= history.length - 1) { showToast('더 이상 앞으로 갈 수 없습니다.'); return; }
  historyIdx++;
  restoreHistory(history[historyIdx]);
}

function restoreHistory(entry: HistoryEntry): void {
  const img = new Image();
  img.onload = () => {
    app.currentImage = img;
    app.canvas.width  = img.naturalWidth;
    app.canvas.height = img.naturalHeight;
    // 필터 상태 복원
    app.filters  = { ...entry.filters };
    app.rotation = entry.rotation;
    renderCanvas();
    updateFilterUI();
  };
  img.src = entry.dataUrl;
}

// ── 이미지 저장 ───────────────────────────────────────────────
export function saveImage(): void {
  if (!app.currentImage) return;
  const idx  = app.currentIndex;
  const data = idx !== null ? app.images[idx] : null;
  const ext  = data?.name.split('.').pop()?.toLowerCase() ?? 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const name = data?.name ?? `image_${Date.now()}.${ext}`;
  const dataUrl = app.canvas.toDataURL(mime, 0.92);
  const a = document.createElement('a');
  a.href = dataUrl; a.download = name;
  a.click();
  showToast(`💾 ${name} 저장됨`);
}

// ── 캔버스 이벤트 설정 ────────────────────────────────────────
export function setupCanvasEvents(): void {
  const canvas = app.canvas;

  // 마우스 휠 줌
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(app.zoom * factor);
  }, { passive: false });

  // 마우스 드래그 팬
  canvas.addEventListener('mousedown', (e) => {
    if (app.cropMode) { handleCropMouseDown(e.offsetX, e.offsetY); return; }
    app.isDragging = true;
    app.dragStart  = { x: e.clientX - app.pan.x, y: e.clientY - app.pan.y };
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mousemove', (e) => {
    if (app.cropMode && app.cropRect) { handleCropMouseMove(e.offsetX, e.offsetY); return; }
    if (!app.isDragging || !app.dragStart) return;
    app.pan.x = e.clientX - app.dragStart.x;
    app.pan.y = e.clientY - app.dragStart.y;
    renderCanvas();
  });
  canvas.addEventListener('mouseup', () => {
    app.isDragging = false;
    if (app.cropMode) { app.cropDragHandle = null; }
    canvas.style.cursor = app.cropMode ? 'crosshair' : 'grab';
  });

  // 터치 이벤트
  let lastPinchDist = 0;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      return;
    }
    const touch = e.touches[0];
    const rect  = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (app.cropMode) { handleCropMouseDown(x, y); return; }
    app.isDragging = true;
    app.dragStart  = { x: touch.clientX - app.pan.x, y: touch.clientY - app.pan.y };
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist > 0) setZoom(app.zoom * (dist / lastPinchDist));
      lastPinchDist = dist;
      return;
    }
    const touch = e.touches[0];
    const rect  = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (app.cropMode) { handleCropMouseMove(x, y); return; }
    if (app.isDragging && app.dragStart) {
      app.pan.x = touch.clientX - app.dragStart.x;
      app.pan.y = touch.clientY - app.dragStart.y;
      renderCanvas();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    lastPinchDist = 0;
    if (app.cropMode) { app.cropDragHandle = null; return; }
    app.isDragging = false;
  });
}

// ── 자르기 마우스 핸들링 ─────────────────────────────────────
function handleCropMouseDown(x: number, y: number): void {
  if (!app.cropRect) return;
  const r   = app.cropRect;
  const hs  = 10;
  const pts: [string, number, number][] = [
    ['tl', r.x, r.y], ['tc', r.x+r.w/2, r.y], ['tr', r.x+r.w, r.y],
    ['ml', r.x, r.y+r.h/2], ['mr', r.x+r.w, r.y+r.h/2],
    ['bl', r.x, r.y+r.h], ['bc', r.x+r.w/2, r.y+r.h], ['br', r.x+r.w, r.y+r.h],
  ];
  for (const [handle, hx, hy] of pts) {
    if (Math.abs(x - hx) < hs && Math.abs(y - hy) < hs) {
      app.cropDragHandle = handle;
      app.cropDragStart  = { x, y };
      return;
    }
  }
  if (x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h) {
    app.cropDragHandle = 'move';
    app.cropDragStart  = { x, y };
  } else {
    app.cropRect = { x: Math.round(x), y: Math.round(y), w: 0, h: 0 };
    app.cropDragHandle = 'br';
    app.cropDragStart  = { x, y };
  }
}

function handleCropMouseMove(x: number, y: number): void {
  if (!app.cropRect || !app.cropDragHandle || !app.cropDragStart) return;
  const dx = x - app.cropDragStart.x;
  const dy = y - app.cropDragStart.y;
  app.cropDragStart = { x, y };
  const r = app.cropRect;

  if (app.cropDragHandle === 'move') {
    r.x = Math.max(0, Math.min(app.canvas.width  - r.w, r.x + dx));
    r.y = Math.max(0, Math.min(app.canvas.height - r.h, r.y + dy));
  } else {
    if (app.cropDragHandle.includes('r')) r.w = Math.max(10, r.w + dx);
    if (app.cropDragHandle.includes('l')) { r.x += dx; r.w = Math.max(10, r.w - dx); }
    if (app.cropDragHandle.includes('b')) r.h = Math.max(10, r.h + dy);
    if (app.cropDragHandle.includes('t')) { r.y += dy; r.h = Math.max(10, r.h - dy); }
  }
  renderCanvas();
}
