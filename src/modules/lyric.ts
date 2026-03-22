import { _ly } from '../store';
import { showToast } from '../utils';
import type { MediaItem } from '../types';

export function audioToggleLyric(): void {
  _ly.visible = !_ly.visible;
  const panel = document.getElementById('audioLyricPanel');
  const btn   = document.getElementById('lyricToggleBtn');
  if (panel) panel.classList.toggle('visible', _ly.visible);
  if (btn)   btn.classList.toggle('active', _ly.visible);
  if (_ly.visible && _ly.lines.length === 0)
    _lyShowStatus('가사가 없습니다.\n같은 이름의 .lrc 파일을 업로드하거나\nMP3 ID3 태그에 가사를 포함해 주세요.');
  if (_ly.visible && _ly.lines.length > 0) _lyScroll(_ly.curIdx, false);
}

export function audioLoadLrcFile(input: HTMLInputElement): void {
  const file = input.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    const text = e.target!.result as string;
    if (file.name.toLowerCase().endsWith('.lrc') || /\[\d+:\d+/.test(text))
      _lyParseLrc(text);
    else
      _lyParsePlain(text);
    showToast('🎤 가사 파일 로드됨: ' + file.name);
    if (!_ly.visible) audioToggleLyric();
  };
  r.readAsText(file, 'UTF-8');
  input.value = '';
}

export function _lyParseLrc(text: string): void {
  _ly.lines   = [];
  _ly.hasTime = false;
  for (const raw of text.split(/\r?\n/)) {
    const txt = raw.replace(/\[\d{1,2}:\d{2}(?:[.:,]\d+)?\]/g, '').trim();
    if (!txt || /^\[(ti|ar|al|by|offset|length|re|ve):/.test(raw)) continue;
    const times: number[] = [];
    const re = /\[(\d{1,2}):(\d{2})(?:[.:,](\d+))?\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      times.push(+m[1]*60 + +m[2] + (m[3] ? parseInt(m[3].padEnd(3,'0').slice(0,3))/1000 : 0));
    }
    if (times.length) {
      _ly.hasTime = true;
      times.forEach(t => _ly.lines.push({ time: t, text: txt }));
    } else {
      _ly.lines.push({ time: -1, text: txt });
    }
  }
  if (_ly.hasTime) {
    _ly.lines = _ly.lines.filter(l => l.time >= 0).sort((a, b) => a.time - b.time);
  }
  _lyRender();
}

export function _lyParsePlain(text: string): void {
  _ly.lines   = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(t => ({ time: -1, text: t }));
  _ly.hasTime = false;
  _lyRender();
}

export function _lyReadID3(file: File): void {
  if (typeof (window as unknown as { jsmediatags?: unknown }).jsmediatags === 'undefined') return;
  const jmt = (window as unknown as { jsmediatags: { read: (f: File, opts: { onSuccess: (t: { tags: Record<string, unknown> }) => void; onError: (e: { type: string }) => void }) => void } }).jsmediatags;
  jmt.read(file, {
    onSuccess(tag) {
      const tags = tag.tags;
      // 앨범아트
      const pic = (tags.APIC || tags.picture) as { data: number[]; format: string } | undefined;
      if (pic?.data?.length) {
        try {
          const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format || 'image/jpeg' });
          const fr = new FileReader();
          fr.onload = e2 => {
            const art  = document.getElementById('audioArt') as HTMLImageElement | null;
            const note = document.getElementById('audioArtNote');
            if (art)  { art.src = e2.target!.result as string; art.style.opacity = '1'; }
            if (note) note.style.display = 'none';
          };
          fr.readAsDataURL(blob);
        } catch { /* ignore */ }
      }
      // USLT
      const uslt = tags.USLT || tags.uslt;
      if (uslt) {
        const txt = typeof uslt === 'object' ? ((uslt as { data?: { lyrics?: string } }).data?.lyrics ?? '') : String(uslt);
        if (txt.trim()) {
          if (/\[\d+:\d+/.test(txt)) _lyParseLrc(txt);
          else _lyParsePlain(txt);
          if (_ly.lines.length) { showToast('🎤 ID3 가사 로드됨'); if (!_ly.visible) audioToggleLyric(); return; }
        }
      }
      // SYLT
      const sylt = tags.SYLT || tags.sylt;
      if (sylt && typeof sylt === 'object') {
        const data = (sylt as { data?: Array<{ timestamp: number; text: string }> }).data;
        if (data?.length) {
          _ly.lines   = data.map(i => ({ time: i.timestamp / 1000, text: i.text })).filter(l => l.text);
          _ly.hasTime = true;
          _ly.lines.sort((a, b) => a.time - b.time);
          _lyRender();
          showToast('🎤 ID3 동기화 가사 로드됨');
          if (!_ly.visible) audioToggleLyric();
        }
      }
    },
    onError(e) { console.warn('ID3 읽기 실패:', e.type); }
  });
}

