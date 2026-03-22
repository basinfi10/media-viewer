import { app } from '../store';
import { loadMedia, updateStatus } from '../modules/player';
import { showToast } from '../utils';

// ── lastSelectedIndex를 app에 동적으로 추가 ──────────────────
function getLastSelected(): number | null {
  return (app as typeof app & { lastSelectedIndex?: number | null }).lastSelectedIndex ?? null;
}
function setLastSelected(v: number | null): void {
  (app as typeof app & { lastSelectedIndex?: number | null }).lastSelectedIndex = v;
}

// ── 썸네일 생성 (원본 createThumbnail 100% 동일) ─────────────
export function createThumbnailEl(index: number): void {
  const data = app.images[index];
  const list = document.getElementById('thumbnailList');
  if (!list) return;

  const div = document.createElement('div');
  div.className = 'thumbnail-item';
  div.setAttribute('data-index', String(index));

  // 삭제 버튼
  const deleteBtn = document.createElement('div');
  deleteBtn.className = 'thumbnail-delete';
  deleteBtn.innerHTML = '×';
  deleteBtn.title = '삭제';
  deleteBtn.onclick = (e) => { e.stopPropagation(); removeImage(index); };

  // 맨 위로
  const moveTopBtn = document.createElement('div');
  moveTopBtn.className = 'thumbnail-move-top';
  moveTopBtn.innerHTML = '⬆';
  moveTopBtn.title = '맨 위로';
  moveTopBtn.onclick = (e) => { e.stopPropagation(); moveImageToPosition(index, 0); };

  // 맨 아래로
  const moveBottomBtn = document.createElement('div');
  moveBottomBtn.className = 'thumbnail-move-bottom';
  moveBottomBtn.innerHTML = '⬇';
  moveBottomBtn.title = '맨 아래로';
  moveBottomBtn.onclick = (e) => { e.stopPropagation(); moveImageToPosition(index, app.images.length - 1); };

  const img = document.createElement('img');
  img.loading = 'lazy';

  if (data.type === 'audio') {
    img.src = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect width="100" height="100" rx="8" fill="#1a1a3e"/>' +
      '<text y="70" x="50" font-size="52" text-anchor="middle" fill="#4fa8ff">🎵</text>' +
      '</svg>');
    const audioIcon = document.createElement('div');
    audioIcon.innerHTML = '🎵';
    audioIcon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;pointer-events:none;';
    div.style.position = 'relative';
    div.appendChild(audioIcon);
  } else if (data.type === 'video') {
    img.src = data.thumbnailUrl ?? '';
    const videoIcon = document.createElement('div');
    videoIcon.innerHTML = '▶';
    videoIcon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;color:white;text-shadow:0 0 4px black;pointer-events:none;';
    div.style.position = 'relative';
    div.appendChild(videoIcon);
  } else {
    img.src = data.url;
  }

  // ── 클릭: Shift 범위선택 / Ctrl 개별토글 / 일반 로드 ────────
  div.onclick = (e) => {
    if (e.shiftKey) {
      const last = getLastSelected();
      if (last !== null) {
        const start = Math.min(last, index);
        const end   = Math.max(last, index);
        for (let i = start; i <= end; i++) {
          if (!app.selectedImages.includes(i)) app.selectedImages.push(i);
        }
      } else {
        toggleImageSelection(index);
      }
      updateThumbnailSelection();
    } else if (e.ctrlKey || e.metaKey) {
      toggleImageSelection(index);
      updateThumbnailSelection();
    } else {
      app.selectedImages = [];
      loadMedia(index);
      updateThumbnailSelection();
    }
  };

  // ── 드래그 앤 드롭 ──────────────────────────────────────────
  div.draggable = true;

  div.ondragstart = (e) => {
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', String(index));
    div.classList.add('dragging');
  };
  div.ondragend = () => {
    div.classList.remove('dragging');
    document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('drag-over'));
  };
  div.ondragover = (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    div.classList.add('drag-over');
  };
  div.ondragleave = () => div.classList.remove('drag-over');
  div.ondrop = (e) => {
    e.preventDefault();
    div.classList.remove('drag-over');
    const fromIndex = parseInt(e.dataTransfer!.getData('text/plain'));
    if (fromIndex !== index) moveImageToPosition(fromIndex, index);
  };

  // ── 우클릭 컨텍스트 메뉴 ────────────────────────────────────
  div.oncontextmenu = (e) => {
    e.preventDefault();
    if (!app.selectedImages.includes(index)) {
      app.selectedImages = [index];
      updateThumbnailSelection();
    }
    showContextMenu(e.clientX, e.clientY);
  };

  const info = document.createElement('div');
  info.className = 'thumbnail-info';
  info.textContent = data.name;

  div.appendChild(deleteBtn);
  div.appendChild(moveTopBtn);
  div.appendChild(moveBottomBtn);
  div.appendChild(img);
  div.appendChild(info);
  list.appendChild(div);

  if (app.selectedImages.includes(index)) div.classList.add('selected');
  if (app.currentIndex === index) div.classList.add('active');
}

