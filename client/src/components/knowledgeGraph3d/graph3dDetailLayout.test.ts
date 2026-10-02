import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { localizePortfolioContent } from "@/lib/i18nContent";
import type { LabelBox } from "@/components/knowledgeMap/knowledgeMapLayout";
import { graph3dCopy } from "./graph3dCopy";
import { DETAIL_METRICS, DETAIL_TIERS, layoutDomainDetail, navigateDetail, type DetailVariant, type DomainDetailLayout } from "./graph3dDetailLayout";
import { buildKnowledgeGraph, type KnowledgeGraph } from "./graph3dModel";
import { RAIL_WIDTHS } from "./graph3dLayout";

const graphs = {
  ko: buildKnowledgeGraph(portfolioContent, portfolioContent, "ko"),
  en: buildKnowledgeGraph(portfolioContent, localizePortfolioContent(portfolioContent, englishTranslations, "en"), "en"),
};

/** 레일 폭(205 · 240 · 274px)과 넓게 보기 무대(가장 좁은 대화상자 ≈ 560px, 보통 ≈ 820px) */
const SIZES: Array<{ variant: DetailVariant; width: number }> = [...RAIL_WIDTHS.map((width) => ({ variant: "rail" as const, width })), { variant: "explorer", width: 560 }, { variant: "explorer", width: 820 }];

function detail(locale: "ko" | "en", domain: string, variant: DetailVariant, width: number): { graph: KnowledgeGraph; layout: DomainDetailLayout } {
  const graph = graphs[locale];
  return { graph, layout: layoutDomainDetail({ graph, domain: domain as never, width, variant, gutterLabels: graph3dCopy(locale).gutters }) };
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.left + b.width - 0.5 && b.left < a.left + a.width - 0.5 && a.top < b.top + b.height - 0.5 && b.top < a.top + a.height - 0.5;
}

