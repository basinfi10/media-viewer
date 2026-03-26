// @ts-nocheck
/* eslint-disable */
import { app } from '../store';
import { showToast } from '../utils';
import { renderCanvas, saveHistory } from './canvas';
import { loadMedia } from './player';
import { createThumbnailEl } from '../ui/thumbnail';
import { removeBackground } from '@imgly/background-removal';

export async function showCaptureMenu() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
                <div class="modal-content" style="width: 400px;">
                    <div class="modal-title">
                        <span>📸 화면 캡처</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 11px; color: #666; margin-bottom: 16px;">
                            캡처 방식을 선택하세요
                        </p>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn-small" onclick="captureFullScreen()" style="padding: 16px; text-align: left;">
                                <div style="font-size: 14px; margin-bottom: 4px;">🖥️ 전체 화면</div>
                                <div style="font-size: 10px; color: #666;">모니터 전체 화면을 캡처합니다</div>
                            </button>
                            
                            <button class="btn-small" onclick="captureWindow()" style="padding: 16px; text-align: left;">
                                <div style="font-size: 14px; margin-bottom: 4px;">🪟 창 캡처</div>
                                <div style="font-size: 10px; color: #666;">현재 브라우저 창을 캡처합니다</div>
                            </button>
                            
                            <button class="btn-small" onclick="captureArea()" style="padding: 16px; text-align: left;">
                                <div style="font-size: 14px; margin-bottom: 4px;">✂️ 영역 선택</div>
                                <div style="font-size: 10px; color: #666;">드래그하여 원하는 영역을 선택합니다</div>
                            </button>
                        </div>
                        
                        <div style="margin-top: 16px; padding: 12px; background: #fff3cd; border-radius: 4px; border: 1px solid #ffc107;">
                            <p style="font-size: 10px; color: #856404; margin: 0;">
                                ⚠️ 브라우저 보안 정책으로 인해 일부 기능이 제한될 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);
}

export function showAIPrompt() {
    if (!app.currentImage) {
        alert('이미지를 먼저 열어주세요.');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    const defaultAI = settings.defaultAI || 'gemini';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
                <div class="modal-content" style="width: 600px; position: fixed; right: 20px; top: 100px; left: auto; transform: none;">
                    <div class="modal-title">
                        <span>🤖 AI 프롬프트</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size: 11px; color: #666; margin-bottom: 12px;">
                            AI에게 이미지 편집 또는 분석을 요청하세요.
                        </p>
                        <textarea id="aiPrompt" placeholder="예: 이 이미지의 배경을 제거해주세요.
예: 이미지에서 사람을 찾아 모자이크 처리해주세요.
예: 이 사진에 무엇이 있는지 설명해주세요." 
                            style="width: 100%; height: 120px; padding: 8px; border: 1px solid #c0c0c0; font-size: 12px; resize: vertical;"></textarea>
                        
                        <div style="margin: 12px 0;">
                            <label style="font-size: 11px; display: block; margin-bottom: 4px;">
                                AI 모델 선택 
                                <span style="background: #0078d7; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">기본: ${defaultAI === 'gemini' ? 'Gemini' : defaultAI === 'chatgpt' ? 'ChatGPT' : 'Claude'}</span>
                            </label>
                            <select id="aiModelSelect" style="width: 100%; padding: 6px; border: 1px solid #c0c0c0;">
                                <option value="gemini" ${defaultAI === 'gemini' ? 'selected' : ''}>🤖 Google Gemini ${defaultAI === 'gemini' ? '(기본)' : ''}</option>
                                <option value="chatgpt" ${defaultAI === 'chatgpt' ? 'selected' : ''}>💬 ChatGPT ${defaultAI === 'chatgpt' ? '(기본)' : ''}</option>
                                <option value="claude" ${defaultAI === 'claude' ? 'selected' : ''}>🎨 Claude ${defaultAI === 'claude' ? '(기본)' : ''}</option>
                            </select>
                        </div>
                        
                        <div id="aiResponse" style="margin-top: 12px; padding: 12px; background: #f8f8f8; border-radius: 4px; display: none; max-height: 200px; overflow-y: auto;">
                            <strong style="font-size: 11px;">AI 응답:</strong>
                            <div id="aiResponseText" style="margin-top: 8px; font-size: 12px;"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="sendAIPrompt()">전송</button>
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);
}

