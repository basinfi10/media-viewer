// @ts-nocheck
/* eslint-disable */
import { app, defaultFilters } from '../store';
import { showToast } from '../utils';
import { renderCanvas, saveHistory, fitToScreen } from './canvas';

export function toggleImagePanel() {
            const panel = document.getElementById('imagePanel');
            const tool = document.getElementById('imageTool');
            const isActive = panel.classList.contains('active');
            
            if (!isActive) {
                // 이미지 패널 열기 - 다른 패널 닫기
                if (app.cropMode) {
                    app.cropMode = false;
                    app.cropRect = null;
                    app.cropDragHandle = null;
                    app.cropDragStart = null;
                    document.getElementById('cropTool').classList.remove('active');
                    canvas.style.cursor = 'default';
                    renderCanvas();
                }
                
                const editPanel = document.getElementById('editPanel');
                if (editPanel.classList.contains('active')) {
                    editPanel.classList.remove('active');
                    document.getElementById('editTool').classList.remove('active');
                }
            }
            
            panel.classList.toggle('active');
            tool.classList.toggle('active');
        }

export function toggleEditPanel() {
            const panel = document.getElementById('editPanel');
            const tool = document.getElementById('editTool');
            const isActive = panel.classList.contains('active');
            
            if (!isActive) {
                // 편집 패널 열기 - 다른 패널 닫기
                if (app.cropMode) {
                    app.cropMode = false;
                    app.cropRect = null;
                    app.cropDragHandle = null;
                    app.cropDragStart = null;
                    document.getElementById('cropTool').classList.remove('active');
                    canvas.style.cursor = 'default';
                    renderCanvas();
                }
                
                const imagePanel = document.getElementById('imagePanel');
                if (imagePanel.classList.contains('active')) {
                    imagePanel.classList.remove('active');
                    document.getElementById('imageTool').classList.remove('active');
                }
                
                // 크기 입력 필드 초기화
                setTimeout(() => initEditResizeInputs(), 100);
            }
            
            panel.classList.toggle('active');
            tool.classList.toggle('active');
        }

