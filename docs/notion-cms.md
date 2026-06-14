# Notion CMS 구조

이 포트폴리오는 Notion 워크스페이스 **`KYS — Portfolio (CMS)`**(부모 페이지)를 단일 원본으로 사용합니다.
`scripts/notion-content.mjs`가 각 데이터베이스를 읽어 `content/` 산출물을 재생성합니다.

## 데이터베이스와 산출물

| DB | 산출물 | 비고 |
|----|--------|------|
| Profile | `content/profile.json` | 단일 행. 페이지 본문 단락 = `summary[]` |
| Contacts | `profile.json.contacts[]` | `Order`로 정렬, `Key`가 contact id |
| Site | `content/site.json` | 단일 행. `navigation`/`images`는 fetch 기본값 주입 |
| Timeline | `content/education.json` | `Status=Published`, `Order` 정렬 |
| Projects | `content/projects/<slug>.mdx` | 페이지 본문 = MDX 본문 |
| Research | `content/research/<slug>.mdx` | 페이지 본문 = MDX 본문 |
| Notes | `content/notes/<slug>.mdx` | 페이지 본문 = MDX 본문 |
| Skills | `content/skills.json` | `Items`는 쉼표 구분(순서 유지) |
| Starred | `content/starred.json` | `Order` 정렬 |

추가로 `content/order.json`(컬렉션별 표시 순서)과 `content/i18n/en.json`(영어 번역)이 생성됩니다.

## 자연 작성 (권장): 한 페이지에 한국어·영어 함께

장문 콘텐츠(Projects · Research · Notes)는 **노션에서 일반 문서처럼** 작성합니다. JSON·여러 속성을 채울 필요 없이, 본문에 두 언어 구역만 두면 됩니다.

**본문 형식** — 다음 중 하나로 두 언어를 구분합니다(둘 다 지원):
- **제목 방식**: 본문에 `# 한국어` 와 `# English` 제목을 두고 각 구역에 자유롭게 작성.
- **토글 방식**: `한국어` 토글과 `English` 토글을 만들고 그 안에 작성(페이지가 깔끔).

```
# 한국어
(한 줄 요약)
## 개요
…본문(이미지·표·콜아웃·코드 자유)…

# English
(one-line summary)
## Overview
…body…
```

- fetch가 **한국어 구역 → 사이트 KO 본문**, **English 구역 → en.json(EN 본문)** 으로 분리합니다.
- **요약(desc/summary)** 은 각 구역의 **첫 문단에서 자동 추출** → 별도 속성 입력 불필요.
- **slug** 는 제목에서 자동 생성(원하면 `Slug` 속성으로 수동 지정).
- 영어 구역이 없으면 한국어만 발행되고, 기존 `… (EN)` 속성이 있으면 그걸 폴백으로 씁니다(하위호환).
- `Metrics JSON`/`Evaluation JSON`은 더 이상 필수가 아닙니다. 핵심지표 칩이 필요하면 `Metric`(한 줄) 속성만 채우면 됩니다.

**필수 속성은 `Name`(제목)과 `Status`뿐**입니다. 나머지(Tags·Link·Highlight·Period·Category/Focus)는 선택이며, 분류(Category/Focus)는 비우면 본문에서 추론됩니다.

> 작성 흐름: New → 제목 → `# 한국어`/`# English`에 평소처럼 작성(이미지 드래그·표 등) → (원하면 태그·커버) → `Status=Published`. 노션에서도 두 언어가 한 페이지에 보이고, namuori.net은 KO/EN 토글로 갈라 보여줍니다.

## 속성 규약

- **Status**: `Published` / `Draft` / `Archived`. 콘텐츠 DB(Projects/Research/Notes/Timeline)는 `Published`만 발행됩니다.
- **Order** (number): 사이트 표시 순서. 작을수록 먼저.
- **관계 필드**(`Related Notes`, `Related Projects`, `Related Research`, `Related Skills`): Notion 관계 대신 **쉼표로 구분한 slug 문자열** rich_text로 둡니다. 예: `aerospace-rag, llm-rag-research`.
- **Bullets** (Timeline): 한 줄에 하나씩.
- **Links** (Timeline): 한 줄에 `라벨|https://주소` 형식.
- **Metrics JSON / Evaluation JSON** (Projects): 구조화 지표를 JSON 문자열로 저장.
  - 예: `[{"label":"MRR","value":"+31%","baseline":"단일 검색 채널","note":"..."}]`
  - 예: `{"baseline":"...","dataset":"...","method":"..."}`
- **Cover / Avatar** (files): fetch가 `client/public/notion/...`로 self-host하고 경로를 치환합니다.
- **영어(i18n)**: 번역이 필요한 필드는 동반 속성 `… (EN)`(예: `Title (EN)`, `Summary (EN)`, `Metrics JSON (EN)`)에 채웁니다. 비우면 한국어로 폴백합니다. `content/i18n/en.json`이 이 값들로 재생성됩니다.

## 데이터베이스 id

`.env.example`와 `scripts/notion-content.mjs`의 `DATABASE_DEFAULTS`에 기록되어 있습니다.

