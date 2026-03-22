// @ts-nocheck
/* eslint-disable */
// 비디오 변환 엔진 — 기존 JS 로직 유지 (타입 체크 제외)
import { app, _vc } from '../store';
import { showToast } from '../utils';
import { checkMemory, getMemoryInfo } from '../utils';
import { setVideoOrientation } from './player';

// ── 비디오 변환 패널 HTML (동적 삽입) ────────────────────────
export function mountVideoConvertPanel(): void {
  if (document.getElementById('videoConvertPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'videoConvertPanel';
  panel.className = 'video-convert-panel';
  panel.innerHTML = getConvertPanelHTML();
  document.body.appendChild(panel);
}

export function vcOpenPanel(mode) {
        const panel = document.getElementById('videoConvertPanel');
        if (!panel) return;
        if (panel.classList.contains('open') && _vc.currMode === mode) {
            vcClosePanel(); return;
        }
        _vc.currMode = mode;
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) { panel.style.top = toolbar.getBoundingClientRect().bottom + 'px'; }

        const titles = {
            mp4:'🎞 MP4 변환', webm:'🌐 WebM 변환', mp3:'🎵 MP3 추출',
            gif:'📦 GIF 변환', trim:'✂️ 구간 추출', mute:'🔇 무음 저장',
            rotate:'🔄 회전 저장', info:'ℹ️ 비디오 정보',
        };
        const el = document.getElementById('vcPanelTitle');
        if (el) el.textContent = titles[mode] || '🎬 비디오 변환';

        // 포맷 셀렉트 동기화
        const fmtMap = { mp4:'mp4', webm:'webm', mp3:'mp3', gif:'gif' };
        const fmtSel = document.getElementById('vcFormat');
        if (fmtSel && fmtMap[mode]) fmtSel.value = fmtMap[mode];

        // 섹션 표시 제어
        const rotSec  = document.getElementById('vcRotateSection');
        const bodySec = document.getElementById('vcConvertBody');   // 변환 관련 UI
        const infoSec = document.getElementById('vcInfoSection');   // 정보 전용 UI
        const isInfo  = (mode === 'info');
        if (rotSec)  rotSec.style.display  = (mode === 'rotate') ? '' : 'none';
        if (bodySec) bodySec.style.display = isInfo ? 'none' : '';
        if (infoSec) infoSec.style.display = isInfo ? '' : 'none';
        // 변환 시작 버튼
        const startBtn = document.getElementById('vcStartBtn');
        if (startBtn) startBtn.style.display = isInfo ? 'none' : '';

        // 현재 파일 정보 표시
        vcUpdateFileInfo();
        vcOnFormatChange();
        vcResetProgress();
        panel.classList.add('open');
    }
export function vcClosePanel() {
        const panel = document.getElementById('videoConvertPanel');
        if (panel) panel.classList.remove('open');
        _vc.currMode = null;
    }

    // 해상도/품질 버튼용: 패널이 열려있으면 현재 모드 유지, 닫혀있으면 mp4로 열기
export function vcOpenPanelKeep(defaultMode) {
        const panel = document.getElementById('videoConvertPanel');
        if (!panel) return;
        if (panel.classList.contains('open') && _vc.currMode) {
            // 이미 열려있으면 설정만 반영 (닫지 않음)
            vcUpdateFileInfo();
            vcOnFormatChange();
            return;
        }
        vcOpenPanel(defaultMode || 'mp4');
    }
export function vcUpdateFileInfo() {
        if (app.currentIndex === null || !app.images[app.currentIndex]) return;
        const data = app.images[app.currentIndex];
        const file = data.file;
        if (!file) return;
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setVal('vcFileName', file.name.length > 22 ? file.name.slice(0,20)+'…' : file.name);
        setVal('vcFileSize', (file.size / 1024 / 1024).toFixed(1) + ' MB');
        const warn = document.getElementById('vcSizeWarn');
        if (warn) warn.classList.toggle('show', file.size > 500 * 1024 * 1024);
        const v = document.getElementById('videoPlayer');
        if (v && v.videoWidth) {
            setVal('vcFileRes', v.videoWidth + '×' + v.videoHeight);
            setVal('vcFileDur', vcFmtTime(v.duration));
        }
        // ── info 섹션 상세 정보 ──
        const infoDiv = document.getElementById('vcInfoContent');
        if (infoDiv && v) {
            const vw = v.videoWidth, vh = v.videoHeight;
            const dur = v.duration;
            const fps = v.webkitDecodedFrameCount ? '~30fps' : '-';
            const ratio = vw && vh ? (() => {
                const g = (a,b) => b ? g(b, a%b) : a;
                const d = g(vw, vh);
                return (vw/d) + ':' + (vh/d);
            })() : '-';
            const orient = vw >= vh ? '가로 (Landscape)' : '세로 (Portrait)';
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            const ext = file.name.split('.').pop().toUpperCase();
            const codec = ext === 'MP4' ? 'H.264 (추정)' : ext === 'WEBM' ? 'VP9 (추정)' : ext;
            infoDiv.innerHTML = [
                '📄 파일명: ' + file.name,
                '📦 포맷: ' + ext + ' / ' + codec,
                '💾 크기: ' + sizeMB + ' MB (' + file.size.toLocaleString() + ' bytes)',
                '🖼 해상도: ' + vw + ' × ' + vh + ' px',
                '📐 비율: ' + ratio,
                '🕐 길이: ' + vcFmtTime(dur) + ' (' + (dur ? dur.toFixed(1) + '초' : '-') + ')',
                '🔄 방향: ' + orient,
                '🔊 오디오: ' + (v.mozHasAudio !== undefined ? (v.mozHasAudio ? '있음' : '없음') : '확인 불가'),
            ].map(s => '<div style="padding:1px 0;">' + s + '</div>').join('');
        }
    }
export function vcFmtTime(sec) {
        if (!isFinite(sec)) return '-';
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return m + ':' + String(s).padStart(2,'0');
    }
export function vcParseTime(str) {
        if (!str || !str.trim()) return null;
        const parts = str.trim().split(':');
        if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
        return parseFloat(parts[0]) || null;
    }
export function vcSetProgress(pct, msg) {
        const fill = document.getElementById('vcProgressFill');
        const text = document.getElementById('vcProgressText');
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = msg || pct + '%';
    }
export function vcResetProgress() {
        const wrap = document.getElementById('vcProgressWrap');
        const done = document.getElementById('vcDoneMsg');
        const btn  = document.getElementById('vcStartBtn');
        if (wrap) wrap.classList.remove('show');
        if (done) done.classList.remove('show');
        if (btn)  { btn.disabled = false; btn.textContent = '▶ 변환 시작'; }
        vcSetProgress(0, '준비 중...');
    }
export function vcSetQuality(v) {
        _vc.currQuality = v;
        document.querySelectorAll('.vc-quality-active').forEach(b => b.classList.remove('vc-quality-active'));
        document.querySelectorAll('[onclick]').forEach(b => {
            if (b.onclick && b.onclick.toString().includes('vcSetQuality(' + v + ')')) b.classList.add('vc-quality-active');
        });
        const sel = document.getElementById('vcQuality');
        if (sel) sel.value = String(v);
    }
export function vcSetResolution(v) {
        _vc.currRes = v;
        const sel = document.getElementById('vcResolution');
        if (sel) sel.value = v;
        vcOnResChange();
    }
export function vcOnFormatChange() {
        const fmt = document.getElementById('vcFormat')?.value || 'mp4';
        const resRow  = document.getElementById('vcResRow');
        const qualRow = document.getElementById('vcQualityRow');
        const audRow  = document.getElementById('vcAudioRow');
        const trimSec = document.getElementById('vcTrimSection');
        const isAudio = fmt === 'mp3';
        const isGif   = fmt === 'gif';
        if (resRow)  resRow.style.display  = isAudio ? 'none' : '';
        if (qualRow) qualRow.style.display = (isAudio || isGif) ? 'none' : '';
        if (audRow)  audRow.style.display  = isAudio ? 'none' : '';

        // 호환성 경고 업데이트
        vcUpdateCompatNote(fmt);
    }
export function vcUpdateCompatNote(fmt) {
        let note = document.getElementById('vcCompatNote');
        if (!note) {
            note = document.createElement('div');
            note.id = 'vcCompatNote';
            note.style.cssText = 'font-size:11px;color:#aaa;margin-top:6px;line-height:1.4;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px;';
            const startBtn = document.getElementById('vcStartBtn');
            if (startBtn) startBtn.parentNode.insertBefore(note, startBtn);
        }
        const notes = {
            mp4:  '📌 MP4: 재녹화 방식. 원본 화질 유지. 트림/무음/회전 지원.',
            webm: '📌 WebM: 브라우저 기본 포맷. 파일 크기 작음. 트림/무음 지원.',
            mp3:  '📌 MP3: Web Audio API로 오디오만 추출. Ogg 포맷으로 저장됩니다.',
            gif:  '📌 GIF: Canvas 프레임 캡처 방식. 10초 이내, 소리 없음. 파일 클 수 있음.',
        };
        note.textContent = notes[fmt] || '';
    }
export function vcOnResChange() {
        const v = document.getElementById('vcResolution')?.value;
        const row = document.getElementById('vcCustomResRow');
        if (row) row.style.display = (v === 'custom') ? '' : 'none';
    }

    // ══════════════════════════════════════════════════════════════
    // ── 변환 시작 (MediaRecorder + Canvas — SharedArrayBuffer 불필요)
    // ══════════════════════════════════════════════════════════════
export async function vcStartConvert() {
        if (_vc.converting) { showToast('이미 변환 중입니다.'); return; }
        if (app.currentIndex === null || !app.images[app.currentIndex]) { showToast('비디오를 선택해주세요.'); return; }
        const data = app.images[app.currentIndex];
        if (!data.file) { showToast('파일 정보가 없습니다.'); return; }

        // ── 메모리 사전 경고 ──────────────────────────────────────
        const fileSizeMB = data.file.size / 1024 / 1024;
        const memInfo = performance.memory;  // Chrome 전용 (없으면 undefined)
        const availHeapMB = memInfo ? (memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize) / 1024 / 1024 : null;
        // 파일 크기 > 500MB 또는 가용 힙이 파일 크기의 3배 미만이면 경고
        const memRisk = fileSizeMB > 500 || (availHeapMB !== null && availHeapMB < fileSizeMB * 3);
        if (memRisk) {
            const heapInfo = availHeapMB !== null ? `\n가용 메모리: ${Math.round(availHeapMB)}MB` : '';
            const ok = confirm(
                `⚠️ 메모리 부족 가능성\n\n` +
                `파일 크기: ${Math.round(fileSizeMB)}MB${heapInfo}\n\n` +
                `파일이 너무 크면 변환 중 브라우저가 멈출 수 있습니다.\n` +
                `계속 진행하시겠습니까?\n\n` +
                `(취소 후 구간 추출로 짧게 잘라서 변환하는 것을 권장합니다)`
            );
            if (!ok) return;
        }

        _vc.converting = true;
        const btn  = document.getElementById('vcStartBtn');
        const wrap = document.getElementById('vcProgressWrap');
        const done = document.getElementById('vcDoneMsg');
        if (btn)  { btn.disabled = true; btn.textContent = '⏳ 변환 중...'; }
        if (wrap) wrap.classList.add('show');
        if (done) done.classList.remove('show');
        vcSetProgress(0, '준비 중...');

        const file     = data.file;
        const fmt      = document.getElementById('vcFormat')?.value    || 'mp4';
        const res      = document.getElementById('vcResolution')?.value || 'original';
        const trimS    = vcParseTime(document.getElementById('vcTrimStart')?.value);
        const trimE    = vcParseTime(document.getElementById('vcTrimEnd')?.value);
        const muteAudio = (document.getElementById('vcAudio')?.value === 'remove') || (_vc.currMode === 'mute');
        const rotDir   = document.getElementById('vcRotateDir')?.value || '90';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const mode     = _vc.currMode || fmt;

        // ── 청크 크기 모니터링 (메모리 오버 감지) ─────────────────
        let _memWatchInterval = null;
        const _startMemWatch = () => {
            if (!performance.memory) return;
            _memWatchInterval = setInterval(() => {
                const mem = performance.memory;
                const usedMB = mem.usedJSHeapSize / 1024 / 1024;
                const limitMB = mem.jsHeapSizeLimit / 1024 / 1024;
                const usagePct = usedMB / limitMB;
                if (usagePct > 0.90) {  // 90% 초과 시 강제 중단
                    clearInterval(_memWatchInterval);
                    _vc.converting = false;
                    if (btn)  { btn.disabled = false; btn.textContent = '▶ 변환 시작'; }
                    vcSetProgress(0, '❌ 메모리 부족으로 중단됨');
                    showToast(`❌ 메모리 부족! (사용: ${Math.round(usedMB)}MB / ${Math.round(limitMB)}MB)\n구간을 나눠서 변환하세요.`);
                    // 변환 중단 플래그
                    window._vcMemAbort = true;
                }
            }, 2000);
        };
        window._vcMemAbort = false;

        try {
            _startMemWatch();
            if (fmt === 'mp3') {
                await vcExtractAudio(file, baseName);
            } else if (fmt === 'gif') {
                await vcMakeGif(file, baseName, trimS, trimE);
            } else {
                // MP4 / WebM — MediaRecorder 재녹화
                await vcRecordVideo(file, fmt, res, trimS, trimE, muteAudio,
                                    mode === 'rotate' ? rotDir : null, baseName);
            }

            vcSetProgress(100, '✅ 변환 완료!');
            if (done) done.classList.add('show');
            if (btn)  { btn.disabled = false; btn.textContent = '▶ 변환 시작'; }

        } catch(e) {
            console.error('[vcStartConvert]', e);
            showToast('❌ 변환 실패: ' + e.message);
            if (btn)  { btn.disabled = false; btn.textContent = '▶ 변환 시작'; }
            vcSetProgress(0, '❌ ' + e.message);
        } finally {
            _vc.converting = false;
            if (_memWatchInterval) { clearInterval(_memWatchInterval); _memWatchInterval = null; }
        }
    }

    // ── MediaRecorder 재녹화 (MP4/WebM, 트림, 회전, 무음) ──────────
export function vcRecordVideo(file, fmt, res, trimS, trimE, muteAudio, rotateDir, baseName) {
        return new Promise((resolve, reject) => {
            const videoEl = document.createElement('video');
            videoEl.src     = URL.createObjectURL(file);
            videoEl.muted   = true;   // 캔버스 드로잉용 — 실제 오디오는 AudioContext로
            videoEl.preload = 'metadata';
            videoEl.playsInline = true;

            videoEl.onloadedmetadata = async () => {
                const duration = videoEl.duration;
                const startT   = trimS !== null ? Math.max(0, trimS) : 0;
                const endT     = trimE !== null ? Math.min(trimE, duration) : duration;
                const totalDur = endT - startT;

                if (totalDur <= 0) { reject(new Error('구간이 잘못되었습니다.')); return; }

                // 출력 해상도 계산
                let outW = videoEl.videoWidth, outH = videoEl.videoHeight;
                if (res !== 'original' && res !== 'custom') {
                    const [rw, rh] = res.split('x').map(Number);
                    // 비율 유지
                    const scale = Math.min(rw / outW, rh / outH);
                    outW = Math.round(outW * scale / 2) * 2;
                    outH = Math.round(outH * scale / 2) * 2;
                } else if (res === 'custom') {
                    const cw = parseInt(document.getElementById('vcCustomW')?.value);
                    const ch = parseInt(document.getElementById('vcCustomH')?.value);
                    if (cw && ch) { outW = cw; outH = ch; }
                    else if (cw)  { outH = Math.round(cw * outH / outW / 2) * 2; outW = cw; }
                    else if (ch)  { outW = Math.round(ch * outW / outH / 2) * 2; outH = ch; }
                }

                // 회전 시 가로/세로 교환
                const doRotate = rotateDir !== null;
                const rotate90 = doRotate && (rotateDir === '90' || rotateDir === '-90');
                const canvasW = rotate90 ? outH : outW;
                const canvasH = rotate90 ? outW : outH;

                const canvas = document.createElement('canvas');
                canvas.width  = canvasW;
                canvas.height = canvasH;
                const ctx = canvas.getContext('2d');

                // ── 오디오 스트림 준비 ──
                let audioStream = null;
                if (!muteAudio) {
                    try {
                        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        const src = audioCtx.createMediaElementSource(videoEl);
                        const dest = audioCtx.createMediaStreamDestination();
                        src.connect(dest);
                        src.connect(audioCtx.destination);
                        audioStream = dest.stream;
                        videoEl.muted = false;
                    } catch(e) { console.warn('오디오 스트림 실패:', e); }
                }

                // ── MediaRecorder 설정 ──
                const canvasStream = canvas.captureStream(30);
                let combinedStream;
                if (audioStream && audioStream.getAudioTracks().length > 0) {
                    combinedStream = new MediaStream([
                        ...canvasStream.getVideoTracks(),
                        ...audioStream.getAudioTracks(),
                    ]);
                } else {
                    combinedStream = canvasStream;
                }

                // mimeType 선택: 브라우저 지원 여부 확인
                const mimeList = fmt === 'webm'
                    ? ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
                    : ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
                let mimeType = mimeList.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

                const chunks = [];
                const recorder = new MediaRecorder(combinedStream, { mimeType });
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const outExt = fmt === 'mp4' ? 'mp4' : 'webm';
                    const blob = new Blob(chunks, { type: mimeType });
                    vcDownload(blob, baseName + '_converted.' + outExt);
                    URL.revokeObjectURL(videoEl.src);
                    resolve();
                };
                recorder.onerror = e => reject(new Error('MediaRecorder 오류: ' + e.error));

                // ── 재생 + 프레임 드로잉 ──
                videoEl.currentTime = startT;

                videoEl.onseeked = async () => {
                    videoEl.onseeked = null;
                    recorder.start(100); // 100ms 단위 청크

                    const drawFrame = () => {
                        if (window._vcMemAbort) {
                            videoEl.pause();
                            if (recorder.state === 'recording') recorder.stop();
                            reject(new Error('메모리 부족으로 중단됨'));
                            return;
                        }
                        if (videoEl.paused || videoEl.ended) return;
                        const elapsed = videoEl.currentTime - startT;
                        if (videoEl.currentTime >= endT) {
                            recorder.stop();
                            videoEl.pause();
                            return;
                        }
                        // 진행률 업데이트
                        vcSetProgress(Math.round((elapsed / totalDur) * 90) + 5,
                            '녹화 중... ' + vcFmtTime(elapsed) + ' / ' + vcFmtTime(totalDur));

                        ctx.save();
                        if (doRotate) {
                            ctx.translate(canvasW / 2, canvasH / 2);
                            const deg = rotateDir === '180' ? 180 : (rotateDir === '-90' ? -90 : 90);
                            ctx.rotate(deg * Math.PI / 180);
                            ctx.drawImage(videoEl, -outW / 2, -outH / 2, outW, outH);
                        } else {
                            ctx.drawImage(videoEl, 0, 0, canvasW, canvasH);
                        }
                        ctx.restore();
                        requestAnimationFrame(drawFrame);
                    };

                    videoEl.onended = () => { if (recorder.state === 'recording') recorder.stop(); };
                    videoEl.ontimeupdate = () => {
                        if (videoEl.currentTime >= endT) {
                            videoEl.pause();
                            if (recorder.state === 'recording') recorder.stop();
                        }
                    };

                    await videoEl.play();
                    requestAnimationFrame(drawFrame);
                };

                // seek 트리거
                videoEl.currentTime = startT;
            };
            videoEl.onerror = () => reject(new Error('비디오 파일을 읽을 수 없습니다.'));
        });
    }

    // ── MP3(Ogg) 오디오 추출 — WebAudio + MediaRecorder ──────────