export function showFilterMenu() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            // 자르기 모드 해제
            if (app.cropMode) {
                app.cropMode = false;
                app.cropRect = null;
                app.cropDragHandle = null;
                app.cropDragStart = null;
                document.getElementById('cropTool').classList.remove('active');
                canvas.style.cursor = 'default';
                renderCanvas();
            }
            
            // 편집 패널 닫기
            const editPanel = document.getElementById('editPanel');
            if (editPanel.classList.contains('active')) {
                editPanel.classList.remove('active');
                document.getElementById('editTool').classList.remove('active');
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content" style="width: 420px; position: fixed; right: 20px; top: 100px; left: auto; transform: none;">
                    <div class="modal-title">
                        <span>🎭 이미지 필터</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 12px; color: #666; margin-bottom: 12px;">클릭하면 즉시 적용됩니다</p>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            <button class="btn-small" onclick="applyPresetFilter('grayscale')" style="padding: 12px;">⚫ 흑백</button>
                            <button class="btn-small" onclick="applyPresetFilter('sepia')" style="padding: 12px;">🟤 세피아</button>
                            <button class="btn-small" onclick="applyPresetFilter('invert')" style="padding: 12px;">🔄 반전</button>
                            <button class="btn-small" onclick="applyPresetFilter('blur')" style="padding: 12px;">💫 블러</button>
                            <button class="btn-small" onclick="applyPresetFilter('sharpen')" style="padding: 12px;">✨ 선명</button>
                            <button class="btn-small" onclick="applyPresetFilter('emboss')" style="padding: 12px;">🗿 엠보싱</button>
                            <button class="btn-small" onclick="applyPresetFilter('edge')" style="padding: 12px;">📐 가장자리</button>
                            <button class="btn-small" onclick="applyPresetFilter('vignette')" style="padding: 12px;">🌓 비네팅</button>
                            <button class="btn-small" onclick="applyPresetFilter('warm')" style="padding: 12px;">🔥 따뜻하게</button>
                            <button class="btn-small" onclick="applyPresetFilter('cool')" style="padding: 12px;">❄️ 차갑게</button>
                            <button class="btn-small" onclick="applyPresetFilter('shadow')" style="padding: 12px;">🌑 그림자</button>
                            <button class="btn-small" onclick="applyPresetFilter('watercolor')" style="padding: 12px;">🎨 수채화</button>
                            <button class="btn-small" onclick="applyPresetFilter('sketch')" style="padding: 12px;">✏️ 연필 스케치</button>
                            <button class="btn-small" onclick="applyPresetFilter('oil')" style="padding: 12px;">🖌️ 유화</button>
                            <button class="btn-small" onclick="applyPresetFilter('cartoon')" style="padding: 12px;">🎬 카툰</button>
                            <button class="btn-small" onclick="applyPresetFilter('neon')" style="padding: 12px;">💡 네온</button>
                        </div>
                        <hr style="margin: 16px 0; border: none; border-top: 1px solid #e0e0e0;">
                        <button class="btn-small" style="width: 100%; background: #dc3545; color: white;" 
                            onclick="resetToOriginal(); this.closest('.modal-overlay').remove();">
                            원본 복원
                        </button>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

export function applyPresetFilter(filterName) {
            const temp = document.createElement('canvas');
            temp.width = app.currentImage.width;
            temp.height = app.currentImage.height;
            const tempCtx = temp.getContext('2d');
            tempCtx.drawImage(app.currentImage, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, temp.width, temp.height);
            const d = imageData.data;
            
            if (filterName === 'grayscale') {
                for (let i = 0; i < d.length; i += 4) {
                    const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
                    d[i] = d[i+1] = d[i+2] = g;
                }
            } else if (filterName === 'sepia') {
                for (let i = 0; i < d.length; i += 4) {
                    const r = d[i], g = d[i+1], b = d[i+2];
                    d[i] = Math.min(255, r*0.393 + g*0.769 + b*0.189);
                    d[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
                    d[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
                }
            } else if (filterName === 'invert') {
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = 255 - d[i];
                    d[i+1] = 255 - d[i+1];
                    d[i+2] = 255 - d[i+2];
                }
            } else if (filterName === 'blur') {
                const copy = new Uint8ClampedArray(d);
                for (let y = 1; y < temp.height-1; y++) {
                    for (let x = 1; x < temp.width-1; x++) {
                        let r=0, g=0, b=0, cnt=0;
                        for (let dy=-1; dy<=1; dy++) {
                            for (let dx=-1; dx<=1; dx++) {
                                const i = ((y+dy)*temp.width + (x+dx))*4;
                                r += copy[i];
                                g += copy[i+1];
                                b += copy[i+2];
                                cnt++;
                            }
                        }
                        const i = (y*temp.width + x)*4;
                        d[i] = r/cnt;
                        d[i+1] = g/cnt;
                        d[i+2] = b/cnt;
                    }
                }
            } else if (filterName === 'sharpen') {
                applyConvolutionFilter(imageData, temp.width, temp.height, [0,-1,0,-1,5,-1,0,-1,0]);
            } else if (filterName === 'emboss') {
                applyConvolutionFilter(imageData, temp.width, temp.height, [-2,-1,0,-1,1,1,0,1,2]);
            } else if (filterName === 'edge') {
                applyConvolutionFilter(imageData, temp.width, temp.height, [-1,-1,-1,-1,8,-1,-1,-1,-1]);
            } else if (filterName === 'vignette') {
                const cx = temp.width/2, cy = temp.height/2;
                const maxD = Math.sqrt(cx*cx + cy*cy);
                for (let y = 0; y < temp.height; y++) {
                    for (let x = 0; x < temp.width; x++) {
                        const dx = x - cx, dy = y - cy;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        const f = 1 - (dist / maxD) * 0.7;
                        const i = (y*temp.width + x)*4;
                        d[i] *= f;
                        d[i+1] *= f;
                        d[i+2] *= f;
                    }
                }
            } else if (filterName === 'warm') {
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.min(255, d[i] * 1.1);
                    d[i+2] = Math.max(0, d[i+2] * 0.9);
                }
            } else if (filterName === 'cool') {
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.max(0, d[i] * 0.9);
                    d[i+2] = Math.min(255, d[i+2] * 1.1);
                }
            } else if (filterName === 'shadow') {
                // 그림자 효과 - 어두운 부분 더 어둡게
                for (let i = 0; i < d.length; i += 4) {
                    const gray = (d[i] + d[i+1] + d[i+2]) / 3;
                    if (gray < 128) {
                        d[i] *= 0.6;
                        d[i+1] *= 0.6;
                        d[i+2] *= 0.6;
                    }
                }
            } else if (filterName === 'watercolor') {
                // 수채화 효과 - 블러 + 채도 증가
                const blurKernel = [
                    1/16, 2/16, 1/16,
                    2/16, 4/16, 2/16,
                    1/16, 2/16, 1/16
                ];
                applyConvolutionFilter(imageData, temp.width, temp.height, blurKernel);
                // 채도 증가
                for (let i = 0; i < d.length; i += 4) {
                    const avg = (d[i] + d[i+1] + d[i+2]) / 3;
                    d[i] = Math.min(255, avg + (d[i] - avg) * 1.3);
                    d[i+1] = Math.min(255, avg + (d[i+1] - avg) * 1.3);
                    d[i+2] = Math.min(255, avg + (d[i+2] - avg) * 1.3);
                }
            } else if (filterName === 'sketch') {
                // 연필 스케치 - 가장자리 감지 + 흑백 반전
                const edgeKernel = [
                    -1, -1, -1,
                    -1,  8, -1,
                    -1, -1, -1
                ];
                applyConvolutionFilter(imageData, temp.width, temp.height, edgeKernel);
                // 흑백 변환 후 반전
                for (let i = 0; i < d.length; i += 4) {
                    const gray = (d[i] + d[i+1] + d[i+2]) / 3;
                    const inverted = 255 - gray;
                    d[i] = d[i+1] = d[i+2] = inverted;
                }
            } else if (filterName === 'oil') {
                // 유화 효과 - 색상 단순화
                const radius = 2;
                for (let y = radius; y < temp.height - radius; y++) {
                    for (let x = radius; x < temp.width - radius; x++) {
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let dy = -radius; dy <= radius; dy++) {
                            for (let dx = -radius; dx <= radius; dx++) {
                                const idx = ((y + dy) * temp.width + (x + dx)) * 4;
                                r += d[idx];
                                g += d[idx + 1];
                                b += d[idx + 2];
                                count++;
                            }
                        }
                        const idx = (y * temp.width + x) * 4;
                        d[idx] = r / count;
                        d[idx + 1] = g / count;
                        d[idx + 2] = b / count;
                    }
                }
            } else if (filterName === 'cartoon') {
                // 카툰 효과 - 색상 양자화 + 가장자리 강조
                const levels = 4;
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.floor(d[i] / (256 / levels)) * (256 / levels);
                    d[i+1] = Math.floor(d[i+1] / (256 / levels)) * (256 / levels);
                    d[i+2] = Math.floor(d[i+2] / (256 / levels)) * (256 / levels);
                }
            } else if (filterName === 'neon') {
                // 네온 효과 - 가장자리 + 밝은 색상
                const edgeKernel = [
                    -1, -1, -1,
                    -1,  8, -1,
                    -1, -1, -1
                ];
                applyConvolutionFilter(imageData, temp.width, temp.height, edgeKernel);
                // 색상 강조
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.min(255, d[i] * 1.5);
                    d[i+1] = Math.min(255, d[i+1] * 1.5);
                    d[i+2] = Math.min(255, d[i+2] * 1.5);
                }
            }
            
            tempCtx.putImageData(imageData, 0, 0);
            
            const newImg = new Image();
            newImg.onload = function() {
                app.currentImage = newImg;
                app.images[app.currentIndex].img = newImg.cloneNode();
                app.images[app.currentIndex].modified = true;  // 수정됨 표시
                renderCanvas();
                saveHistory();
            };
            newImg.src = temp.toDataURL();
        }

