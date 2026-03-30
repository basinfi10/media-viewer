import './style.css';
import { app } from './store';
import { loadFiles } from './modules/loader';
import { setupCanvasEvents, renderCanvas, zoomIn, zoomOut, actualSize, fitToScreen, rotate, flipHorizontal, flipVertical, toggleCropMode, applyCrop, saveImage, undo, redo, resetFilters } from './modules/canvas';
import { loadMedia, prevImage, nextImage, togglePlay, toggleMute, setVolume, seekBackward, seekForward, nextVideo, prevVideo } from './modules/player';
import { toggleFullscreen, toggleAppFullscreen, toggleImageFullscreen, doFullscreen, setupFullscreenEvents } from './modules/fullscreen';
import { toggleImageView, updateImageView, imageViewPrev, imageViewNext, ivRotateLeft, ivRotateRight, ivCrop, ivToggleThumb } from './ui/imageView';
import { toggleThumbnails } from './ui/sidebar';
import { showCropMenu, showAbout, showShortcuts } from './ui/menu';
import { setupKeyboard } from './modules/keyboard';
import { showToast } from './utils';
import {
  toggleRepeatOne, toggleRepeatAll, toggleOrientation,
  setVideoOrientation, toggleVideoActualSize, rotateVideo, setupVideoOverlay,
} from './modules/player';
import { vcOpenPanel, vcClosePanel, vcOpenPanelKeep, vcSetResolution, vcSetQuality, vcStartConvert, vcToggleAutoOrient, mountVideoConvertPanel } from './modules/videoConvert';
import { applyResizeFromDialog } from './ui/menu';
import {
  toggleImageSelection, selectAllImages, deselectAllImages,
  deleteSelectedImages, showDeleteSelectionMenu,
  updateBatchEditButton, updateThumbnailSelection,
  moveImageToPosition, showContextMenu, removeImage,
} from './ui/thumbnail';
import { showBatchEditDialog, processBatchEdit } from './modules/selection';
import {
  toggleImagePanel, toggleEditPanel,
  showFilterMenu, applyPresetFilter, applyFilmEffect,
  updateFilters, applyFilters, updateInputFields,
  applyConvolutionFilter, sharpenImage,
  resetToOriginal, applyEditResize, quickResizeEdit,
  showCanvasSizeDialog, updateCanvasSize, setCanvasAlign,
  applyResize, updateImageSizeDisplay,
  autoLevel, autoColor, backlightCorrection, reduceNoise, resetEditFilters,
} from './modules/imageEdit';
import {
  showCaptureMenu, showAIPrompt, sendAIPrompt,
  aiUpscale, aiRemoveBackground, aiEnhance, aiColorize, aiObjectRemove, aiOCR,
  showSettings, saveSettings, saveImageAs, printImage,
  showProgressModal, startSlideshow,
  captureFullScreen, captureWindow, captureArea,
} from './modules/misc';
import {
  loadAudio, audioTogglePlay, audioPrev, audioNext,
  audioToggleRepeat, audioToggleShuffle, audioSetVolume,
  audioToggleMute, audioSetSpeed, audioCycleSpeed, audioTogglePlaylist,
} from './modules/audio';
import { audioToggleLyric, audioLoadLrcFile } from './modules/lyric';
import { startCropWithRatio } from './modules/canvas';

// HTML은 index.html에 직접 포함됨

