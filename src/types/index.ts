// ── 미디어 아이템 타입 ────────────────────────────────────────
export type MediaType = 'image' | 'video' | 'audio';

export interface MediaItem {
  type: MediaType;
  file: File;
  url: string;
  name: string;
  size: number;
  format: string;
  modified: boolean;
  // 이미지 전용
  img?: HTMLImageElement;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  // 비디오 전용
  duration?: number;
  _blobUrl?: string;
}

// ── 앱 전역 상태 ──────────────────────────────────────────────
export interface AppState {
  images: MediaItem[];
  currentIndex: number | null;
  currentImage: HTMLImageElement | null;
  currentVideo: MediaItem | null;
  videoElement: HTMLVideoElement | null;
  audioMode: boolean;

  // 캔버스 상태
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  originalImage: HTMLImageElement | null;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  isPlaying: boolean;

  // 편집 필터
  filters: FilterState;

  // 자르기
  cropMode: boolean;
  cropRect: CropRect | null;
  cropRatio: string;
  cropDragHandle: string | null;
  cropDragStart: { x: number; y: number } | null;

  // 슬라이드쇼
  slideshowTimer: number | null;
  slideshowInterval: number;

  // 선택
  selectedImages: number[];

  // 비디오
  videoRotation: number;
  videoOrientation: 'landscape' | 'portrait';

  // 터치
  lastTouchTime: number;
  lastTouchPos: { x: number; y: number } | null;

  // 기타
  repeatAll: boolean;
  repeatOne: boolean;
}

export interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;         // 색조 (-180 ~ 180)
  sharpness: number;
  blur: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  clarity: number;
  vignette: number;
  noise: number;
  rotateAngle: number;
  flipH: boolean;
  flipV: boolean;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── 오디오 플레이어 상태 ──────────────────────────────────────
export type RepeatMode = 'none' | 'one' | 'all';

export interface AudioState {
  el: HTMLAudioElement | null;
  index: number | null;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffleList: number[];
  shufflePos: number;
  speeds: number[];
  speedIdx: number;
  vizBars: HTMLElement[];
  vizRaf: number | null;
  audioCtx: AudioContext | null;
  analyser: AnalyserNode | null;
  sourceNode: MediaElementAudioSourceNode | null;
  playlistOpen: boolean;
  _loading: boolean;
  errorCount: number;
}

// ── 가사 상태 ─────────────────────────────────────────────────
export interface LyricLine {
  time: number;  // -1 = 타임코드 없음
  text: string;
}

export interface LyricState {
  lines: LyricLine[];
  curIdx: number;
  visible: boolean;
  hasTime: boolean;
}

// ── 비디오 변환 상태 ──────────────────────────────────────────
export type VcMode = 'mp4' | 'webm' | 'mp3' | 'gif' | 'trim' | 'mute' | 'rotate' | 'info';

export interface VideoConvertState {
  converting: boolean;
  currMode: VcMode | null;
  currQuality: number;
  currRes: string;
}

// ── 이미지 전체보기 상태 ──────────────────────────────────────
export interface ImageViewState {
  scale: number;
  minScale: number;
  maxScale: number;
  translateX: number;
  translateY: number;
  pinchStartDist: number;
  pinchStartScale: number;
  pinchActive: boolean;
  toolbarTimer: number | null;
  thumbVisible: boolean;
}

// ── 전체화면 상태 ─────────────────────────────────────────────
export interface FullscreenGuard {
  interval: number | null;
}