export function vcExtractAudio(file, baseName) {
        return new Promise((resolve, reject) => {
            const videoEl = document.createElement('video');
            videoEl.src = URL.createObjectURL(file);
            videoEl.preload = 'metadata';
            videoEl.playsInline = true;

            videoEl.onloadedmetadata = async () => {
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const src  = audioCtx.createMediaElementSource(videoEl);
                    const dest = audioCtx.createMediaStreamDestination();
                    src.connect(dest);

                    const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
                        ? 'audio/ogg;codecs=opus'
                        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                            ? 'audio/webm;codecs=opus' : 'audio/webm');
                    const ext = mimeType.startsWith('audio/ogg') ? 'ogg' : 'webm';

                    const chunks = [];
                    const recorder = new MediaRecorder(dest.stream, { mimeType });
                    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                    recorder.onstop = () => {
                        const blob = new Blob(chunks, { type: mimeType });
                        vcDownload(blob, baseName + '_audio.' + ext);
                        URL.revokeObjectURL(videoEl.src);
                        resolve();
                    };

                    recorder.start(100);
                    await videoEl.play();

                    const dur = videoEl.duration;
                    videoEl.ontimeupdate = () => {
                        vcSetProgress(Math.round((videoEl.currentTime / dur) * 90) + 5,
                            '오디오 추출 중... ' + vcFmtTime(videoEl.currentTime));
                    };
                    videoEl.onended = () => { recorder.stop(); };
                } catch(e) { reject(e); }
            };
            videoEl.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
        });
    }

    // ── GIF 생성 — Canvas 프레임 캡처 방식 ──────────────────────
