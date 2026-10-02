import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { buildKnowledgeMap, linkedProjectSlugs, MAP_LAYERS, MENTIONED_PROJECTS, normalizeTech, projectCount, shortLabel } from "./knowledgeMapModel";

const ko = buildKnowledgeMap(portfolioContent, portfolioContent, "ko");
const en = buildKnowledgeMap(portfolioContent, localizePortfolioContent(portfolioContent, englishTranslations, "en"), "en");
const below = (id: string) => ko.below.get(id) ?? [];

describe("buildKnowledgeMap", () => {
  it("stacks published research, published projects and the technologies they used in three layers", () => {
    const published = <T extends { status: string }>(items: T[]) => items.filter((item) => item.status === "published").length;
    expect(ko.nodes.filter((node) => node.layer === "research")).toHaveLength(published(portfolioContent.research));
    expect(ko.nodes.filter((node) => node.layer === "project")).toHaveLength(published(portfolioContent.projects));
    expect(ko.nodes.some((node) => node.layer === "tech")).toBe(true);
    // 연결은 늘 한 층 아래로만 이어집니다 (연구 → 프로젝트 → 기술).
    for (const link of ko.links) {
      const from = MAP_LAYERS.indexOf(ko.byId.get(link.source)!.layer);
      const to = MAP_LAYERS.indexOf(ko.byId.get(link.target)!.layer);
      expect(to - from).toBe(1);
    }
  });

  it("links a research question only to projects its own text names", () => {
    expect(below("research:rag")).toEqual(expect.arrayContaining(["project:smartfarm-rag", "project:aerospace-rag"]));
    expect(below("research:video-qa")).toEqual(["project:mv-evirag"]);
    expect(below("research:sensor-operations")).toEqual(["project:smartfarm-rag"]);
    expect(below("research:audio-voice")).toEqual(expect.arrayContaining(["project:music-splitter-web", "project:music-source-separation"]));
    for (const research of portfolioContent.research) {
      const text = `${research.desc}\n${research.body}`;
      for (const target of below(`research:${research.slug}`)) {
        const slug = target.replace("project:", "");
        const mention = MENTIONED_PROJECTS[research.slug]?.find((item) => item.slug === slug);
        expect(linkedProjectSlugs(research.body).includes(slug) || Boolean(mention && text.includes(mention.anchor))).toBe(true);
      }
    }
  });

  it("keeps every curated mention anchored in the current Korean research text", () => {
    for (const [slug, mentions] of Object.entries(MENTIONED_PROJECTS)) {
      const research = portfolioContent.research.find((item) => item.slug === slug);
      expect(research).toBeDefined();
      for (const mention of mentions) expect(`${research!.desc}\n${research!.body}`).toContain(mention.anchor);
    }
  });

  it("uses only technologies that are in the stack and tagged on a project — no starred repositories or proficiency scores", () => {
    const stack = new Set(portfolioContent.skills.flatMap((group) => group.items.map(normalizeTech)));
    const techs = ko.nodes.filter((node) => node.layer === "tech");
    for (const node of techs) {
      expect(stack.has(normalizeTech(node.key))).toBe(true);
      expect(projectCount(ko, node.id)).toBeGreaterThan(0);
    }
    // 기술 스택에 있어도 어느 프로젝트에도 태그가 없으면 지도에 넣지 않습니다.
    expect(ko.byId.has("tech:docker")).toBe(false);
    // 스택에 없는 태그(예: Hydra)도 넣지 않습니다.
    expect(ko.byId.has("tech:hydra")).toBe(true);
    const titles = ko.nodes.map((node) => node.title).join("\n");
    for (const repo of portfolioContent.starred) expect(titles).not.toContain(repo.name);
    expect(JSON.stringify(ko.nodes)).not.toMatch(/score|proficien|level/i);
  });

  it("keeps the same nodes and links across languages while localizing names", () => {
    expect(en.nodes.map((node) => node.id)).toEqual(ko.nodes.map((node) => node.id));
    expect(en.links).toEqual(ko.links);
    expect(ko.byId.get("tech:회로")?.label).toBe("회로");
    expect(en.byId.get("tech:회로")?.label).toBe("Circuitry");
    expect(en.byId.get("research:rag")?.title).toBe(englishTranslations.research?.rag?.title);
    expect(en.byId.get("project:smartfarm-rag")?.metric).toBe(englishTranslations.projects?.["smartfarm-rag"]?.metric);
    expect(ko.byId.get("project:smartfarm-rag")?.metric).toBe("관련 KCI 논문 1편 게재");
  });

  it("gives every node a short, recognisable label and keeps the full name for reading", () => {
    for (const map of [ko, en]) {
      for (const node of map.nodes) {
        expect(node.label.length).toBeGreaterThan(1);
        expect(node.label.length).toBeLessThanOrEqual(20);
        expect(node.title.length).toBeGreaterThanOrEqual(node.label.replace("…", "").length - 1);
      }
    }
    expect(ko.byId.get("research:rag")?.label).toBe("문서 검색");
    expect(en.byId.get("research:rag")?.label).toBe("Retrieval");
    expect(ko.byId.get("tech:spring-security")?.label).toBe("Spring Security");
    expect(shortLabel("질문에 맞는 문서 검색과 근거 있는 답변")).toBe("질문에 맞는 문서 검색");
    expect(shortLabel("Blog Editing and Change Review")).toBe("Blog Editing");
    expect(shortLabel("Unity Hackathon Game Jam Entry")).toBe("Unity Hackath…");
  });
});
