# yskim Portfolio

[English README](README.en.md)

**Notion을 단일 원본(Single Source of Truth)으로 쓰는 포트폴리오**입니다.
Notion에서 내용을 편집하면 ① Notion 페이지 자체가 공유 가능한 포트폴리오가 되고,
② GitHub Actions가 그 내용을 가져와 정적 사이트(`namuori.net`)로 빌드·배포합니다.
"Notion을 요구하는 곳"과 "웹사이트를 보는 곳"을 한 번의 편집으로 모두 커버합니다.

흐름은 단순합니다.

1. Notion의 `KYS — Portfolio (CMS)` 워크스페이스에서 내용을 편집합니다.
2. 각 항목의 `Status`를 `Published`로 둡니다.
3. `scripts/notion-content.mjs`가 Notion → `content/`(JSON + MDX)를 재생성합니다.
4. Vite가 `content/`를 읽어 정적 사이트를 빌드합니다.
5. Cloudflare Pages가 배포합니다.

> 이전의 `/admin`(GitHub OAuth → draft 브랜치 → PR) 편집 경로는 제거되었습니다. 편집은 이제 **Notion에서만** 합니다.

## 아키텍처

```text
Notion category DBs ──fetch──▶  content/*.json + content/**/*.mdx  ──vite build──▶  dist/public  ──▶  Cloudflare Pages
 (섹션별 원본)       scripts/notion-content.mjs      (프론트엔드가 빌드 시 import)
```

- 프론트엔드(`client/src/content/index.ts`)는 빌드 시 `content/*.json`과 `content/**/*.mdx`를 그대로 import합니다.
- `fetch:notion`이 그 파일들을 Notion 내용으로 재생성합니다. 저장소에 커밋된 `content/`는 오프라인 빌드를 위한 **seed/cache**이며, fetch가 덮어씁니다.
- Notion 데이터베이스 구조와 속성 규약은 [docs/notion-cms.md](docs/notion-cms.md)를 참고하세요.

## 기술 구성

- Frontend: React, Vite, TypeScript, Wouter
- Content: Notion (`@notionhq/client` + `notion-to-md`)
- Validation: Zod (`client/src/content/schema.ts`)
- Deployment: Cloudflare Pages (정적)
- i18n: 각 카테고리 DB 안에서 `Locale=ko/en`, 같은 `Key`로 매칭 → `content/i18n/en.json`, KO/EN 토글

## 현재 운영 주소

- 공개 사이트: `https://namuori.net`
- GitHub 저장소: `https://github.com/NAMUORI00/yskim-portfolio`
- Cloudflare Pages 프로젝트: `namuori-portfolio-cms`
- Notion CMS: `KYS — Portfolio (CMS)` (URL은 비공개)

## 폴더 구조

```text
content/                 # Notion에서 생성되는 산출물(커밋된 seed, fetch가 덮어씀)
  site.json profile.json education.json skills.json starred.json order.json
  i18n/en.json
  research/*.mdx projects/*.mdx notes/*.mdx
scripts/
  notion-content.mjs     # Notion → content/ 재생성 파이프라인
  notion-setup.mjs       # GitHub secret/variable 점검
client/src/
  content/               # 콘텐츠 로더 + Zod 스키마 + 타입
  pages/Home.tsx         # 공개 포트폴리오
  pages/ContentPages.tsx # CV/노트/프로젝트/연구 상세
tests/notion-content.test.mjs   # fetch 변환 단위 테스트(node --test)
.github/workflows/sync-from-notion.yml   # fetch → build → deploy
```

## 로컬 개발

```bash
corepack enable
pnpm install

# Notion에서 최신 내용 가져오기 (NOTION_TOKEN 필요)
export NOTION_TOKEN=...        # PowerShell: $env:NOTION_TOKEN="..."
pnpm fetch:notion

pnpm dev                       # http://localhost:3000
```

`NOTION_TOKEN` 없이도 커밋된 `content/` seed로 `pnpm dev` / `pnpm build`가 동작합니다.
DB id는 `scripts/notion-content.mjs`에 기본값이 있어, 다른 워크스페이스를 쓸 때만 `.env`로 덮어쓰면 됩니다(`.env.example` 참고).

## 콘텐츠 편집 흐름

1. Notion `KYS — Portfolio (CMS)`의 섹션별 데이터베이스에서 항목을 추가/수정합니다.
2. `Locale`, `Key`, `Status`, `Order`를 채웁니다. 사이트에는 `Status=Published`이면서 `Private=false`인 항목만 반영됩니다.
3. 영어 노출이 필요하면 같은 `Key`로 `Locale=en` 항목을 하나 더 만듭니다.
4. GitHub Actions `Sync from Notion and deploy`가 실행되면 사이트에 반영됩니다
   (push / 수동 실행 / 6시간마다 스케줄).

## 검증

```bash
pnpm check        # tsc
pnpm test         # vitest (프론트엔드)
pnpm test:notion  # node --test (fetch 변환 로직)
pnpm build        # dist/public
```

## 배포 / 설정

**배포는 Cloudflare Pages의 GitHub 연동이 담당합니다.** `namuori-portfolio-cms` Pages 프로젝트가
이 저장소에 연결돼 있고(프로덕션 분기 `main`, 자동 배포), `main`에 push될 때마다
`pnpm build`(빌드 출력 `dist/public`)로 빌드·배포합니다. 별도의 Cloudflare API 토큰이 필요 없습니다.

콘텐츠 동기화는 GitHub Actions가 맡습니다.

- 흐름: `Sync content from Notion` 워크플로(스케줄 6h + 수동 실행)가 `pnpm fetch:notion`으로
  Notion → `content/`(+ 미디어 `client/public/notion/`)를 재생성하고, `pnpm sync:notion-public`으로
  Notion 공개 렌더링 페이지도 같은 카테고리 DB에서 다시 구성합니다. 변경이 있으면 `main`에 커밋·push →
  Cloudflare Pages가 그 push를 빌드·배포.
- 코드 변경(일반 push/PR 머지)은 Cloudflare Pages 연동이 직접 빌드·배포.
- `content/`와 `client/public/notion/`은 **커밋**됩니다(CF 빌드가 `pnpm build`만 돌리므로 산출물이 저장소에 있어야 함).

필요한 GitHub secret/variable (`pnpm check:notion`으로 점검):

```text
secret   NOTION_TOKEN       # Notion 통합 토큰. 카테고리 DB 읽기 + 공개 페이지 쓰기에 사용
variable NOTION_PROFILE_DB_ID
variable NOTION_INTRO_DB_ID
variable NOTION_CONTACTS_DB_ID
variable NOTION_TIMELINE_DB_ID
variable NOTION_RESEARCH_DB_ID
variable NOTION_PROJECTS_DB_ID
variable NOTION_SKILLS_DB_ID
variable NOTION_STARRED_DB_ID
variable NOTION_NOTES_DB_ID
variable NOTION_SITE_DB_ID
variable NOTION_PUBLIC_PAGE_ID # DB 기반 공개 Notion 렌더링 페이지 id
```

사용자 수동 작업: Notion 통합을 포트폴리오 관리 페이지, 섹션별 데이터베이스, 공개 렌더링 페이지에 연결(공유), 통합 권한에서 콘텐츠 읽기/삽입/업데이트를 허용, GitHub에 `NOTION_TOKEN` secret 입력.
(프록시 미디어 모드를 쓸 경우에만 Cloudflare Pages 런타임 secret `NOTION_TOKEN` + `NOTION_MEDIA_MODE=proxy` 추가.)
