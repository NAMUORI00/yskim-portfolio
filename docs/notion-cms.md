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

영어는 **언어별 분리 DB**로 관리합니다. 장문 콘텐츠는 `Slug`, 짧은 설정 섹션은 `Key`로 한국어 원본과 매칭합니다.

| EN DB | 매칭 | 산출물 |
|----|------|--------|
| Profile (EN) | `Key=profile` | `en.json.profile` |
| Site (EN) | `Key=site` | `en.json.site` |
| Contacts (EN) | `Key`로 Contacts와 매칭 | `en.json.profile.contacts` |
| Timeline (EN) | `Key`로 Timeline과 매칭 | `en.json.education[]` |
| Skills (EN) | `Key`로 Skills와 매칭 | `en.json.skills[...]` |
| Starred (EN) | `Key`로 Starred와 매칭 | `en.json.starred[...]` |
| Projects (EN) | `Slug`로 Projects와 매칭 | `en.json.projects[slug]` |
| Research (EN) | `Slug`로 Research와 매칭 | `en.json.research[slug]` |
| Notes (EN) | `Slug`로 Notes와 매칭 | `en.json.notes[slug]` |

## 작성 방법: 한국어/영어를 DB로 나눠서 관리 (권장)

장문 콘텐츠(Projects · Research · Notes)는 **노션에서 일반 문서처럼** 작성합니다. JSON을 쓸 필요가 없습니다.

- **한국어**: `Projects`/`Research`/`Notes` DB에 작성. 이 DB가 **원본(canonical)** 이라 slug·태그·기간·순서·카테고리·링크·상태 등 **구조/공통 필드**가 여기에 있습니다. 페이지 본문 = 한국어 본문.
- **영어**: 짝이 되는 `Projects (EN)`/`Research (EN)`/`Notes (EN)` DB에 작성. **번역만** 두면 됩니다 — `Slug`(한국어와 동일), 제목, 한 줄 요약(`Desc`/`Summary`), (프로젝트는 `Metric`·`Tags`, 기간이 "진행 중"처럼 번역이 필요하면 `Period`), 그리고 페이지 본문 = 영어 본문. 비운 필드는 한국어 값으로 폴백됩니다.

```
[Projects] aerospace-rag (한국어)          [Projects (EN)] aerospace-rag (English)
  Slug: aerospace-rag                        Slug: aerospace-rag   ← 동일 slug로 매칭
  Tags / Period / Link / Category …          Name / Desc / Metric / Tags
  본문: 한 줄 요약 + ## 개요 …               본문: one-line summary + ## Overview …
```

- fetch가 **한국어 DB → 사이트 KO 본문(MDX)**, **EN DB → en.json(EN 본문)** 으로 생성하고 `Slug`로 둘을 잇습니다.
- **요약(desc/summary)** 은 본문 **첫 문단에서 자동 추출**됩니다(원하면 `Desc`/`Summary` 속성으로 덮어쓰기).
- **slug** 는 한국어 DB의 제목에서 자동 생성(원하면 `Slug` 속성으로 수동 지정). **EN 행에는 같은 slug를 반드시 넣어야** 짝이 맞습니다.
- 짝이 되는 EN 행이 없으면 그 글은 영어에서 **한국어로 폴백**됩니다(한국어만 먼저 올려도 됨).
- 구조 필드(태그·기간 등)는 **한국어 DB 한 곳만** 고치면 됩니다. EN DB는 번역 텍스트만 — 양쪽이 어긋날 일이 없습니다.

**필수 속성은 한국어 DB의 `Name`(제목)과 `Status`뿐**입니다. 나머지(Tags·Link·Highlight·Period·Category/Focus)는 선택이며, 분류(Category/Focus)는 비우면 본문에서 추론됩니다. 장문 EN DB는 `Slug`·제목·`Status=Published`만 있으면 발행됩니다. 짧은 설정 EN DB는 `Key`와 번역 필드만 있으면 됩니다.