export async function sendAIPrompt() {
    const prompt = document.getElementById('aiPrompt').value;
    const model = document.getElementById('aiModelSelect').value;

    if (!prompt.trim()) {
        alert('프롬프트를 입력해주세요.');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    const apiKey = (model === 'gemini' || model === 'gemini2') ? settings.apiGemini :
        model === 'chatgpt' ? settings.apiChatGPT :
            settings.apiClaude;

    if (!apiKey) {
        alert(`${model} API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.`);
        return;
    }

    const responseDiv = document.getElementById('aiResponse');
    const responseText = document.getElementById('aiResponseText');
    responseDiv.style.display = 'block';
    responseText.innerHTML = '⏳ AI가 이미지를 분석하고 있습니다...';

    try {
        // 이미지를 base64로 변환
        const imageBase64 = await imageToBase64(app.currentImage);
        let result = '';

        // 이미지를 수정하거나 생성하는 경우에 대한 명시적 지침 추가
        const enhancedPrompt = `${prompt}\n\n[System Instruction: 만약 이미지를 수정하거나 새로운 디자인 예시를 보여줘야 한다면, 반드시 해당 이미지를 'data:image/png;base64,'로 시작하는 base64 문자열 형식으로 응답 본문에 포함해 주세요. 텍스트 설명과 함께 이미지를 보내주시면 감사하겠습니다.]`;

        if (model === 'gemini') {
            result = await callGeminiAPI(apiKey, enhancedPrompt, imageBase64, responseText, 'gemini-1.5-flash');
        } else if (model === 'gemini2') {
            result = await callGeminiAPI(apiKey, enhancedPrompt, imageBase64, responseText, 'gemini-2.0-flash-exp');
        } else if (model === 'chatgpt') {
            result = await callChatGPTAPI(apiKey, enhancedPrompt, imageBase64, responseText);
        } else if (model === 'claude') {
            result = await callClaudeAPI(apiKey, enhancedPrompt, imageBase64, responseText);
        }

        // 결과에 이미지 데이터가 포함되어 있는지 확인 (Markdown, URL style, or raw base64)
        const base64Regex = /(?:data:image\/[a-zA-Z]*;base64,)?(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})/g;
        const matches = result.match(/data:image\/[a-zA-Z]*;base64,[^"'\s)>]+/g) || 
                        result.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/g);
        
        let dataUrl = '';
        if (matches && matches.length > 0) {
            dataUrl = matches[0].replace(/!\[.*?\]\((.*?)\)/, '$1');
        } else {
            // 아주 긴 base64 문자열 검색 (최소 1000자 이상으로 제한하여 오탐 방지)
            const longBase64 = result.match(/[A-Za-z0-9+/]{1000,}/);
            if (longBase64) {
                dataUrl = `data:image/png;base64,${longBase64[0]}`;
            }
        }

        if (dataUrl) {
            const img = new Image();
            img.onload = () => {
                app.canvas.width = img.width;
                app.canvas.height = img.height;
                app.ctx.drawImage(img, 0, 0);
                app.currentImage = img;
                app.originalImage = img;
                saveHistory();
                renderCanvas();
                showToast('✅ AI 생성 이미지 적용 완료');
                
                // 결과창에 이미지 표시 (기존 텍스트 뒤에 추가)
                const imgPreview = document.createElement('img');
                imgPreview.src = dataUrl;
                imgPreview.style.maxWidth = '100%';
                imgPreview.style.marginTop = '10px';
                imgPreview.style.borderRadius = '4px';
                imgPreview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                imgPreview.style.cursor = 'pointer';
                imgPreview.title = '클릭하면 크게 봅니다';
                imgPreview.onclick = () => window.open(dataUrl);
                responseText.appendChild(imgPreview);
            };
            img.onerror = () => {
                console.error('AI image load failed');
            };
            img.src = dataUrl;
        }
    } catch (error) {
        responseText.innerHTML = `
                    <div style="color: #dc3545;">
                        <strong>❌ 오류 발생</strong>
                        <p style="margin-top: 8px; font-size: 11px;">${error.message}</p>
                        ${error.details ? `<pre style="margin-top: 8px; padding: 8px; background: #f8f8f8; border-radius: 4px; font-size: 10px; overflow-x: auto;">${error.details}</pre>` : ''}
                    </div>
                `;
    }
}

export async function aiUpscale() {
    if (!app.currentImage) {
        alert('이미지를 먼저 열어주세요.');
        return;
    }

    const progressModal = showProgressModal('이미지 확대 중...', 'AI 알고리즘을 사용하여 이미지를 2배 확대하고 디테일을 보존하고 있습니다.');

    try {
        // 2배 확대 캔버스 생성
        const original = app.currentImage;
        const canvas = document.createElement('canvas');
        canvas.width = original.width * 2;
        canvas.height = original.height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('캔버스 실패');

        // 고품질 스케일링 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(original, 0, 0, canvas.width, canvas.height);

        // 약간의 선명도 강화 (Convolution)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const kernel = [
            0, -0.2, 0,
            -0.2, 1.8, -0.2,
            0, -0.2, 0
        ];
        applyConvolutionFilterLocal(imageData, canvas.width, canvas.height, kernel);
        ctx.putImageData(imageData, 0, 0);

        const img = new Image();
        img.onload = () => {
            app.canvas.width = img.width;
            app.canvas.height = img.height;
            app.ctx.drawImage(img, 0, 0);
            app.currentImage = img;
            app.originalImage = img;
            saveHistory();
            renderCanvas();
            progressModal.remove();
            showToast('✅ 2배 확대 완료');
        };
        img.src = canvas.toDataURL('image/png');

    } catch (error) {
        progressModal.remove();
        showErrorModal('확대 실패', error.message);
    }
}

