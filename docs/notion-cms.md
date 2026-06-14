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

## 셋업 (최초 1회, 사용자 작업)

1. Notion **내부 통합(integration)** 토큰을 준비합니다(블로그와 공유하는 `BLOG` 통합을 그대로 써도 됩니다).
2. 부모 페이지 `KYS — Portfolio (CMS)`(`37fdcd44-779f-8161-827b-d4cc6615a7ab`)를 그 통합과 **공유(•••→Connections→통합 추가)**합니다. 하위 9개 DB에 상속됩니다. **이 연결이 없으면 fetch가 404로 실패합니다.**
3. 통합 토큰을 로컬 `.env`의 `NOTION_TOKEN`과 GitHub 저장소 secret으로 설정합니다.
4. Cloudflare 배포용으로 `CLOUDFLARE_API_TOKEN`(Pages 편집 권한), `CLOUDFLARE_ACCOUNT_ID` secret을 추가합니다.
5. `pnpm check:notion`으로 누락된 secret/variable과 설정 명령을 확인합니다.

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