export function applyFilmEffect(type) {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            // 각 필름 타입에 따른 설정
            const effects = {
                // 기존 5개
                vintage: { brightness: -5, contrast: 10, saturation: -20, sharpness: 0 },
                classic: { brightness: 5, contrast: 15, saturation: -10, sharpness: 10 },
                warm: { brightness: 10, contrast: 5, saturation: 15, sharpness: 5 },
                cool: { brightness: -5, contrast: 10, saturation: -5, sharpness: 10 },
                faded: { brightness: 15, contrast: -15, saturation: -30, sharpness: 0 },
                // 새로운 5개
                retro: { brightness: 0, contrast: 20, saturation: -15, sharpness: 15 },
                noir: { brightness: -10, contrast: 30, saturation: -100, sharpness: 20 },
                pastel: { brightness: 20, contrast: -10, saturation: -20, sharpness: 0 },
                vivid: { brightness: 5, contrast: 20, saturation: 40, sharpness: 30 },
                soft: { brightness: 10, contrast: -20, saturation: -10, sharpness: 0 }
            };
            
            const effect = effects[type];
            if (effect) {
                app.filters.brightness = effect.brightness;
                app.filters.contrast = effect.contrast;
                app.filters.saturation = effect.saturation;
                app.filters.sharpness = effect.sharpness;
                
                document.getElementById('brightness').value = effect.brightness;
                document.getElementById('brightnessValue').textContent = effect.brightness;
                document.getElementById('contrast').value = effect.contrast;
                document.getElementById('contrastValue').textContent = effect.contrast;
                document.getElementById('saturation').value = effect.saturation;
                document.getElementById('saturationValue').textContent = effect.saturation;
                document.getElementById('sharpness').value = effect.sharpness;
                document.getElementById('sharpnessValue').textContent = effect.sharpness;
                
                renderCanvas();
                saveHistory();
            }
        }