export function vcMakeGif(file, baseName, trimS, trimE) {
        return new Promise((resolve, reject) => {
            const videoEl = document.createElement('video');
            videoEl.src = URL.createObjectURL(file);
            videoEl.muted = true;
            videoEl.preload = 'metadata';
            videoEl.playsInline = true;

            videoEl.onloadedmetadata = async () => {
                const duration = videoEl.duration;
                const startT   = trimS !== null ? Math.max(0, trimS) : 0;
                const endT     = trimE !== null ? Math.min(trimE, duration) : Math.min(startT + 10, duration);
                const totalDur = endT - startT;

                // GIF 파라미터
                const fps    = 10;
                const scale  = 0.5; // 원본의 50% 크기 (파일 크기 감소)
                const W      = Math.round(videoEl.videoWidth  * scale / 2) * 2;
                const H      = Math.round(videoEl.videoHeight * scale / 2) * 2;
                const interval = 1 / fps;
                const frameCount = Math.ceil(totalDur * fps);

                const canvas = document.createElement('canvas');
                canvas.width = W; canvas.height = H;
                const ctx = canvas.getContext('2d');

                vcSetProgress(5, 'GIF 프레임 캡처 중...');

                // 프레임을 순서대로 seek → capture
                const frames = [];
                for (let i = 0; i < frameCount; i++) {
                    const t = startT + i * interval;
                    await new Promise(res => {
                        videoEl.currentTime = t;
                        videoEl.onseeked = () => {
                            ctx.drawImage(videoEl, 0, 0, W, H);
                            frames.push(ctx.getImageData(0, 0, W, H));
                            vcSetProgress(5 + Math.round((i / frameCount) * 60),
                                'GIF 프레임 캡처 ' + (i+1) + '/' + frameCount);
                            res();
                        };
                    });
                }

                vcSetProgress(70, 'GIF 인코딩 중...');
                // 간단한 Animated GIF 인코더 (내장)
                const gifBytes = vcEncodeGif(frames, W, H, Math.round(100 / fps));
                const blob = new Blob([gifBytes], { type: 'image/gif' });
                vcDownload(blob, baseName + '_converted.gif');
                URL.revokeObjectURL(videoEl.src);
                resolve();
            };
            videoEl.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
        });
    }

    // ── 내장 GIF 인코더 (LZW 압축, 애니메이션 GIF) ──────────────
