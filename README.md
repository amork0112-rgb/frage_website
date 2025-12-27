# FRAGE EDU (프라게 에듀) Official Website

프라게 에듀(Frage English Academy)의 공식 웹사이트 및 학부모 커뮤니티 플랫폼 프로젝트입니다.
Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase를 기반으로 구축되었습니다.

## 🖼 이미지 변경 가이드 (Image Update Guide)

웹사이트에 사용된 이미지를 변경하는 방법은 두 가지가 있습니다.

### 방법 1: `public` 폴더에 이미지 파일 추가하기 (추천)
가장 쉽고 안정적인 방법입니다.

1.  프로젝트 루트(최상위 폴더)에 있는 **`public`** 폴더를 엽니다.
2.  사용하고 싶은 이미지 파일(jpg, png 등)을 이 폴더 안에 넣습니다.
    *   예: `award_2023.jpg`
3.  코드(`src/data/translations.ts`)에서 이미지 경로를 다음과 같이 수정합니다:
    ```typescript
    // 예시
    image: "/award_2023.jpg"
    ```
    *   주의: 경로 앞에 반드시 `/`를 붙여야 합니다.

### 방법 2: 외부 이미지 URL 사용하기
인터넷에 있는 이미지를 바로 사용할 수도 있습니다.

1.  이미지의 주소(URL)를 복사합니다.
2.  코드(`src/data/translations.ts`)에서 이미지 경로를 URL로 변경합니다:
    ```typescript
    // 예시
    image: "https://example.com/my-image.jpg"
    ```

---

## 🚀 프로젝트 개요
- **프리미엄 브랜드 아이덴티티**: 국제학교 컨셉의 고급스러운 디자인 (Navy & Gold Theme)
- **반응형 웹 디자인**: 데스크톱, 태블릿, 모바일 완벽 지원
- **다국어 지원**: 한국어/영어 토글 기능 (Context API 활용)
- **학부모 커뮤니티**: Supabase Auth 기반의 로그인 및 게시판 기능

## 🛠 기술 스택
- **Framework**: Next.js 14.2.15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Fonts**: Playfair Display (영문), MaruBuri (한글), Inter (본문)

## 📦 설치 및 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 정보를 입력하세요:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_KAKAO_CHANNEL_URL=your_kakao_channel_url
```

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000`으로 접속합니다.

### 4. 프로덕션 빌드 및 실행
```bash
npm run build
npm run start
```

## ☁️ 배포 가이드 (Vercel)

이 프로젝트는 [Vercel](https://vercel.com)에 최적화되어 있습니다.

1. GitHub 저장소에 코드를 푸시합니다.
2. Vercel 대시보드에서 'Add New Project'를 클릭하고 저장소를 가져옵니다.
3. **Environment Variables** 설정에서 위 `.env.local`의 내용을 입력합니다.
4. 'Deploy' 버튼을 클릭하면 자동으로 빌드 및 배포가 완료됩니다.

## 📁 주요 디렉토리 구조
- `src/app`: 페이지 및 라우팅 (App Router)
- `src/components`: 재사용 가능한 UI 컴포넌트
- `src/context`: 전역 상태 관리 (LanguageContext 등)
- `src/data`: 정적 데이터 및 번역 파일 (텍스트 및 이미지 경로 수정 위치)
- `src/lib`: 유틸리티 함수 및 라이브러리 설정 (Supabase 등)

## 🔐 관리자 및 접근 권한
- **관리자 페이지**: `/admin/login` (별도 구현 필요 시 확장 가능)
- **커뮤니티**: 로그인한 학부모만 접근 가능 (Supabase RLS 적용)

---
© 2002-2024 FRAGE EDU. All rights reserved.