export function updateFilters() {
            app.filters.brightness = parseInt((document.getElementById('brightness') as HTMLInputElement).value);
            app.filters.contrast   = parseInt((document.getElementById('contrast')   as HTMLInputElement).value);
            app.filters.saturation = parseInt((document.getElementById('saturation') as HTMLInputElement).value);
            app.filters.hue        = parseInt((document.getElementById('hue')        as HTMLInputElement).value);
            app.filters.sharpness  = parseInt((document.getElementById('sharpness')  as HTMLInputElement).value);

            const hueVal = app.filters.hue;
            (document.getElementById('brightnessValue') as HTMLElement).textContent = String(app.filters.brightness);
            (document.getElementById('contrastValue')   as HTMLElement).textContent = String(app.filters.contrast);
            (document.getElementById('saturationValue') as HTMLElement).textContent = String(app.filters.saturation);
            (document.getElementById('hueValue')        as HTMLElement).textContent = hueVal + '°';
            (document.getElementById('sharpnessValue')  as HTMLElement).textContent = String(app.filters.sharpness);

            renderCanvas();
        }

export function applyFilters(img) {
            const temp = document.createElement('canvas');
            temp.width = img.width;
            temp.height = img.height;
            const tempCtx = temp.getContext('2d');
            tempCtx.drawImage(img, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, temp.width, temp.height);
            const data = imageData.data;

            const b = app.filters.brightness * 2.55;
            const c = app.filters.contrast;
            const s = app.filters.saturation / 100;
            const h = (app.filters.hue || 0) / 180 * Math.PI;  // 색조를 라디안으로

            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let bl = data[i + 2];

                // 밝기
                r += b;
                g += b;
                bl += b;

                // 대비
                const cf = (259 * (c + 255)) / (255 * (259 - c));
                r = cf * (r - 128) + 128;
                g = cf * (g - 128) + 128;
                bl = cf * (bl - 128) + 128;

                // 채도
                const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
                r = gray + (1 + s) * (r - gray);
                g = gray + (1 + s) * (g - gray);
                bl = gray + (1 + s) * (bl - gray);
                
                // 색조 (간단한 회전 행렬 사용)
                if (h !== 0) {
                    const cosH = Math.cos(h);
                    const sinH = Math.sin(h);
                    const rr = r * (cosH + (1 - cosH) / 3) + g * ((1 - cosH) / 3 - sinH / Math.sqrt(3)) + bl * ((1 - cosH) / 3 + sinH / Math.sqrt(3));
                    const gg = r * ((1 - cosH) / 3 + sinH / Math.sqrt(3)) + g * (cosH + (1 - cosH) / 3) + bl * ((1 - cosH) / 3 - sinH / Math.sqrt(3));
                    const bb = r * ((1 - cosH) / 3 - sinH / Math.sqrt(3)) + g * ((1 - cosH) / 3 + sinH / Math.sqrt(3)) + bl * (cosH + (1 - cosH) / 3);
                    r = rr;
                    g = gg;
                    bl = bb;
                }

                data[i] = Math.max(0, Math.min(255, r));
                data[i + 1] = Math.max(0, Math.min(255, g));
                data[i + 2] = Math.max(0, Math.min(255, bl));
            }

            tempCtx.putImageData(imageData, 0, 0);
            return temp;
        }

