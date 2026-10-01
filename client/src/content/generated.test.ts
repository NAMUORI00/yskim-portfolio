import { describe, expect, it } from "vitest";
import { portfolioContent, englishTranslations } from "./index";
import { validatePortfolioContent } from "./schema";
import { localizePortfolioContent } from "@/lib/i18nContent";

describe("Git-managed portfolio content", () => {
  it("loads the actual published content without a runtime schema error", () => {
    expect(() => validatePortfolioContent(portfolioContent)).not.toThrow();
    expect(portfolioContent.projects.length).toBeGreaterThan(0);
    expect(portfolioContent.projects.find(project => project.slug === "golden-glove")?.category).toBe("undergraduate");
    expect(() => validatePortfolioContent(localizePortfolioContent(portfolioContent, englishTranslations, "en"))).not.toThrow();
  });
});