describe("layoutDomainDetail — honest layers by kind", () => {
  it("puts every item of the field in the layer of its own kind, and nothing from other fields", () => {
    const graph = graphs.ko;
    for (const domain of graph.domains) {
      const { layout } = detail("ko", domain.id, "rail", 240);
      const knowledge = layout.order.filter((id) => graph.byId.has(id));
      expect(knowledge.sort()).toEqual([...domain.members].sort());
      for (const id of knowledge) {
        const node = graph.byId.get(id)!;
        expect(layout.items.get(id)!.tier, id).toBe(node.kind);
        // 관심·스택 목록은 같은 층 안의 따로 이름 붙은 줄(작업 기록 없음)에 둡니다.
        expect(layout.items.get(id)!.group, id).toBe(node.status === "evidenced" ? "main" : node.status);
        expect(layout.items.get(id)!.open, id).toBe(node.status !== "evidenced");
      }
      // 층은 위에서부터 개념 → 구현한 방법 → 기술 → 근거 (비어 있는 층은 빠짐)
      const keys = layout.tiers.map((tier) => tier.key);
      expect(keys).toEqual(DETAIL_TIERS.filter((key) => keys.includes(key)));
      for (let index = 1; index < layout.tiers.length; index += 1) expect(layout.tiers[index].top).toBeGreaterThan(layout.tiers[index - 1].bottom);
    }
  });

  it("makes the evidence layer exactly the sources the field's items cite — projects and papers stay evidence, never knowledge", () => {
    const graph = graphs.ko;
    for (const domain of graph.domains) {
      const { layout } = detail("ko", domain.id, "explorer", 820);
      const cited = new Set(domain.members.flatMap((id) => graph.byId.get(id)!.claims.map((claim) => claim.evidence.id)));
      const evidence = layout.tiers.find((tier) => tier.key === "evidence")!;
      expect(new Set(evidence.items)).toEqual(cited);
      for (const id of evidence.items) {
        expect(graph.byId.has(id), id).toBe(false);
        expect(graph.evidence.has(id), id).toBe(true);
      }
      // 근거 선은 노드가 실제로 든 근거(claims)뿐입니다.
      for (const claim of layout.claims) {
        expect(graph.byId.get(claim.source)!.claims.some((item) => item.evidence.id === claim.target), claim.key).toBe(true);
        expect(claim.relation).toBe("claim");
      }
    }
  });

  it("draws only documented relations inside the field, with their real relation names, and counts the links to other fields apart", () => {
    const graph = graphs.ko;
    let internal = 0;
    let crossing = 0;
    for (const domain of graph.domains) {
      const { layout } = detail("ko", domain.id, "rail", 274);
      const members = new Set(domain.members);
      const expected = graph.links.filter((link) => members.has(link.source) && members.has(link.target));
      expect(layout.links.map((link) => `${link.key}:${link.relation}`).sort()).toEqual(expected.map((link) => `${link.key}:${link.relation}`).sort());
      internal += layout.links.length;
      for (const [id, others] of Array.from(layout.external.entries())) {
        expect(members.has(id)).toBe(true);
        for (const other of others) expect(graph.byId.get(other)!.domain, `${id} → ${other}`).not.toBe(domain.id);
        crossing += others.length;
      }
    }
    // 분야 안 연결 69개 + 분야 사이 연결 32개(양쪽 분야에서 한 번씩) = 연결 101개
    expect(internal).toBe(graph.links.length - 32);
    expect(crossing).toBe(32 * 2);
  });

  it("keeps every chip legible — full-size text, inside the width, never overlapping — in every field, width and language, scrolling instead of shrinking", () => {
    for (const locale of ["ko", "en"] as const) {
      for (const domain of graphs[locale].domains) {
        for (const { variant, width } of SIZES) {
          const { layout } = detail(locale, domain.id, variant, width);
          const boxes = layout.order.map((id) => ({ id, box: layout.items.get(id)!.box }));
          const context = `${locale} ${domain.id} ${variant} ${width}`;
          boxes.forEach(({ id, box }, index) => {
            expect(box.left, `${context} ${id}`).toBeGreaterThanOrEqual(0);
            expect(box.left + box.width, `${context} ${id}`).toBeLessThanOrEqual(width);
            expect(box.top + box.height, `${context} ${id}`).toBeLessThanOrEqual(layout.height);
            expect(box.height).toBe(DETAIL_METRICS[variant].chipHeight);
            for (const other of boxes.slice(index + 1)) expect(overlaps(box, other.box), `${context} ${id} × ${other.id}`).toBe(false);
          });
          // 지식 이름은 줄이지 않습니다 (근거의 긴 제목만 줄임표 — 전체 이름은 설명 칸과 읽기용 이름에).
          for (const id of layout.order) {
            const item = layout.items.get(id)!;
            if (item.tier !== "evidence") expect(item.truncated, `${context} ${id}`).toBe(false);
            if (item.truncated) expect(item.text.endsWith("…")).toBe(true);
          }
          // 칩은 자기 층의 판 안에 있습니다.
          for (const tier of layout.tiers) {
            for (const id of tier.items) {
              const box = layout.items.get(id)!.box;
              expect(box.top, `${context} ${id}`).toBeGreaterThanOrEqual(tier.top);
              expect(box.top + box.height, `${context} ${id}`).toBeLessThanOrEqual(tier.bottom);
            }
          }
        }
      }
    }
  });

  it("is deterministic and orders a layer by where its linked items sit above (fewer crossings), the same in both languages", () => {
    const first = detail("ko", "retrieval", "rail", 240).layout;
    const again = detail("ko", "retrieval", "rail", 240).layout;
    expect(first.order).toEqual(again.order);
    expect(Array.from(first.items.values())).toEqual(Array.from(again.items.values()));
    // 영어도 같은 층·같은 묶음 (줄바꿈 자리는 글자 폭에 따라 다를 수 있음)
    const english = detail("en", "retrieval", "rail", 240).layout;
    for (const id of first.order) {
      expect(english.items.get(id)?.tier, id).toBe(first.items.get(id)!.tier);
      expect(english.items.get(id)?.group, id).toBe(first.items.get(id)!.group);
    }
    // 무게중심 순서: 같은 줄 묶음 안에서 위 층에 이어진 것이 있는 칩이 없는 칩보다 앞에 옵니다.
    const graph = graphs.ko;
    for (const domain of graph.domains) {
      const { layout } = detail("ko", domain.id, "explorer", 820);
      for (const tier of layout.tiers.slice(1)) {
        const main = tier.items.filter((id) => layout.items.get(id)!.group === layout.items.get(tier.items[0])!.group);
        const linked = main.map((id) => [...layout.links, ...layout.claims].some((link) => (link.source === id || link.target === id) && layout.items.get(link.source === id ? link.target : link.source)!.tier !== tier.key && layout.tiers.findIndex((entry) => entry.key === layout.items.get(link.source === id ? link.target : link.source)!.tier) < layout.tiers.findIndex((entry) => entry.key === tier.key)));
        const firstUnlinked = linked.indexOf(false);
        if (firstUnlinked >= 0) expect(linked.slice(firstUnlinked).every((value) => !value), `${domain.id} ${tier.key}`).toBe(true);
      }
    }
  });

  it("labels the extra rows honestly — interest and stack-only rows, and evidence by kind", () => {
    const { layout } = detail("ko", "retrieval", "rail", 240);
    const gutters = layout.rows.flatMap((row) => (row.gutter ? [row.gutter.key] : []));
    expect(gutters).toEqual(expect.arrayContaining(["interest", "listed", "paper", "project", "research"]));
    expect(layout.items.get("rag-eval")!.group).toBe("interest");
    expect(layout.items.get("langchain")!.group).toBe("listed");
    expect(layout.items.get("paper:kci")!.group).toBe("paper");
    expect(layout.items.get("paper:kci")!.text).toContain("스마트팜");
    // 기술 스택 목록(작업 기록 없음)은 근거 층에서도 점선 칩입니다.
    const infra = detail("ko", "infra", "rail", 240).layout;
    expect(infra.items.get("stack:skills")).toMatchObject({ group: "stack", open: true });
  });
});

describe("navigateDetail", () => {
  const { layout } = detail("ko", "media", "rail", 240);

  it("moves in reading order with the arrows, between rows by nearest position, and between layers with PageUp and PageDown", () => {
    const first = layout.order[0];
    expect(navigateDetail(layout, first, "ArrowLeft")).toBe(first);
    expect(navigateDetail(layout, first, "ArrowRight")).toBe(layout.order[1]);
    const down = navigateDetail(layout, first, "ArrowDown");
    expect(layout.items.get(down)!.row).toBe(layout.items.get(first)!.row + 1);
    expect(navigateDetail(layout, down, "ArrowUp")).toBe(first);
    const second = layout.tiers[1].items[0];
    expect(navigateDetail(layout, first, "PageDown")).toBe(second);
    expect(navigateDetail(layout, second, "PageUp")).toBe(first);
    const tier = layout.tiers[1];
    expect(navigateDetail(layout, tier.items[tier.items.length - 1], "Home")).toBe(tier.items[0]);
    expect(navigateDetail(layout, tier.items[0], "End")).toBe(tier.items[tier.items.length - 1]);
    const last = layout.order[layout.order.length - 1];
    expect(navigateDetail(layout, last, "ArrowRight")).toBe(last);
  });
});