> 작성 흐름: 한국어 DB에서 New → 제목·`Status=Published` → 본문 작성(이미지 드래그·표 등) → (영어가 필요하면) EN DB에서 New → **같은 Slug** + 제목 + 영어 본문 → `Status=Published`. namuori.net은 KO/EN 토글로 갈라 보여줍니다.

## 속성 규약

- **Status**: `Published` / `Draft` / `Archived`. 콘텐츠 DB(Projects/Research/Notes/Timeline)는 `Published`만 발행됩니다.
- **Order** (number): 사이트 표시 순서. 작을수록 먼저.
- **관계 필드**(`Related Notes`, `Related Projects`, `Related Research`, `Related Skills`): Notion 관계 대신 **쉼표로 구분한 slug 문자열** rich_text로 둡니다. 예: `aerospace-rag, llm-rag-research`.
- **Bullets** (Timeline): 한 줄에 하나씩.
- **Links** (Timeline): 한 줄에 `라벨|https://주소` 형식.
- **Metric** (Projects): 카드에 표시할 핵심 지표 한 줄(선택). (예전의 `Metrics JSON`/`Evaluation JSON` 구조화 속성은 제거됨 — JSON 수기 작성 불필요.)
- **Cover / Avatar** (files): fetch가 `client/public/notion/...`로 self-host하고 경로를 치환합니다.
- **영어(i18n)**:
  - **장문 콘텐츠**(Projects/Research/Notes): 위 "작성 방법"처럼 **EN DB**에서 관리합니다. `Slug`로 한국어 행과 매칭.
  - **짧은 설정**(Profile/Site/Timeline/Skills/Starred/Contacts): 짝이 되는 **EN DB**에서 관리합니다. `Key`로 한국어 행과 매칭. 기존 `… (EN)` 속성은 누락 시 fallback으로만 사용합니다.
  - 두 경로 모두 `content/i18n/en.json`으로 합쳐집니다.

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
| Profile (EN) | `bf146819-6058-449a-a228-ff095d650efa` |
| Site (EN) | `269ac4da-d038-4a91-a247-0370c641cdba` |
| Contacts (EN) | `dc570f0b-b20c-47fc-ba44-2be0d4fee913` |
| Timeline (EN) | `65181b91-fcc8-4794-8160-cd60e95fdb62` |
| Skills (EN) | `d574da0e-ad8b-4da5-9339-c3dd68c70d6c` |
| Starred (EN) | `e17abf1b-f603-4ba0-a6ae-a23a4958dafc` |
| Projects (EN) | `f3b4502f-afc7-4601-b447-d7966d6b983b` |
| Research (EN) | `405ae235-49cc-4fc5-b31a-7102584ef75a` |
| Notes (EN) | `5a7b919e-e9e6-4076-9291-1a8cdf5a6d0e` |

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
2. 부모 페이지 `KYS — Portfolio (CMS)`(`37fdcd44-779f-8161-827b-d4cc6615a7ab`)를 그 통합과 **공유(•••→Connections→통합 추가)**합니다. 하위 KO/EN DB에 상속됩니다. **이 연결이 없으면 fetch가 404로 실패합니다.**
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

1. **한국어**: `Projects`에서 새 페이지 → `Name`(제목)·`Tags`·`Order` 등을 채우고 본문에 개요/상세를 작성합니다. `Status=Published`.
2. **영어(선택)**: `Projects (EN)`에서 새 페이지 → **같은 `Slug`** + `Name`(영문)·`Metric`(영문) + 영어 본문. `Status=Published`. (생략하면 영어에서 한국어로 폴백.)
3. `pnpm fetch:notion`(로컬) 또는 GitHub Actions 실행으로 사이트에 반영합니다.
4. slug는 한국어 제목에서 자동 생성되므로, EN 행의 `Slug`는 한국어 행과 정확히 같아야 매칭됩니다.
