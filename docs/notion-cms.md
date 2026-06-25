# Notion CMS 구조

이 포트폴리오는 Notion 워크스페이스 **`KYS — Portfolio (CMS)`**의 **`Portfolio Entries` 단일 데이터베이스**를 운영 원본으로 사용합니다.
`scripts/notion-content.mjs`는 이 DB만 읽어 `content/` 산출물을 재생성합니다. 예전 섹션별 DB fallback은 제거됐습니다.

## 관리 원칙

모든 콘텐츠는 같은 방식으로 작성합니다.

| 필드 | 의미 |
|----|----|
| `Title` | 표시 제목. 프로젝트면 프로젝트명, 연락처면 라벨, 기술 스택이면 그룹명 |
| `Section` | `profile`, `site`, `contacts`, `timeline`, `projects`, `research`, `notes`, `skills`, `starred` |
| `Locale` | `ko` 또는 `en` |
| `Key` | KO/EN을 묶는 고유 키. 같은 콘텐츠의 KO row와 EN row는 같은 `Key`를 씁니다 |
| `Status` | `Published`, `Draft`, `Archived`. 사이트에는 `Published`만 반영 |
| `Order` | 같은 섹션 안 표시 순서 |
| 페이지 본문 | profile/projects/research/notes의 긴 본문. Notion 페이지 안에 그냥 작성 |

영어는 별도 DB가 아니라 같은 DB에서 `Locale=en` row로 관리합니다.

```text
Portfolio Entries
  Key: aerospace-rag, Locale: ko, Section: projects, Title: 항공우주 RAG ...
  Key: aerospace-rag, Locale: en, Section: projects, Title: Aerospace RAG ...
```

## 섹션별 사용 필드

| Section | 주요 필드 | 산출물 |
|----|----|----|
| `profile` | `Title`, `Romanized`, `Handle`, `Availability`, `Headline`, `Summary Lead`, 페이지 본문 | `content/profile.json` |
| `site` | `Title`, `Summary`, `URL` | `content/site.json` |
| `contacts` | `Title`, `Key`, `Type`, `Href`, `Order` | `profile.json.contacts[]` |
| `timeline` | `Title`, `Type`, `School`, `Period`, `Summary`, `Bullets`, `Links`, `Current`, `Highlight` | `content/education.json` |
| `projects` | `Title`, `Slug`, `Summary`, `Period`, `Metric`, `Tags`, `Link`, `Highlight`, `Private`, 페이지 본문 | `content/projects/<slug>.mdx` |
| `research` | `Title`, `Slug`, `Summary`, `Show Diagram`, 페이지 본문 | `content/research/<slug>.mdx` |
| `notes` | `Title`, `Slug`, `Date`, `Summary`, `Tags`, 페이지 본문 | `content/notes/<slug>.mdx` |
| `skills` | `Title`, `Items`, `Order` | `content/skills.json` |
| `starred` | `Title`, `Href`, `Stars`, `Summary`, `Order` | `content/starred.json` |

`Tags`, `Items`, `Bullets`, `Related Notes`, `Related Projects`, `Related Research`, `Related Skills`는 쉼표 또는 줄바꿈 기반 텍스트로 관리합니다. JSON을 직접 쓰지 않습니다.

## 작성 흐름

1. `Portfolio Entries`에서 새 row를 만듭니다.
2. `Section`, `Locale=ko`, `Key`, `Status=Published`, `Order`를 채웁니다.
3. 긴 콘텐츠는 row 페이지 안에 본문을 작성합니다.
4. 영어가 필요하면 같은 `Key`로 `Locale=en` row를 하나 더 만듭니다.
5. GitHub Actions `Sync content from Notion`을 실행하거나 6시간 스케줄을 기다립니다.
6. 같은 워크플로가 공개 Notion 렌더링 페이지도 `Portfolio Entries`에서 다시 구성합니다.

## 데이터베이스 ID

| DB | database id |
|----|-------------|
| Portfolio Entries | `a15aff41-47f3-4a92-8dc8-a1367ae00a46` |

## 배포 구조

- GitHub Actions `Sync content from Notion`이 `pnpm fetch:notion`을 실행합니다.
- fetch는 `Portfolio Entries`를 읽고, `content/`와 `content/i18n/en.json`을 재생성합니다.
- 이어서 `pnpm sync:notion-public`이 같은 DB를 읽어 공개 Notion 렌더링 페이지의 본문 블록을 재생성합니다.
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
