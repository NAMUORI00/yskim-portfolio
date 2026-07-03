# Notion CMS 구조

이 포트폴리오는 Notion 워크스페이스 **`KYS - Portfolio (CMS)`**의 섹션별 데이터베이스를 운영 원본으로 사용합니다. 공개 포트폴리오 렌더링은 Notion 페이지가 아니라 `namuori.net`에서만 담당합니다.

## 관리 원칙

콘텐츠는 블로그 글처럼 각 카테고리 DB의 row/page에서 관리합니다. KO/EN은 같은 DB 안에서 `Locale=ko/en`, 같은 `Key`로 짝을 맞춥니다.

DB 속성은 "렌더링에 필요한 메타데이터"만 둡니다. 설명, 성과, bullet, 긴 소개, 연구/프로젝트 상세, 번역 본문처럼 사람이 글로 읽고 쓰는 내용은 row 내부 페이지에 작성합니다.

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
| `Slug` | 상세 페이지 URL slug가 필요한 콘텐츠에서 사용 |
| `Highlight` | 대표 프로젝트 우선 노출 |

`Summary`, `Bullets`, `Items`, `Metric`처럼 문장이나 목록을 담던 컬럼은 제거했습니다. 카드/목록 요약은 내부 페이지의 첫 문단에서, 스킬/타임라인 목록은 내부 페이지의 bullet list에서 읽습니다.

## 섹션별 주요 필드

| DB | 주요 필드 | 산출물 |
|----|----|----|
| `Profile` | `Romanized`, `Handle`, `Availability`, `Headline`, `Avatar URL` | `content/profile.json` |
| `Intro` | `Summary Lead`, 페이지 본문 | `profile.json.summary` |
| `Contacts` | `Type`, `Href` | `profile.json.contacts[]` |
| `Timeline` | `Type`, `School`, `Period`, `Current`, `Highlight`, 페이지 본문 | `content/education.json` |
| `Research Interests` | `Slug`, `Show Diagram`, `Related Notes`, 페이지 본문 | `content/research/*.mdx` |
| `Projects` | `Slug`, `Period`, `Category`, `Focus`, `Proof Level`, `Tags`, `Link`, `Highlight`, `Related Notes`, 페이지 본문 | `content/projects/*.mdx` |
| `Tech Stack` | 페이지 본문 | `content/skills.json` |
| `Starred Repos` | `Href`, `Stars`, 페이지 본문 | `content/starred.json` |
| `Notes` | `Slug`, `Date`, `Tags`, `Type`, `Related Projects`, `Related Research`, 페이지 본문 | `content/notes/*.mdx` |
| `Site Config` | `Description`, `URL` | `content/site.json` |

`Tags`, `Related Notes`, `Related Projects`, `Related Research`를 속성으로 유지할 때는 쉼표 또는 줄바꿈 기반 텍스트로 관리합니다. JSON을 직접 쓰지 않습니다.

## 얇은 스키마 원칙

아래 속성은 삭제됐거나 새 글에서 다시 만들지 않습니다. 같은 내용은 내부 페이지 본문으로 관리합니다.

| 기존 속성 | 권장 위치 | 렌더링 동작 |
|----|----|----|
| `Summary`, `Desc` | 내부 페이지 첫 문단 | 첫 문단을 자동 요약으로 사용 |
| `Bullets` | 내부 페이지 bullet list | 첫 bullet list를 타임라인 bullet로 사용 |
| `Items` | 내부 페이지 bullet list | 첫 bullet list를 기술 스택 items로 사용 |
| `Metric` | 프로젝트 본문 `Evidence` 섹션의 `Metric:` 줄 | 카드 성과값으로 자동 사용 |
| `Metrics JSON`, `Evaluation JSON` | 프로젝트 본문 표/목록 | 고급 구조화가 필요할 때만 유지 |
| `Related ...` 텍스트 | 본문 링크 또는 추후 Relation 속성 | 노트/프로젝트처럼 화면 연결에 쓰는 경우에만 유지 |

새 항목을 만들 때 기본적으로 채울 속성은 `Title`, `Locale`, `Key`, `Status`, `Private`, `Order`입니다. 프로젝트/연구/노트처럼 URL이 있는 글은 `Slug`를 추가하고, 화면 필터나 링크에 실제로 쓰이는 속성만 더 채웁니다.

## 작성 흐름

1. 해당 카테고리 DB에서 새 row를 만듭니다.
2. `Locale`, `Key`, `Status`, `Private`, `Order`를 채웁니다.
3. 긴 콘텐츠는 row 페이지 안에 일반 Notion 문서처럼 작성합니다.
4. 프로젝트 성과를 카드에 노출하려면 본문에 `## Evidence` 아래 `- Metric: ...` 형식으로 씁니다.
5. 타임라인/기술 스택 목록은 본문에 `- item` bullet list로 씁니다.
6. 영어가 필요하면 같은 DB 안에 같은 `Key`로 `Locale=en` row를 하나 더 만듭니다.
7. 공개 전에는 `Status=Published`, `Private=false`, 제목, 본문, 순서를 확인합니다.
8. GitHub Actions `Sync content from Notion`을 실행하거나 6시간 스케줄을 기다립니다.
7. 같은 워크플로가 `namuori.net` 콘텐츠를 재생성하고 Cloudflare Pages 배포를 트리거합니다.

## 배포 구조

- GitHub Actions `Sync content from Notion`이 `pnpm fetch:notion`을 실행합니다.
- fetch는 섹션별 카테고리 DB를 읽고, `content/`와 `content/i18n/en.json`을 재생성합니다.
- 변경이 있으면 Actions가 `main`에 `chore(content): sync from Notion` 커밋을 푸시합니다.
- Cloudflare Pages GitHub 연동이 `main` push를 빌드/배포합니다.

## 로컬에서 동기화

```bash
export NOTION_TOKEN=...     # PowerShell: $env:NOTION_TOKEN="..."
pnpm fetch:notion
pnpm dev
```

`NOTION_TOKEN`이 없으면 커밋된 `content/` seed로 빌드됩니다.
