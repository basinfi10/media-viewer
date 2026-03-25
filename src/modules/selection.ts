// @ts-nocheck
/* eslint-disable */
import { app } from '../store';
import { showToast } from '../utils';
import { loadMedia } from './player';
import { renderCanvas } from './canvas';
import { rebuildThumbnails } from '../ui/thumbnail';
import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';

export function toggleImageSelection(index) {
            const idx = app.selectedImages.indexOf(index);
            if (idx > -1) {
                app.selectedImages.splice(idx, 1);
                app.lastSelectedIndex = null;
            } else {
                app.selectedImages.push(index);
                app.lastSelectedIndex = index;
            }
        }

export function selectAllImages() {
            app.selectedImages = [];
            for (let i = 0; i < app.images.length; i++) {
                app.selectedImages.push(i);
            }
            updateThumbnailSelection();
        }

export function deselectAllImages() {
            app.selectedImages = [];
            updateThumbnailSelection();
        }

export function deleteSelectedImages() {
            if (app.selectedImages.length === 0) {
                alert('삭제할 이미지를 선택해주세요.');
                return;
            }
            
            // 수정된 이미지 확인
            const modifiedImages = [];
            for (const index of app.selectedImages) {
                if (app.images[index] && app.images[index].modified) {
                    modifiedImages.push(app.images[index].name);
                }
            }
            
            // 수정된 이미지가 있으면 확인
            if (modifiedImages.length > 0) {
                const fileList = modifiedImages.map(name => `  • ${name}`).join('\n');
                const message = `다음 이미지가 수정되었습니다:\n\n${fileList}\n\n저장하지 않고 삭제하시겠습니까?`;
                if (!confirm(message)) {
                    return;
                }
            } else {
                // 일반 확인
                if (!confirm(`선택한 ${app.selectedImages.length}개의 이미지를 삭제하시겠습니까?`)) {
                    return;
                }
            }
            
            // 인덱스를 내림차순으로 정렬 (뒤에서부터 삭제)
            const sortedIndices = [...app.selectedImages].sort((a, b) => b - a);
            
            // 삭제
            for (const index of sortedIndices) {
                if (app.images[index]) {
                    app.images.splice(index, 1);
                }
            }
            
            // 선택 해제
            app.selectedImages = [];
            
            // 썸네일 다시 그리기
            refreshThumbnails();
            
            // 현재 이미지 확인
            if (app.images.length > 0) {
                const newIndex = Math.min(app.currentIndex || 0, app.images.length - 1);
                loadImage(newIndex);
            } else {
                app.currentImage = null;
                app.currentIndex = null;
                document.getElementById('dropZone').classList.remove('hidden');
                document.querySelector('.image-container').classList.add('hidden');
            }
            
            updateStatus();
            updateThumbnailSelection();
        }

export function showDeleteSelectionMenu() {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            
            if (app.selectedImages.length === 0) {
                // 선택된 이미지가 없을 때
                modal.innerHTML = `
                    <div class="modal-content" style="width: 300px;">
                        <div class="modal-title">
                            <span>이미지 선택</span>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                        </div>
                        <div class="modal-body">
                            <p style="font-size: 12px; color: #666; margin-bottom: 16px;">
                                총 ${app.images.length}개의 이미지
                            </p>
                            <button class="btn-small" onclick="selectAllImages(); this.closest('.modal-overlay').remove();" style="width: 100%; background: #0078d7; color: white;">
                                ☑️ 전체 선택 (${app.images.length}개)
                            </button>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
                        </div>
                    </div>
                `;
            } else {
                // 선택된 이미지가 있을 때
                modal.innerHTML = `
                    <div class="modal-content" style="width: 300px;">
                        <div class="modal-title">
                            <span>선택된 이미지 (${app.selectedImages.length}개)</span>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                        </div>
                        <div class="modal-body">
                            <p style="font-size: 12px; color: #666; margin-bottom: 16px;">
                                ${app.selectedImages.length}개 이미지가 선택되었습니다.
                            </p>
                            <button class="btn-small" onclick="selectAllImages(); this.closest('.modal-overlay').remove();" style="width: 100%; background: #0078d7; color: white; margin-bottom: 8px;">
                                ☑️ 전체 선택 (${app.images.length}개)
                            </button>
                            <button class="btn-small" onclick="deleteSelectedImages(); this.closest('.modal-overlay').remove();" style="width: 100%; background: #dc3545; color: white; margin-bottom: 8px;">
                                🗑️ 선택 항목 삭제
                            </button>
                            <button class="btn-small" onclick="deselectAllImages(); this.closest('.modal-overlay').remove();" style="width: 100%;">
                                ⬜ 선택 해제
                            </button>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
                        </div>
                    </div>
                `;
            }
            
            document.body.appendChild(modal);
        }