// ── 썸네일 전체 재구성 ───────────────────────────────────────
export function rebuildThumbnails(): void {
  const list = document.getElementById('thumbnailList');
  if (!list) return;
  list.innerHTML = '';
  app.images.forEach((_, i) => createThumbnailEl(i));
}

// ── 위치 이동 ─────────────────────────────────────────────────
export function moveImageToPosition(fromIndex: number, toIndex: number): void {
  if (fromIndex === toIndex) return;
  const item = app.images.splice(fromIndex, 1)[0];
  app.images.splice(toIndex, 0, item);

  if (app.currentIndex === fromIndex) {
    app.currentIndex = toIndex;
  } else if (app.currentIndex !== null) {
    if (fromIndex < app.currentIndex && toIndex >= app.currentIndex) app.currentIndex--;
    else if (fromIndex > app.currentIndex && toIndex <= app.currentIndex) app.currentIndex++;
  }

  app.selectedImages = app.selectedImages.map(idx => {
    if (idx === fromIndex) return toIndex;
    if (fromIndex < idx && toIndex >= idx) return idx - 1;
    if (fromIndex > idx && toIndex <= idx) return idx + 1;
    return idx;
  });

  rebuildThumbnails();
  showToast(`🔀 순서 변경 완료`);
}

// ── 선택 토글 ─────────────────────────────────────────────────
export function toggleImageSelection(index: number): void {
  const i = app.selectedImages.indexOf(index);
  if (i > -1) {
    app.selectedImages.splice(i, 1);
    setLastSelected(null);
  } else {
    app.selectedImages.push(index);
    setLastSelected(index);
  }
}

// ── 전체 선택 ─────────────────────────────────────────────────
export function selectAllImages(): void {
  app.selectedImages = app.images.map((_, i) => i);
  setLastSelected(app.images.length - 1);
  updateThumbnailSelection();
}

// ── 선택 해제 ─────────────────────────────────────────────────
export function deselectAllImages(): void {
  app.selectedImages = [];
  setLastSelected(null);
  updateThumbnailSelection();
}

// ── 선택 상태 UI 반영 ─────────────────────────────────────────
export function updateThumbnailSelection(): void {
  document.querySelectorAll('.thumbnail-item').forEach(thumb => {
    const idx = parseInt(thumb.getAttribute('data-index') ?? '-1');
    thumb.classList.toggle('selected', app.selectedImages.includes(idx));
    thumb.classList.toggle('active', idx === app.currentIndex);
  });
  updateBatchEditButton();
}

