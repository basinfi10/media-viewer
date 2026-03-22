// @ts-nocheck
/* eslint-disable */
import { app } from '../store';
import { showToast } from '../utils';
import { renderCanvas, saveHistory } from './canvas';
import { loadMedia } from './player';

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
                                <option value="gemini" ${defaultAI==='gemini'?'selected':''}>🤖 Google Gemini ${defaultAI==='gemini'?'(기본)':''}</option>
                                <option value="chatgpt" ${defaultAI==='chatgpt'?'selected':''}>💬 ChatGPT ${defaultAI==='chatgpt'?'(기본)':''}</option>
                                <option value="claude" ${defaultAI==='claude'?'selected':''}>🎨 Claude ${defaultAI==='claude'?'(기본)':''}</option>
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
            const apiKey = model === 'gemini' ? settings.apiGemini : 
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
                
                if (model === 'gemini') {
                    await callGeminiAPI(apiKey, prompt, imageBase64, responseText);
                } else if (model === 'chatgpt') {
                    await callChatGPTAPI(apiKey, prompt, imageBase64, responseText);
                } else if (model === 'claude') {
                    await callClaudeAPI(apiKey, prompt, imageBase64, responseText);
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
            
            const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
            const defaultAI = settings.defaultAI || 'gemini';
            const apiKey = defaultAI === 'gemini' ? settings.apiGemini : 
                          defaultAI === 'chatgpt' ? settings.apiChatGPT : 
                          settings.apiClaude;
            
            if (!apiKey) {
                alert('AI API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.');
                return;
            }
            
            const progressModal = showProgressModal('이미지 확대 분석 중...', 'AI가 이미지를 분석하고 확대 시 주의할 점을 확인하고 있습니다.');
            
            try {
                const imageBase64 = await imageToBase64(app.currentImage);
                const prompt = '이 이미지를 2배 확대할 때 디테일을 보존하려면 어떤 점에 주의해야 하는지 분석해주세요.';
                
                const result = await callAIWithImage(defaultAI, apiKey, prompt, imageBase64);
                
                progressModal.remove();
                alert('✅ AI 분석:\n\n' + result);
                
            } catch (error) {
                progressModal.remove();
                showErrorModal('확대 분석 실패', error.message, error.details);
            }
        }

export async function aiRemoveBackground() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
            const defaultAI = settings.defaultAI || 'gemini';
            const apiKey = defaultAI === 'gemini' ? settings.apiGemini : 
                          defaultAI === 'chatgpt' ? settings.apiChatGPT : 
                          settings.apiClaude;
            
            if (!apiKey) {
                alert('AI API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.');
                return;
            }
            
            // 진행 중 팝업 표시
            const progressModal = showProgressModal('배경 제거 중...', 'AI가 이미지 배경을 제거하고 있습니다.');
            
            try {
                const imageBase64 = await imageToBase64(app.currentImage);
                const prompt = '이 이미지의 배경을 제거하고, 주 피사체만 남긴 투명 배경 이미지를 생성해주세요. PNG 형식으로 반환해주세요.';
                
                // API 호출 (실제로는 이미지 편집 API가 필요합니다)
                // 여기서는 AI에게 설명을 요청하는 방식으로 구현
                const result = await callAIWithImage(defaultAI, apiKey, prompt, imageBase64);
                
                progressModal.remove();
                
                // 성공 메시지
                alert('✅ AI 응답:\n\n' + result + '\n\n참고: 실제 배경 제거는 전문 API(Remove.bg 등)가 필요합니다.');
                
            } catch (error) {
                progressModal.remove();
                showErrorModal('배경 제거 실패', error.message, error.details);
            }
        }

export async function aiEnhance() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
            const defaultAI = settings.defaultAI || 'gemini';
            const apiKey = defaultAI === 'gemini' ? settings.apiGemini : 
                          defaultAI === 'chatgpt' ? settings.apiChatGPT : 
                          settings.apiClaude;
            
            if (!apiKey) {
                alert('AI API 키가 설정되지 않았습니다.\nAI 기능 > API 키 관리에서 설정해주세요.');
                return;
            }
            
            const progressModal = showProgressModal('화질 개선 중...', 'AI가 이미지 화질을 분석하고 개선하고 있습니다.');
            
            try {
                const imageBase64 = await imageToBase64(app.currentImage);
                const prompt = '이 이미지의 화질을 분석하고, 어떤 부분을 개선할 수 있는지 상세히 설명해주세요. (노이즈, 선명도, 색상, 밝기 등)';
                
                const result = await callAIWithImage(defaultAI, apiKey, prompt, imageBase64);
                
                progressModal.remove();
                alert('✅ AI 분석:\n\n' + result);
                
            } catch (error) {
                progressModal.remove();
                showErrorModal('화질 분석 실패', error.message, error.details);
            }
        }

export async function aiColorize() {
            if (!app.currentImage) {
                alert('이미지를 먼저 열어주세요.');
                return;
            }
            
            const settings = JSON.parse(localStorage.getItem('imgViewerSettings') || '{}');
            const defaultAI = settings.defaultAI || 'gemini';
            const apiKey = defaultAI === 'gemini' ? settings.apiGemini : 
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
            const apiKey = defaultAI === 'gemini' ? settings.apiGemini : 
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
                            <option value="image/png" ${s.defFmt==='image/png'?'selected':''}>PNG</option>
                            <option value="image/jpeg" ${s.defFmt==='image/jpeg'?'selected':''}>JPEG</option>
                            <option value="image/webp" ${s.defFmt==='image/webp'?'selected':''}>WebP</option>
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
            
            formatSelect.addEventListener('change', function() {
                if (this.value === 'image/jpeg' || this.value === 'image/webp') {
                    qualityControl.style.display = 'block';
                } else {
                    qualityControl.style.display = 'none';
                }
            });
            
            qualitySlider.addEventListener('input', function() {
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

