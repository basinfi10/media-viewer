import { app } from '../store';
import { showToast } from '../utils';
import { startCropWithRatio, renderCanvas } from '../modules/canvas';

export function showCropMenu(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  const ratios = [
    ['free','📐','자유'],['original','⬜','원본'],['1:1','⬛','1:1'],['9:16','📱','9:16'],
    ['16:9','🖥️','16:9'],['4:5','📸','4:5'],['5:4','🖼️','5:4'],['3:4','📄','3:4'],
    ['4:3','🖼️','4:3'],['2:3','📱','2:3'],['3:2','📷','3:2'],['2:1','🎬','2:1'],
  ];
  modal.innerHTML = `
    <div class="modal-content" style="width:400px;">
      <div class="modal-title">
        <span>✂️ 자르기 비율 선택</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${ratios.map(([r,ic,lb]) => `
            <button class="btn-small" style="padding:16px 8px;font-size:10px;"
              onclick="startCropWithRatio('${r}');this.closest('.modal-overlay').remove()">
              ${ic}<br>${lb}
            </button>`).join('')}
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

export function showResizeDialog(): void {
  if (!app.currentImage) return;
  const w = app.currentImage.naturalWidth;
  const h = app.currentImage.naturalHeight;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-content" style="width:320px;">
      <div class="modal-title"><span>📐 크기 조정</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:10px;">현재 크기: ${w} × ${h}px</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <label style="min-width:32px;">너비</label>
          <input type="number" id="resizeW" value="${w}" style="width:80px;">
          <span>px</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
          <label style="min-width:32px;">높이</label>
          <input type="number" id="resizeH" value="${h}" style="width:80px;">
          <span>px</span>
        </div>
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
          <input type="checkbox" id="resizeLock" checked> 비율 유지
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">취소</button>
        <button class="btn-small" style="background:#0078d7;color:white;" onclick="applyResizeFromDialog(this)">적용</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // 비율 유지 연동
  const wInput = modal.querySelector('#resizeW') as HTMLInputElement;
  const hInput = modal.querySelector('#resizeH') as HTMLInputElement;
  const lock   = modal.querySelector('#resizeLock') as HTMLInputElement;
  const ratio  = w / h;
  wInput.addEventListener('input', () => { if (lock.checked) hInput.value = String(Math.round(+wInput.value / ratio)); });
  hInput.addEventListener('input', () => { if (lock.checked) wInput.value = String(Math.round(+hInput.value * ratio)); });
}

export function showToastMessage(msg: string): void { showToast(msg); }

export function showAbout(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-content" style="width:360px;">
      <div class="modal-title"><span>ℹ️ 미디어 뷰어 정보</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body" style="text-align:center;padding:20px;">
        <div style="font-size:48px;margin-bottom:12px;">🎬</div>
        <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">미디어 뷰어 v3.35.2</div>
        <div style="color:#666;font-size:13px;line-height:1.6;">
          이미지 · 영상 · 음악 통합 뷰어<br>
          TypeScript + Vite<br><br>
          JPG · PNG · GIF · WebP · BMP · AVIF<br>
          MP4 · WebM · MOV · AVI · MKV<br>
          MP3 · FLAC · AAC · WAV · OGG · M4A<br>
          ZIP 일괄 로드 지원
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

export function showShortcuts(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-content" style="width:420px;">
      <div class="modal-title"><span>⌨️ 단축키</span>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body" style="font-size:13px;line-height:2;">
        <b>파일</b><br>
        Ctrl+O — 파일 열기<br>
        Ctrl+S — 저장<br>
        Del — 현재 파일 삭제<br><br>
        <b>탐색</b><br>
        ← → — 이전/다음<br>
        F9 — 썸네일 패널 토글<br><br>
        <b>이미지</b><br>
        +/- — 줌 인/아웃 &nbsp; 0 — 실제 크기 &nbsp; \ — 화면 맞춤<br>
        Ctrl+Z — 실행 취소 &nbsp; Ctrl+Y — 다시 실행<br>
        F11 — 창 전체화면 &nbsp; I — 이미지 전체보기<br><br>
        <b>영상</b><br>
        Space — 재생/정지<br>
        , / . — 5초 뒤/앞<br><br>
        <b>음악</b><br>
        Space — 재생/정지
      </div>
      <div class="modal-footer">
        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

export function applyResizeFromDialog(btn: HTMLElement): void {
  const modal  = btn.closest('.modal-overlay') as HTMLElement | null;
  if (!modal) return;
  const wInput = modal.querySelector('#resizeW') as HTMLInputElement | null;
  const hInput = modal.querySelector('#resizeH') as HTMLInputElement | null;
  if (!wInput || !hInput) return;

  const newW = parseInt(wInput.value);
  const newH = parseInt(hInput.value);
  if (!newW || !newH || newW < 1 || newH < 1) { showToast('올바른 크기를 입력해주세요.'); return; }

  const tmp = document.createElement('canvas');
  tmp.width = newW; tmp.height = newH;
  const tc = tmp.getContext('2d')!;
  if (app.currentImage) tc.drawImage(app.currentImage, 0, 0, newW, newH);
  const img = new Image();
  img.onload = () => {
    app.currentImage = img;
    app.canvas.width  = newW;
    app.canvas.height = newH;
    renderCanvas();
    showToast(`📐 ${newW}×${newH}px 적용됨`);
  };
  img.src = tmp.toDataURL();
  modal.remove();
}