// ── 전역 함수 노출 (HTML onclick에서 호출) ────────────────────
Object.assign(window, {
  // 파일
  openFiles: () => document.getElementById('fileInput')?.click(),
  loadFiles,

  // 이미지 편집
  zoomIn, zoomOut, actualSize, fitToScreen,
  rotate, flipHorizontal, flipVertical,
  toggleCropMode, applyCrop, startCropWithRatio,
  saveImage, undo, redo, resetFilters,
  showCropMenu,

  // 미디어 로드
  loadMedia, prevImage, nextImage,

  // 비디오
  togglePlay, toggleMute, setVolume,
  seekBackward, seekForward, nextVideo, prevVideo,

  // 전체화면
  toggleFullscreen, toggleAppFullscreen,
  toggleImageFullscreen, doFullscreen,
  closeFsPopup: () => {
    document.getElementById('vFsPopup')?.style.setProperty('display','none');
  },
  showFsPopup: (e: MouseEvent) => {
    e.stopPropagation();
    const p = document.getElementById('vFsPopup');
    if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
  },
  setVideoWindowSize,

  // 이미지 전체보기
  toggleImageView, imageViewPrev, imageViewNext,
  ivRotateLeft, ivRotateRight, ivCrop, ivToggleThumb,

  // 썸네일
  toggleThumbnails,

  // 오디오
  audioTogglePlay, audioPrev, audioNext,
  audioToggleRepeat, audioToggleShuffle,
  audioSetVolume, audioToggleMute,
  audioSetSpeed, audioCycleSpeed, audioTogglePlaylist,
  audioToggleLyric, audioLoadLrcFile,

  // 비디오 제어
  toggleRepeatOne, toggleRepeatAll, toggleOrientation,
  setVideoOrientation, toggleVideoActualSize, rotateVideo,
  // 비디오 변환
  vcOpenPanel, vcClosePanel, vcOpenPanelKeep,
  vcSetResolution, vcSetQuality, vcStartConvert, vcToggleAutoOrient,
  // 크기 조정
  applyResizeFromDialog,
  // 선택/삭제/일괄편집
  toggleImageSelection, selectAllImages, deselectAllImages,
  deleteSelectedImages, showDeleteSelectionMenu,
  showBatchEditDialog, processBatchEdit, updateBatchEditButton, updateThumbnailSelection,
  moveImageToPosition, showContextMenu, removeImage,
  // 이미지 편집/필터
  toggleImagePanel, toggleEditPanel,
  showFilterMenu, applyPresetFilter, applyFilmEffect,
  updateFilters, applyFilters, updateInputFields,
  applyConvolutionFilter, sharpenImage,
  resetToOriginal, applyEditResize, quickResizeEdit,
  showCanvasSizeDialog, updateCanvasSize, setCanvasAlign,
  applyResize, updateImageSizeDisplay,
  autoLevel, autoColor, backlightCorrection, reduceNoise, resetEditFilters,
  // 캡처/AI/설정
  showCaptureMenu, showAIPrompt, sendAIPrompt,
  aiUpscale, aiRemoveBackground, aiEnhance, aiColorize, aiObjectRemove, aiOCR,
  showSettings, saveSettings, saveImageAs, printImage,
  showProgressModal, startSlideshow,
  captureFullScreen, captureWindow, captureArea,
  // 메뉴
  showAbout, showShortcuts,
  showToast,
});

// ── 초기화 ───────────────────────────────────────────────────
function init(): void {
  // 캔버스 초기화
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const ctx    = canvas.getContext('2d')!;
  app.canvas = canvas;
  app.ctx    = ctx;

  // 툴바 높이 CSS variable
  updateToolbarHeight();
  window.addEventListener('resize', updateToolbarHeight);

  // 캔버스 이벤트
  setupCanvasEvents();

  // 키보드
  setupKeyboard();

  // 전체화면 이벤트
  setupFullscreenEvents();

  // 파일 입력
  setupFileInput();

  // 드래그 앤 드롭
  setupDragDrop();
  // 비디오 변환 패널 마운트
  mountVideoConvertPanel();
  // 비디오 오버레이
  setupVideoOverlay();

  // 비디오 진행바 시크
  setupVideoSeek();
}

function updateToolbarHeight(): void {
  const tb = document.querySelector('.toolbar') as HTMLElement | null;
  if (tb) {
    const h = tb.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--toolbar-h', `${Math.ceil(h)}px`);
  }
}

function setupFileInput(): void {
  const input = document.getElementById('fileInput') as HTMLInputElement;
  if (!input) return;
  input.addEventListener('change', () => {
    if (input.files?.length) {
      loadFiles(input.files);
      input.value = '';
    }
  });
}

function setupDragDrop(): void {
  const viewer = document.getElementById('viewerArea');
  if (!viewer) return;
  viewer.addEventListener('dragover', e => { e.preventDefault(); });
  viewer.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) await loadFiles(files);
  });
}

function setupVideoSeek(): void {
  const track = document.getElementById('videoTrack');
  if (!track) return;
  const seek = (e: MouseEvent | TouchEvent) => {
    const rect = track.getBoundingClientRect();
    const cx   = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const pct  = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const vp   = app.videoElement;
    if (vp?.duration) vp.currentTime = pct * vp.duration;
  };
  track.addEventListener('mousedown',  e => seek(e as MouseEvent));
  track.addEventListener('touchstart', e => seek(e as TouchEvent), { passive: true });
  track.addEventListener('mousemove',  e => { if ((e as MouseEvent).buttons === 1) seek(e as MouseEvent); });
}

function setVideoWindowSize(ratio: string): void {
  const vw = document.getElementById('videoWrapper') as HTMLElement;
  if (!vw) return;
  if (ratio === 'original') { vw.style.width = ''; vw.style.height = ''; return; }
  const [rw, rh] = ratio.split(':').map(Number);
  const maxW = window.innerWidth * 0.8;
  const w    = Math.min(maxW, 800);
  const h    = w * rh / rw;
  vw.style.width  = `${w}px`;
  vw.style.height = `${h}px`;
}

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