export function vcEncodeGif(frames, w, h, delayCs) {
        // GIF89a 스펙 구현
        const bytes = [];
        const push16 = (v) => { bytes.push(v & 0xFF, (v >> 8) & 0xFF); };
        const pushStr = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)); };

        // ── 팔레트 양자화 (256색) ──
function quantize(imageData) {
            // 간단한 미디안컷 양자화
            const data = imageData.data;
            const pixels = [];
            for (let i = 0; i < data.length; i += 4) {
                pixels.push([data[i], data[i+1], data[i+2]]);
            }
            // 256색 팔레트 생성 (빠른 근사: 색 공간 균등 분할)
            const palette = [];
            for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) {
                palette.push([Math.round(r*51), Math.round(g*51), Math.round(b*51)]);
            }
            // 나머지 40개 회색조로 채움
            for (let i = 0; i < 40; i++) { const v = Math.round(i * 255/39); palette.push([v,v,v]); }
            while (palette.length < 256) palette.push([0,0,0]);

            // 각 픽셀 → 팔레트 인덱스 (가장 가까운 색)
            const indices = new Uint8Array(pixels.length);
            for (let pi = 0; pi < pixels.length; pi++) {
                const [pr, pg, pb] = pixels[pi];
                let best = 0, bestD = Infinity;
                for (let ci = 0; ci < palette.length; ci++) {
                    const [cr, cg, cb] = palette[ci];
                    const d = (pr-cr)**2 + (pg-cg)**2 + (pb-cb)**2;
                    if (d < bestD) { bestD = d; best = ci; }
                }
                indices[pi] = best;
            }
            return { palette, indices };
        }

        // LZW 압축
