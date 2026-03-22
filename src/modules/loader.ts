import JSZip from 'jszip';
import { app } from '../store';
import type { MediaItem } from '../types';
import {
  isImageFile, isVideoFile, isAudioFile,
  makePlayableUrl, readFileAsDataURL, guessAudioMime,
  checkMemory, getMemoryInfo, showToast,
} from '../utils';
import { createThumbnailEl } from '../ui/thumbnail';
import { loadMedia } from './player';

// ── 파일 목록 로드 (진입점) ───────────────────────────────────
export async function loadFiles(files: FileList | File[]): Promise<void> {
  let addedCount = 0;

  for (const file of Array.from(files)) {
    // 메모리 85% 초과 시 중단
    if (!checkMemory()) {
      const info = getMemoryInfo();
      const msg = info
        ? `⚠️ 메모리 부족 (${info.used}/${info.limit}MB) — ${addedCount}개 추가 후 중단됨`
        : `⚠️ 메모리 부족 — ${addedCount}개 추가 후 중단됨`;
      showToast(msg);
      break;
    }

    if (file.name.toLowerCase().endsWith('.zip')) {
      const cnt = await loadZipFile(file);
      addedCount += cnt;
    } else if (isImageFile(file)) {
      await addImage(file);
      addedCount++;
    } else if (isAudioFile(file)) {
      await addAudio(file);
      addedCount++;
    } else if (isVideoFile(file)) {
      await addVideo(file);
      addedCount++;
    }
  }

  if (app.images.length > 0) {
    if (app.currentIndex === null || app.currentIndex < 0) {
      const firstNew = Math.max(0, app.images.length - addedCount);
      loadMedia(firstNew);
    }
    document.getElementById('dropZone')?.classList.add('hidden');
    if (!app.audioMode) {
      document.querySelector('.image-container')?.classList.remove('hidden');
    }
  }
}

// ── ZIP 파일 처리 ─────────────────────────────────────────────
export async function loadZipFile(file: File): Promise<number> {
  try {
    const zip = await JSZip.loadAsync(file);
    const entries: { path: string; entry: JSZip.JSZipObject }[] = [];

    zip.forEach((relativePath, entry) => {
      if (!entry.dir && /\.(jpg|jpeg|png|gif|bmp|webp|avif)$/i.test(relativePath)) {
        entries.push({ path: relativePath, entry });
      }
    });
    entries.sort((a, b) => a.path.localeCompare(b.path));

    let count = 0;
    for (const { path, entry } of entries) {
      if (!checkMemory()) {
        const info = getMemoryInfo();
        if (info) showToast(`⚠️ 메모리 부족 (${info.used}/${info.limit}MB) — ZIP ${count}개 추가 후 중단됨`);
        break;
      }
      const blob = await entry.async('blob');
      const name = path.split('/').pop() ?? path;
      await addImage(new File([blob], name, { type: blob.type }));
      count++;
    }
    return count;
  } catch {
    showToast('ZIP 파일 처리 중 오류가 발생했습니다.');
    return 0;
  }
}

// ── 이미지 추가 ───────────────────────────────────────────────
export async function addImage(file: File): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const item: MediaItem = {
        type: 'image', file, url,
        img,
        name: file.name, size: file.size,
        width: img.naturalWidth, height: img.naturalHeight,
        format: file.type || 'image/png',
        modified: false,
      };
      app.images.push(item);
      createThumbnailEl(app.images.length - 1);
      resolve();
    };
    img.onerror = () => {
      // fallback
      const item: MediaItem = {
        type: 'image', file, url,
        name: file.name, size: file.size,
        format: file.type || 'image/png',
        modified: false,
      };
      app.images.push(item);
      createThumbnailEl(app.images.length - 1);
      resolve();
    };
    img.src = url;
  });
}

// ── 비디오 추가 ───────────────────────────────────────────────
export async function addVideo(file: File): Promise<void> {
  showToast(`🎬 추가 중: ${file.name}`);
  const playUrl = await makePlayableUrl(file);
  const thumb   = await makeThumbnail(playUrl) ?? makeDefaultThumb(file.name);

  const item: MediaItem = {
    type: 'video', file,
    url: playUrl,
    thumbnailUrl: thumb,
    name: file.name, size: file.size,
    width: 1920, height: 1080, duration: 0,
    format: file.type || 'video/mp4',
    modified: false,
    _blobUrl: playUrl,
  };
  app.images.push(item);
  createThumbnailEl(app.images.length - 1);
  showToast(`✅ ${file.name}`);
}

// ── 오디오 추가 ───────────────────────────────────────────────
export async function addAudio(file: File): Promise<void> {
  showToast(`🎵 로드 중: ${file.name}`);
  // CSP blob 차단 환경 대응 → DataURL
  const url = await readFileAsDataURL(file);
  const item: MediaItem = {
    type: 'audio', file, url,
    name: file.name, size: file.size,
    format: file.type || guessAudioMime(file.name),
    modified: false,
  };
  app.images.push(item);
  createThumbnailEl(app.images.length - 1);
  showToast(`✅ ${file.name}`);
}

// ── 비디오 썸네일 생성 ────────────────────────────────────────
export function makeThumbnail(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true;
    v.setAttribute('playsinline', 'true');
    v.setAttribute('webkit-playsinline', 'true');
    const timer = setTimeout(() => { v.src = ''; resolve(null); }, 3000);
    v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 10); };
    v.onseeked = () => {
      clearTimeout(timer);
      try {
        const c = document.createElement('canvas');
        c.width = 160; c.height = 90;
        c.getContext('2d')?.drawImage(v, 0, 0, 160, 90);
        resolve(c.toDataURL('image/jpeg', 0.7));
      } catch { resolve(null); }
      v.src = '';
    };
    v.onerror = () => { clearTimeout(timer); resolve(null); };
    v.src = url;
  });
}

export function makeDefaultThumb(name: string, reason = ''): string {
  const svg = `<svg width="160" height="90" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="90" fill="#1a1a2e"/>
    <text y="55" x="80" font-size="32" fill="white" text-anchor="middle">▶</text>
    <text y="75" x="80" font-size="9" fill="#aaa" text-anchor="middle">${name.substring(0, 20)}</text>
    ${reason ? `<text y="85" x="80" font-size="8" fill="#888" text-anchor="middle">${reason}</text>` : ''}
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
