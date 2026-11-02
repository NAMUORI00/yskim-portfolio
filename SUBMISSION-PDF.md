# Submission PDF

`/insights` creates one Korean PDF containing the selected resume records, career details and portfolio projects. Each project includes a short description, a three-node core diagram, work/results and a portfolio link. The home links to this editor.

The editor supports purpose presets, inclusion/exclusion, order, an editable introduction, summary/standard/detailed levels, preview and one PDF download. There is no document-type switch or ZIP export. Edits are session-only. Source content is not modified.

Skills use conventional technical categories and only technologies in selected projects/records. Three representative projects have explicit source-backed core flows. Other projects use up to three recorded modules without implying sequence; sparse records receive no invented diagram.

Submission-specific wording is mapped to exact source paragraphs in `wording.ts`. Tests detect source drift. Published/review statuses and local/simulation scope are retained. No unmeasured improvement metrics are generated.

PDF libraries load on demand. OFL Korean fonts are bundled locally; output is searchable A4 with clickable links and page numbers. `wasm-unsafe-eval` permits the bundled Yoga layout engine while JavaScript `unsafe-eval` stays disabled. `frame-src blob:` permits the PDF preview. Native inline PDF rendering depends on the browser; download/new-window links are available.

Validation: `pnpm check`, `pnpm test`, `pnpm build`.
Set `SUBMISSION_OUTPUT_DIR` and run `pnpm exec vitest run src/submission/SubmissionDocument.test.tsx` to generate `combined.pdf`. Set `SUBMISSION_STRESS_PATH` to additionally save the all-projects/long-introduction fixture. Default content produces six pages. Render and visually inspect changed layouts.
