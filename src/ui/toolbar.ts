// ── 툴바 모드 전환 ────────────────────────────────────────────
export function showImageToolbar(): void {
  const img = document.getElementById('imageToolbarGroups');
  const vid = document.getElementById('videoToolbarGroups');
  const aud = document.getElementById('audioToolbarGroups');
  if (img) { img.classList.remove('hidden'); img.style.display = 'contents'; }
  if (vid) { vid.classList.remove('active'); vid.style.display = 'none'; }
  if (aud) { aud.style.display = 'none'; }
}

export function showVideoToolbar(): void {
  const img = document.getElementById('imageToolbarGroups');
  const vid = document.getElementById('videoToolbarGroups');
  const aud = document.getElementById('audioToolbarGroups');
  if (img) { img.classList.add('hidden'); img.style.display = 'none'; }
  if (vid) { vid.classList.add('active'); vid.style.display = 'flex'; }
  if (aud) { aud.style.display = 'none'; }
}

export function showAudioToolbar(): void {
  const img = document.getElementById('imageToolbarGroups');
  const vid = document.getElementById('videoToolbarGroups');
  const aud = document.getElementById('audioToolbarGroups');
  if (img) { img.classList.add('hidden'); img.style.display = 'none'; }
  if (vid) { vid.classList.remove('active'); vid.style.display = 'none'; }
  if (aud) { aud.style.display = 'flex'; }
}