export function updateInputFields() {
                const mode = resizeModeSelect.value;
                
                // 모두 활성화로 초기화
                widthInput.disabled = false;
                heightInput.disabled = false;
                widthInput.style.backgroundColor = '';
                heightInput.style.backgroundColor = '';
                
                if (mode === 'none') {
                    // 크기 조절 안 함 - 모두 비활성화
                    widthInput.disabled = true;
                    heightInput.disabled = true;
                    widthInput.style.backgroundColor = '#f0f0f0';
                    heightInput.style.backgroundColor = '#f0f0f0';
                } else if (mode === 'fit-width') {
                    // 너비에 맞추기 - 높이 비활성화
                    heightInput.disabled = true;
                    heightInput.style.backgroundColor = '#f0f0f0';
                    heightInput.value = '';
                } else if (mode === 'fit-height') {
                    // 높이에 맞추기 - 너비 비활성화
                    widthInput.disabled = true;
                    widthInput.style.backgroundColor = '#f0f0f0';
                    widthInput.value = '';
                }
                // 'exact'와 'fit-both'는 모두 활성화 상태 유지
            }

export function applyConvolutionFilter(imageData, w, h, kernel) {
            const d = imageData.data;
            const copy = new Uint8ClampedArray(d);
            
            for (let y = 1; y < h-1; y++) {
                for (let x = 1; x < w-1; x++) {
                    let r=0, g=0, b=0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const i = ((y+ky)*w + (x+kx))*4;
                            const k = kernel[(ky+1)*3 + (kx+1)];
                            r += copy[i] * k;
                            g += copy[i+1] * k;
                            b += copy[i+2] * k;
                        }
                    }
                    const i = (y*w + x)*4;
                    d[i] = Math.max(0, Math.min(255, r));
                    d[i+1] = Math.max(0, Math.min(255, g));
                    d[i+2] = Math.max(0, Math.min(255, b));
                }
            }
        }

export function sharpenImage() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            // 선명도와 대비 증가
            app.filters.sharpness = 50;
            app.filters.contrast = 10;
            
            document.getElementById('sharpness').value = 50;
            document.getElementById('sharpnessValue').textContent = '50';
            document.getElementById('contrast').value = 10;
            document.getElementById('contrastValue').textContent = '10';
            
            renderCanvas();
            saveHistory();
        }