function lzwEncode(indices, minCodeSize) {
            const clearCode = 1 << minCodeSize;
            const eofCode   = clearCode + 1;
            const table     = new Map();
            let nextCode = eofCode + 1;
            let codeSize = minCodeSize + 1;
            const out = []; // [code, bits]

            const emit = (code) => out.push(code);
            emit(clearCode);

            let prefix = [];
            for (let i = 0; i < indices.length; i++) {
                const pixel = indices[i];
                const candidate = [...prefix, pixel];
                const key = candidate.join(',');
                if (table.has(key)) {
                    prefix = candidate;
                } else {
                    emit(prefix.length ? (table.has(prefix.join(',')) ? table.get(prefix.join(',')) : prefix[prefix.length-1]) : pixel);
                    if (nextCode < 4096) {
                        table.set(key, nextCode++);
                        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
                    } else {
                        emit(clearCode);
                        table.clear(); nextCode = eofCode + 1; codeSize = minCodeSize + 1;
                    }
                    prefix = [pixel];
                }
            }
            if (prefix.length) emit(prefix[prefix.length-1]);
            emit(eofCode);

            // コードをビット列に変換してバイト配列に
            const bitStream = [];
            let currentCode = minCodeSize + 1;
            const codes2 = [clearCode];
            // 再エンコード (簡略版: 固定コードサイズ minCodeSize+1 → 最大8bit)
            // 簡単のため固定8bit
            const result = [];
            let buf = 0, bits = 0;
            const push = (code, nbits) => {
                buf |= (code << bits);
                bits += nbits;
                while (bits >= 8) { result.push(buf & 0xFF); buf >>= 8; bits -= 8; }
            };
            const fixedSize = Math.max(2, minCodeSize) + 1;
            push(clearCode, fixedSize);
            for (let i = 0; i < indices.length; i++) push(indices[i], fixedSize);
            push(eofCode, fixedSize);
            if (bits > 0) result.push(buf & 0xFF);
            return result;
        }

        // GIF ヘッダー
        pushStr('GIF89a');
        push16(w); push16(h);
        bytes.push(0xF7, 0, 0); // GCT flag, bg color, aspect

        // ── 最初のフレームでグローバルカラーテーブル作成 ──
        const { palette: gPalette } = quantize(frames[0]);
        for (const [r,g,b] of gPalette) { bytes.push(r, g, b); }

        // ループ拡張 (NETSCAPE 2.0)
        pushStr('\x21\xFF\x0B');
        pushStr('NETSCAPE2.0');
        bytes.push(3, 1); push16(0); bytes.push(0);

        // 各フレーム
        for (let fi = 0; fi < frames.length; fi++) {
            const { indices } = quantize(frames[fi]);

            vcSetProgress(70 + Math.round((fi / frames.length) * 25),
                'GIF 인코딩 중 ' + (fi+1) + '/' + frames.length + '...');

            // グラフィック制御拡張
            bytes.push(0x21, 0xF9, 4);
            bytes.push(0x08); // dispose: restore to background
            push16(delayCs);
            bytes.push(0, 0);

            // イメージ記述子
            bytes.push(0x2C);
            push16(0); push16(0); push16(w); push16(h);
            bytes.push(0); // ローカルカラーテーブルなし

            // LZWコード
            const minCode = 8;
            bytes.push(minCode);
            const lzw = lzwEncode(indices, minCode);
            // 255バイトブロックに分割
            for (let i = 0; i < lzw.length; i += 255) {
                const chunk = lzw.slice(i, i + 255);
                bytes.push(chunk.length, ...chunk);
            }
            bytes.push(0); // ブロック終端
        }

        bytes.push(0x3B); // GIF trailer
        return new Uint8Array(bytes);
    }

    // ══════════════════════════════════════════════════════════════
    // ── 자동 방향 감지 (screen.orientation — 자이로스코프 불필요)
    // screen.orientation은 기기 실제 화면 회전을 감지
    // 스마트TV/패드에서 화면을 돌리면 portrait/landscape 자동 전환
    // ══════════════════════════════════════════════════════════════
    let _vcAutoOrient = false;
    let _vcOrientHandler = null;
