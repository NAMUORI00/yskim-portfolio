import { submissionIntroduction } from "./model";
import React from "react";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderToBuffer } from "@react-pdf/renderer";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { portfolioContent } from "@/content";
import {
  registerSubmissionFonts,
  SubmissionDocument,
  numberPages,
} from "./SubmissionDocument";
import { recommend, availableProjects, type DocumentKind } from "./model";

describe("real PDF rendering", () => {
  it("renders the combined A4 document with embedded Korean fonts", async () => {
    registerSubmissionFonts(
      fileURLToPath(new URL("../../public", import.meta.url)).replace(
        /\\/g,
        "/"
      )
    );
    for (const kind of ["combined"] as DocumentKind[]) {
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
      const rawDoc = await PDFDocument.load(buffer);
      expect(rawDoc.getPage(0).getHeight()).toBeGreaterThan(840);
      expect(buffer.toString("latin1")).toContain("/FontFile2");
      expect(buffer.toString("latin1")).toContain("/URI");
      const finalized = new Uint8Array(
        await (
          await numberPages(
            buffer,
            readFileSync(
              fileURLToPath(
                new URL(
                  "../../public/forms/moel-standard-resume.pdf",
                  import.meta.url
                )
              )
            )
          )
        ).arrayBuffer()
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
        kind="combined"
        detail="detailed"
        introduction={"연구와 개발 경험을 바탕으로 사용자 기능을 구현합니다. ".repeat(
          60
        )}
      />
    );
    const bytes = new Uint8Array(
      await (
        await numberPages(
          buffer,
          readFileSync(
            fileURLToPath(
              new URL(
                "../../public/forms/moel-standard-resume.pdf",
                import.meta.url
              )
            )
          )
        )
      ).arrayBuffer()
    );
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(projects.length + 1);
    if (process.env.SUBMISSION_STRESS_PATH)
      writeFileSync(process.env.SUBMISSION_STRESS_PATH, bytes);
  }, 60000);
  it("fills optional form fields without changing the template page size", async () => {
    registerSubmissionFonts(
      fileURLToPath(new URL("../../public", import.meta.url)).replace(
        /\\/g,
        "/"
      )
    );
    const buffer = await renderToBuffer(
      <SubmissionDocument
        content={portfolioContent}
        selection={recommend(portfolioContent, "ai")}
        kind="combined"
        detail="standard"
        introduction={submissionIntroduction}
        officialDetails={{
          address: "테스트 주소 123 (00000)",
          telephone: "02-0000-0000",
          mobile: "010-0000-0000",
          qualification1: "테스트 자격증",
          qualificationDate1: "2024년 1월",
          specialty: "연구 및 개발",
          veteranNumber: "테스트 번호",
          disabilityType: "테스트",
          disabilityDegree: "테스트",
          disabilityNumber: "테스트 번호",
          basicLivelihood: "테스트",
          singleParent: "테스트",
        }}
      />
    );
    const template = readFileSync(
      fileURLToPath(
        new URL("../../public/forms/moel-standard-resume.pdf", import.meta.url)
      )
    );
    const final = new Uint8Array(
      await (await numberPages(buffer, template)).arrayBuffer()
    );
    const doc = await PDFDocument.load(final);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595, height: 841 });
    if (process.env.SUBMISSION_FIELDS_PATH)
      writeFileSync(process.env.SUBMISSION_FIELDS_PATH, final);
  }, 60000);
});
