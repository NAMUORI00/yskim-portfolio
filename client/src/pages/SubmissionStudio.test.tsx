// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import SubmissionStudio from "./SubmissionStudio";
const generate = vi.hoisted(() => vi.fn());
vi.mock("@/submission/SubmissionDocument", () => ({
  generateSubmission: generate,
}));
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement, root: Root;
const button = (name: string) =>
  Array.from(container.querySelectorAll("button")).find(
    b => b.textContent === name
  )!;
beforeEach(() => {
  generate.mockReset();
  generate.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
  URL.createObjectURL = vi.fn(() => "blob:test-pdf");
  URL.revokeObjectURL = vi.fn();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SubmissionStudio />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
describe("submission editor", () => {
  it("offers only one PDF and lets projects be ordered", () => {
    expect(container.textContent).not.toContain("ZIP");
    const down = container.querySelector<HTMLButtonElement>(
      'button[aria-label="질문에 맞는 문서 검색과 스마트팜 운영 지원 아래로"]'
    )!;
    act(() => down.click());
    expect(
      container.querySelector(".submission-outline")!.textContent
    ).toContain("01 · 다중 시점");
  });
  it("invalidates the generated PDF after changing content", async () => {
    await act(async () => button("PDF 미리보기 생성").click());
    expect(container.querySelector("iframe")?.src).toBe("blob:test-pdf");
    expect(generate.mock.calls[0][0].kind).toBe("combined");
    act(() =>
      container
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click()
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-pdf");
  });
  it("disables generation when no records or projects are selected", () => {
    for (const input of Array.from(
      container.querySelectorAll<HTMLInputElement>("input:checked")
    ))
      act(() => input.click());
    expect(button("PDF 미리보기 생성").disabled).toBe(true);
  });
  it("shows errors without discarding selections", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    generate.mockRejectedValueOnce(new Error("font unavailable"));
    await act(async () => button("PDF 미리보기 생성").click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "다시 시도"
    );
    expect(button("PDF 미리보기 생성").disabled).toBe(false);
    expect(container.querySelectorAll("input:checked").length).toBe(15);
  });
});