// ── 일괄편집 버튼 상태 ───────────────────────────────────────
export function updateBatchEditButton(): void {
  const btn   = document.getElementById('batchEditToolBtn') as HTMLElement | null;
  const count = document.getElementById('selectedCount') as HTMLElement | null;
  if (!btn) return;
  const n = app.selectedImages.length;
  if (count) {
    count.textContent = n > 0 ? `(${n}개 선택)` : '';
    count.style.display = n > 0 ? 'inline' : 'none';
  }
  btn.style.opacity = n >= 2 ? '1' : '0.3';
  btn.title = n >= 2 ? `일괄 편집 (${n}개)` : '일괄 편집 (2개 이상 선택 필요)';
}

// ── 선택 메뉴 (☰) ─────────────────────────────────────────────
export function showDeleteSelectionMenu(): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  const n = app.selectedImages.length;
  const total = app.images.length;

  if (n === 0) {
    modal.innerHTML = `
      <div class="modal-content" style="width:300px;">
        <div class="modal-title"><span>미디어 선택</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:#666;margin-bottom:16px;">총 ${total}개의 미디어</p>
          <button class="btn-small" onclick="selectAllImages();this.closest('.modal-overlay').remove();"
            style="width:100%;background:#0078d7;color:white;">☑️ 전체 선택 (${total}개)</button>
        </div>
        <div class="modal-footer">
          <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
        </div>
      </div>`;
  } else {
    modal.innerHTML = `
      <div class="modal-content" style="width:300px;">
        <div class="modal-title"><span>선택된 항목 (${n}개)</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:#666;margin-bottom:16px;">${n}개 항목 선택됨</p>
          <button class="btn-small" onclick="selectAllImages();this.closest('.modal-overlay').remove();"
            style="width:100%;background:#0078d7;color:white;margin-bottom:8px;">☑️ 전체 선택 (${total}개)</button>
          <button class="btn-small" onclick="deleteSelectedImages();this.closest('.modal-overlay').remove();"
            style="width:100%;background:#dc3545;color:white;margin-bottom:8px;">🗑️ 선택 항목 삭제</button>
          <button class="btn-small" onclick="deselectAllImages();this.closest('.modal-overlay').remove();"
            style="width:100%;">⬜ 선택 해제</button>
        </div>
        <div class="modal-footer">
          <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
        </div>
      </div>`;
  }
  document.body.appendChild(modal);
}

// ── 선택 항목 삭제 ───────────────────────────────────────────
export function deleteSelectedImages(): void {
  if (app.selectedImages.length === 0) { showToast('삭제할 항목을 선택해주세요.'); return; }
  if (!confirm(`선택한 ${app.selectedImages.length}개를 삭제하시겠습니까?`)) return;

  const sorted = [...app.selectedImages].sort((a, b) => b - a);
  for (const idx of sorted) {
    if (app.images[idx]) app.images.splice(idx, 1);
  }
  app.selectedImages = [];
  setLastSelected(null);
  rebuildThumbnails();

  if (app.images.length > 0) {
    loadMedia(Math.min(app.currentIndex ?? 0, app.images.length - 1));
  } else {
    app.currentIndex = null; app.currentImage = null; app.currentVideo = null;
    document.getElementById('dropZone')?.classList.remove('hidden');
    document.querySelector('.image-container')?.classList.add('hidden');
  }
  updateStatus();
  updateThumbnailSelection();
}

// ── 단일 삭제 ─────────────────────────────────────────────────
export function removeImage(index: number): void {
  app.images.splice(index, 1);
  rebuildThumbnails();
  if (app.currentIndex === index) {
    if (app.images.length > 0) loadMedia(Math.min(index, app.images.length - 1));
    else {
      app.currentIndex = null; app.currentImage = null; app.currentVideo = null;
      document.getElementById('dropZone')?.classList.remove('hidden');
      document.querySelector('.image-container')?.classList.add('hidden');
    }
  } else if (app.currentIndex !== null && app.currentIndex > index) {
    app.currentIndex--;
  }
  updateStatus();
}

