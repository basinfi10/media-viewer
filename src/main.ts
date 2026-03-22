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
import { showBatchEditDialog } from './modules/selection';
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
  aiUpscale, aiRemoveBackground, aiEnhance, aiColorize, aiObjectRemove,
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
  showBatchEditDialog, updateBatchEditButton, updateThumbnailSelection,
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
  aiUpscale, aiRemoveBackground, aiEnhance, aiColorize, aiObjectRemove,
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

// ── HTML 템플릿 ───────────────────────────────────────────────
function getAppHTML(): string {
  return `
<!-- 메뉴바 -->
<div class="menubar">
  <div class="menu-item" onclick="document.getElementById('fileMenu').classList.toggle('active')">
    파일
    <div class="dropdown-menu" id="fileMenu">
      <div class="dropdown-item" onclick="openFiles()">📁 열기 <span class="shortcut">Ctrl+O</span></div>
      <div class="dropdown-item" onclick="saveImage()">💾 저장 <span class="shortcut">Ctrl+S</span></div>
      <hr class="dropdown-divider">
      <div class="dropdown-item" onclick="showAbout()">ℹ️ 정보</div>
    </div>
  </div>
  <div class="menu-item" onclick="document.getElementById('editMenu').classList.toggle('active')">
    편집
    <div class="dropdown-menu" id="editMenu">
      <div class="dropdown-item" onclick="undo()">↶ 실행 취소 <span class="shortcut">Ctrl+Z</span></div>
      <div class="dropdown-item" onclick="redo()">↷ 다시 실행 <span class="shortcut">Ctrl+Y</span></div>
      <hr class="dropdown-divider">
      <div class="dropdown-item" onclick="flipHorizontal()">⟷ 좌우 뒤집기</div>
      <div class="dropdown-item" onclick="flipVertical()">⟱ 상하 뒤집기</div>
      <div class="dropdown-item" onclick="rotate(-90)">⟲ 왼쪽 회전</div>
      <div class="dropdown-item" onclick="rotate(90)">⟳ 오른쪽 회전</div>
      <hr class="dropdown-divider">
      <div class="dropdown-item" onclick="showCropMenu()">✂️ 자르기</div>
      <div class="dropdown-item" onclick="resetFilters()">🔄 필터 초기화</div>
    </div>
  </div>
  <div class="menu-item" onclick="document.getElementById('viewMenu').classList.toggle('active')">
    보기
    <div class="dropdown-menu" id="viewMenu">
      <div class="dropdown-item" onclick="toggleThumbnails()">🖼 썸네일 <span class="shortcut">F9</span></div>
      <div class="dropdown-item" onclick="toggleImageView()">🔍 이미지 전체보기 <span class="shortcut">I</span></div>
      <hr class="dropdown-divider">
      <div class="dropdown-item" onclick="toggleFullscreen()">⛶ 창 전체화면 <span class="shortcut">F11</span></div>
    </div>
  </div>
  <div class="menu-item" onclick="document.getElementById('helpMenu').classList.toggle('active')">
    도움말
    <div class="dropdown-menu" id="helpMenu">
      <div class="dropdown-item" onclick="showShortcuts()">⌨️ 단축키</div>
      <div class="dropdown-item" onclick="showAbout()">ℹ️ 정보</div>
    </div>
  </div>
  <button id="appFsBtn" onclick="toggleAppFullscreen()" title="창 전체화면 (F11)"
    style="margin-left:auto;border:none;background:transparent;cursor:pointer;padding:0 10px;height:24px;font-size:16px;color:#333;display:flex;align-items:center;flex-shrink:0;">
    &#x26F6;
  </button>
</div>

<!-- 툴바 -->
<div class="toolbar">
  <!-- 이미지 툴바 -->
  <div id="imageToolbarGroups" style="display:contents;">
    <div class="tool-group">
      <button class="tool-btn" onclick="openFiles()" title="이미지 열기 (Ctrl+O)">
        <div class="tool-icon">📁</div><div class="tool-label">열기</div>
      </button>
      <button class="tool-btn" onclick="saveImage()" title="저장 (Ctrl+S)">
        <div class="tool-icon">💾</div><div class="tool-label">저장</div>
      </button>
    </div>
    <div class="tool-group">
      <button class="tool-btn" onclick="undo()" title="실행 취소 (Ctrl+Z)">
        <div class="tool-icon">↶</div><div class="tool-label">실행취소</div>
      </button>
      <button class="tool-btn" onclick="redo()" title="다시 실행 (Ctrl+Y)">
        <div class="tool-icon">↷</div><div class="tool-label">다시실행</div>
      </button>
    </div>
    <div class="tool-group">
      <button class="tool-btn" onclick="rotate(-90)" title="왼쪽 회전">
        <div class="tool-icon">⟲</div><div class="tool-label">좌회전</div>
      </button>
      <button class="tool-btn" onclick="rotate(90)" title="오른쪽 회전">
        <div class="tool-icon">⟳</div><div class="tool-label">우회전</div>
      </button>
      <button class="tool-btn" onclick="flipHorizontal()" title="좌우 뒤집기">
        <div class="tool-icon">⟷</div><div class="tool-label">좌우뒤집기</div>
      </button>
      <button class="tool-btn" onclick="flipVertical()" title="상하 뒤집기">
        <div class="tool-icon">⟱</div><div class="tool-label">상하뒤집기</div>
      </button>
    </div>
    <div class="tool-group">
      <button class="tool-btn" onclick="showCropMenu()" title="자르기">
        <div class="tool-icon">✂️</div><div class="tool-label">자르기</div>
      </button>
      <button class="tool-btn" onclick="toggleImageView()" title="전체보기 (I)">
        <div class="tool-icon">🔍</div><div class="tool-label">전체보기</div>
      </button>
      <button class="tool-btn" id="imgFsBtn" onclick="toggleImageFullscreen()" title="이미지 전체화면">
        <div class="tool-icon">⛶</div><div class="tool-label">전체화면</div>
      </button>
    </div>
    <div class="tool-group">
      <button class="tool-btn" onclick="prevImage()" title="이전 (←)">
        <div class="tool-icon">⟨</div><div class="tool-label">이전</div>
      </button>
      <button class="tool-btn" onclick="nextImage()" title="다음 (→)">
        <div class="tool-icon">⟩</div><div class="tool-label">다음</div>
      </button>
    </div>
  </div>

  <!-- 비디오 툴바 -->
  <div id="videoToolbarGroups" style="display:none;">
    <div class="tool-group">
      <button class="tool-btn" onclick="openFiles()"><div class="tool-icon">📁</div><div class="tool-label">열기</div></button>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">포맷변환</div>
      <button class="tool-btn" onclick="vcOpenPanel('mp4')"><div class="tool-icon">🎞</div><div class="tool-label">MP4</div></button>
      <button class="tool-btn" onclick="vcOpenPanel('webm')"><div class="tool-icon">🌐</div><div class="tool-label">WebM</div></button>
      <button class="tool-btn" onclick="vcOpenPanel('mp3')"><div class="tool-icon">🎵</div><div class="tool-label">MP3추출</div></button>
      <button class="tool-btn" onclick="vcOpenPanel('gif')"><div class="tool-icon">📦</div><div class="tool-label">GIF</div></button>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">해상도</div>
      <button class="tool-btn" onclick="vcSetResolution('1920x1080');vcOpenPanelKeep('mp4')"><div class="tool-icon">📺</div><div class="tool-label">1080p</div></button>
      <button class="tool-btn" onclick="vcSetResolution('1280x720');vcOpenPanelKeep('mp4')"><div class="tool-icon">🖥</div><div class="tool-label">720p</div></button>
      <button class="tool-btn" onclick="vcSetResolution('854x480');vcOpenPanelKeep('mp4')"><div class="tool-icon">📱</div><div class="tool-label">480p</div></button>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">편집</div>
      <button class="tool-btn" onclick="vcOpenPanel('trim')"><div class="tool-icon">✂️</div><div class="tool-label">구간추출</div></button>
      <button class="tool-btn" onclick="vcOpenPanel('mute')"><div class="tool-icon">🔇</div><div class="tool-label">음소거</div></button>
      <button class="tool-btn" onclick="vcOpenPanel('rotate')"><div class="tool-icon">🔄</div><div class="tool-label">회전저장</div></button>
    </div>
    <div class="tool-group">
      <button class="tool-btn" onclick="prevImage()"><div class="tool-icon">⟨</div><div class="tool-label">이전</div></button>
      <button class="tool-btn" onclick="nextImage()"><div class="tool-icon">⟩</div><div class="tool-label">다음</div></button>
    </div>
  </div>

  <!-- 오디오 툴바 -->
  <div id="audioToolbarGroups" style="display:none;">
    <div class="tool-group">
      <button class="tool-btn" onclick="openFiles()"><div class="tool-icon">📁</div><div class="tool-label">열기</div></button>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">재생</div>
      <button class="tool-btn" onclick="audioPrev()"><div class="tool-icon">⏮</div><div class="tool-label">이전</div></button>
      <button class="tool-btn" id="tbAudioPlayBtn" onclick="audioTogglePlay()"><div class="tool-icon">▶</div><div class="tool-label">재생</div></button>
      <button class="tool-btn" onclick="audioNext()"><div class="tool-icon">⏭</div><div class="tool-label">다음</div></button>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">모드</div>
      <button class="tool-btn" id="tbAudioRepeatBtn" onclick="audioToggleRepeat()"><div class="tool-icon">🔁</div><div class="tool-label">반복</div></button>
      <button class="tool-btn" id="tbAudioShuffleBtn" onclick="audioToggleShuffle()"><div class="tool-icon">🔀</div><div class="tool-label">셔플</div></button>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">볼륨</div>
      <button class="tool-btn" id="tbAudioVolBtn" onclick="audioToggleMute()"><div class="tool-icon">🔊</div><div class="tool-label">음소거</div></button>
      <div style="display:flex;flex-direction:column;align-items:center;padding:2px 4px;">
        <input type="range" id="tbAudioVol" min="0" max="1" step="0.05" value="1" oninput="audioSetVolume(+this.value)" style="width:60px;accent-color:#4fa8ff;">
        <div class="tool-label">볼륨</div>
      </div>
    </div>
    <div class="tool-group">
      <div class="tool-group-label">속도</div>
      <button class="tool-btn" onclick="audioSetSpeed(0.75)"><div class="tool-icon">🐢</div><div class="tool-label">0.75x</div></button>
      <button class="tool-btn" onclick="audioSetSpeed(1)"><div class="tool-icon">▶▶</div><div class="tool-label" style="color:#4fa8ff;font-weight:bold;">1x</div></button>
      <button class="tool-btn" onclick="audioSetSpeed(1.5)"><div class="tool-icon">🐇</div><div class="tool-label">1.5x</div></button>
      <button class="tool-btn" onclick="audioSetSpeed(2)"><div class="tool-icon">⚡</div><div class="tool-label">2x</div></button>
    </div>
    <div class="tool-group">
      <button class="tool-btn" onclick="audioTogglePlaylist()"><div class="tool-icon">🎵</div><div class="tool-label">목록</div></button>
    </div>
  </div>
</div>

<!-- 메인 컨테이너 -->
<div class="main-container">
  <!-- 썸네일 패널 -->
  <div class="thumbnail-panel" id="thumbnailPanel">
    <div class="panel-header">
      <span>미디어 목록</span>
      <span class="panel-toggle" onclick="toggleThumbnails()" title="패널 접기/펼치기 (F9)">◀</span>
    </div>
    <div class="panel-tab" onclick="toggleThumbnails()">미디어 목록</div>
    <div class="thumbnail-list" id="thumbnailList"></div>
  </div>

  <!-- 뷰어 영역 -->
  <div class="viewer-area" id="viewerArea">
    <div class="drop-zone" id="dropZone">
      <div class="drop-zone-icon">🎵</div>
      <div class="drop-zone-text">이미지, 영상, 음악을 드래그하여 놓으세요</div>
      <div class="drop-zone-hint">또는 Ctrl+O 를 눌러 파일을 선택하세요<br>JPG·PNG·GIF·WebP·MP4·WebM·MOV·MP3·FLAC·AAC·WAV·ZIP 지원</div>
    </div>

    <!-- 오디오 플레이어 -->
    <div id="audioWrapper">
      <div class="audio-bg-wave"></div>
      <div class="audio-bg-wave"></div>
      <div class="audio-bg-wave"></div>
      <div id="audioLyricBar">
        <button class="lyric-bar-btn" id="lyricToggleBtn" onclick="audioToggleLyric()">🎤 가사</button>
        <label class="lyric-bar-btn" style="cursor:pointer;">
          📂 LRC
          <input type="file" id="lrcFileInput" accept=".lrc,.txt" style="display:none" onchange="audioLoadLrcFile(this)">
        </label>
      </div>
      <div id="audioLyricPanel">
        <div id="lyricStatus"></div>
        <div id="lyricScroll" style="display:none;"><div id="lyricInner"></div></div>
      </div>
      <div class="audio-art-wrap">
        <img id="audioArt" src="" alt="">
        <div class="audio-art-note" id="audioArtNote">🎵</div>
      </div>
      <div class="audio-info">
        <div id="audioTitle">음악을 불러오세요</div>
        <div id="audioSubInfo">0:00 / 0:00</div>
      </div>
      <div id="audioVisualizer"></div>
      <div class="audio-progress-wrap">
        <div id="audioTrack">
          <div id="audioFill"></div>
          <div id="audioThumb"></div>
        </div>
        <div class="audio-time-row">
          <span id="audioCurTime">0:00</span>
          <span id="audioDurTime">0:00</span>
        </div>
      </div>
      <div class="audio-controls">
        <button class="ac-btn" id="audioShuffleBtn" onclick="audioToggleShuffle()">🔀</button>
        <button class="ac-btn" onclick="audioPrev()">⏮</button>
        <button class="ac-btn" id="audioPlayBtn" onclick="audioTogglePlay()">▶</button>
        <button class="ac-btn" onclick="audioNext()">⏭</button>
        <button class="ac-btn" id="audioRepeatBtn" onclick="audioToggleRepeat()">🔁</button>
      </div>
      <div class="audio-sub-controls">
        <button class="ac-sub-btn" id="audioMuteBtn" onclick="audioToggleMute()">🔊</button>
        <input type="range" id="audioVolSlider" min="0" max="1" step="0.05" value="1" oninput="audioSetVolume(+this.value)" style="width:80px;accent-color:#4fa8ff;cursor:pointer;">
        <button class="ac-speed-btn" id="audioSpeedBtn" onclick="audioCycleSpeed()">1.0x</button>
        <button class="ac-sub-btn" onclick="audioTogglePlaylist()">🎵</button>
      </div>
      <div id="audioPlaylist"></div>
      <audio id="audioPlayer" preload="metadata"></audio>
    </div>

    <!-- 비디오 래퍼 -->
    <div id="videoWrapper">
      <video id="videoPlayer" playsinline webkit-playsinline x5-playsinline preload="metadata"
        style="width:auto;height:auto;max-width:100%;max-height:calc(100% - 52px);background:#000;object-fit:contain;display:block;"></video>
      <div id="videoOverlay">
        <div id="videoProgressBar">
          <button class="vctrl-btn" id="videoPlayBtn" onclick="togglePlay()">▶</button>
          <span id="videoCurTime">0:00</span>
          <div id="videoTrack">
            <div id="videoFill"></div>
            <div id="videoThumb"></div>
          </div>
          <span id="videoDurTime">0:00</span>
          <button class="vctrl-btn" id="vVolBtn" onclick="toggleMute()">🔊</button>
          <input type="range" id="vVolSlider" min="0" max="1" step="0.05" value="1" oninput="setVolume(+this.value)" style="width:64px;flex-shrink:0;accent-color:#4fa8ff;cursor:pointer;">
          <button class="vctrl-btn" id="vFsBtn" onclick="showFsPopup(event)">⛶</button>
        </div>
        <div id="vFsPopup" style="display:none;position:absolute;bottom:60px;right:10px;background:rgba(20,20,30,0.97);border:1px solid #555;border-radius:8px;padding:6px 0;z-index:200;min-width:170px;box-shadow:0 4px 20px rgba(0,0,0,0.7);">
          <div onclick="setVideoWindowSize('16:9')" style="padding:9px 18px;color:#eee;cursor:pointer;font-size:13px;">🖥 16:9 창 크기</div>
          <div onclick="setVideoWindowSize('4:3')"  style="padding:9px 18px;color:#eee;cursor:pointer;font-size:13px;">📺 4:3 창 크기</div>
          <div onclick="setVideoWindowSize('original')" style="padding:9px 18px;color:#eee;cursor:pointer;font-size:13px;">↩ 원래대로</div>
          <div style="height:1px;background:#444;margin:4px 8px;"></div>
          <div onclick="doFullscreen();closeFsPopup()" style="padding:9px 18px;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">⛶ 전체화면</div>
        </div>
        <div id="videoControlBar">
          <button class="vctrl-btn" onclick="prevVideo()">⏮</button>
          <button class="vctrl-btn" onclick="nextVideo()">⏭</button>
          <button class="vctrl-btn" id="vRepeatOneBtn" onclick="toggleRepeatOne()">🔂</button>
          <button class="vctrl-btn" id="vRepeatAllBtn" onclick="toggleRepeatAll()">🔁</button>
          <button class="vctrl-btn" onclick="seekBackward()" style="font-size:12px;font-weight:bold;">-5</button>
          <button class="vctrl-btn" onclick="seekForward()"  style="font-size:12px;font-weight:bold;">+5</button>
        </div>
      </div>
    </div>

    <!-- 이미지 캔버스 -->
    <div class="image-container hidden">
      <canvas id="mainCanvas"></canvas>
    </div>

    <!-- 줌 컨트롤 -->
    <div class="zoom-control">
      <button class="zoom-btn" id="zoomOutBtn" onclick="zoomOut()">-</button>
      <div class="zoom-level" id="zoomLevel">100%</div>
      <button class="zoom-btn" id="zoomInBtn" onclick="zoomIn()">+</button>
      <button class="zoom-btn" id="fitScreenBtn" onclick="fitToScreen()" title="화면에 맞추기">⊡</button>
      <button class="zoom-btn" id="actualSizeBtn" onclick="actualSize()" title="실제 크기">1:1</button>
    </div>
  </div>
</div>

<!-- 상태바 -->
<div class="statusbar">
  <span id="statusIndex">0/0</span>
  <span style="margin:0 8px;color:#999;">|</span>
  <span id="statusName"></span>
  <span style="margin:0 8px;color:#999;">|</span>
  <span id="statusSize"></span>
  <span style="margin:0 8px;color:#999;">|</span>
  <span id="statusInfo"></span>
</div>

<!-- 이미지 전체보기 오버레이 -->
<div class="image-view-overlay" id="imageViewOverlay">
  <div class="image-view-container" id="imageViewContainer">
    <img id="imageViewImg" class="image-view-img" src="" alt="">
    <div class="image-view-nav prev" onclick="imageViewPrev()">⟨</div>
    <div class="image-view-nav next" onclick="imageViewNext()">⟩</div>
    <div class="image-view-close" onclick="toggleImageView()">✕</div>
    <div class="image-view-info" id="imageViewInfo">1 / 1</div>
    <div id="imageViewThumb"></div>
    <div id="imageViewToolbar">
      <button class="iv-tool-btn" onclick="ivRotateLeft()"><span class="iv-tool-icon">⟲</span><span class="iv-tool-label">좌회전</span></button>
      <button class="iv-tool-btn" onclick="ivRotateRight()"><span class="iv-tool-icon">⟳</span><span class="iv-tool-label">우회전</span></button>
      <button class="iv-tool-btn" onclick="ivCrop()"><span class="iv-tool-icon">✂️</span><span class="iv-tool-label">자르기</span></button>
      <button class="iv-tool-btn" onclick="ivToggleThumb()"><span class="iv-tool-icon">🖼️</span><span class="iv-tool-label">목록</span></button>
    </div>
  </div>
</div>

<!-- 파일 입력 -->
<input type="file" id="fileInput" multiple
  accept="image/*,video/*,audio/*,.zip,.mp3,.flac,.aac,.wav,.ogg,.m4a,.opus,.wma,.aiff"
  style="display:none">
`;
}
