
export function toggleThumbnails(): void {
  const panel = document.getElementById('thumbnailPanel');
  if (!panel) return;
  if (panel.classList.contains('collapsed')) {
    expandThumbnails();
  } else {
    collapseThumbnails();
  }
}

export function collapseThumbnails(): void {
  const panel = document.getElementById('thumbnailPanel');
  if (!panel) return;
  panel.classList.add('collapsed');
  const btn = panel.querySelector('.panel-toggle');
  if (btn) btn.textContent = '▶';
}

export function expandThumbnails(): void {
  const panel = document.getElementById('thumbnailPanel');
  if (!panel) return;
  panel.classList.remove('collapsed');
  const btn = panel.querySelector('.panel-toggle');
  if (btn) btn.textContent = '◀';
}