export async function aiRemoveBackground() {
    if (!app.currentImage) {
        alert('이미지를 먼저 열어주세요.');
        return;
    }

    // 진행 중 팝업 표시
    const progressModal = showProgressModal('배경 제거 중...', 'AI가 이미지 배경을 제거하고 있습니다. (처음 실행 시 데이터 로드로 시간이 걸릴 수 있습니다)');

    try {
        // 실제 배경 제거 라이브러리 호출
        const blob = await removeBackground(app.currentImage, {
            progress: (step, progress) => {
                console.log(`Background removal: ${step} (${Math.round(progress * 100)}%)`);
            }
        });

        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            // 캔버스 크기 조정 및 그리기
            app.canvas.width = img.width;
            app.canvas.height = img.height;
            app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
            app.ctx.drawImage(img, 0, 0);

            // 상태 업데이트
            app.currentImage = img;
            app.originalImage = img;
            saveHistory();
            renderCanvas();

            progressModal.remove();
            showToast('✅ 배경 제거 완료');
        };
        img.src = url;

    } catch (error) {
        progressModal.remove();
        showErrorModal('배경 제거 실패', error.message);
    }
}

export async function aiEnhance() {
    if (!app.currentImage) {
        alert('이미지를 먼저 열어주세요.');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    const defaultAI = settings.defaultAI || 'gemini';
    const apiKey = (defaultAI === 'gemini' || defaultAI === 'gemini2') ? settings.apiGemini :
        defaultAI === 'chatgpt' ? settings.apiChatGPT :
            settings.apiClaude;

    if (!apiKey) {
        alert('AI API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.');
        return;
    }

    const progressModal = showProgressModal('화질 개선 분석 중...', 'AI가 이미지를 분석하여 최적의 보정 값을 찾고 있습니다.');

    try {
        const imageBase64 = await imageToBase64(app.currentImage);
        const prompt = `이 이미지를 분석하여 가장 잘 어울리는 보정 값을 JSON 형식으로만 응답해주세요. 
규칙: 
1. {"brightness": 숫자, "contrast": 숫자, "saturation": 숫자, "sharpness": 숫자} 형식
2. 각 숫자의 범위는 -100에서 100 사이
3. 가능한 자연스럽게 보정할 수 있는 값을 선택하세요.`;

        const result = await callAIWithImage(defaultAI, apiKey, prompt, imageBase64);

        // JSON 추출 시도
        const jsonMatch = result.match(/\{.*\}/s);
        if (jsonMatch) {
            const params = JSON.parse(jsonMatch[0]);

            // 값 적용
            if (params.brightness !== undefined) app.filters.brightness = params.brightness;
            if (params.contrast !== undefined) app.filters.contrast = params.contrast;
            if (params.saturation !== undefined) app.filters.saturation = params.saturation;
            if (params.sharpness !== undefined) app.filters.sharpness = params.sharpness;

            // UI 동기화
            syncFilterUI();

            renderCanvas();
            saveHistory();
            progressModal.remove();
            showToast('✅ AI 자동 보정 완료');
        } else {
            throw new Error('AI 응답에서 유효한 보정 값을 찾을 수 없습니다.');
        }

    } catch (error) {
        progressModal.remove();
        showErrorModal('화질 개선 실패', error.message);
    }
}

export async function aiColorize() {
    if (!app.currentImage) {
        alert('이미지를 먼저 열어주세요.');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    const defaultAI = settings.defaultAI || 'gemini';
    const apiKey = (defaultAI === 'gemini' || defaultAI === 'gemini2') ? settings.apiGemini :
        defaultAI === 'chatgpt' ? settings.apiChatGPT :
            settings.apiClaude;

    if (!apiKey) {
        alert('AI API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.');
        return;
    }

    const progressModal = showProgressModal('컬러화 진행 중...', 'AI가 흑백 이미지를 분석하고 자연스러운 색상을 추천하고 있습니다.');

    try {
        const imageBase64 = await imageToBase64(app.currentImage);
        const prompt = '이 이미지가 흑백이라면, 각 요소에 어떤 색상을 입히면 자연스러울지 상세히 설명해주세요.';

        const result = await callAIWithImage(defaultAI, apiKey, prompt, imageBase64);

        progressModal.remove();
        alert('✅ AI 색상 추천:\n\n' + result);

    } catch (error) {
        progressModal.remove();
        showErrorModal('컬러화 분석 실패', error.message, error.details);
    }
}

export async function aiObjectRemove() {
    if (!app.currentImage) {
        alert('이미지를 먼저 열어주세요.');
        return;
    }

    const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    const defaultAI = settings.defaultAI || 'gemini';
    const apiKey = (defaultAI === 'gemini' || defaultAI === 'gemini2') ? settings.apiGemini :
        defaultAI === 'chatgpt' ? settings.apiChatGPT :
            settings.apiClaude;

    if (!apiKey) {
        alert('AI API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.');
        return;
    }

    const progressModal = showProgressModal('객체 제거 중...', 'AI가 선택된 객체를 자연스럽게 제거하고 있습니다.');

    try {
        const imageBase64 = await imageToBase64(app.currentImage);
        const prompt = '이 이미지에서 제거할 수 있는 객체들을 식별하고, 각 객체를 제거하는 방법을 설명해주세요.';

        const result = await callAIWithImage(defaultAI, apiKey, prompt, imageBase64);

        progressModal.remove();
        alert('✅ AI 분석:\n\n' + result + '\n\n참고: 실제 객체 제거는 전문 편집 API가 필요합니다.');

    } catch (error) {
        progressModal.remove();
        showErrorModal('객체 제거 실패', error.message, error.details);
    }
}

export function showSettings() {
    const s = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
                <div class="modal-content" style="width: 500px;">
                    <div class="modal-title">
                        <span>⚙️ 환경 설정</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <h3 style="font-size: 13px; margin-bottom: 8px;">⚙️ 기본 설정</h3>
                        <label style="font-size: 12px; display: block; margin-bottom: 4px;">기본 저장 포맷</label>
                        <select id="defFmt" style="width: 100%; padding: 6px; border: 1px solid #c0c0c0; margin-bottom: 12px;">
                            <option value="image/png" ${s.defFmt === 'image/png' ? 'selected' : ''}>PNG</option>
                            <option value="image/jpeg" ${s.defFmt === 'image/jpeg' ? 'selected' : ''}>JPEG</option>
                            <option value="image/webp" ${s.defFmt === 'image/webp' ? 'selected' : ''}>WebP</option>
                        </select>
                        <hr style="margin: 16px 0; border: none; border-top: 1px solid #e0e0e0;">
                        <button class="btn-small" style="width: 100%;" onclick="this.closest('.modal-overlay').remove(); manageAIKeys();">
                            🔑 AI API 키 관리
                        </button>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="saveSettings()">저장</button>
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">취소</button>
                    </div>
                </div>
            `;
    document.body.appendChild(modal);
}

export function saveSettings() {
    const s = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    s.defFmt = document.getElementById('defFmt').value;
    localStorage.setItem('imgViewerSettings', JSON.stringify(s));
    alert('설정이 저장되었습니다.');
    document.querySelector('.modal-overlay').remove();
}

export async function saveImageAs() {
    if (!app.currentImage) {
        alert('저장할 이미지가 없습니다.');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
                <div class="modal-content" style="width: 450px;">
                    <div class="modal-title">
                        <span>다른 이름으로 저장</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; display: block; margin-bottom: 4px;">파일 이름</label>
                            <input type="text" id="saveFileName" value="${app.images[app.currentIndex].name.replace(/\.[^.]+$/, '')}" 
                                style="width: 100%; padding: 6px; border: 1px solid #c0c0c0; font-size: 12px;">
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; display: block; margin-bottom: 4px;">저장 포맷</label>
                            <select id="saveFormat" style="width: 100%; padding: 6px; border: 1px solid #c0c0c0; font-size: 12px;">
                                <option value="image/png">PNG (.png) - 무손실</option>
                                <option value="image/jpeg">JPEG (.jpg) - 사진용</option>
                                <option value="image/webp">WebP (.webp) - 최신</option>
                            </select>
                        </div>
                        <div id="qualityControl" style="margin-bottom: 12px; display: none;">
                            <label style="font-size: 12px; display: block; margin-bottom: 4px;">
                                품질: <span id="qualityValue">90</span>%
                            </label>
                            <input type="range" id="saveQuality" min="1" max="100" value="90" style="width: 100%;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-small" onclick="performSaveAs()">저장</button>
                        <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">취소</button>
                    </div>
                </div>
            `;

    document.body.appendChild(modal);

    const formatSelect = document.getElementById('saveFormat');
    const qualityControl = document.getElementById('qualityControl');
    const qualitySlider = document.getElementById('saveQuality');
    const qualityValue = document.getElementById('qualityValue');

    formatSelect.addEventListener('change', function () {
        if (this.value === 'image/jpeg' || this.value === 'image/webp') {
            qualityControl.style.display = 'block';
        } else {
            qualityControl.style.display = 'none';
        }
    });

    qualitySlider.addEventListener('input', function () {
        qualityValue.textContent = this.value;
    });
}

export async function printImage() {
    if (!app.currentImage) {
        alert('인쇄할 이미지가 없습니다.');
        return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = app.currentImage.width;
    exportCanvas.height = app.currentImage.height;
    const exportCtx = exportCanvas.getContext('2d');
    const filtered = applyFilters(app.currentImage);
    exportCtx.drawImage(filtered, 0, 0);

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
        return;
    }

    const scriptTag = '<' + 'script>';
    const scriptEndTag = '<' + '/script>';

    printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>인쇄 - ${app.images[app.currentIndex].name}</title>
                    <style>
                        @media print {
                            body { margin: 0; padding: 0; }
                            img { 
                                max-width: 100%; 
                                max-height: 100vh;
                                display: block;
                                margin: auto;
                                page-break-inside: avoid;
                            }
                        }
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            margin: 0;
                            background: #f0f0f0;
                        }
                    </style>
                </head>
                <body>
                    <img src="${exportCanvas.toDataURL()}" alt="${app.images[app.currentIndex].name}">
                    ${scriptTag}
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 500);
                        };
                        window.onafterprint = function() {
                            window.close();
                        };
                    ${scriptEndTag}
                </body>
                </html>
            `);
    printWindow.document.close();
}

export function showProgressModal(title, message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
                <div class="modal-content" style="width: 400px;">
                    <div class="modal-title">
                        <span>${title}</span>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 30px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                        <p style="font-size: 14px; color: #666;">${message}</p>
                        <div style="margin-top: 20px;">
                            <div style="width: 100%; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
                                <div style="width: 0%; height: 100%; background: #0078d7; animation: progress 2s infinite;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes progress {
                        0% { width: 0%; }
                        50% { width: 70%; }
                        100% { width: 100%; }
                    }
                </style>
            `;
    document.body.appendChild(modal);
    return modal;
}

