import { submissionIntroduction } from "./model";
import React from "react";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderToBuffer } from "@react-pdf/renderer";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { portfolioContent } from "@/content";
import {
  registerSubmissionFonts,
  SubmissionDocument,
  numberPages,
} from "./SubmissionDocument";
import { recommend, availableProjects, type DocumentKind } from "./model";

describe("real PDF rendering", () => {
  it("renders both A4 documents with embedded Korean fonts", async () => {
    registerSubmissionFonts(
      fileURLToPath(new URL("../../public", import.meta.url)).replace(
        /\\/g,
        "/"
      )
    );
    for (const kind of ["resume", "portfolio"] as DocumentKind[]) {
      const buffer = await renderToBuffer(
        <SubmissionDocument
          content={portfolioContent}
          selection={recommend(portfolioContent, "ai")}
          kind={kind}
          detail="standard"
          introduction={submissionIntroduction}
        />
      );
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buffer.toString("latin1")).toContain("/FontFile2");
      expect(buffer.toString("latin1")).toContain("/URI");
      const finalized = new Uint8Array(
        await (await numberPages(buffer)).arrayBuffer()
      );
      const parsed = await PDFDocument.load(finalized);
      expect(parsed.getPageCount()).toBeGreaterThanOrEqual(2);
      expect(
        parsed
          .getPages()
          .every(
            p =>
              Math.abs(p.getWidth() - 595.28) < 1 &&
              Math.abs(p.getHeight() - 841.89) < 1
          )
      ).toBe(true);
      if (process.env.SUBMISSION_OUTPUT_DIR) {
        mkdirSync(process.env.SUBMISSION_OUTPUT_DIR, { recursive: true });
        writeFileSync(
          `${process.env.SUBMISSION_OUTPUT_DIR}/${kind}.pdf`,
          finalized
        );
      }
    }
  }, 60000);
  it("renders all public projects and long introductions without dropping the last project", async () => {
    registerSubmissionFonts(
      fileURLToPath(new URL("../../public", import.meta.url)).replace(
        /\\/g,
        "/"
      )
    );
    const projects = availableProjects(portfolioContent);
    const buffer = await renderToBuffer(
      <SubmissionDocument
        content={portfolioContent}
        selection={{ projects: projects.map(p => p.slug), records: [] }}
        kind="portfolio"
        detail="detailed"
        introduction={"연구와 개발 경험을 바탕으로 사용자 기능을 구현합니다. ".repeat(
          60
        )}
      />
    );
    const bytes = new Uint8Array(
      await (await numberPages(buffer)).arrayBuffer()
    );
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(projects.length + 1);
    if (process.env.SUBMISSION_STRESS_PATH)
      writeFileSync(process.env.SUBMISSION_STRESS_PATH, bytes);
  }, 60000);
});
