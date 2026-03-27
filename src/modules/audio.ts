import { app, _au } from '../store';
import { fmtTime, showToast } from '../utils';
import { showAudioToolbar } from '../ui/toolbar';
import { _lyReset, _lySync } from './lyric';

// ── 오디오 파일 목록 ──────────────────────────────────────────
export function auList(): { item: typeof app.images[0]; idx: number }[] {
  return app.images
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type === 'audio');
}

// ── 오디오 로드 ───────────────────────────────────────────────
export function loadAudio(appIndex: number): void {
  const data = app.images[appIndex];
  if (!data || data.type !== 'audio') return;
  if (_au._loading) return;

  _au._loading = true;
  app.audioMode = true;
  setTimeout(() => { _au._loading = false; }, 500);

  showAudioToolbar();

  // UI 전환
  const canvas  = document.getElementById('mainCanvas') as HTMLCanvasElement | null;
  const vidWrap = document.getElementById('videoWrapper');
  const audWrap = document.getElementById('audioWrapper');
  const imgCont = document.querySelector('.image-container');
  const dz      = document.getElementById('dropZone');
  if (canvas)  canvas.style.display = 'none';
  if (imgCont) imgCont.classList.add('hidden');
  if (vidWrap) vidWrap.classList.remove('active');
  if (audWrap) audWrap.classList.add('active');
  if (dz)      dz.classList.add('hidden');

  ['zoomOutBtn','zoomLevel','zoomInBtn','fitScreenBtn','actualSizeBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  _au.el    = document.getElementById('audioPlayer') as HTMLAudioElement;
  _au.index = appIndex;
  _au.errorCount = 0;
  app.currentIndex = appIndex;
  app.currentVideo = null;
  app.currentImage = null;

  _au.el.src = data.url;
  _auUpdateInfo(data);
  _auBindEvents();
  _auBuildPlaylist();
  _auBuildViz();

  if (_au.el.readyState >= 3) {
    _au.el.play().catch(e => console.warn('autoplay:', e));
  } else {
    const tryPlay = () => {
      _au.el!.removeEventListener('canplay', tryPlay);
      _au.el!.play().catch(e => console.warn('autoplay:', e));
    };
    _au.el.addEventListener('canplay', tryPlay, { once: true });
    _au.el.load();
  }

  if (_au.shuffle) _auBuildShuffle();
}

// ── 곡 정보 표시 ─────────────────────────────────────────────
function _auUpdateInfo(data: typeof app.images[0]): void {
  const title   = document.getElementById('audioTitle');
  const subInfo = document.getElementById('audioSubInfo');
  const name    = data.name.replace(/\.[^.]+$/, '');
  if (title)   title.textContent   = name;
  if (subInfo) subInfo.textContent = `${(data.size / 1024 / 1024).toFixed(1)} MB · ${data.format || ''}`;
  _lyReset(data);
}

// ── 이벤트 바인딩 ────────────────────────────────────────────
function _auBindEvents(): void {
  const el = _au.el!;
  if ((el as HTMLAudioElement & { _auBound?: boolean })._auBound) return;
  (el as HTMLAudioElement & { _auBound?: boolean })._auBound = true;

  el.addEventListener('timeupdate',     _auOnTimeUpdate);
  el.addEventListener('loadedmetadata', _auOnMeta);
  el.addEventListener('ended',          _auOnEnded);
  el.addEventListener('play',           _auOnPlay);
  el.addEventListener('pause',          _auOnPause);
  el.addEventListener('error',          _auOnError);

  const track = document.getElementById('audioTrack');
  if (track && !(track as HTMLElement & { _auBound?: boolean })._auBound) {
    (track as HTMLElement & { _auBound?: boolean })._auBound = true;
    const seek = (e: MouseEvent | TouchEvent) => {
      const rect = track.getBoundingClientRect();
      const cx   = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const pct  = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
      if (_au.el?.duration) _au.el.currentTime = pct * _au.el.duration;
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
       seek(e);
       const onMove = (me: MouseEvent | TouchEvent) => seek(me);
       const onEnd = () => {
         window.removeEventListener('mousemove', onMove);
         window.removeEventListener('mouseup', onEnd);
         window.removeEventListener('touchmove', onMove);
         window.removeEventListener('touchend', onEnd);
       };
       window.addEventListener('mousemove', onMove);
       window.addEventListener('mouseup', onEnd);
       window.addEventListener('touchmove', onMove, { passive: false });
       window.addEventListener('touchend', onEnd);
    };

    track.addEventListener('mousedown',  onStart as EventListener);
    track.addEventListener('touchstart', onStart as EventListener, { passive: false });
  }
}

// ── 이벤트 핸들러 ────────────────────────────────────────────
function _auOnMeta(): void {
  _auUpdateProgress();
  const sub  = document.getElementById('audioSubInfo');
  const data = _au.index !== null ? app.images[_au.index] : null;
  const sizeMB = data ? `${(data.size/1024/1024).toFixed(1)} MB · ` : '';
  if (sub) sub.textContent = sizeMB + fmtTime(_au.el!.duration);
}

function _auOnTimeUpdate(): void {
  _auUpdateProgress();
  if (_au.el) _lySync(_au.el.currentTime);
}

function _auOnPlay(): void {
  document.getElementById('audioWrapper')?.classList.add('playing');
  _auSetPlayIcon(false);
  _auStartViz();
}

function _auOnPause(): void {
  document.getElementById('audioWrapper')?.classList.remove('playing');
  _auSetPlayIcon(true);
  _auStopViz();
}

function _auOnEnded(): void {
  if (_au.repeat === 'one') {
    _au.el!.currentTime = 0;
    _au.el!.play().catch(() => {});
  } else if (_au.repeat === 'all' || _au.shuffle) {
    audioNext();
  } else {
    const list = auList();
    const pos  = list.findIndex(x => x.idx === _au.index);
    if (pos >= 0 && pos < list.length - 1) audioNext();
  }
}

function _auOnError(): void {
  _au.errorCount++;
  const name = (_au.index !== null ? app.images[_au.index] : null)?.name ?? '';
  showToast(`❌ 재생 불가: ${name}`);
  if (_au.errorCount <= 3) {
    const list = auList();
    const pos  = list.findIndex(x => x.idx === _au.index);
    if (pos >= 0 && pos < list.length - 1) setTimeout(audioNext, 300);
    else _au.errorCount = 0;
  } else {
    _au.errorCount = 0;
    showToast('⚠️ 재생 불가 파일이 많습니다. 중단됩니다.');
  }
}

// ── 진행바 업데이트 ───────────────────────────────────────────
function _auUpdateProgress(): void {
  const el = _au.el;
  if (!el?.duration) return;
  const pct = (el.currentTime / el.duration) * 100;
  const fill  = document.getElementById('audioFill');
  const thumb = document.getElementById('audioThumb');
  const cur   = document.getElementById('audioCurTime');
  const dur   = document.getElementById('audioDurTime');
  if (fill)  fill.style.width = `${pct}%`;
  if (thumb) thumb.style.left = `${pct}%`;
  if (cur)   cur.textContent  = fmtTime(el.currentTime);
  if (dur)   dur.textContent  = fmtTime(el.duration);
}

// ── 아이콘 동기화 ────────────────────────────────────────────
function _auSetPlayIcon(paused: boolean): void {
  const icon  = paused ? '▶' : '⏸';
  const label = paused ? '재생' : '일시정지';
  const p = document.getElementById('audioPlayBtn');
  const t = document.getElementById('tbAudioPlayBtn');
  if (p) p.textContent = icon;
  if (t) {
    const ic = t.querySelector('.tool-icon');
    const lb = t.querySelector('.tool-label');
    if (ic) ic.textContent = icon;
    if (lb) lb.textContent = label;
  }
}

// ── 공개 제어 함수 ────────────────────────────────────────────
export function audioTogglePlay(): void {
  if (!_au.el) return;
  if (_au.el.paused) _au.el.play().catch(() => {});
  else               _au.el.pause();
}

export function audioPrev(): void {
  const list = auList();
  if (!list.length) return;
  if (_au.el && _au.el.currentTime > 3) { _au.el.currentTime = 0; return; }
  if (_au.shuffle) {
    _au.shufflePos = (_au.shufflePos - 1 + _au.shuffleList.length) % _au.shuffleList.length;
    loadAudio(_au.shuffleList[_au.shufflePos]);
  } else {
    const pos = list.findIndex(x => x.idx === _au.index);
    loadAudio(list[(pos - 1 + list.length) % list.length].idx);
  }
}

export function audioNext(): void {
  const list = auList();
  if (!list.length) return;
  if (_au.shuffle) {
    _au.shufflePos = (_au.shufflePos + 1) % _au.shuffleList.length;
    loadAudio(_au.shuffleList[_au.shufflePos]);
  } else {
    const pos = list.findIndex(x => x.idx === _au.index);
    const nextPos = pos + 1;
    if (nextPos >= list.length) {
      if (_au.repeat === 'all') loadAudio(list[0].idx);
      return;
    }
    loadAudio(list[nextPos].idx);
  }
}

export function audioToggleRepeat(): void {
  const modes: typeof _au.repeat[] = ['none','all','one'];
  _au.repeat = modes[(modes.indexOf(_au.repeat) + 1) % modes.length];
  const icons  = { none:'🔁', all:'🔁', one:'🔂' };
  const colors = { none:'rgba(255,255,255,0.5)', all:'#4fa8ff', one:'#4fa8ff' };
  const b  = document.getElementById('audioRepeatBtn') as HTMLElement | null;
  const tb = document.getElementById('tbAudioRepeatBtn');
  if (b)  { b.textContent = icons[_au.repeat]; b.style.color = colors[_au.repeat]; }
  if (tb) {
    const ic = tb.querySelector('.tool-icon');
    const lb = tb.querySelector('.tool-label');
    if (ic) ic.textContent = icons[_au.repeat];
    if (lb) lb.textContent = { none:'반복', all:'전체반복', one:'한곡반복' }[_au.repeat];
    (tb as HTMLElement).style.color = colors[_au.repeat];
  }
  showToast(_au.repeat === 'none' ? '반복 끔' : _au.repeat === 'all' ? '🔁 전체 반복' : '🔂 한 곡 반복');
}

export function audioToggleShuffle(): void {
  _au.shuffle = !_au.shuffle;
  const col = _au.shuffle ? '#4fa8ff' : 'rgba(255,255,255,0.5)';
  const b  = document.getElementById('audioShuffleBtn') as HTMLElement | null;
  const tb = document.getElementById('tbAudioShuffleBtn') as HTMLElement | null;
  if (b)  b.style.color = col;
  if (tb) tb.style.color = col;
  if (_au.shuffle) _auBuildShuffle();
  showToast(_au.shuffle ? '🔀 셔플 켜짐' : '셔플 꺼짐');
}

function _auBuildShuffle(): void {
  const list = auList();
  _au.shuffleList = list.map(x => x.idx).sort(() => Math.random() - 0.5);
  _au.shufflePos  = Math.max(0, _au.shuffleList.indexOf(_au.index ?? -1));
}

export function audioSetVolume(v: number): void {
  if (!_au.el) return;
  _au.el.volume = v;
  _au.el.muted  = v === 0;
  const icon = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
  const mb = document.getElementById('audioMuteBtn');
  const tb = document.getElementById('tbAudioVolBtn');
  if (mb) mb.textContent = icon;
  if (tb) { const ic = tb.querySelector('.tool-icon'); if (ic) ic.textContent = icon; }
  const vs = document.getElementById('audioVolSlider') as HTMLInputElement | null;
  const tv = document.getElementById('tbAudioVol')    as HTMLInputElement | null;
  if (vs) vs.value = String(v);
  if (tv) tv.value = String(v);
}

export function audioToggleMute(): void {
  if (!_au.el) return;
  audioSetVolume(_au.el.muted ? (_au.el.volume || 1) : 0);
}

export function audioSetSpeed(s: number): void {
  if (!_au.el) return;
  _au.el.playbackRate = s;
  _au.speedIdx = _au.speeds.indexOf(s);
  if (_au.speedIdx < 0) _au.speedIdx = 2;
  const sb = document.getElementById('audioSpeedBtn');
  if (sb) sb.textContent = `${s}x`;
  showToast(`재생 속도: ${s}x`);
}

export function audioCycleSpeed(): void {
  _au.speedIdx = (_au.speedIdx + 1) % _au.speeds.length;
  audioSetSpeed(_au.speeds[_au.speedIdx]);
}

export function audioTogglePlaylist(): void {
  _au.playlistOpen = !_au.playlistOpen;
  const pl = document.getElementById('audioPlaylist');
  if (pl) {
    pl.classList.toggle('open', _au.playlistOpen);
    if (_au.playlistOpen) _auBuildPlaylist();
  }
}

export function _auBuildPlaylist(): void {
  const pl = document.getElementById('audioPlaylist');
  if (!pl) return;
  const list = auList();
  if (!list.length) { pl.innerHTML = '<div style="padding:12px;color:#aaa;text-align:center;">목록이 없습니다</div>'; return; }
  pl.innerHTML = list.map(({ item, idx }, pos) => `
    <div class="ap-item ${idx === _au.index ? 'active' : ''}" data-idx="${idx}">
      <span class="ap-num">${pos + 1}</span>
      <span class="ap-name">${item.name.replace(/\.[^.]+$/, '')}</span>
      <span class="ap-dur">${(item.size/1024/1024).toFixed(1)}MB</span>
    </div>`).join('');
  pl.querySelectorAll('.ap-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-idx') ?? '0');
      loadAudio(idx);
    });
  });
}