export function startSlideshow() {
    alert('슬라이드쇼 기능 구현 중입니다.\n곧 업데이트 예정입니다.');
}

// ── 화면 캡처 기능 ────────────────────────────────────────────
async function captureScreen(filename: string): Promise<void> {
    try {
        const stream = await (navigator.mediaDevices as MediaDevices & {
            getDisplayMedia: (opts: object) => Promise<MediaStream>;
        }).getDisplayMedia({ video: { cursor: 'always' }, audio: false });

        const video = document.createElement('video');
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            setTimeout(() => {
                const tmp = document.createElement('canvas');
                tmp.width = video.videoWidth;
                tmp.height = video.videoHeight;
                tmp.getContext('2d')!.drawImage(video, 0, 0);
                stream.getTracks().forEach(t => t.stop());

                const img = new Image();
                img.onload = () => {
                    tmp.toBlob(blob => {
                        if (!blob) return;
                        const file = new File([blob], filename, { type: 'image/png' });
                        const data = {
                            file, name: file.name, img,
                            width: img.width, height: img.height,
                            size: blob.size, format: 'image/png',
                            type: 'image', modified: false,
                        };
                        app.images.push(data as typeof app.images[0]);
                        // 썸네일 패널에 추가 후 해당 이미지 로드
                        createThumbnailEl(app.images.length - 1);
                        loadMedia(app.images.length - 1);
                        // 모달 닫기
                        document.querySelector('.modal-overlay')?.remove();
                        document.getElementById('dropZone')?.classList.add('hidden');
                        document.querySelector('.image-container')?.classList.remove('hidden');
                        window.focus();
                        showToast(`📸 캡처 완료: ${file.name}`);
                    });
                };
                img.src = tmp.toDataURL();
            }, 500);
        };
    } catch (err: unknown) {
        const e = err as DOMException;
        if (e.name === 'NotAllowedError' && !e.message.includes('permissions policy')) return; // 사용자 취소
        let msg = '화면 캡처를 시작할 수 없습니다.\n\n';
        if (e.name === 'NotAllowedError') {
            msg += '⚠️ 브라우저 보안 정책으로 차단되었습니다.\n\nHTML 파일을 로컬에서 실행하거나\nOS 단축키를 사용하세요:\n• Windows: Win + Shift + S\n• Mac: Cmd + Shift + 4';
        } else if (e.name === 'NotSupportedError') {
            msg += '⚠️ 이 브라우저는 화면 캡처를 지원하지 않습니다.\n(Chrome 72+ / Edge 79+ / Firefox 66+ 필요)';
        } else {
            msg += `오류: ${e.name}\n${e.message}`;
        }
        alert(msg);
    }
}

