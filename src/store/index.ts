import type {
  AppState, AudioState, LyricState, VideoConvertState,
  ImageViewState, FullscreenGuard, FilterState
} from '../types';

// ── 초기 필터 상태 ────────────────────────────────────────────
export const defaultFilters = (): FilterState => ({
  brightness: 0, contrast: 0, saturation: 0, hue: 0, sharpness: 0,
  blur: 0, temperature: 0, tint: 0, highlights: 0,
  shadows: 0, clarity: 0, vignette: 0, noise: 0,
  rotateAngle: 0, flipH: false, flipV: false,
});

// ── 앱 전역 상태 ─────────────────────────────────────────────
export const app: AppState = {
  images: [],
  currentIndex: null,
  currentImage: null,
  currentVideo: null,
  videoElement: null,
  audioMode: false,

  canvas: null!,
  ctx: null!,
  originalImage: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  isDragging: false,
  dragStart: null,
  isPlaying: false,

  filters: defaultFilters(),

  cropMode: false,
  cropRect: null,
  cropRatio: 'free',
  cropDragHandle: null,
  cropDragStart: null,

  slideshowTimer: null,
  slideshowInterval: 3000,

  selectedImages: [],

  videoRotation: 0,
  videoOrientation: 'landscape',

  lastTouchTime: 0,
  lastTouchPos: null,

  repeatAll: false,
  repeatOne: false,
};

// ── 오디오 상태 ───────────────────────────────────────────────
export const _au: AudioState = {
  el: null,
  index: null,
  repeat: 'none',
  shuffle: false,
  shuffleList: [],
  shufflePos: 0,
  speeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
  speedIdx: 2,
  vizBars: [],
  vizRaf: null,
  audioCtx: null,
  analyser: null,
  sourceNode: null,
  playlistOpen: false,
  _loading: false,
  errorCount: 0,
};

// ── 가사 상태 ─────────────────────────────────────────────────
export const _ly: LyricState = {
  lines: [],
  curIdx: -1,
  visible: false,
  hasTime: false,
};

// ── 비디오 변환 상태 ──────────────────────────────────────────
export const _vc: VideoConvertState = {
  converting: false,
  currMode: null,
  currQuality: 23,
  currRes: 'original',
};

// ── 이미지 전체보기 상태 ──────────────────────────────────────
export const _iv: ImageViewState = {
  scale: 1, minScale: 0.5, maxScale: 8,
  translateX: 0, translateY: 0,
  pinchStartDist: 0, pinchStartScale: 1,
  pinchActive: false,
  toolbarTimer: null,
  thumbVisible: false,
};

// ── 전체화면 가드 ─────────────────────────────────────────────
export const _fsGuard: FullscreenGuard = { interval: null };

// ── blob 차단 여부 캐시 ───────────────────────────────────────
export let _blobBlocked: boolean | null = null;
export function setBlobBlocked(v: boolean) { _blobBlocked = v; }