| DB | database id |
|----|-------------|
| Profile | `b5e3e644-61eb-4d9d-ae2d-61a2f3f44fd1` |
| Site | `b657b70e-6dbd-40b3-9b2d-4d4e5e02ba3d` |
| Contacts | `d67538d1-3374-4190-9c63-291dea15e5b7` |
| Timeline | `19648412-cd85-4edf-a688-b1830f8d4aa8` |
| Projects | `b2bdcda8-4d69-47dd-a334-e519de027888` |
| Research | `c8fadc0e-3148-4e1e-9593-0ee144cb4498` |
| Notes | `763f7111-ec1e-4d2d-8d6c-54a22bee930b` |
| Skills | `3dfa6886-7b83-41b2-95f5-a0665fb7dcaf` |
| Starred | `7800c04b-8f20-4521-9427-bfd0c373bbe2` |

## 미디어 & KV 캐시

본문에 이미지·영상·오디오·첨부를 넣으면 `scripts/notion-content.mjs`가 처리합니다.

- **이미지**: 항상 self-host. fetch가 `client/public/notion/<group>/<slug>/...`로 내려받고 본문 URL을 `/notion/...`로 치환합니다. 프론트의 `toMarkdownHtml`이 `<img>`로 렌더합니다.
- **영상/오디오/첨부**: `NOTION_MEDIA_MODE`로 동작이 갈립니다.
  - `download`(기본): 빌드 시 self-host. 런타임 함수 불필요.
  - `proxy`: 본문에 `/media/<블록ID>` 링크를 emit → `functions/media/[id].js`가 요청 시 Notion API로 신선한 URL을 받아 302 리다이렉트(임시 URL 만료 회피). 결과 URL은 KV(`MEDIA_CACHE`, namespace `3d788373ca964d438fe66849bf09420f`)에 45분 TTL로 캐시되어 Notion 호출을 최소화합니다.
  - YouTube/Vimeo 링크는 모드와 무관하게 반응형 iframe으로 임베드됩니다.
- `proxy` 모드를 켜려면: 저장소 variable `NOTION_MEDIA_MODE=proxy` + Cloudflare Pages에 런타임 secret `NOTION_TOKEN` 추가(미디어 함수가 사용) + `wrangler.toml`의 `MEDIA_CACHE` KV 바인딩(이미 구성됨). 함수 배포는 `wrangler pages deploy`가 `functions/`를 자동 번들합니다.
- `toMarkdownHtml`은 신뢰된 소유자 콘텐츠 기준으로 `<figure>/<iframe>/<video>/<audio>/<figcaption>/<a class="file-attachment">`만 통과시키고 나머지 HTML은 이스케이프합니다.

## 배포 구조

- **Cloudflare Pages GitHub 연동**이 배포를 담당합니다. `namuori-portfolio-cms` 프로젝트가 이 저장소에 연결돼 있고(프로덕션 `main`, 자동 배포) `main` push마다 `pnpm build`(출력 `dist/public`)로 빌드·배포합니다. **Cloudflare API 토큰 불필요.**
- `Sync content from Notion` GitHub Actions(스케줄 6h + 수동)가 `pnpm fetch:notion`으로 `content/`(+ `client/public/notion/` 미디어)를 재생성하고 변경 시 `main`에 커밋·push → CF가 자동 배포.
- 그래서 `content/`와 `client/public/notion/`은 **커밋**됩니다(CF 빌드가 fetch 없이 `pnpm build`만 돌리므로 산출물이 저장소에 있어야 함).

## 셋업 (최초 1회, 사용자 작업)

1. Notion **내부 통합(integration)** 토큰을 준비합니다(블로그와 공유하는 `BLOG` 통합을 그대로 써도 됩니다).
2. 부모 페이지 `KYS — Portfolio (CMS)`(`37fdcd44-779f-8161-827b-d4cc6615a7ab`)를 그 통합과 **공유(•••→Connections→통합 추가)**합니다. 하위 9개 DB에 상속됩니다. **이 연결이 없으면 fetch가 404로 실패합니다.**
3. 통합 토큰을 로컬 `.env`의 `NOTION_TOKEN`과 GitHub 저장소 secret으로 설정합니다.
4. `pnpm check:notion`으로 누락된 secret/variable과 설정 명령을 확인합니다.
5. (선택) 프록시 미디어 모드: GitHub variable `NOTION_MEDIA_MODE=proxy` + Cloudflare Pages 런타임 secret `NOTION_TOKEN` 추가.

## 로컬에서 동기화

```bash
export NOTION_TOKEN=...     # PowerShell: $env:NOTION_TOKEN="..."
pnpm fetch:notion          # Notion -> content/
pnpm dev                   # 반영 확인
```

## 새 항목 추가 예시

1. 해당 DB(예: Projects)에서 새 페이지를 만들고 `Slug`, `Name`, `Desc`, `Tags` 등을 채웁니다.
2. 페이지 본문에 개요/상세를 Markdown처럼 작성합니다(= MDX 본문).
3. 표시 순서를 `Order`로, 공개 여부를 `Status=Published`로 지정합니다.
4. `pnpm fetch:notion`(로컬) 또는 GitHub Actions 실행으로 사이트에 반영합니다.
