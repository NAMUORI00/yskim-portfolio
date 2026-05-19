import type { NoteEntry, PortfolioContent, ProjectEntry, ResearchEntry } from "@/content";

export type KnowledgeNodeKind = "profile" | "project" | "research" | "note" | "skill" | "repo" | "term";
export type KnowledgeLinkKind = "profile" | "skill" | "repo" | "tag" | "term" | "related";

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  kind: KnowledgeNodeKind;
  weight: number;
  href?: string;
  section?: string;
}

export interface KnowledgeGraphLink {
  source: string;
  target: string;
  kind: KnowledgeLinkKind;
  weight: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

export interface KnowledgeGraphOptions {
  maxTerms?: number;
  maxLinks?: number;
}

type DocumentNode = {
  id: string;
  label: string;
  kind: "project" | "research" | "note";
  href: string;
  section: string;
  text: string;
  tags: string[];
  relatedNotes?: string[];
  relatedProjects?: string[];
  relatedResearch?: string[];
  highlight?: boolean;
};

const STOP_WORDS = new Set([
  "그리고",
  "기반",
  "대한",
  "문서",
  "사용",
  "시스템",
  "업무",
  "연구",
  "위한",
  "자동",
  "작성",
  "제공",
  "진행",
  "프로젝트",
  "합니다",
  "했습니다",
  "with",
  "and",
  "the",
  "for",
  "from",
  "into",
  "using",
  "based",
  "system",
]);

function normalizeTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,:;()[\]{}'"`]+/g, "")
    .replace(/\s+/g, "-");
}

function termLabel(value: string): string {
  if (value.length <= 4 && /^[a-z0-9+#.-]+$/.test(value)) return value.toUpperCase();
  return value
    .split("-")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part))
    .join(" ");
}

function tokenize(text: string): string[] {
  const matches = text.match(/[A-Za-z][A-Za-z0-9+#./-]*|[가-힣]{2,}/g) ?? [];
  return matches
    .map(normalizeTerm)
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term) && !/^\d+$/.test(term));
}

function addNode(nodes: Map<string, KnowledgeGraphNode>, node: KnowledgeGraphNode) {
  const current = nodes.get(node.id);
  if (!current) {
    nodes.set(node.id, node);
    return;
  }
  nodes.set(node.id, {
    ...current,
    weight: Math.max(current.weight, node.weight),
    href: current.href ?? node.href,
    section: current.section ?? node.section,
  });
}

function addLink(links: Map<string, KnowledgeGraphLink>, link: KnowledgeGraphLink) {
  if (link.source === link.target) return;
  const [left, right] = [link.source, link.target].sort();
  const key = `${left}->${right}:${link.kind}`;
  const current = links.get(key);
  if (!current) {
    links.set(key, link);
    return;
  }
  links.set(key, { ...current, weight: Math.max(current.weight, link.weight) });
}

function compactLinkPriority(link: KnowledgeGraphLink): number {
  if (link.kind === "skill") return 4;
  if (link.kind === "profile") return 3;
  if (link.kind === "repo") return 2;
  if (link.kind === "related") return 1;
  return 0;
}

function projectDocument(project: ProjectEntry): DocumentNode {
  return {
    id: `project:${project.slug}`,
    label: project.name,
    kind: "project",
    href: project.link || `/projects/${project.slug}`,
    section: "projects",
    text: [project.name, project.desc, project.metric, project.tags.join(" "), project.body].join(" "),
    tags: project.tags,
    relatedNotes: project.relatedNotes,
    highlight: project.highlight,
  };
}

function researchDocument(research: ResearchEntry): DocumentNode {
  return {
    id: `research:${research.slug}`,
    label: research.title,
    kind: "research",
    href: `/research/${research.slug}`,
    section: "research",
    text: [research.title, research.desc, research.body].join(" "),
    tags: [],
    relatedNotes: research.relatedNotes,
  };
}

function noteDocument(note: NoteEntry): DocumentNode {
  return {
    id: `note:${note.slug}`,
    label: note.title,
    kind: "note",
    href: `/notes/${note.slug}`,
    section: "interests",
    text: [note.title, note.summary, note.tags.join(" "), note.body].join(" "),
    tags: note.tags,
    relatedProjects: note.relatedProjects,
    relatedResearch: note.relatedResearch,
  };
}

