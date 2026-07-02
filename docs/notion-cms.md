# Notion CMS 구조

이 포트폴리오는 Notion 워크스페이스 **`KYS - Portfolio (CMS)`**의 섹션별 데이터베이스를 운영 원본으로 사용합니다. `scripts/notion-content.mjs`와 `scripts/notion-public-page.mjs`는 더 이상 legacy 단일 DB를 읽지 않습니다.

## 관리 원칙

콘텐츠는 블로그 글처럼 각 카테고리 DB의 row/page에서 관리합니다. KO/EN은 같은 DB 안에서 `Locale=ko/en`, 같은 `Key`로 짝을 맞춥니다.

공개 반영 조건은 모든 DB에서 동일합니다.

- `Status=Published`
- `Private=false`
- 같은 섹션 안에서는 `Order` 오름차순

긴 본문은 row 페이지 안에 일반 Notion 문서처럼 작성합니다. 짧은 요약, 링크, 정렬, 공개 여부는 속성으로 관리합니다.

## 데이터베이스

| DB | 역할 | database id |
|----|----|----|
| `Portfolio - Profile` | 이름, 핸들, 상태, 헤드라인 | `9b24921c-efa4-4143-9ede-abe607300b32` |
| `Portfolio - Intro` | 소개 본문, About 문단 | `fa9e9444-6254-4088-9bde-69c556ad3d58` |
| `Portfolio - Contacts` | 이메일, GitHub, 웹사이트, 블로그 | `2744eeb0-e4fa-46d7-a46b-4ba700de003f` |
| `Portfolio - Timeline` | 학력, 커리어, 장기 실험 축 | `535722e0-d69e-4da8-abfe-1eb9c82835e3` |
| `Portfolio - Research Interests` | 연구 관심사와 연구 설명 | `9cf575d4-e968-4b0b-8cd0-5f30482b5a61` |
| `Portfolio - Projects` | 프로젝트, 증거, 링크, 상세 본문 | `654afefe-1d7e-452a-b1b4-614228fc5a11` |
| `Portfolio - Tech Stack` | 기술 스택 그룹 | `e2fdb49b-cf97-4840-a55c-6cd46613c167` |
| `Portfolio - Starred Repos` | 관심 저장소 링크 | `ea21f9e0-8981-4a95-9939-dcc48e89c2fc` |
| `Portfolio - Notes` | 포트폴리오 노트, `/notes` 콘텐츠 | `8a0a6041-63b4-49c6-85e3-af7e769c7356` |
| `Portfolio - Site Config` | 사이트 제목, 설명, URL | `723e7188-9b2f-4e6d-8ce7-122d5a9a2d53` |

## 공통 필드

| 필드 | 의미 |
|----|----|
| `Title` | 표시 제목 |
| `Locale` | `ko` 또는 `en` |
| `Key` | KO/EN을 묶는 고유 키 |
| `Status` | `Published`, `Draft`, `Archived` |
| `Private` | 공개 사이트와 공개 Notion 페이지에서 제외할지 여부 |
| `Order` | 같은 DB 안 표시 순서 |
| `Summary` | 카드/목록에 쓰는 짧은 요약 |
| `Slug` | 상세 페이지 URL slug가 필요한 콘텐츠에서 사용 |
| `Highlight` | 대표 프로젝트 우선 노출 |

## 섹션별 주요 필드

| DB | 주요 필드 | 산출물 |
|----|----|----|
| `Profile` | `Romanized`, `Handle`, `Availability`, `Headline`, `Summary Lead`, `Avatar URL` | `content/profile.json` |
| `Intro` | `Summary Lead`, `Summary`, 페이지 본문 | `profile.json.summary` |
| `Contacts` | `Type`, `Handle`, `Href`, `URL`, `Link` | `profile.json.contacts[]` |
| `Timeline` | `Type`, `School`, `Period`, `Start Date`, `End Date`, `Current`, `Bullets` | `content/education.json` |
| `Research Interests` | `Tags`, `Focus`, `Cover URL`, 페이지 본문 | `content/research/*.mdx` |
| `Projects` | `Period`, `Metric`, `Proof Level`, `Tags`, `Link`, `Focus`, `Cover URL`, 페이지 본문 | `content/projects/*.mdx` |
| `Tech Stack` | `Items`, `Category`, `Related Projects` | `content/skills.json` |
| `Starred Repos` | `Href`, `Stars`, `Tags`, `Category` | `content/starred.json` |
| `Notes` | `Date`, `Tags`, `Type`, 페이지 본문 | `content/notes/*.mdx` |
| `Site Config` | `Description`, `URL` | `content/site.json` |

`Tags`, `Items`, `Bullets`, `Related Notes`, `Related Projects`, `Related Research`는 쉼표 또는 줄바꿈 기반 텍스트로 관리합니다. JSON을 직접 쓰지 않습니다.

## 작성 흐름

1. 해당 카테고리 DB에서 새 row를 만듭니다.
2. `Locale`, `Key`, `Status`, `Private`, `Order`를 채웁니다.
3. 긴 콘텐츠는 row 페이지 안에 일반 Notion 문서처럼 작성합니다.
4. 영어가 필요하면 같은 DB 안에 같은 `Key`로 `Locale=en` row를 하나 더 만듭니다.
5. 공개 전에는 `Status=Published`, `Private=false`, 제목, 요약, 순서를 확인합니다.
6. GitHub Actions `Sync content from Notion`을 실행하거나 6시간 스케줄을 기다립니다.
7. 같은 워크플로가 `namuori.net` 콘텐츠와 공개 Notion 렌더링 페이지를 모두 재생성합니다.

## 배포 구조

- GitHub Actions `Sync content from Notion`이 `pnpm fetch:notion`을 실행합니다.
- fetch는 섹션별 카테고리 DB를 읽고, `content/`와 `content/i18n/en.json`을 재생성합니다.
- 이어서 `pnpm sync:notion-public`이 같은 카테고리 DB를 읽어 공개 Notion 렌더링 페이지의 본문 블록을 재생성합니다.
- 공개 페이지 자동 갱신에는 Notion 통합의 콘텐츠 읽기/삽입/업데이트 권한과 공개 렌더링 페이지 공유가 필요합니다.
- 변경이 있으면 Actions가 `main`에 `chore(content): sync from Notion` 커밋을 푸시합니다.
- Cloudflare Pages GitHub 연동이 `main` push를 빌드/배포합니다.

## 로컬에서 동기화

```bash
export NOTION_TOKEN=...     # PowerShell: $env:NOTION_TOKEN="..."
pnpm fetch:notion
pnpm sync:notion-public
pnpm dev
```

`NOTION_TOKEN`이 없으면 커밋된 `content/` seed로 빌드됩니다.