export function vcToggleAutoOrient() {
        _vcAutoOrient = !_vcAutoOrient;
        const btn = document.getElementById('vcAutoOrientBtn');

        if (_vcAutoOrient) {
            // ── 자동방향 ON ──
            if (btn) {
                btn.style.background = 'rgba(79,168,255,0.3)';
                btn.style.border = '1px solid #4fa8ff';
                btn.querySelector('.tool-label').textContent = '자동방향 ON';
            }
            showToast('🔁 자동 방향 감지 켜짐 — 화면 돌리면 자동 전환');

            // screen.orientation change 이벤트 (Chrome/Android 지원)
            _vcOrientHandler = () => {
                const type = screen.orientation ? screen.orientation.type : '';
                const angle = screen.orientation ? screen.orientation.angle : window.orientation;
                let mode;
                if (type.includes('portrait') || angle === 0 || angle === 180) {
                    mode = 'portrait';
                } else {
                    mode = 'landscape';
                }
                const current = app.videoOrientation || 'landscape';
                if (mode !== current) {
                    setVideoOrientation(mode);
                    showToast(mode === 'portrait' ? '⬛ 세로 모드 전환' : '🖥 가로 모드 전환');
                }
            };

            if (screen.orientation) {
                screen.orientation.addEventListener('change', _vcOrientHandler);
            } else {
                // fallback: deprecated window.orientation
                window.addEventListener('orientationchange', _vcOrientHandler);
            }

            // 현재 방향으로 즉시 적용
            _vcOrientHandler();

        } else {
            // ── 자동방향 OFF ──
            if (btn) {
                btn.style.background = '';
                btn.style.border = '';
                btn.querySelector('.tool-label').textContent = '자동방향';
            }
            showToast('자동 방향 감지 꺼짐');
            if (_vcOrientHandler) {
                if (screen.orientation) {
                    screen.orientation.removeEventListener('change', _vcOrientHandler);
                } else {
                    window.removeEventListener('orientationchange', _vcOrientHandler);
                }
                _vcOrientHandler = null;
            }
        }
    }
