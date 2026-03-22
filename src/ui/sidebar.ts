export function toggleThumbnails(): void {
  const panel = document.getElementById('thumbnailPanel');
  if (!panel) return;
  panel.classList.toggle('collapsed');
  const btn = panel.querySelector('.panel-toggle');
  if (btn) btn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
}
