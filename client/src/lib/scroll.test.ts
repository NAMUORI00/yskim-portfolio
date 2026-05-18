import { describe, expect, it } from "vitest";
import { activeSectionForAnchor, scrollTopForElement } from "./scroll";

describe("scrollTopForElement", () => {
  it("calculates target scroll from viewport-relative positions", () => {
    expect(
      scrollTopForElement({
        containerTop: 0,
        elementTop: 1609.25,
        scrollTop: 0,
        offset: 32,
      }),
    ).toBe(1577.25);
  });

  it("keeps the target non-negative near the top", () => {
    expect(
      scrollTopForElement({
        containerTop: 120,
        elementTop: 132,
        scrollTop: 0,
        offset: 32,
      }),
    ).toBe(0);
  });
});

describe("activeSectionForAnchor", () => {
  it("keeps the clicked section active when the next heading is also visible", () => {
    expect(
      activeSectionForAnchor(
        [
          { id: "about", top: 32 },
          { id: "education", top: 395.8125 },
          { id: "research", top: 695.875 },
        ],
        96,
      ),
    ).toBe("about");
  });

  it("does not advance to the next section after scrolling to education", () => {
    expect(
      activeSectionForAnchor(
        [
          { id: "about", top: -332 },
          { id: "education", top: 31.8125 },
          { id: "research", top: 331.875 },
        ],
        96,
      ),
    ).toBe("education");
  });
});
