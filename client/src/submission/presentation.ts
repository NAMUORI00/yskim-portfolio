import type { ProjectEntry, EducationEntry } from "@/content/types";
import { PROJECT_INSIGHTS } from "@/components/capabilities/projectInsights";

const categories: [string, string[]][] = [
  [
    "프로그래밍 언어",
    [
      "Python",
      "Java",
      "JavaScript",
      "TypeScript",
      "C++",
      "C#",
      "Dart",
      "PHP",
      "Shell",
      "PowerShell",
    ],
  ],
  [
    "AI 및 머신러닝",
    [
      "PyTorch",
      "RAG",
      "LoRA",
      "Spleeter",
      "CUDA",
      "HuggingFace",
      "LangChain",
      "OpenAI API",
      "llama.cpp",
      "scikit-learn",
      "Ollama",
      "vLLM",
      "Qwen3-VL",
      "SigLIP2",
      "Grounding DINO",
      "Google Vision",
      "Hydra",
    ],
  ],
  ["백엔드", ["Spring Boot", "Spring Security", "FastAPI", "JPA"]],
  [
    "프론트엔드 및 모바일",
    ["Vue", "React", "Next.js", "Flutter", "Bootstrap", "Vite"],
  ],
  ["데이터베이스", ["MySQL", "PostgreSQL", "Qdrant", "Supabase"]],
  [
    "개발환경 및 인프라",
    [
      "Docker",
      "GitHub Actions",
      "Linux",
      "Cloudflare",
      "DevContainer",
      "AWS",
      "MediaMTX",
      "GitHub API",
    ],
  ],
  ["임베디드 및 하드웨어", ["Arduino", "회로", "펌웨어"]],
  ["게임 개발", ["Unity"]],
];
export function technicalSkills(
  projects: ProjectEntry[],
  records: EducationEntry[]
) {
  const used = new Set([
    ...projects.flatMap(p => p.tags),
    ...records.flatMap(e => e.relatedSkills),
  ]);
  return categories
    .map(([label, technologies]) => ({
      label,
      items: technologies.filter(t => used.has(t)),
    }))
    .filter(group => group.items.length > 0);
}
export function projectDiagram(project: ProjectEntry): {
  nodes: string[];
  sequence: boolean;
} {
  const flows: Record<string, string[]> = {
    "smartfarm-rag": ["질문 분석", "검색 조합 선택", "문서 검색 및 답변 생성"],
    "mv-evirag": ["영상 선택", "답변 가능성 판단", "응답 제공 또는 보류"],
    "music-splitter-web": ["음원 업로드", "AI 음원 분리", "결과 다운로드"],
  };
  if (flows[project.slug])
    return { nodes: flows[project.slug], sequence: true };
  return {
    nodes: (PROJECT_INSIGHTS[project.slug]?.modules ?? [])
      .slice(0, 3)
      .map(m => m.name.ko),
    sequence: false,
  };
}