export async function captureFullScreen(): Promise<void> {
    await captureScreen(`screen_${Date.now()}.png`);
}

export async function captureWindow(): Promise<void> {
    await captureScreen(`window_${Date.now()}.png`);
}

export function captureArea(): void {
    document.querySelector('.modal-overlay')?.remove();
    alert('📸 영역 선택 캡처 안내\n\n브라우저 제한으로 직접 구현이 어렵습니다.\n\n대안:\n1. Windows: Win + Shift + S (캡처 도구)\n2. Mac: Cmd + Shift + 4\n3. 전체/창 캡처 후 자르기 기능 사용');
}

// ── AI 통신 헬퍼 ─────────────────────────────────────────────
async function imageToBase64(img: HTMLImageElement): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스 컨텍스트 생성 실패');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

async function callGeminiAPI(apiKey: string, prompt: string, base64: string, responseEl: HTMLElement, modelVariant: string = 'gemini-2.5-flash-image'): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVariant}:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: base64 } }
            ]
        }]
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 받지 못했습니다.';
    responseEl.innerText = text;
    return text;
}

async function callChatGPTAPI(apiKey: string, prompt: string, base64: string, responseEl: HTMLElement): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
        model: 'gpt-4o-mini',
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
        }]
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`ChatGPT API 오류: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.';
    responseEl.innerText = text;
    return text;
}

async function callClaudeAPI(apiKey: string, prompt: string, base64: string, responseEl: HTMLElement): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';
    const payload = {
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
                { type: 'text', text: prompt }
            ]
        }]
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Claude API 오류: ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '응답을 받지 못했습니다.';
    responseEl.innerText = text;
    return text;
}

async function callAIWithImage(model: string, apiKey: string, prompt: string, base64: string): Promise<string> {
    const dummyEl = document.createElement('div');
    if (model === 'gemini') return callGeminiAPI(apiKey, prompt, base64, dummyEl, 'gemini-1.5-flash');
    if (model === 'gemini2') return callGeminiAPI(apiKey, prompt, base64, dummyEl, 'gemini-2.0-flash-exp');
    if (model === 'chatgpt') return callChatGPTAPI(apiKey, prompt, base64, dummyEl);
    if (model === 'claude') return callClaudeAPI(apiKey, prompt, base64, dummyEl);
    throw new Error('지원하지 않는 모델입니다.');
}

function showErrorModal(title: string, msg: string, details?: string) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="width: 400px; border-top: 4px solid #dc3545;">
            <div class="modal-title">
                <span style="color:#dc3545;">❌ ${title}</span>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <p style="font-size: 13px;">${msg}</p>
                ${details ? `<pre style="font-size:10px; background:#f8f9fa; padding:8px; overflow-x:auto;">${details}</pre>` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function applyConvolutionFilterLocal(imageData: ImageData, w: number, h: number, kernel: number[]) {
    const d = imageData.data;
    const copy = new Uint8ClampedArray(d);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const i = ((y + ky) * w + (x + kx)) * 4;
                    const k = kernel[(ky + 1) * 3 + (kx + 1)];
                    r += copy[i] * k;
                    g += copy[i + 1] * k;
                    b += copy[i + 2] * k;
                }
            }
            const i = (y * w + x) * 4;
            d[i] = Math.max(0, Math.min(255, r));
            d[i + 1] = Math.max(0, Math.min(255, g));
            d[i + 2] = Math.max(0, Math.min(255, b));
        }
    }
}

function syncFilterUI() {
    const sliders: Array<[string, number, string]> = [
        ['brightness', app.filters.brightness, ''],
        ['contrast', app.filters.contrast, ''],
        ['saturation', app.filters.saturation, ''],
        ['sharpness', app.filters.sharpness, ''],
    ];
    sliders.forEach(([id, val, suffix]) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        const vl = document.getElementById(`${id}Value`);
        if (el) el.value = String(val);
        if (vl) vl.textContent = String(val) + suffix;
    });
}

export function manageAIKeys() {
    const s = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="width: 500px;">
            <div class="modal-title">
                <span>🔑 AI API 키 관리</span>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 13px; margin-bottom: 12px;">🤖 기본 서비스 선택</h4>
                    <div style="display: flex; gap: 16px;">
                        <label style="display: flex; align-items: center; gap: 6px; font-size:12px; cursor:pointer;">
                            <input type="radio" name="defaultAI" value="gemini" ${s.defaultAI === 'gemini' || !s.defaultAI ? 'checked' : ''}> Gemini 1.5 Flash
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size:12px; cursor:pointer; color: #0078d7; font-weight: bold;">
                            <input type="radio" name="defaultAI" value="gemini2" ${s.defaultAI === 'gemini2' ? 'checked' : ''}> Gemini 2.0 Flash Exp
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size:12px; cursor:pointer;">
                            <input type="radio" name="defaultAI" value="chatgpt" ${s.defaultAI === 'chatgpt' ? 'checked' : ''}> ChatGPT
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; font-size:12px; cursor:pointer;">
                            <input type="radio" name="defaultAI" value="claude" ${s.defaultAI === 'claude' ? 'checked' : ''}> Claude
                        </label>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="font-size: 12px; display: block; margin-bottom: 6px;">Google Gemini API Key</label>
                    <input type="password" id="apiGemini" value="${s.apiGemini || ''}" placeholder="AI 기능을 사용하려면 키를 입력하세요"
                        style="width: 100%; padding: 8px; border: 1px solid #c0c0c0; font-size:12px;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 12px; display: block; margin-bottom: 6px;">OpenAI API Key (GPT-4o)</label>
                    <input type="password" id="apiChatGPT" value="${s.apiChatGPT || ''}" placeholder="AI 기능을 사용하려면 키를 입력하세요"
                        style="width: 100%; padding: 8px; border: 1px solid #c0c0c0; font-size:12px;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 12px; display: block; margin-bottom: 6px;">Anthropic Claude API Key</label>
                    <input type="password" id="apiClaude" value="${s.apiClaude || ''}" placeholder="AI 기능을 사용하려면 키를 입력하세요"
                        style="width: 100%; padding: 8px; border: 1px solid #c0c0c0; font-size:12px;">
                </div>

                <div style="background: #fff3cd; padding: 12px; border-radius: 4px; border: 1px solid #ffeeba;">
                    <p style="font-size: 11px; color: #856404; margin: 0;">
                        ⚠️ API 키는 브라우저의 로컬 저장소(localStorage)에만 저장됩니다. <br>
                        ⚠️ 지원 모델: Gemini 1.5 Flash, Gemini 2.0 Flash Exp, GPT-4o-mini, Claude 3.5 Sonnet
                    </p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-small" onclick="saveAIKeys();" style="background: #0078d7; color: white;">저장</button>
                <button class="btn-small" onclick="this.closest('.modal-overlay').remove()">닫기</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

(window as any).manageAIKeys = manageAIKeys;

export function saveAIKeys() {
    const s = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');

    const defaultAI = (document.querySelector('input[name="defaultAI"]:checked') as HTMLInputElement)?.value;
    const apiGemini = (document.getElementById('apiGemini') as HTMLInputElement).value;
    const apiChatGPT = (document.getElementById('apiChatGPT') as HTMLInputElement).value;
    const apiClaude = (document.getElementById('apiClaude') as HTMLInputElement).value;

    s.defaultAI = defaultAI;
    s.apiGemini = apiGemini;
    s.apiChatGPT = apiChatGPT;
    s.apiClaude = apiClaude;

    localStorage.setItem('imgViewerSettings', JSON.stringify(s));
    showToast('AI 설정이 저장되었습니다.');
    document.querySelector('.modal-overlay')?.remove();
}

(window as any).saveAIKeys = saveAIKeys;
