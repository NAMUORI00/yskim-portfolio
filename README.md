# 김유석 포트폴리오

[English](README.en.md) | [사이트 namuori.net](https://namuori.net)

연구와 프로젝트, 기술 스택, 지식 맵을 한곳에 모은 개인 포트폴리오 사이트의 소스입니다. 콘텐츠를 Git으로 관리하고, `main`에 반영하면 Cloudflare Pages의 GitHub 연동이 사이트를 빌드하고 배포합니다.

```text
content/ + client/ → main push → Cloudflare Pages → namuori.net
```

## 주요 기능

- 프로젝트와 연구 소개 (MDX), 프로젝트별 요약과 모듈 흐름 도식
- 논문, 학력, 경력, 기술 스택과 관심 오픈소스
- 분야별 지식 맵
- 한국어와 영어 전환
- GitHub 스타 목록 일일 자동 동기화

## 기술 스택

React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Vitest, GitHub Actions, Cloudflare Pages

## 개발

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm check && pnpm test && pnpm build
```

외부 CMS나 API 키 없이 저장소만으로 빌드됩니다. GitHub Actions는 타입·테스트·빌드를 검사하고, Cloudflare Pages가 배포합니다. 콘텐츠 파일 위치와 배포 설정은 [docs/editing.md](docs/editing.md)에 정리했습니다.