// ── 필터/상태 전체 초기화 (내부 헬퍼) ─────────────────────────
function resetStateLocal(): void {
    app.zoom = 1;
    app.pan  = { x: 0, y: 0 };
    app.rotation = 0;
    app.filters = defaultFilters();
    const sliders: Array<[string, string, string]> = [
        ['brightness', '0', '0'],
        ['contrast',   '0', '0'],
        ['saturation', '0', '0'],
        ['hue',        '0', '0°'],
        ['sharpness',  '0', '0'],
    ];
    sliders.forEach(([id, val, label]) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        const vl = document.getElementById(`${id}Value`);
        if (el) el.value = val;
        if (vl) vl.textContent = label;
    });
}

export function resetToOriginal() {
    if (!app.originalImage) return;
    app.currentImage = (app.originalImage as HTMLImageElement).cloneNode() as HTMLImageElement;
    if (app.currentIndex !== null && app.images[app.currentIndex]) {
        app.images[app.currentIndex].img = (app.currentImage as HTMLImageElement).cloneNode() as HTMLImageElement;
    }
    resetStateLocal();
    renderCanvas();
    saveHistory();
}

// ── 자동 보정 함수들 ──────────────────────────────────────────
export function autoLevel() {
    if (!app.currentImage) { alert('이미지를 먼저 열어주세요.'); return; }
    app.filters.brightness = 10;
    app.filters.contrast   = 15;
    (document.getElementById('brightness') as HTMLInputElement).value = '10';
    (document.getElementById('brightnessValue') as HTMLElement).textContent = '10';
    (document.getElementById('contrast') as HTMLInputElement).value = '15';
    (document.getElementById('contrastValue') as HTMLElement).textContent = '15';
    renderCanvas();
    saveHistory();
}

export function backlightCorrection() {
    if (!app.currentImage) { alert('이미지를 먼저 열어주세요.'); return; }
    app.filters.brightness = 25;
    app.filters.contrast   = -10;
    (document.getElementById('brightness') as HTMLInputElement).value = '25';
    (document.getElementById('brightnessValue') as HTMLElement).textContent = '25';
    (document.getElementById('contrast') as HTMLInputElement).value = '-10';
    (document.getElementById('contrastValue') as HTMLElement).textContent = '-10';
    renderCanvas();
    saveHistory();
}

export function autoColor() {
    if (!app.currentImage) { alert('이미지를 먼저 열어주세요.'); return; }
    app.filters.saturation = 20;
    app.filters.contrast   = 10;
    (document.getElementById('saturation') as HTMLInputElement).value = '20';
    (document.getElementById('saturationValue') as HTMLElement).textContent = '20';
    (document.getElementById('contrast') as HTMLInputElement).value = '10';
    (document.getElementById('contrastValue') as HTMLElement).textContent = '10';
    renderCanvas();
    saveHistory();
}

export function reduceNoise() {
    if (!app.currentImage) { alert('이미지를 먼저 열어주세요.'); return; }
    app.filters.sharpness = 0;
    app.filters.contrast  = -5;
    (document.getElementById('sharpness') as HTMLInputElement).value = '0';
    (document.getElementById('sharpnessValue') as HTMLElement).textContent = '0';
    (document.getElementById('contrast') as HTMLInputElement).value = '-5';
    (document.getElementById('contrastValue') as HTMLElement).textContent = '-5';
    renderCanvas();
    saveHistory();
}

export function resetEditFilters() {
    if (!app.currentImage) return;
    app.filters.rotateAngle = 0;
    const rotateEl = document.getElementById('rotateAngle') as HTMLInputElement | null;
    const rotateValEl = document.getElementById('rotateAngleValue');
    if (rotateEl) rotateEl.value = '0';
    if (rotateValEl) rotateValEl.textContent = '0°';
    renderCanvas();
}

