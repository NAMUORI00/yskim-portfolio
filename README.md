# 김유석 포트폴리오

[English](README.en.md) · [사이트](https://namuori.net) · [GitHub](https://github.com/NAMUORI00/yskim-portfolio)

콘텐츠, 이미지, 화면 코드를 이 저장소에서 관리합니다. `main`에 변경을 반영하면 Cloudflare Pages의 GitHub 연동이 사이트를 빌드하고 배포합니다.

```text
Git 저장소의 content/ + client/ → main push → Cloudflare Pages → namuori.net
```

## 수정할 파일

| 내용 | 원본 |
|---|---|
| 프로필과 소개 | `content/profile.json` |
| 논문·학력·경력 | `content/education.json` |
| 기술·관심 오픈소스 | `content/skills.json`, `content/starred.json` |
| 연구 관심 분야 | `content/research/*.mdx` |
| 프로젝트·노트 | `content/projects/*.mdx`, `content/notes/*.mdx` |
| 표시 순서 | `content/order.json` |
| 영어 번역 | `content/i18n/en.json` |
| 사이트 정보 | `content/site.json` |
| 이미지·첨부 | `client/public/` |
| 화면과 스타일 | `client/src/` |

MDX의 앞부분에는 제목·설명·상태 등 메타데이터를, 아래에는 본문을 작성합니다. 공개 항목은 `status: published`로 지정합니다. 한국어를 수정하면 같은 키의 영어 번역도 갱신합니다. 변경 사항은 Git diff로 검토합니다.

## 개발과 확인

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
```

외부 CMS나 API 키 없이 저장소만으로 빌드됩니다. GitHub Actions는 타입·테스트·빌드를 검사하고, Cloudflare Pages가 배포합니다. 검증 워크플로가 Pages 배포를 차단하는 구조는 아니므로 push 전에 로컬 검사도 수행합니다.

## 배포

- Pages 프로젝트: `namuori-portfolio-cms` (기존 도메인 연결 유지)
- 운영 브랜치: `main`
- 빌드 명령: `pnpm build`
- 출력: `dist/public`
- 운영 주소: `https://namuori.net`

## 이전 Notion 연동

2026-10-01부터 Notion 자동 동기화와 미디어 프록시를 제거했습니다. 기존 Notion 페이지는 변경하지 않습니다. `content/`는 캐시가 아닌 정식 원본이며 자동 가져오기로 덮어쓰지 않습니다. 이전에 내려받은 정적 이미지도 Git에서 계속 관리합니다. [전환 기록](docs/notion-cms.md)