function _lyRender(): void {
  const inner  = document.getElementById('lyricInner');
  const scroll = document.getElementById('lyricScroll');
  const status = document.getElementById('lyricStatus');
  if (!inner) return;
  if (!_ly.lines.length) {
    if (scroll) scroll.style.display = 'none';
    _lyShowStatus('가사가 없습니다.');
    return;
  }
  if (status) status.textContent = '';
  if (scroll) scroll.style.display = 'block';
  inner.innerHTML = _ly.lines.map((l, i) =>
    `<div class="lyric-line" data-idx="${i}">${l.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
  ).join('');
  inner.querySelectorAll('.lyric-line').forEach((el, i) => {
    el.addEventListener('click', () => _lySeek(i));
  });
  _ly.curIdx = -1;
}

function _lyShowStatus(msg: string): void {
  const s  = document.getElementById('lyricStatus');
  const sc = document.getElementById('lyricScroll');
  if (s)  s.textContent = msg;
  if (sc) sc.style.display = 'none';
}

function _lySeek(idx: number): void {
  const { _au } = require('../store');
  if (!_au.el || !_ly.hasTime || !_ly.lines[idx]) return;
  _au.el.currentTime = _ly.lines[idx].time;
}

export function _lySync(currentTime: number): void {
  if (!_ly.visible || !_ly.lines.length || !_ly.hasTime) return;
  let newIdx = -1;
  for (let i = _ly.lines.length - 1; i >= 0; i--) {
    if (_ly.lines[i].time <= currentTime) { newIdx = i; break; }
  }
  if (newIdx === _ly.curIdx) return;
  _ly.curIdx = newIdx;
  _lyScroll(newIdx, true);
}

function _lyScroll(idx: number, animate: boolean): void {
  const inner  = document.getElementById('lyricInner');
  if (!inner) return;
  inner.querySelectorAll('.lyric-line').forEach((el, i) => {
    el.classList.remove('active', 'near');
    if (i === idx)              el.classList.add('active');
    else if (Math.abs(i-idx) <= 2) el.classList.add('near');
  });
  if (idx < 0) return;
  const activeLine = inner.querySelector('.lyric-line.active') as HTMLElement | null;
  if (!activeLine) return;
  const lineH   = activeLine.offsetHeight + 6;
  const scrollH = (document.getElementById('lyricScroll') as HTMLElement | null)?.offsetHeight ?? 220;
  const target  = idx * lineH - scrollH/2 + lineH/2 - 80;
  inner.style.transition = animate ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none';
  inner.style.transform  = `translateY(${-Math.max(0, target)}px)`;
}

export function _lyReset(data: MediaItem): void {
  _ly.lines = []; _ly.curIdx = -1; _ly.hasTime = false;
  const inner  = document.getElementById('lyricInner');
  const scroll = document.getElementById('lyricScroll');
  const status = document.getElementById('lyricStatus');
  if (inner)  inner.innerHTML = '';
  if (scroll) scroll.style.display = 'none';
  if (status) status.textContent = '';
  const art  = document.getElementById('audioArt') as HTMLImageElement | null;
  const note = document.getElementById('audioArtNote');
  if (art)  { art.src = ''; art.style.opacity = '0'; }
  if (note) note.style.display = 'block';
  if (data.file) _lyReadID3(data.file);
}