export function applyEditResize() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            const widthInput = document.getElementById('editResizeWidth');
            const heightInput = document.getElementById('editResizeHeight');
            
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            
            if (!width || !height || width < 1 || height < 1 || width > 10000 || height > 10000) {
                alert('유효한 크기를 입력해주세요. (1~10000)');
                return;
            }
            
            // 임시 캔버스에서 리사이즈
            const temp = document.createElement('canvas');
            temp.width = width;
            temp.height = height;
            const tempCtx = temp.getContext('2d');
            tempCtx.drawImage(app.currentImage, 0, 0, width, height);
            
            const newImg = new Image();
            newImg.onload = () => {
                app.currentImage = newImg;
                
                // images 배열도 업데이트
                if (app.currentIndex !== null && app.images[app.currentIndex]) {
                    app.images[app.currentIndex].img = newImg.cloneNode();
                    app.images[app.currentIndex].width = newImg.width;
                    app.images[app.currentIndex].height = newImg.height;
                    app.images[app.currentIndex].modified = true;
                }
                
                // 입력 필드 업데이트
                widthInput.value = width;
                heightInput.value = height;
                
                // 화면 업데이트
                resetStateLocal();
                fitToScreen();
                renderCanvas();
                updateStatus();
                saveHistory();
                
                console.log('크기 조절 완료:', width, 'x', height);
            };
            
            newImg.src = temp.toDataURL();
        }

export function quickResizeEdit(scale) {
            if (!app.currentImage) return;
            
            const w = Math.round(app.currentImage.width * scale);
            const h = Math.round(app.currentImage.height * scale);
            
            const widthInput = document.getElementById('editResizeWidth');
            const heightInput = document.getElementById('editResizeHeight');
            
            if (widthInput && heightInput) {
                widthInput.value = w;
                heightInput.value = h;
            }
        }

export function showCanvasSizeDialog() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content" style="width: 500px;">
                    <div class="modal-title">
                        <span>🖼️ 캔버스 크기 확대</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 11px; color: #666; margin-bottom: 12px;">
                            현재 이미지: ${app.currentImage.width} × ${app.currentImage.height} px
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <label style="font-size: 11px; display: block; margin-bottom: 4px;">캔버스 너비 (px)</label>
                                <input type="number" id="canvasWidth" value="${app.currentImage.width}" min="${app.currentImage.width}"
                                    style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                                <label style="font-size: 10px; color: #666; display: block; margin-top: 4px;">+ 추가 (px)</label>
                                <input type="number" id="canvasWidthAdd" value="0" min="0"
                                    style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;"
                                    oninput="updateCanvasSize()">
                            </div>
                            <div>
                                <label style="font-size: 11px; display: block; margin-bottom: 4px;">캔버스 높이 (px)</label>
                                <input type="number" id="canvasHeight" value="${app.currentImage.height}" min="${app.currentImage.height}"
                                    style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                                <label style="font-size: 10px; color: #666; display: block; margin-top: 4px;">+ 추가 (px)</label>
                                <input type="number" id="canvasHeightAdd" value="0" min="0"
                                    style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;"
                                    oninput="updateCanvasSize()">
                            </div>
                        </div>
                        
                        <script>
                            const originalWidth = ${app.currentImage.width};
                            const originalHeight = ${app.currentImage.height};
                            
                            function updateCanvasSize() {
                                const addW = parseInt(document.getElementById('canvasWidthAdd').value) || 0;
                                const addH = parseInt(document.getElementById('canvasHeightAdd').value) || 0;
                                document.getElementById('canvasWidth').value = originalWidth + addW;
                                document.getElementById('canvasHeight').value = originalHeight + addH;
                            }
                        <\/script>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 11px; display: block; margin-bottom: 4px;">이미지 위치</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                                <button class="btn-small" onclick="setCanvasAlign('tl')">↖ 좌상</button>
                                <button class="btn-small" onclick="setCanvasAlign('tc')">↑ 상</button>
                                <button class="btn-small" onclick="setCanvasAlign('tr')">↗ 우상</button>
                                <button class="btn-small" onclick="setCanvasAlign('ml')">← 좌</button>
                                <button class="btn-small" onclick="setCanvasAlign('mc')" style="background: #0078d7; color: white;">● 중앙</button>
                                <button class="btn-small" onclick="setCanvasAlign('mr')">→ 우</button>
                                <button class="btn-small" onclick="setCanvasAlign('bl')">↙ 좌하</button>
                                <button class="btn-small" onclick="setCanvasAlign('bc')">↓ 하</button>
                                <button class="btn-small" onclick="setCanvasAlign('br')">↘ 우하</button>
                            </div>
                            <input type="hidden" id="canvasAlign" value="mc">
                        </div>
                        
                        <div>
                            <label style="font-size: 11px; display: block; margin-bottom: 4px;">배경색</label>
                            <input type="color" id="canvasBg" value="#ffffff" style="width: 100%; height: 35px; border: 1px solid #c0c0c0;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="performCanvasResize()">적용</button>
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">취소</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

