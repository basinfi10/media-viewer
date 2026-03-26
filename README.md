# 미디어 뷰어 v3.35.4

이미지 · 영상 · 음악 통합 뷰어 — TypeScript + Vite

## 기능

- **이미지**: JPG · PNG · GIF · WebP · BMP · AVIF, 편집(필터/자르기/회전/플립), ZIP 일괄 로드
- **영상**: MP4 · WebM · MOV · AVI · MKV, 재생제어, 세로영상 전체화면, 영상변환(MP4/WebM/MP3/GIF)
- **음악**: MP3 · FLAC · AAC · WAV · OGG · M4A, 가사(LRC/ID3), 앨범아트, 시각화

## 개발

```bash
npm install
npm run dev       # 개발 서버 (http://localhost:3000)
npm run build     # 프로덕션 빌드
npm run type-check # 타입 체크
```

## 배포 (Vercel)

```bash
# Vercel CLI
npm i -g vercel
vercel login
vercel --prod
```

또는 GitHub 연동 후 Vercel 대시보드에서 자동 배포.

## 구조

```
src/
├── types/      # TypeScript 타입 정의
├── store/      # 전역 상태
├── modules/    # 핵심 로직
│   ├── loader.ts      # 파일 로딩 (image/video/audio/ZIP)
│   ├── player.ts      # 미디어 플레이어
│   ├── audio.ts       # 오디오 엔진
│   ├── canvas.ts      # 이미지 편집
│   ├── fullscreen.ts  # 전체화면
│   ├── lyric.ts       # 가사 (LRC/ID3)
│   └── keyboard.ts    # 단축키
├── ui/         # UI 컴포넌트
│   ├── toolbar.ts     # 툴바 전환
│   ├── thumbnail.ts   # 썸네일 패널
│   ├── imageView.ts   # 이미지 전체보기
│   ├── sidebar.ts     # 사이드바
│   └── menu.ts        # 메뉴/다이얼로그
├── utils/      # 유틸리티
├── style.css   # 전역 스타일
└── main.ts     # 진입점
```

## 기술 스택

- TypeScript 5.3
- Vite 5
- JSZip (ZIP 처리)
- jsmediatags (ID3 태그 파싱)