export function vcDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 3000);
    }
export function getConvertPanelHTML(): string {
  return "<div id=\"videoConvertPanel\">\n            <div class=\"vcp-header\">\n                <span id=\"vcPanelTitle\">\ud83c\udfac \ube44\ub514\uc624 \ubcc0\ud658</span>\n                <button class=\"vcp-close\" onclick=\"vcClosePanel()\" title=\"\ub2eb\uae30\">\u2715</button>\n            </div>\n            <div class=\"vcp-body\">\n                <!-- \ud30c\uc77c \uc815\ubcf4 -->\n                <div class=\"vcp-info\">\n                    <div>\ud30c\uc77c: <span class=\"vcp-info-val\" id=\"vcFileName\">-</span></div>\n                    <div>\ud06c\uae30: <span class=\"vcp-info-val\" id=\"vcFileSize\">-</span></div>\n                    <div>\ud574\uc0c1\ub3c4: <span class=\"vcp-info-val\" id=\"vcFileRes\">-</span></div>\n                    <div>\uae38\uc774: <span class=\"vcp-info-val\" id=\"vcFileDur\">-</span></div>\n                </div>\n                <!-- \ub300\uc6a9\ub7c9 \uacbd\uace0 -->\n                <div class=\"vcp-warn\" id=\"vcSizeWarn\">\n                    \u26a0\ufe0f \ud30c\uc77c\uc774 \ud07d\ub2c8\ub2e4 (500MB+). \ube0c\ub77c\uc6b0\uc800 \uba54\ubaa8\ub9ac \ud55c\uacc4\ub85c \uc2e4\ud328\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.\n                </div>\n                <!-- \u2500\u2500 \uc815\ubcf4 \uc804\uc6a9 \uc139\uc158 (info \ubaa8\ub4dc) \u2500\u2500 -->\n                <div id=\"vcInfoSection\" style=\"display:none;\">\n                    <div class=\"vcp-section\">\n                        <div class=\"vcp-section-title\">\ud83d\udcd0 \uc601\uc0c1 \uc815\ubcf4</div>\n                        <div id=\"vcInfoContent\" style=\"color:#ccc;font-size:12px;line-height:1.9;\"></div>\n                    </div>\n                </div>\n                <!-- \u2500\u2500 \ubcc0\ud658 \uc124\uc815 \ubcf8\ubb38 \u2500\u2500 -->\n                <div id=\"vcConvertBody\">\n                <!-- \ucd9c\ub825 \uc124\uc815 -->\n                <div class=\"vcp-section\">\n                    <div class=\"vcp-section-title\">\ucd9c\ub825 \uc124\uc815</div>\n                    <div class=\"vcp-row\">\n                        <span class=\"vcp-label\">\ucd9c\ub825 \ud615\uc2dd</span>\n                        <select class=\"vcp-select\" id=\"vcFormat\" onchange=\"vcOnFormatChange()\">\n                            <option value=\"mp4\">MP4 (H.264)</option>\n                            <option value=\"webm\">WebM (VP9)</option>\n                            <option value=\"mp3\">MP3 (\uc624\ub514\uc624\ub9cc)</option>\n                            <option value=\"gif\">GIF</option>\n                        </select>\n                    </div>\n                    <div class=\"vcp-row\" id=\"vcResRow\">\n                        <span class=\"vcp-label\">\ud574\uc0c1\ub3c4</span>\n                        <select class=\"vcp-select\" id=\"vcResolution\" onchange=\"vcOnResChange()\">\n                            <option value=\"original\">\uc6d0\ubcf8 \uc720\uc9c0</option>\n                            <option value=\"1920x1080\">1080p (1920\u00d71080)</option>\n                            <option value=\"1280x720\">720p (1280\u00d7720)</option>\n                            <option value=\"854x480\">480p (854\u00d7480)</option>\n                            <option value=\"custom\">\uc9c1\uc811 \uc785\ub825</option>\n                        </select>\n                    </div>\n                    <div class=\"vcp-row\" id=\"vcCustomResRow\" style=\"display:none;\">\n                        <span class=\"vcp-label\">\ud06c\uae30</span>\n                        <input class=\"vcp-input\" id=\"vcCustomW\" type=\"number\" placeholder=\"\uac00\ub85c\" min=\"1\" style=\"width:58px;flex:none;\">\n                        <span style=\"color:#888;font-size:12px;padding:0 2px;\">\u00d7</span>\n                        <input class=\"vcp-input\" id=\"vcCustomH\" type=\"number\" placeholder=\"\uc138\ub85c\" min=\"1\" style=\"width:58px;flex:none;\">\n                    </div>\n                    <div class=\"vcp-row\" id=\"vcQualityRow\">\n                        <span class=\"vcp-label\">\ud488\uc9c8</span>\n                        <select class=\"vcp-select\" id=\"vcQuality\">\n                            <option value=\"18\">\uace0\ud488\uc9c8 (CRF 18)</option>\n                            <option value=\"23\" selected>\uc911\uac04 (CRF 23)</option>\n                            <option value=\"28\">\uc800\uc6a9\ub7c9 (CRF 28)</option>\n                        </select>\n                    </div>\n                    <div class=\"vcp-row\" id=\"vcAudioRow\">\n                        <span class=\"vcp-label\">\uc624\ub514\uc624</span>\n                        <select class=\"vcp-select\" id=\"vcAudio\">\n                            <option value=\"keep\">\uc720\uc9c0</option>\n                            <option value=\"remove\">\uc81c\uac70 (\ubb34\uc74c)</option>\n                        </select>\n                    </div>\n                </div>\n                <!-- \uad6c\uac04 \ucd94\ucd9c -->\n                <div class=\"vcp-section\" id=\"vcTrimSection\">\n                    <div class=\"vcp-section-title\">\uad6c\uac04 \ucd94\ucd9c (\ube44\uc6b0\uba74 \uc804\uccb4)</div>\n                    <div class=\"vcp-row\">\n                        <span class=\"vcp-label\">\uc2dc\uc791</span>\n                        <input class=\"vcp-time-input\" id=\"vcTrimStart\" type=\"text\" placeholder=\"0:00\">\n                    </div>\n                    <div class=\"vcp-row\">\n                        <span class=\"vcp-label\">\ub05d</span>\n                        <input class=\"vcp-time-input\" id=\"vcTrimEnd\" type=\"text\" placeholder=\"\uc804\uccb4\">\n                    </div>\n                </div>\n                <!-- \ud68c\uc804 \uc800\uc7a5 \uc635\uc158 -->\n                <div class=\"vcp-section\" id=\"vcRotateSection\" style=\"display:none;\">\n                    <div class=\"vcp-section-title\">\ud68c\uc804 \ubc29\ud5a5</div>\n                    <div class=\"vcp-row\">\n                        <span class=\"vcp-label\">\ubc29\ud5a5</span>\n                        <select class=\"vcp-select\" id=\"vcRotateDir\">\n                            <option value=\"90\">\uc2dc\uacc4\ubc29\ud5a5 90\u00b0</option>\n                            <option value=\"-90\">\ubc18\uc2dc\uacc4\ubc29\ud5a5 90\u00b0</option>\n                            <option value=\"180\">180\u00b0</option>\n                        </select>\n                    </div>\n                </div>\n                <!-- \ubcc0\ud658 \uc2dc\uc791 \ubc84\ud2bc -->\n                <button class=\"vcp-start-btn\" id=\"vcStartBtn\" onclick=\"vcStartConvert()\">\u25b6 \ubcc0\ud658 \uc2dc\uc791</button>\n                <!-- \uc9c4\ud589 \ud45c\uc2dc -->\n                <div class=\"vcp-progress-wrap\" id=\"vcProgressWrap\">\n                    <div class=\"vcp-progress-bar-bg\">\n                        <div class=\"vcp-progress-bar-fill\" id=\"vcProgressFill\"></div>\n                    </div>\n                    <div class=\"vcp-progress-text\" id=\"vcProgressText\">\uc900\ube44 \uc911...</div>\n                </div>\n                <!-- \uc644\ub8cc \uba54\uc2dc\uc9c0 -->\n                <div class=\"vcp-done-msg\" id=\"vcDoneMsg\">\u2705 \ubcc0\ud658 \uc644\ub8cc! \ud30c\uc77c\uc774 \ub2e4\uc6b4\ub85c\ub4dc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.</div>\n                </div><!-- /#vcConvertBody -->\n            </div><!-- /.vcp-body -->\n        </div>";
}