export function updateCanvasSize() {
                                const addW = parseInt(document.getElementById('canvasWidthAdd').value) || 0;
                                const addH = parseInt(document.getElementById('canvasHeightAdd').value) || 0;
                                document.getElementById('canvasWidth').value = originalWidth + addW;
                                document.getElementById('canvasHeight').value = originalHeight + addH;
                            }

export function setCanvasAlign(align) {
            document.getElementById('canvasAlign').value = align;
            document.querySelectorAll('.modal-content .btn-small').forEach(btn => {
                btn.style.background = '';
                btn.style.color = '';
            });
            event.target.style.background = '#0078d7';
            event.target.style.color = 'white';
        }

export function applyResize() {
            showResizeDialog();
        }

export function updateImageSizeDisplay() {
            const sizeDisplay = document.getElementById('imageSizeDisplay');
            
            if (!app.currentImage || !sizeDisplay) return;
            
            sizeDisplay.textContent = `${app.currentImage.width} × ${app.currentImage.height} px`;
            sizeDisplay.style.display = 'block';
        }

export function showResizeDialog() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content" style="width: 450px;">
                    <div class="modal-title">
                        <span>📏 이미지 크기 조절</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 11px; color: #666; margin-bottom: 12px;">
                            현재 크기: ${app.currentImage.width} × ${app.currentImage.height} px
                        </p>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 8px;">
                                <input type="checkbox" id="keepRatio" checked>
                                <span>비율 유지</span>
                            </label>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="font-size: 11px; display: block; margin-bottom: 4px;">너비 (px)</label>
                                <input type="number" id="resizeWidth" value="${app.currentImage.width}" min="1" max="10000"
                                    style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                            </div>
                            <div>
                                <label style="font-size: 11px; display: block; margin-bottom: 4px;">높이 (px)</label>
                                <input type="number" id="resizeHeight" value="${app.currentImage.height}" min="1" max="10000"
                                    style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                            </div>
                        </div>
                        
                        <div style="margin-top: 12px;">
                            <label style="font-size: 11px; display: block; margin-bottom: 4px;">빠른 선택</label>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                                <button class="btn-small" onclick="quickResize(0.5)">50%</button>
                                <button class="btn-small" onclick="quickResize(0.75)">75%</button>
                                <button class="btn-small" onclick="quickResize(1.5)">150%</button>
                                <button class="btn-small" onclick="quickResize(2)">200%</button>
                                <button class="btn-small" onclick="quickResize(3)">300%</button>
                                <button class="btn-small" onclick="quickResize(0.25)">25%</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="performResize()">적용</button>
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">취소</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const widthInput = document.getElementById('resizeWidth');
            const heightInput = document.getElementById('resizeHeight');
            const keepRatio = document.getElementById('keepRatio');
            const ratio = app.currentImage.width / app.currentImage.height;
            
            widthInput.addEventListener('input', () => {
                if (keepRatio.checked) {
                    heightInput.value = Math.round(widthInput.value / ratio);
                }
            });
            
            heightInput.addEventListener('input', () => {
                if (keepRatio.checked) {
                    widthInput.value = Math.round(heightInput.value * ratio);
                }
            });
        }