function visibleDocuments(content: PortfolioContent): DocumentNode[] {
  return [
    ...content.projects.filter((project) => project.status === "published").map(projectDocument),
    ...content.research.filter((research) => research.status === "published").map(researchDocument),
    ...content.notes.filter((note) => note.status === "published").map(noteDocument),
  ];
}

export function buildKnowledgeGraph(content: PortfolioContent, options: KnowledgeGraphOptions = {}): KnowledgeGraphData {
  const maxTerms = options.maxTerms ?? 18;
  const maxLinks = options.maxLinks ?? 72;
  const nodes = new Map<string, KnowledgeGraphNode>();
  const links = new Map<string, KnowledgeGraphLink>();
  const documents = visibleDocuments(content);
  const termScores = new Map<string, number>();
  const documentTerms = new Map<string, Map<string, number>>();

  addNode(nodes, {
    id: "profile",
    label: content.profile.handle || content.profile.name,
    kind: "profile",
    weight: 5,
    section: "about",
  });

  for (const document of documents) {
    addNode(nodes, {
      id: document.id,
      label: document.label,
      kind: document.kind,
      weight: document.highlight ? 3.4 : 2.6,
      href: document.href,
      section: document.section,
    });
    addLink(links, { source: "profile", target: document.id, kind: "profile", weight: document.highlight ? 2.2 : 1.4 });

    const counts = new Map<string, number>();
    for (const term of [...document.tags.map(normalizeTerm), ...tokenize(document.text)]) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    documentTerms.set(document.id, counts);
    for (const [term, count] of Array.from(counts.entries())) {
      termScores.set(term, (termScores.get(term) ?? 0) + Math.min(count, 5));
    }
  }

  for (const group of content.skills) {
    for (const skill of group.items) {
      const id = `skill:${normalizeTerm(skill)}`;
      addNode(nodes, { id, label: skill, kind: "skill", weight: 1.8, section: "skills" });
      addLink(links, { source: "profile", target: id, kind: "skill", weight: 0.8 });
      termScores.set(normalizeTerm(skill), (termScores.get(normalizeTerm(skill)) ?? 0) + 2);
    }
  }

  for (const repo of content.starred.slice(0, 4)) {
    const id = `repo:${normalizeTerm(repo.name)}`;
    addNode(nodes, { id, label: repo.name, kind: "repo", weight: 1.25, section: "interests" });
    addLink(links, { source: "profile", target: id, kind: "repo", weight: 0.5 });
  }

  const topTerms = Array.from(termScores.entries())
    .filter(([term]) => !STOP_WORDS.has(term))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxTerms);
  const topTermSet = new Set(topTerms.map(([term]) => term));

  for (const [term, score] of topTerms) {
    addNode(nodes, {
      id: `term:${term}`,
      label: termLabel(term),
      kind: "term",
      weight: Math.max(1, Math.min(3.2, 0.8 + score / 3)),
    });
  }

  for (const document of documents) {
    for (const tag of document.tags) {
      const term = normalizeTerm(tag);
      if (!topTermSet.has(term)) continue;
      addLink(links, { source: document.id, target: `term:${term}`, kind: "tag", weight: 2 });
    }

    const rankedTerms = Array.from((documentTerms.get(document.id) ?? new Map<string, number>()).entries())
      .filter(([term]) => topTermSet.has(term))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
    for (const [term, count] of rankedTerms) {
      addLink(links, { source: document.id, target: `term:${term}`, kind: "term", weight: Math.min(2.6, 0.8 + count / 2) });
    }
  }

  for (const document of documents) {
    for (const slug of document.relatedNotes ?? []) {
      addLink(links, { source: document.id, target: `note:${slug}`, kind: "related", weight: 2.8 });
    }
    for (const slug of document.relatedProjects ?? []) {
      addLink(links, { source: document.id, target: `project:${slug}`, kind: "related", weight: 2.8 });
    }
    for (const slug of document.relatedResearch ?? []) {
      addLink(links, { source: document.id, target: `research:${slug}`, kind: "related", weight: 2.8 });
    }
  }

  const nodeIds = new Set(nodes.keys());
  const compactLinks = Array.from(links.values())
    .filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target))
    .sort((a, b) => compactLinkPriority(b) - compactLinkPriority(a) || b.weight - a.weight || a.source.localeCompare(b.source))
    .slice(0, maxLinks);

  return {
    nodes: Array.from(nodes.values()).sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id)),
    links: compactLinks,
  };
}
