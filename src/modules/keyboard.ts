import { app, _au } from '../store';
import { zoomIn, zoomOut, actualSize, fitToScreen, rotate, undo, redo, saveImage, toggleCropMode, applyCrop } from '../modules/canvas';
import { prevImage, nextImage, togglePlay, seekBackward, seekForward } from '../modules/player';
import { toggleFullscreen } from '../modules/fullscreen';
import { toggleImageView } from '../ui/imageView';
import { toggleThumbnails } from '../ui/sidebar';
import { audioTogglePlay } from '../modules/audio';
import { showToast } from '../utils';

export function setupKeyboard(): void {
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  // ESC — 전체화면 해제
  if (e.key === 'Escape') {
    const fsEl = document.fullscreenElement;
    if (fsEl) {
      e.preventDefault();
      document.exitFullscreen?.();
    }
    return;
  }

  // F11 — 창 전체화면 토글
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }

  // F9 — 썸네일 패널 토글
  if (e.key === 'F9') {
    e.preventDefault();
    toggleThumbnails();
    return;
  }

  // Ctrl 조합
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'o': case 'O': e.preventDefault(); document.getElementById('fileInput')?.click(); return;
      case 's': case 'S': e.preventDefault(); saveImage(); return;
      case 'z': case 'Z': e.preventDefault(); undo(); return;
      case 'y': case 'Y': e.preventDefault(); redo(); return;
    }
  }

  // Space — 재생/정지
  if (e.key === ' ') {
    e.preventDefault();
    if (app.audioMode && _au.el) audioTogglePlay();
    else if (app.videoElement && app.currentVideo) togglePlay();
    return;
  }

  // 방향키 — 이전/다음
  if (e.key === 'ArrowLeft')  { e.preventDefault(); prevImage(); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); nextImage(); return; }

  // 이미지 모드 단축키
  if (app.currentImage && !app.currentVideo && !app.audioMode) {
    switch (e.key) {
      case '+': case '=': e.preventDefault(); zoomIn();  return;
      case '-': case '_': e.preventDefault(); zoomOut(); return;
      case '0':           e.preventDefault(); actualSize(); return;
      case '\\':          e.preventDefault(); fitToScreen(); return;
      case 'i': case 'I': e.preventDefault(); toggleImageView(); return;
      case 'Enter':
        if (app.cropMode && app.cropRect) { e.preventDefault(); applyCrop(); }
        return;
    }
  }

  // 영상 단축키
  if (app.currentVideo) {
    switch (e.key) {
      case ',': case '<': e.preventDefault(); seekBackward(); return;
      case '.': case '>': e.preventDefault(); seekForward();  return;
    }
  }
}