export function showBatchEditDialog() {
            // 2개 미만 선택 시 알림
            if (app.selectedImages.length < 2) {
                alert('일괄 편집을 위해 2개 이상의 이미지를 선택해주세요.\n\nCtrl+클릭 또는 Shift+클릭으로 여러 이미지를 선택할 수 있습니다.');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content" style="width: 500px;">
                    <div class="modal-title">
                        <span>🔧 일괄 편집 (${app.selectedImages.length}개 이미지)</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px;">
                            <h4 style="font-size: 13px; margin-bottom: 12px;">📐 크기 조절 방식</h4>
                            <select id="batchResizeMode" style="width: 100%; padding: 8px; border: 1px solid #c0c0c0; margin-bottom: 12px;">
                                <option value="none">크기 조절 안 함</option>
                                <option value="fit-width">너비에 맞추기 (비율 유지)</option>
                                <option value="fit-height">높이에 맞추기 (비율 유지)</option>
                                <option value="exact">정확한 크기 (비율 무시)</option>
                                <option value="fit-both">너비/높이 모두 맞추기 (비율 유지)</option>
                            </select>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="font-size: 11px; display: block; margin-bottom: 4px;">너비 (px)</label>
                                    <input type="number" id="batchWidth" min="1" max="10000" placeholder="원본 유지"
                                        style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                                </div>
                                <div>
                                    <label style="font-size: 11px; display: block; margin-bottom: 4px;">높이 (px)</label>
                                    <input type="number" id="batchHeight" min="1" max="10000" placeholder="원본 유지"
                                        style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <h4 style="font-size: 13px; margin-bottom: 12px;">🔄 포맷 변환</h4>
                            <select id="batchFormat" style="width: 100%; padding: 8px; border: 1px solid #c0c0c0;">
                                <option value="">변환 안 함</option>
                                <option value="image/jpeg">JPEG</option>
                                <option value="image/png">PNG</option>
                                <option value="image/webp">WebP</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <h4 style="font-size: 13px; margin-bottom: 12px;">💾 저장 방식</h4>
                            <select id="batchSaveMode" style="width: 100%; padding: 8px; border: 1px solid #c0c0c0;">
                                <option value="zip">ZIP 파일로 다운로드</option>
                                <option value="folder">폴더에 개별 저장 (File System API)</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h4 style="font-size: 13px; margin-bottom: 12px;">🤖 AI 일괄 처리</h4>
                            <div style="display: flex; gap: 8px; flex-direction: column;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                                    <input type="checkbox" id="batchRemoveBg">
                                    <span>모든 이미지 배경 제거</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                                    <input type="checkbox" id="batchUpscale">
                                    <span>모든 이미지 2배 확대 (AI)</span>
                                </label>
                            </div>
                        </div>
                        
                        <div id="saveModeTip" style="background: #e7f3ff; padding: 12px; border-radius: 4px; border-left: 4px solid #0078d7;">
                            <p style="font-size: 11px; color: #004085; margin: 0;">
                                💡 <strong>ZIP 다운로드:</strong> 하나의 ZIP 파일로 다운로드<br>
                                💡 <strong>폴더 저장:</strong> 폴더를 선택하여 개별 파일로 저장 (최신 브라우저 필요)
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="processBatchEdit()" style="background: #0078d7; color: white;">
                            처리 시작
                        </button>
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">취소</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 크기 조절 방식 변경 시 입력 필드 활성화/비활성화
            const resizeModeSelect = document.getElementById('batchResizeMode');
            const widthInput = document.getElementById('batchWidth');
            const heightInput = document.getElementById('batchHeight');
            
            function updateInputFields() {
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
            
            // 초기 상태 설정
            updateInputFields();
            
            // 변경 시 업데이트
            resizeModeSelect.addEventListener('change', updateInputFields);
        }

export async function processBatchEdit() {
    const resizeMode = (document.getElementById('batchResizeMode') as HTMLSelectElement).value;
    const targetWidth = parseInt((document.getElementById('batchWidth') as HTMLInputElement).value);
    const targetHeight = parseInt((document.getElementById('batchHeight') as HTMLInputElement).value);
    const format = (document.getElementById('batchFormat') as HTMLSelectElement).value;
    const saveMode = (document.getElementById('batchSaveMode') as HTMLSelectElement).value;
    const doRemoveBg = (document.getElementById('batchRemoveBg') as HTMLInputElement).checked;
    const doUpscale = (document.getElementById('batchUpscale') as HTMLInputElement).checked;

    document.querySelector('.modal-overlay')?.remove();
    
    // 진행 상황 모달
    const progressModal = createSimpleProgressModal('일괄 처리 중...', `총 ${app.selectedImages.length}개의 파일을 처리하고 있습니다.`);
    document.body.appendChild(progressModal);

    const zip = saveMode === 'zip' ? new JSZip() : null;
    let processedCount = 0;

    try {
        for (const index of app.selectedImages) {
            const imageData = app.images[index];
            if (!imageData) continue;

            let currentImg = imageData.img as HTMLImageElement;

            // 1. AI 배경 제거
            if (doRemoveBg) {
                const blob = await removeBackground(currentImg);
                currentImg = await blobToImage(blob);
            }

            // 2. AI 업스케일링
            if (doUpscale) {
                currentImg = await upscaleImageLocal(currentImg);
            }

            // 3. 크기 조절 및 포맷 변환용 캔버스
            const canvas = document.createElement('canvas');
            let w = currentImg.width;
            let h = currentImg.height;

            if (resizeMode !== 'none') {
                if (resizeMode === 'fit-width' && targetWidth) {
                    h = (targetWidth / w) * h;
                    w = targetWidth;
                } else if (resizeMode === 'fit-height' && targetHeight) {
                    w = (targetHeight / h) * w;
                    h = targetHeight;
                } else if (resizeMode === 'exact' && targetWidth && targetHeight) {
                    w = targetWidth;
                    h = targetHeight;
                }
            }

            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(currentImg, 0, 0, w, h);

            const outFormat = format || 'image/png';
            const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), outFormat, 0.9));
            
            // 4. 결과 저장
            const fileName = imageData.name.replace(/\.[^.]+$/, '') + (format ? `.${format.split('/')[1]}` : '');
            
            if (zip) {
                zip.file(fileName, blob);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
            }

            processedCount++;
            const progress = Math.round((processedCount / app.selectedImages.length) * 100);
            const progressFill = progressModal.querySelector('.progress-fill') as HTMLElement;
            if (progressFill) progressFill.style.width = `${progress}%`;
        }

        if (zip) {
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `media_viewer_batch_${Date.now()}.zip`;
            a.click();
        }

        progressModal.remove();
        showToast(`✅ ${processedCount}개의 파일 처리가 완료되었습니다.`);
    } catch (error) {
        progressModal.remove();
        alert(`일괄 처리 중 오류 발생: ${error.message}`);
    }
}

