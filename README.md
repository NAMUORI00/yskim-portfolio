# Namuori Portfolio CMS

[English README](README.en.md)

Namuori Portfolio CMS는 `content/` 폴더에 있는 포트폴리오 데이터를 읽어 공개 사이트를 만들고, `/admin`에서 수정한 내용을 GitHub Pull Request로 발행하는 배포형 포트폴리오 시스템입니다.

핵심 생각은 단순합니다.

1. 글과 프로필 정보는 코드가 아니라 `content/` 데이터로 관리합니다.
2. 관리자는 `/admin`에서 내용을 수정합니다.
3. 저장하면 GitHub의 `draft/...` 브랜치에 기록됩니다.
4. 게시하면 `main`으로 들어가는 Pull Request가 만들어집니다.
5. Cloudflare Pages가 미리보기와 실제 배포를 자동으로 만듭니다.

## 원리 다이어그램

아래 그림은 이 저장소가 어떤 경로로 콘텐츠를 저장하고 배포하는지 한눈에 볼 수 있도록 정리한 구조입니다.

![Namuori Portfolio CMS 원리 다이어그램](docs/assets/portfolio-cms-principle.png)

그림에서 중요한 흐름은 하나입니다.

`content/`에 있는 데이터가 `/admin` 편집기를 거쳐 GitHub 브랜치와 PR로 저장되고, Cloudflare Pages가 이를 빌드해 `namuori.net`에 보여줍니다.

## 현재 운영 주소

- 공개 사이트: `https://namuori.net`
- 관리자 페이지: `https://namuori.net/admin`
- GitHub 저장소: `https://github.com/NAMUORI00/namuori-portfolio-cms`
- Cloudflare Pages 프로젝트: `namuori-portfolio-cms`

## 기술 구성

- Frontend: React, Vite, TypeScript
- Content validation: Zod
- Styling: CSS, Tailwind 기반 유틸리티, Pretendard 중심 폰트 스택
- Admin auth: GitHub OAuth, 허용된 GitHub 계정만 관리자 접근
- Write path: Cloudflare Pages Functions -> GitHub App -> draft branch
- Deployment: Cloudflare Pages
- Verification: TypeScript check, Vitest, production build

## 폴더 구조

```text
content/
  site.json              # 사이트 제목, 설명, 내비게이션, 공통 이미지
  profile.json           # 이름, 소개, 연락처, 프로필 상태
  education.json         # 학력, 타임라인, CV형 이력
  research/*.mdx         # 연구 관심사 글
  projects/*.mdx         # 프로젝트 글
  skills.json            # 기술 스택 그룹
  starred.json           # 관심 저장소
  notes/*.mdx            # 상세 노트와 보조 문서

client/src/
  pages/Home.tsx         # 공개 포트폴리오 화면
  pages/Admin.tsx        # 관리자 편집 화면
  content/schema.ts      # 콘텐츠 검증 규칙

functions/api/
  auth/*                 # GitHub 로그인
  github/save.js         # draft 브랜치에 저장
  github/publish.js      # 게시 PR 생성 또는 갱신
  github/import.js       # GitHub 후보 데이터 가져오기
  translate/en.js        # 영어 초안 생성 API
```

## 로컬 개발

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install
pnpm dev
```

로컬에서 열 수 있는 주소입니다.

- 포트폴리오: `http://localhost:3000/`
- 노트: `http://localhost:3000/notes`
- 데모 관리자: `http://localhost:3000/admin?demo=1`

`?demo=1`은 편집 화면 동작을 확인하기 위한 로컬 모드입니다. 실제 GitHub 저장이나 PR 생성은 하지 않습니다.

## 콘텐츠 수정 흐름

관리자 기준 흐름은 다음과 같습니다.

1. `/admin`에 접속합니다.
2. 허용된 GitHub 계정으로 로그인합니다.
3. 프로필, 타임라인, 연구 관심사, 프로젝트, 기술 스택, 관심 저장소, 노트를 수정합니다.
4. `Save draft`로 `draft/...` 브랜치에 저장합니다.
5. `Publish PR`로 `main` 대상 Pull Request를 만듭니다.
6. PR의 Cloudflare Pages 미리보기를 확인합니다.
7. 문제가 없으면 PR을 merge해 운영 사이트에 배포합니다.

## 한국어와 영어 콘텐츠

기본 작성 언어는 한국어입니다. 영어 콘텐츠는 한국어 원문을 기준으로 초안을 생성한 뒤 관리자가 직접 다듬는 구조입니다.

- 한국어 원본: `content/*.json`, `content/**/*.mdx`
- 영어 번역본: `content/i18n/en.json`
- 공개 화면: KO/EN 토글 지원
- 관리자 화면: 한국어와 영어 콘텐츠를 같은 흐름에서 관리

## 보안 모델

이 프로젝트는 관리 기능이 공개 사이트와 같은 도메인에 있지만, 쓰기 작업은 다음 조건을 통과해야 합니다.

- GitHub OAuth 로그인
- `ADMIN_GITHUB_USERS`에 포함된 계정인지 확인
- 서명된 세션 쿠키 검증
- same-origin 관리자 요청 헤더 확인
- 허용된 콘텐츠 경로만 저장
- `draft/...` 브랜치 형식만 허용
- 파일 개수와 파일 크기 제한
- `javascript:` 같은 위험 URL 차단
- Cloudflare `_headers` 기반 CSP, HSTS, frame 차단, nosniff 적용

## Cloudflare Pages 설정

Cloudflare Pages Git integration 기준 설정입니다.

```text
Repository: NAMUORI00/namuori-portfolio-cms
Production branch: main
Build command: pnpm build
Build output directory: dist/public
Functions directory: functions
Preview branches: draft/* and feature/*
```

필요한 환경 변수입니다.

```text
ADMIN_GITHUB_USERS=NAMUORI00
GITHUB_APP_ID=<GitHub App ID>
GITHUB_APP_CLIENT_ID=<GitHub App client ID>
GITHUB_APP_CLIENT_SECRET=<GitHub App client secret>
GITHUB_APP_PRIVATE_KEY=<GitHub App private key, newline escaped or multiline secret>
GITHUB_APP_INSTALLATION_ID=<installation ID>
GITHUB_REPO_OWNER=NAMUORI00
GITHUB_REPO_NAME=namuori-portfolio-cms
SESSION_SECRET=<long random secret>
```

GitHub App callback URL은 운영 도메인 기준으로 다음 값을 포함해야 합니다.

```text
https://namuori.net/api/auth/callback
```

Pages 기본 도메인도 함께 쓴다면 다음 형식의 callback URL도 GitHub App에 추가합니다.

```text
https://<project>.pages.dev/api/auth/callback
```

## 검증

일반적인 변경 후에는 아래 명령을 실행합니다.

```bash
pnpm check
pnpm test
pnpm build
```

보안 관련 변경 후에는 추가로 확인합니다.

```bash
pnpm audit --prod
```

배포는 Cloudflare Pages에서 GitHub merge를 통해 자동으로 수행하거나, 필요 시 Wrangler로 직접 수행할 수 있습니다.

```bash
npx wrangler pages deploy dist/public --project-name namuori-portfolio-cms --branch main
```
