import { app } from '../store';
import { loadMedia } from '../modules/player';

export function createThumbnailEl(index: number): void {
  const data = app.images[index];
  const list = document.getElementById('thumbnailList');
  if (!list) return;

  const div = document.createElement('div');
  div.className = 'thumbnail-item';
  div.setAttribute('data-index', String(index));
  if (index === app.currentIndex) div.classList.add('active');

  // 삭제 버튼
  const del = document.createElement('div');
  del.className = 'thumbnail-delete';
  del.innerHTML = '×';
  del.title = '삭제';
  del.onclick = (e) => { e.stopPropagation(); removeMediaItem(index); };

  const img = document.createElement('img');

  if (data.type === 'audio') {
    img.src = `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect width="100" height="100" rx="8" fill="#1a1a3e"/>' +
      '<text y="70" x="50" font-size="52" text-anchor="middle" fill="#4fa8ff">🎵</text>' +
      '</svg>'
    )}`;
  } else if (data.type === 'video') {
    img.src = data.thumbnailUrl ?? '';
    const icon = document.createElement('div');
    icon.innerHTML = '▶';
    icon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;color:white;text-shadow:0 0 4px black;pointer-events:none;';
    div.style.position = 'relative';
    div.appendChild(icon);
  } else {
    img.src = data.url;
  }

  div.appendChild(del);
  div.appendChild(img);
  div.onclick = () => loadMedia(index);
  list.appendChild(div);
}

export function rebuildThumbnails(): void {
  const list = document.getElementById('thumbnailList');
  if (!list) return;
  list.innerHTML = '';
  app.images.forEach((_, i) => createThumbnailEl(i));
}

export function removeMediaItem(index: number): void {
  const wasActive = app.currentIndex === index;
  app.images.splice(index, 1);

  if (wasActive) {
    if (app.images.length === 0) {
      app.currentIndex = null;
      document.getElementById('dropZone')?.classList.remove('hidden');
      document.querySelector('.image-container')?.classList.add('hidden');
    } else {
      const newIdx = Math.min(index, app.images.length - 1);
      app.currentIndex = null;
      loadMedia(newIdx);
    }
  } else if (app.currentIndex !== null && app.currentIndex > index) {
    app.currentIndex--;
  }

  rebuildThumbnails();
}
