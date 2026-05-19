function slugBase(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "github-repo"
  );
}

function normalizeSource(source) {
  const trimmed = String(source || "").trim().replace(/\/+$/, "");
  if (/^github\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function parseGitHubImportSource(source, mode) {
  const normalized = normalizeSource(source);
  if (!normalized) throw new Error("GitHub source is required");

  let parts;
  if (/^https?:\/\//i.test(normalized)) {
    let url;
    try {
      url = new URL(normalized);
    } catch {
      throw new Error("Invalid GitHub URL");
    }
    if (url.hostname.toLowerCase() !== "github.com") {
      throw new Error("Only GitHub URLs are supported");
    }
    parts = url.pathname.split("/").filter(Boolean);
  } else {
    parts = normalized.split("/").filter(Boolean);
  }

  const [owner, repo] = parts;
  if (!owner || parts.length > 2) throw new Error("Unsupported GitHub source");
  if (mode === "repo" && !repo) throw new Error("Repository import requires owner/repo");
  if (mode === "profile" && repo) throw new Error("Profile import requires a GitHub owner only");
  return repo ? { owner, repo } : { owner };
}

export function compactStars(value) {
  const count = Number(value || 0);
  if (count < 1000) return String(count);
  const compact = count / 1000;
  return `${compact >= 10 ? compact.toFixed(1) : compact.toFixed(1)}`.replace(/\.0$/, "") + "k";
}

function formatPeriod(repo) {
  const value = repo.created_at || repo.updated_at;
  if (!value) return "기간 입력";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "기간 입력";
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function cleanReadme(readme) {
  return String(readme || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[[^\]]+]\([^)]+\)/g, (match) => match.replace(/^\[/, "").replace(/\]\([^)]+\)$/, ""))
    .replace(/[#>*_`~-]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n")
    .slice(0, 900);
}

function uniqueList(items, limit = 6) {
  const seen = new Set();
  const next = [];
  for (const item of items) {
    const clean = String(item || "").trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    next.push(clean);
    if (next.length >= limit) break;
  }
  return next;
}

export function repositoryToProjectCandidate(repo, details = {}) {
  const languages = Object.keys(details.languages || {});
  const tags = uniqueList([...(repo.topics || []), repo.language, ...languages]);
  const language = repo.language || languages[0] || "GitHub";
  const desc = repo.description || "GitHub에서 가져온 프로젝트 후보입니다. 포트폴리오 문체에 맞게 설명을 다듬으세요.";
  const readme = cleanReadme(details.readme);
  const bodyParts = [
    "## GitHub Import",
    "",
    `- GitHub URL: ${repo.html_url}`,
    `- Main language: ${language}`,
  ];
  if (tags.length > 0) bodyParts.push(`- Topics: ${tags.join(", ")}`);
  bodyParts.push("", desc);
  if (readme) bodyParts.push("", "### README excerpt", "", readme);
  bodyParts.push("", "적용 후 프로젝트 성과와 설명을 포트폴리오 톤에 맞게 수정하세요.", "");

  return {
    slug: slugBase(repo.name),
    name: repo.name || repo.full_name || "GitHub repository",
    period: formatPeriod(repo),
    desc,
    metric: `★ ${compactStars(repo.stargazers_count)} · forks ${Number(repo.forks_count || 0)} · ${language} 중심 저장소`,
    tags,
    link: repo.html_url || "",
    highlight: false,
    private: Boolean(repo.private),
    status: "draft",
    body: bodyParts.join("\n"),
    relatedNotes: [],
  };
}

function displayTopic(value) {
  const clean = String(value || "").trim();
  const known = {
    ai: "AI",
    llm: "LLM",
    rag: "RAG",
    qdrant: "Qdrant",
    react: "React",
    nextjs: "Next.js",
    docker: "Docker",
    cloudflare: "Cloudflare",
    typescript: "TypeScript",
    javascript: "JavaScript",
    python: "Python",
    cuda: "CUDA",
  };
  return known[clean.toLowerCase()] || clean.replace(/(^|-)([a-z])/g, (_, prefix, char) => `${prefix ? " " : ""}${char.toUpperCase()}`);
}

function groupForSkill(skill) {
  const key = skill.toLowerCase();
  if (["typescript", "javascript", "python", "rust", "go", "java", "c++", "c", "cuda"].includes(key)) return "Language";
  if (["react", "next.js", "nextjs", "vite", "tailwind", "css", "html"].includes(key)) return "Frontend";
  if (["node", "express", "spring", "fastapi", "django", "postgresql", "sqlite"].includes(key)) return "Backend";
  if (["ai", "llm", "rag", "qdrant", "ollama", "pytorch", "tensorflow", "huggingface"].includes(key)) return "AI / Data";
  if (["docker", "cloudflare", "github actions", "linux", "aws", "devcontainer"].includes(key)) return "Infra";
  if (["git", "github", "cli", "automation"].includes(key)) return "Tools";
  return "GitHub inferred";
}

export function buildSkillGroupsFromRepositories(repos, languageMaps = []) {
  const grouped = new Map();
  function add(skill) {
    const display = displayTopic(skill);
    if (!display) return;
    const label = groupForSkill(display);
    const items = grouped.get(label) || [];
    if (!items.some((item) => item.toLowerCase() === display.toLowerCase())) items.push(display);
    grouped.set(label, items);
  }

  for (const repo of repos) {
    add(repo.language);
    for (const topic of repo.topics || []) add(topic);
  }
  for (const languages of languageMaps) {
    for (const language of Object.keys(languages || {})) add(language);
  }

  const order = ["Language", "Frontend", "Backend", "AI / Data", "Infra", "Tools", "GitHub inferred"];
  return order
    .map((label) => ({ label, items: grouped.get(label) || [] }))
    .filter((group) => group.items.length > 0);
}

export function repositoryToStarredCandidate(repo) {
  return {
    name: repo.full_name || repo.name || "owner/repository",
    stars: compactStars(repo.stargazers_count),
    desc: repo.description || "GitHub에서 가져온 관심 저장소입니다.",
  };
}

export function decodeReadmeContent(readme) {
  if (!readme?.content) return "";
  const base64 = String(readme.content).replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
