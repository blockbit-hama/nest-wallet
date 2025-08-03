# Nest Wallet UI/UX 디자인 시스템 튜토리얼

이 문서는 CSS를 잘 모르는 개발자도 nest-wallet의 UI/UX 구조를 이해하고 수정할 수 있도록 도와주는 가이드입니다.

## 📚 목차

1. [디자인 시스템 개요](#디자인-시스템-개요)
2. [CSS 아키텍처 구조](#css-아키텍처-구조)
3. [색상 시스템](#색상-시스템)
4. [타이포그래피](#타이포그래피)
5. [레이아웃 시스템](#레이아웃-시스템)
6. [컴포넌트 스타일링](#컴포넌트-스타일링)
7. [반응형 디자인](#반응형-디자인)
8. [애니메이션과 인터랙션](#애니메이션과-인터랙션)

## 디자인 시스템 개요

### 🎨 **디자인 철학**

nest-wallet은 **다크 테마 기반의 모던 모바일 퍼스트** 디자인을 채택합니다:

- **미니멀리즘**: 불필요한 요소 제거, 깔끔한 인터페이스
- **모바일 우선**: 최대 너비 480px의 모바일 중심 레이아웃
- **다크 테마**: 눈의 피로 감소, 프리미엄 느낌
- **일관성**: 통일된 색상, 타이포그래피, 간격 시스템

### 🛠 **기술 스택**

```
CSS 기술 스택:
├── Tailwind CSS (유틸리티 기반)
├── CSS Modules (컴포넌트 스코핑)
├── CSS Custom Properties (CSS 변수)
└── PostCSS (빌드 최적화)
```

### 📱 **디자인 토큰**

```css
/* 핵심 디자인 토큰 */
:root {
  /* 색상 */
  --color-primary: #F2A003;     /* 메인 오렌지 */
  --color-background: #14151A;   /* 배경색 */
  --color-surface: #23242A;      /* 카드/컴포넌트 배경 */
  --color-text: #E0DFE4;         /* 메인 텍스트 */
  --color-text-secondary: #A0A0B0; /* 보조 텍스트 */
  
  /* 간격 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* 반경 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  /* 그림자 */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.18);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.24);
}
```

## CSS 아키텍처 구조

### 📁 **파일 구조**

```
src/
├── app/
│   └── globals.css              # 전역 스타일
├── components/
│   ├── ui/                      # 기본 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   └── molecules/               # 복합 컴포넌트
│       ├── CustomSelect.tsx
│       └── TabBar.tsx
└── lib/utils/
    └── utils.ts                 # 스타일 유틸리티
```

### 🏗 **CSS 레이어 구조**

```css
/* globals.css의 계층 구조 */

@tailwind base;      /* Tailwind 기본 스타일 */
@tailwind components; /* Tailwind 컴포넌트 */
@tailwind utilities;  /* Tailwind 유틸리티 */

@layer base {
  /* 전역 기본 스타일 */
  body { /* 기본 배경, 폰트 */ }
}

@layer components {
  /* 재사용 가능한 컴포넌트 스타일 */
  .common-button { /* 공통 버튼 */ }
  .common-card { /* 공통 카드 */ }
  .main-summary-box { /* 메인 요약 박스 */ }
}
```

### 🎯 **CSS 클래스 명명 규칙**

```css
/* BEM 방법론 기반 명명 */

/* Block (독립적인 컴포넌트) */
.balance-card { }

/* Element (블록의 하위 요소) */
.balance-card-name { }
.balance-card-amount { }
.balance-card-usd { }

/* Modifier (상태나 변형) */
.balance-card--loading { }
.balance-card--selected { }

/* 유틸리티 클래스 */
.flex-center { /* Flexbox 중앙 정렬 */ }
.common-button { /* 공통 버튼 스타일 */ }
```

## 색상 시스템

### 🎨 **색상 팔레트**

```css
/* 메인 브랜드 색상 */
.color-primary {
  --primary: #F2A003;      /* 메인 오렌지 */
  --primary-hover: #E09400; /* 호버 상태 */
  --primary-light: #FFF3D4; /* 연한 오렌지 */
}

/* 배경 색상 (다크 테마) */
.color-backgrounds {
  --bg-primary: #14151A;    /* 메인 배경 */
  --bg-secondary: #1B1C22;  /* 카드 배경 */
  --bg-tertiary: #23242A;   /* 모달, 드롭다운 */
  --bg-quaternary: #2A2B30; /* 호버 상태 */
}

/* 텍스트 색상 */
.color-text {
  --text-primary: #E0DFE4;   /* 메인 텍스트 */
  --text-secondary: #A0A0B0; /* 보조 텍스트 */
  --text-disabled: #6B7280;  /* 비활성 텍스트 */
  --text-on-primary: #14151A; /* 버튼 위 텍스트 */
}

/* 상태 색상 */
.color-status {
  --success: #6FCF97;        /* 성공 (초록) */
  --error: #EB5757;          /* 오류 (빨강) */
  --warning: #F2A003;        /* 경고 (오렌지) */
  --info: #56CCF2;           /* 정보 (파랑) */
}
```

### 📝 **색상 사용 가이드**

```css
/* ✅ 올바른 색상 사용 */
.button-primary {
  background: #F2A003;      /* 메인 액션 버튼 */
  color: #14151A;           /* 어두운 텍스트로 대비 */
}

.card-background {
  background: #1B1C22;      /* 카드 배경 */
  color: #E0DFE4;           /* 밝은 텍스트 */
}

/* ❌ 피해야 할 색상 사용 */
.bad-contrast {
  background: #14151A;      /* 어두운 배경 */
  color: #6B7280;           /* 어두운 텍스트 - 가독성 나쁨 */
}
```

### 🌙 **다크 테마 대비율**

```css
/* WCAG 2.1 AA 기준 (4.5:1) 준수 */
.contrast-examples {
  /* 좋은 대비 (7.2:1) */
  background: #14151A;      /* 어두운 배경 */
  color: #E0DFE4;           /* 밝은 텍스트 */
  
  /* 보통 대비 (5.1:1) */
  background: #23242A;      /* 중간 배경 */
  color: #E0DFE4;           /* 밝은 텍스트 */
  
  /* 주의 대비 (4.6:1) - 최소 기준 */
  background: #14151A;      /* 어두운 배경 */
  color: #A0A0B0;           /* 회색 텍스트 */
}
```

## 타이포그래피

### 📝 **폰트 시스템**

```css
/* 폰트 패밀리 */
.font-system {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  /* 시스템 폰트 폴백으로 빠른 로딩 */
}

/* 폰트 크기 스케일 */
.typography-scale {
  --text-xs: 12px;     /* 캡션, 라벨 */
  --text-sm: 14px;     /* 보조 텍스트 */
  --text-base: 16px;   /* 기본 텍스트 */
  --text-lg: 18px;     /* 중요 텍스트 */
  --text-xl: 20px;     /* 섹션 제목 */
  --text-2xl: 24px;    /* 페이지 제목 */
  --text-3xl: 30px;    /* 큰 제목 */
  --text-4xl: 36px;    /* 메인 타이틀 */
  --text-5xl: 48px;    /* 히어로 타이틀 */
}

/* 폰트 두께 */
.font-weights {
  --font-light: 300;   /* 라이트 */
  --font-normal: 400;  /* 일반 */
  --font-medium: 500;  /* 미디엄 */
  --font-semibold: 600; /* 세미볼드 */
  --font-bold: 700;    /* 볼드 */
  --font-extrabold: 800; /* 엑스트라볼드 */
}
```

### 📐 **타이포그래피 사용 예시**

```css
/* 메인 화면 금액 표시 */
.main-summary-amount {
  font-size: 48px;        /* 큰 숫자로 임팩트 */
  font-weight: 800;       /* 굵은 폰트로 강조 */
  color: #E0DFE4;         /* 밝은 색상 */
  letter-spacing: -1.5px; /* 타이트한 자간 */
  line-height: 1.1;       /* 좁은 줄간격 */
}

/* 카드 제목 */
.balance-card-name {
  font-size: 26.5px;      /* 중간 크기 */
  font-weight: 600;       /* 세미볼드 */
  color: #E0DFE4;         /* 메인 텍스트 색상 */
  letter-spacing: -1.5px; /* 읽기 좋은 자간 */
}

/* 보조 정보 */
.balance-card-sub-usd {
  font-size: 17px;        /* 작은 크기 */
  font-weight: 500;       /* 미디엄 */
  color: #A0A0B0;         /* 보조 텍스트 색상 */
}
```

### 📏 **타이포그래피 가이드라인**

```css
/* ✅ 좋은 타이포그래피 */
.good-typography {
  /* 계층구조가 명확함 */
  h1 { font-size: 48px; font-weight: 800; }  /* 메인 타이틀 */
  h2 { font-size: 24px; font-weight: 700; }  /* 섹션 제목 */
  p  { font-size: 16px; font-weight: 400; }  /* 본문 */
  
  /* 적절한 줄간격 */
  line-height: 1.5;       /* 읽기 좋은 간격 */
  
  /* 적절한 자간 */
  letter-spacing: -0.025em; /* 약간 타이트하게 */
}

/* ❌ 피해야 할 타이포그래피 */
.bad-typography {
  font-size: 13px;        /* 너무 작음 */
  font-weight: 400;       /* 계층구조 부족 */
  line-height: 1.2;       /* 너무 좁은 줄간격 */
  letter-spacing: 2px;    /* 너무 넓은 자간 */
}
```

## 레이아웃 시스템

### 📱 **모바일 퍼스트 레이아웃**

```css
/* 기본 컨테이너 */
.main-container {
  width: 100%;
  max-width: 480px;       /* 모바일 최적화 */
  margin: 0 auto;         /* 중앙 정렬 */
  min-height: 100vh;      /* 전체 화면 높이 */
  background: #14151A;    /* 다크 배경 */
}

/* 메인 콘텐츠 영역 */
.main-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 0 80px 0;    /* 하단 탭바 공간 확보 */
  min-height: 100vh;
}
```

### 🧩 **그리드 시스템**

```css
/* Flexbox 기반 그리드 */
.grid-container {
  display: flex;
  flex-direction: column;
  gap: 24px;              /* 일정한 간격 */
}

/* 버튼 그룹 레이아웃 */
.main-action-button-group {
  width: calc(100% - 32px);
  max-width: 432px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;               /* 버튼 간 간격 */
  margin-bottom: 56px;
}

/* 카드 리스트 레이아웃 */
.balance-list {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 24px;              /* 카드 간 간격 */
}
```

### 📏 **간격 시스템**

```css
/* 표준화된 간격 시스템 */
.spacing-system {
  --space-1: 4px;   /* 0.25rem */
  --space-2: 8px;   /* 0.5rem */
  --space-3: 12px;  /* 0.75rem */
  --space-4: 16px;  /* 1rem */
  --space-5: 20px;  /* 1.25rem */
  --space-6: 24px;  /* 1.5rem */
  --space-8: 32px;  /* 2rem */
  --space-10: 40px; /* 2.5rem */
  --space-12: 48px; /* 3rem */
  --space-16: 64px; /* 4rem */
}

/* 간격 사용 예시 */
.component-spacing {
  padding: var(--space-6);      /* 24px 패딩 */
  margin-bottom: var(--space-8); /* 32px 하단 마진 */
  gap: var(--space-4);          /* 16px 간격 */
}
```

## 컴포넌트 스타일링

### 🔘 **버튼 컴포넌트**

```css
/* 기본 버튼 스타일 */
.common-button {
  border-radius: 12px;          /* 둥근 모서리 */
  font-weight: 700;             /* 굵은 폰트 */
  cursor: pointer;              /* 포인터 커서 */
  transition: all 0.15s ease;   /* 부드러운 전환 */
  border: none;                 /* 테두리 제거 */
  outline: none;                /* 아웃라인 제거 */
}

/* 메인 액션 버튼 */
.main-action-button {
  width: 32%;                   /* 반응형 너비 */
  height: 72px;                 /* 고정 높이 */
  border-radius: 24px;          /* 큰 둥근 모서리 */
  background: #F2A003;          /* 메인 색상 */
  color: #14151A;               /* 어두운 텍스트 */
  font-weight: 700;
  font-size: 22px;
  box-shadow: 0 2px 8px rgba(242,160,3,0.08);
}

/* 버튼 호버 효과 */
.main-action-button:hover {
  background: #E09400;          /* 어두운 오렌지 */
  transform: translateY(-1px);  /* 살짝 위로 */
  box-shadow: 0 4px 12px rgba(242,160,3,0.15);
}
```

### 🃏 **카드 컴포넌트**

```css
/* 기본 카드 스타일 */
.common-card {
  background: #1B1C22;         /* 어두운 카드 배경 */
  border-radius: 20px;         /* 둥근 모서리 */
  padding: 14px 24px;          /* 내부 여백 */
  display: flex;
  align-items: center;
  gap: 20px;                   /* 요소 간 간격 */
  border: 1px solid transparent; /* 투명 테두리 */
  transition: all 0.2s ease;   /* 부드러운 전환 */
}

/* 카드 호버 효과 */
.common-card:hover {
  background: #23242A;         /* 밝은 배경 */
  border-color: #F2A003;       /* 오렌지 테두리 */
  transform: translateY(-2px);  /* 위로 이동 */
  box-shadow: 0 8px 24px rgba(242,160,3,0.15);
}

/* 잔액 카드 내부 레이아웃 */
.balance-card-inner {
  display: flex;
  flex-direction: column;
  min-width: 64px;
  margin-right: 12px;
}
```

### 🎛 **셀렉트 컴포넌트**

```css
/* 커스텀 셀렉트 버튼 */
.select-button {
  width: 100%;
  background: #23242A;
  color: inherit;
  border: 2px solid #23242A;
  border-radius: 14px;
  font-weight: 700;
  padding-right: 48px;         /* 화살표 공간 */
  text-align: left;
  outline: none;
  cursor: pointer;
  position: relative;
  transition: border 0.2s, box-shadow 0.2s;
}

/* 열린 상태 */
.select-button.open {
  border-color: #F2A003;       /* 오렌지 테두리 */
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
}

/* 드롭다운 메뉴 */
.dropdown-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  background: #23242A;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  z-index: 1000;
  padding: 6px;
  max-height: 320px;           /* 스크롤 가능 */
  overflow-y: auto;
  border: 2px solid #F2A003;
}
```

## 반응형 디자인

### 📱 **브레이크포인트**

```css
/* 모바일 퍼스트 접근법 */
/* 기본: 320px - 480px (모바일) */
.mobile-first {
  width: 100%;
  padding: 16px;
}

/* 태블릿: 481px - 768px */
@media (min-width: 481px) {
  .responsive-container {
    max-width: 480px;         /* 최대 너비 유지 */
    margin: 0 auto;           /* 중앙 정렬 */
  }
}

/* 데스크톱: 769px+ */
@media (min-width: 769px) {
  .desktop-layout {
    max-width: 480px;         /* 모바일 크기 유지 */
    margin: 0 auto;           /* 중앙 정렬 */
    box-shadow: 0 0 50px rgba(0,0,0,0.5); /* 그림자 추가 */
  }
}
```

### 📐 **유연한 레이아웃**

```css
/* Flexbox 활용 */
.flexible-layout {
  display: flex;
  flex-direction: column;     /* 세로 배치 */
  gap: clamp(16px, 4vw, 24px); /* 반응형 간격 */
}

/* Grid 활용 */
.grid-layout {
  display: grid;
  grid-template-columns: 1fr; /* 단일 컬럼 */
  gap: 24px;
}

/* 반응형 버튼 그룹 */
.button-group {
  display: flex;
  width: 100%;
  gap: 8px;
}

.button-group > .button {
  flex: 1;                    /* 균등 분할 */
  min-width: 0;               /* 축소 허용 */
}
```

### 🔄 **뷰포트 단위 활용**

```css
/* 뷰포트 기반 크기 */
.viewport-sizing {
  width: 100vw;               /* 뷰포트 너비 */
  height: 100vh;              /* 뷰포트 높이 */
  min-height: 100dvh;         /* 동적 뷰포트 높이 */
}

/* 안전 영역 고려 (아이폰 노치) */
.safe-area {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## 애니메이션과 인터랙션

### ⚡ **트랜지션**

```css
/* 기본 트랜지션 */
.smooth-transition {
  transition: all 0.2s ease;  /* 모든 속성 부드럽게 */
}

/* 개별 속성 트랜지션 */
.selective-transition {
  transition: 
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

/* 버튼 인터랙션 */
.interactive-button {
  transition: all 0.15s ease;
}

.interactive-button:hover {
  transform: translateY(-1px);  /* 위로 이동 */
  box-shadow: 0 4px 12px rgba(242,160,3,0.15);
}

.interactive-button:active {
  transform: translateY(0);     /* 원래 위치 */
  transition-duration: 0.05s;   /* 빠른 피드백 */
}
```

### 🎯 **호버 효과**

```css
/* 카드 호버 */
.card-hover {
  transition: all 0.2s ease;
}

.card-hover:hover {
  background: #23242A;
  border-color: #F2A003;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(242,160,3,0.15);
}

/* 링크 호버 */
.link-hover {
  color: #E0DFE4;
  transition: color 0.15s ease;
}

.link-hover:hover {
  color: #F2A003;
}
```

### 🔄 **로딩 애니메이션**

```css
/* 스피너 애니메이션 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #A0A0B0;
  border-top: 2px solid #F2A003;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 페이드 인 애니메이션 */
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

## 실제 구현 예시

### 💡 **메인 화면 레이아웃**

```css
/* 전체 페이지 구조 */
.home-page {
  min-height: 100vh;
  width: 100%;
  background: #14151A;
  color: #E0DFE4;
  font-family: 'Inter', sans-serif;
}

/* 상단 바 */
.top-bar {
  position: sticky;
  top: 0;
  height: 88px;
  background: rgba(20,21,26,0.98);
  border-bottom: 1px solid #23242A;
  z-index: 10;
}

.top-bar-inner {
  max-width: 480px;
  margin: 0 auto;
  height: 100%;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 메인 콘텐츠 */
.main-content {
  flex: 1;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 0 80px 0;
}

/* 잔액 요약 */
.balance-summary {
  text-align: center;
  margin: 8px auto 32px auto;
  padding: 0 16px;
}

.total-amount {
  font-size: 48px;
  font-weight: 800;
  color: #E0DFE4;
  letter-spacing: -1.5px;
  margin-bottom: 14px;
}

/* 액션 버튼 그룹 */
.action-buttons {
  display: flex;
  gap: 8px;
  margin: 0 16px 56px 16px;
}

.action-button {
  flex: 1;
  height: 72px;
  border-radius: 24px;
  font-weight: 700;
  font-size: 22px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-button--primary {
  background: #F2A003;
  color: #14151A;
}

.action-button--secondary {
  background: #E0DFE4;
  color: #14151A;
}

/* 자산 카드 리스트 */
.asset-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 16px;
}

.asset-card {
  background: #1B1C22;
  border-radius: 20px;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.2s ease;
}

.asset-card:hover {
  background: #23242A;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
```

### 🎨 **컴포넌트 스타일링 팁**

```css
/* ✅ 좋은 스타일링 패턴 */

/* 1. 명확한 계층 구조 */
.component {
  /* 레이아웃 속성 먼저 */
  display: flex;
  flex-direction: column;
  width: 100%;
  
  /* 크기 속성 */
  height: auto;
  padding: 16px;
  margin: 8px 0;
  
  /* 외관 속성 */
  background: #1B1C22;
  border-radius: 12px;
  border: 1px solid transparent;
  
  /* 텍스트 속성 */
  font-size: 16px;
  font-weight: 500;
  color: #E0DFE4;
  
  /* 상호작용 속성 */
  cursor: pointer;
  transition: all 0.2s ease;
}

/* 2. 상태별 스타일링 */
.component:hover {
  background: #23242A;
  border-color: #F2A003;
}

.component:focus {
  outline: 2px solid #F2A003;
  outline-offset: 2px;
}

.component:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 3. 반응형 고려 */
@media (max-width: 480px) {
  .component {
    padding: 12px;
    font-size: 14px;
  }
}
```

## 디버깅과 개발 도구

### 🔍 **CSS 디버깅**

```css
/* 개발 중 레이아웃 시각화 */
.debug * {
  outline: 1px solid red !important;
}

/* 그리드 시각화 */
.debug-grid {
  background-image: 
    linear-gradient(rgba(255,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* 컴포넌트 경계 표시 */
.debug-component {
  border: 2px dashed yellow !important;
  position: relative;
}

.debug-component::before {
  content: attr(class);
  position: absolute;
  top: -20px;
  left: 0;
  background: yellow;
  color: black;
  padding: 2px 4px;
  font-size: 10px;
}
```

### 🛠 **개발 유틸리티**

```javascript
// 개발자 도구에서 사용할 수 있는 CSS 헬퍼
const cssHelpers = {
  // 모든 요소에 테두리 표시
  showBorders: () => {
    const style = document.createElement('style');
    style.textContent = '* { outline: 1px solid red !important; }';
    document.head.appendChild(style);
  },
  
  // 특정 클래스를 가진 요소들 하이라이트
  highlight: (className) => {
    document.querySelectorAll(`.${className}`).forEach(el => {
      el.style.background = 'rgba(255,255,0,0.3)';
    });
  },
  
  // 컴포넌트별 색상 구분
  colorizeComponents: () => {
    const colors = ['red', 'blue', 'green', 'orange', 'purple'];
    document.querySelectorAll('[class*="component"]').forEach((el, i) => {
      el.style.borderColor = colors[i % colors.length];
    });
  }
};

// 사용법: 개발자 콘솔에서
// cssHelpers.showBorders();
// cssHelpers.highlight('balance-card');
```

이 튜토리얼을 통해 CSS를 잘 모르는 개발자도 nest-wallet의 UI/UX 구조를 이해하고, 효과적으로 스타일을 수정하거나 새로운 컴포넌트를 만들 수 있습니다. 핵심은 기존 패턴을 따라하고, 일관된 색상과 간격을 사용하는 것입니다! 🎨