// ── 우클릭 컨텍스트 메뉴 ──────────────────────────────────────
export function showContextMenu(x: number, y: number): void {
  document.getElementById('_thumbCtxMenu')?.remove();
  const n = app.selectedImages.length;
  const hasImg = n > 0 && app.images[app.selectedImages[0]]?.type === 'image';

  const menu = document.createElement('div');
  menu.id = '_thumbCtxMenu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:white;
    border:1px solid #c0c0c0;box-shadow:0 2px 8px rgba(0,0,0,0.25);
    border-radius:4px;padding:4px 0;min-width:190px;z-index:10001;font-size:13px;`;

  const row = (icon: string, label: string, action: () => void, opts?: { danger?: boolean; disabled?: boolean }) => {
    if (opts?.disabled) return;
    const el = document.createElement('div');
    el.style.cssText = `padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;
      color:${opts?.danger ? '#dc3545' : '#222'};`;
    el.innerHTML = `<span style="width:18px;text-align:center;">${icon}</span><span>${label}</span>`;
    el.onmouseenter = () => el.style.background = opts?.danger ? '#ffe5e5' : '#e5f1fb';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = () => { menu.remove(); action(); };
    menu.appendChild(el);
  };

  const sep = () => {
    const s = document.createElement('div');
    s.style.cssText = 'height:1px;background:#e0e0e0;margin:3px 0;';
    menu.appendChild(s);
  };

  row('🖼️', '새 탭에서 열기', () => {
    app.selectedImages.forEach(i => { const d = app.images[i]; if (d) window.open(d.url, '_blank'); });
  }, { disabled: !hasImg });

  row('📋', '이미지 복사', () => copyImageToClipboard(), { disabled: !hasImg || n !== 1 });
  row('📂', '파일명 복사', () => copyPathToClipboard());
  sep();
  row('⬆️', '맨 위로 이동', () => moveImageToPosition(app.selectedImages[0], 0), { disabled: n !== 1 });
  row('⬇️', '맨 아래로 이동', () => moveImageToPosition(app.selectedImages[0], app.images.length - 1), { disabled: n !== 1 });
  sep();
  row('☑️', `전체 선택 (${app.images.length}개)`, () => selectAllImages());
  row('⬜', '선택 해제', () => deselectAllImages(), { disabled: n === 0 });
  sep();
  row('🗑️', n > 1 ? `선택 삭제 (${n}개)` : '삭제', () => {
    if (n === 1) removeImage(app.selectedImages[0]);
    else deleteSelectedImages();
  }, { danger: true, disabled: n === 0 });

  document.body.appendChild(menu);

  // 화면 밖 보정
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = `${x - r.width}px`;
    if (r.bottom > window.innerHeight) menu.style.top  = `${y - r.height}px`;
  });

  // 외부 클릭 닫기
  const close = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) { menu.remove(); document.removeEventListener('mousedown', close); }
  };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

// ── 클립보드 복사 ─────────────────────────────────────────────
async function copyImageToClipboard(): Promise<void> {
  if (!app.selectedImages.length) return;
  try {
    const d = app.images[app.selectedImages[0]];
    if (!d?.img) { showToast('이미지를 먼저 로드해주세요.'); return; }
    const tmp = document.createElement('canvas');
    tmp.width = d.img.naturalWidth; tmp.height = d.img.naturalHeight;
    tmp.getContext('2d')!.drawImage(d.img, 0, 0);
    tmp.toBlob(async blob => {
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('✅ 클립보드에 복사됐습니다.');
    }, 'image/png');
  } catch { showToast('❌ 클립보드 복사 실패'); }
}

async function copyPathToClipboard(): Promise<void> {
  if (!app.selectedImages.length) return;
  const names = app.selectedImages.map(i => app.images[i]?.name ?? '').join('\n');
  await navigator.clipboard.writeText(names);
  showToast('✅ 파일명 복사됐습니다.');
}
