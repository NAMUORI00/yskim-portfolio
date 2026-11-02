# Submission PDF

`/insights` creates a single Korean A4 PDF: the Ministry of Employment and Labor's actual standard resume form, career details, academic/research background, and selected project portfolios. Source and limited punctuation adaptations are documented in `client/public/forms/README.md`.

The editor supports purpose presets, inclusion/exclusion, order, introduction editing, optional personal form inputs, summary/standard/detailed levels, preview and one PDF download. Personal inputs and edits are session-only, not sent to a server. Source content is not modified. Unprovided form values stay empty; no qualification or support status is inferred.

The actual original PDF first page is copied with pdf-lib and filled by overlaying Korean text. The original first-page title, labels and table lines are retained. Middle dots become commas per user preference. Long introductions continue on another page. All selected career entries are included in the appendix, beyond the two fixed original employment rows.

Skills use conventional technical categories and only selected source technologies. Project diagrams have at most three core nodes. Project footers contain only the recorded GitHub link; missing links are omitted. Exact-source wording mappings retain publication/review status and local/simulation scope.

PDF libraries load on demand. Korean fonts are bundled locally. CSP permits Yoga WASM and blob PDF previews, not general JavaScript unsafe-eval. The official PDF template must load successfully; no fallback to a different form is produced.

Validation: `pnpm check`, `pnpm test`, `pnpm build`. Set `SUBMISSION_OUTPUT_DIR`, `SUBMISSION_STRESS_PATH`, `SUBMISSION_FIELDS_PATH` before `pnpm exec vitest run src/submission/SubmissionDocument.test.tsx` for standard, all-project/long-introduction, and synthetic optional-field PDF fixtures. Verify actual rendered first-page values and original table geometry, then visually inspect every page. Default output is six pages.
