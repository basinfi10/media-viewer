import { _blobBlocked, setBlobBlocked } from '../store';

// ── 토스트 메시지 ─────────────────────────────────────────────
export function showToast(msg: string, duration = 2500): void {
  const existing = document.getElementById('toastMsg');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'toastMsg';
  el.textContent = msg;
  el.style.cssText = `
    position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.82); color:#fff; padding:9px 20px;
    border-radius:20px; font-size:13px; z-index:99999;
    white-space:pre-line; text-align:center; max-width:80vw;
    animation:fadeIn 0.2s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── 시간 포맷 ─────────────────────────────────────────────────
export function fmtTime(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── 파일 타입 판별 ────────────────────────────────────────────
export function isImageFile(file: File): boolean {
  if (file.type?.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg','jpeg','png','gif','bmp','webp','svg','ico','tiff','tif','avif'].includes(ext);
}

export function isVideoFile(file: File): boolean {
  if (file.type?.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['mp4','m4v','webm','mov','avi','mkv','flv','wmv','3gp','ts','mts','m2ts','mpeg','mpg'].includes(ext);
}

export function isAudioFile(file: File): boolean {
  if (file.type?.startsWith('audio/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['mp3','flac','aac','wav','ogg','m4a','opus','wma','aiff','ape','alac'].includes(ext);
}

// ── MIME 추정 ─────────────────────────────────────────────────
export function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    'mp4':'video/mp4','m4v':'video/mp4','webm':'video/webm','ogv':'video/ogg',
    'mov':'video/mp4','avi':'video/x-msvideo','mkv':'video/x-matroska',
    'ts':'video/mp2t','3gp':'video/3gpp','flv':'video/x-flv',
  };
  return map[ext] ?? 'video/mp4';
}

export function guessAudioMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    'mp3':'audio/mpeg','mp4':'audio/mp4','m4a':'audio/mp4',
    'ogg':'audio/ogg','oga':'audio/ogg','opus':'audio/ogg; codecs=opus',
    'wav':'audio/wav','wave':'audio/wav','flac':'audio/flac','aac':'audio/aac',
    'wma':'audio/x-ms-wma','aiff':'audio/aiff','aif':'audio/aiff',
  };
  return map[ext] ?? 'audio/mpeg';
}

// ── FileReader 헬퍼 ───────────────────────────────────────────
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target!.result as ArrayBuffer);
    r.onerror = () => reject(new Error('ArrayBuffer 읽기 실패: ' + file.name));
    r.readAsArrayBuffer(file);
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target!.result as string);
    r.onerror = () => reject(new Error('DataURL 읽기 실패: ' + file.name));
    r.readAsDataURL(file);
  });
}

// ── CSP blob 차단 감지 + URL 생성 ────────────────────────────
export async function checkBlobAllowed(): Promise<boolean> {
  if (_blobBlocked !== null) return !_blobBlocked;
  try {
    const b = new Blob(['test'], { type: 'text/plain' });
    const u = URL.createObjectURL(b);
    await fetch(u, { method: 'HEAD' });
    URL.revokeObjectURL(u);
    setBlobBlocked(false);
  } catch {
    setBlobBlocked(true);
  }
  return !_blobBlocked;
}

export async function makePlayableUrl(file: File): Promise<string> {
  const MAX_DIRECT = 50 * 1024 * 1024;
  const blobOk = await checkBlobAllowed();
  if (!blobOk) {
    try { return await readFileAsDataURL(file); } catch { /* fall through */ }
  }
  if (file.size <= MAX_DIRECT) {
    try {
      const buf  = await readFileAsArrayBuffer(file);
      const mime = file.type || guessMime(file.name);
      const blob = new Blob([buf], { type: mime });
      return URL.createObjectURL(blob);
    } catch { /* fall through */ }
  }
  return URL.createObjectURL(file);
}

// ── メモリチェック ────────────────────────────────────────────
export function checkMemory(): boolean {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!mem) return true;
  // Smart TV 등에서 메모리 측정이 불안정할 수 있으므로 임계치를 90%로 완화
  return mem.usedJSHeapSize / mem.jsHeapSizeLimit < 0.90;
}

export function getMemoryInfo(): { used: number; limit: number } | null {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!mem) return null;
  return {
    used:  Math.round(mem.usedJSHeapSize  / 1024 / 1024),
    limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
  };
}

// ── DOM 헬퍼 ─────────────────────────────────────────────────
export function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function qs<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}
