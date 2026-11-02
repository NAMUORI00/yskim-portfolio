import { describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import { recommend, selectedItems, availableProjects } from "./model";
import { technicalSkills, projectDiagram } from "./presentation";
describe("submission presentation", () => {
  it("groups real technologies under conventional technical categories", () => {
    const { projects, records } = selectedItems(
      portfolioContent,
      recommend(portfolioContent, "ai")
    );
    const groups = technicalSkills(projects, records);
    expect(groups.find(g => g.label === "프로그래밍 언어")?.items).toEqual([
      "Python",
      "Java",
    ]);
    expect(groups.find(g => g.label === "AI·머신러닝")?.items).toContain(
      "PyTorch"
    );
    expect(groups.find(g => g.label === "백엔드")?.items).toContain("FastAPI");
    expect(groups.flatMap(g => g.items)).not.toContain("팀 진행 관리");
  });
  it("keeps diagrams to three core nodes and does not invent a flow for modules", () => {
    for (const project of availableProjects(portfolioContent)) {
      const diagram = projectDiagram(project);
      expect(diagram.nodes.length).toBeLessThanOrEqual(3);
      if (
        !["smartfarm-rag", "mv-evirag", "music-splitter-web"].includes(
          project.slug
        )
      )
        expect(diagram.sequence).toBe(false);
    }
    expect(
      projectDiagram(
        portfolioContent.projects.find(p => p.slug === "music-splitter-web")!
      ).nodes
    ).toEqual(["음원 업로드", "AI 음원 분리", "결과 다운로드"]);
  });
});