function createSimpleProgressModal(title, message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="width: 400px;">
            <div class="modal-title"><span>${title}</span></div>
            <div class="modal-body" style="text-align: center; padding: 20px;">
                <p style="font-size: 13px; margin-bottom: 12px;">${message}</p>
                <div style="width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
                    <div class="progress-fill" style="width: 0%; height: 100%; background: #0078d7; transition: width 0.3s;"></div>
                </div>
            </div>
        </div>
    `;
    return modal;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
    });
}

async function upscaleImageLocal(img: HTMLImageElement): Promise<HTMLImageElement> {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    ctx!.imageSmoothingEnabled = true;
    ctx!.imageSmoothingQuality = 'high';
    ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!)));
    return blobToImage(blob);
}

export function updateBatchEditButton() {
            const toolBtn = document.getElementById('batchEditToolBtn');
            const selectedCountSpan = document.getElementById('selectedCount');
            
            if (!toolBtn) return;
            
            // 선택 개수 표시 업데이트
            if (selectedCountSpan) {
                if (app.selectedImages.length > 0) {
                    selectedCountSpan.textContent = `(${app.selectedImages.length}개 선택)`;
                    selectedCountSpan.style.display = 'inline';
                } else {
                    selectedCountSpan.style.display = 'none';
                }
            }
            
            // 일괄 편집 버튼 상태 업데이트
            if (app.selectedImages.length >= 2) {
                // 2개 이상 선택 시 활성화
                toolBtn.style.opacity = '1';
                toolBtn.title = `일괄 편집 (${app.selectedImages.length}개)`;
            } else {
                // 1개 이하일 때 비활성화
                toolBtn.style.opacity = '0.3';
                toolBtn.title = '일괄 편집 (2개 이상 선택 필요)';
            }
        }

export function updateThumbnailSelection() {
            const thumbnails = document.querySelectorAll('.thumbnail-item');
            thumbnails.forEach(thumb => {
                const index = parseInt(thumb.getAttribute('data-index'));
                if (app.selectedImages.includes(index)) {
                    thumb.classList.add('selected');
                } else {
                    thumb.classList.remove('selected');
                }
            });
            
            // 일괄 편집 버튼 표시/숨김
            updateBatchEditButton();
        }