// ── 시각화 바 ────────────────────────────────────────────────
export function _auBuildViz(): void {
  const viz = document.getElementById('audioVisualizer');
  if (!viz) return;
  viz.innerHTML = '';
  _au.vizBars = [];
  for (let i = 0; i < 28; i++) {
    const bar = document.createElement('div');
    bar.className = 'av-bar';
    bar.style.height = '4px';
    viz.appendChild(bar);
    _au.vizBars.push(bar);
  }
}

function _auStartViz(): void {
  _auStopViz();
  if (!_au.audioCtx && _au.el) {
    try {
      _au.audioCtx  = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      _au.analyser  = _au.audioCtx.createAnalyser();
      _au.analyser.fftSize = 64;
      _au.sourceNode = _au.audioCtx.createMediaElementSource(_au.el);
      _au.sourceNode.connect(_au.analyser);
      _au.analyser.connect(_au.audioCtx.destination);
    } catch (e) { console.warn('AudioContext 실패:', e); _au.audioCtx = null; }
  }
  if (_au.audioCtx && _au.analyser) {
    const data = new Uint8Array(_au.analyser.frequencyBinCount);
    const draw = () => {
      if (!_au.el || _au.el.paused) return;
      _au.analyser!.getByteFrequencyData(data);
      _au.vizBars.forEach((bar, i) => {
        bar.style.height = `${Math.max(4, (data[i] || 0) * 36 / 255)}px`;
      });
      _au.vizRaf = requestAnimationFrame(draw);
    };
    _au.vizRaf = requestAnimationFrame(draw);
  } else {
    const draw = () => {
      if (!_au.el || _au.el.paused) return;
      _au.vizBars.forEach(bar => { bar.style.height = `${4 + Math.random() * 32}px`; });
      _au.vizRaf = requestAnimationFrame(draw);
    };
    _au.vizRaf = requestAnimationFrame(draw);
  }
}

function _auStopViz(): void {
  if (_au.vizRaf) { cancelAnimationFrame(_au.vizRaf); _au.vizRaf = null; }
  _au.vizBars.forEach(bar => { bar.style.height = '4px'; });
}
