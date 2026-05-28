import { describe, expect, it } from "vitest";
import { parseFrontmatter, serializeFrontmatter, toMarkdownHtml } from "./markdown";

describe("frontmatter helpers", () => {
  it("parses frontmatter and body", () => {
    const parsed = parseFrontmatter(`---
title: RAG 평가 노트
slug: rag-evaluation
status: published
tags:
  - RAG
  - 평가
---

## 평가

Recall@5를 봅니다.`);

    expect(parsed.data).toEqual({
      title: "RAG 평가 노트",
      slug: "rag-evaluation",
      status: "published",
      tags: ["RAG", "평가"],
    });
    expect(parsed.body).toContain("Recall@5");
  });

  it("serializes frontmatter in a stable shape", () => {
    expect(
      serializeFrontmatter(
        {
          title: "RAG 평가 노트",
          slug: "rag-evaluation",
          status: "published",
          tags: ["RAG", "평가"],
          featured: true,
        },
        "본문",
      ),
    ).toBe(`---
title: RAG 평가 노트
slug: rag-evaluation
status: published
tags:
  - RAG
  - 평가
featured: true
---

본문`);
  });

  it("round-trips structured JSON frontmatter values", () => {
    const serialized = serializeFrontmatter(
      {
        slug: "aerospace-rag",
        metrics: [{ label: "MRR", value: "+31%", baseline: "Dense-only" }],
        evaluation: { baseline: "Dense-only", dataset: "80개 질의", method: "same corpus" },
      },
      "본문",
    );

    expect(serialized).toContain('metrics: [{"label":"MRR","value":"+31%","baseline":"Dense-only"}]');
    expect(serialized).toContain('evaluation: {"baseline":"Dense-only","dataset":"80개 질의","method":"same corpus"}');
    expect(parseFrontmatter(serialized).data).toMatchObject({
      metrics: [{ label: "MRR", value: "+31%", baseline: "Dense-only" }],
      evaluation: { baseline: "Dense-only", dataset: "80개 질의", method: "same corpus" },
    });
  });

  it("renders basic markdown to safe HTML", () => {
    const html = toMarkdownHtml("## 제목\n\n본문 **강조**와 [링크](https://example.com)");

    expect(html).toContain("<h2>제목</h2>");
    expect(html).toContain("<strong>강조</strong>");
    expect(html).toContain('href="https://example.com"');
    expect(toMarkdownHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
