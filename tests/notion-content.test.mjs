import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildContacts,
  buildEducation,
  buildSkills,
  buildStarred,
  buildDocument,
  commaList,
  lineList,
  parseLinks,
  parseJsonValue,
  normalizeStatus,
  serializeScalar,
  readPlainText,
  readMultiSelect,
  toPlayerEmbedUrl,
  hasTemporaryNotionUrl,
  videoEmbedTag,
} from "../scripts/notion-content.mjs";

// --- mock Notion property factories -------------------------------------------
const title = (text) => ({ type: "title", title: [{ plain_text: text }] });
const rich = (text) => ({ type: "rich_text", rich_text: [{ plain_text: text }] });
const sel = (name) => ({ type: "select", select: name ? { name } : null });
const multi = (names) => ({ type: "multi_select", multi_select: names.map((name) => ({ name })) });
const url = (value) => ({ type: "url", url: value });
const chk = (value) => ({ type: "checkbox", checkbox: value });
const date = (value) => ({ type: "date", date: { start: value } });

test("serializeScalar quotes values that would be mis-parsed", () => {
  assert.equal(serializeScalar("hello world"), "hello world");
  assert.equal(serializeScalar("2026.05"), '"2026.05"'); // numeric-looking -> quoted
  assert.equal(serializeScalar("true"), '"true"');
  assert.equal(serializeScalar(""), '""');
  assert.equal(serializeScalar("[bracket"), '"[bracket"');
});

test("list + json parsers", () => {
  assert.deepEqual(commaList("a, b ,c"), ["a", "b", "c"]);
  assert.deepEqual(commaList(""), []);
  assert.deepEqual(lineList("one\n  two \n\nthree"), ["one", "two", "three"]);
  assert.deepEqual(parseLinks("CV|https://x.test\nbad-line"), [{ label: "CV", href: "https://x.test" }]);
  assert.deepEqual(parseJsonValue('[{"label":"MRR"}]', []), [{ label: "MRR" }]);
  assert.deepEqual(parseJsonValue("not json", []), []);
  assert.equal(normalizeStatus("Published"), "published");
  assert.equal(normalizeStatus("Draft"), "draft");
  assert.equal(normalizeStatus(""), "published");
});

test("readers extract plain values", () => {
  assert.equal(readPlainText(title("김유석")), "김유석");
  assert.equal(readPlainText(rich("hi")), "hi");
  assert.deepEqual(readMultiSelect(multi(["a", "b"])), ["a", "b"]);
});

test("buildDocument emits frontmatter compatible with parseFrontmatter", () => {
  const doc = buildDocument(
    [
      ["slug", "aerospace-rag"],
      ["period", "2026.05"],
      ["tags", ["Python", "RAG"]],
      ["relatedNotes", []],
      ["metrics", [{ label: "MRR", value: "+31%" }]],
      ["highlight", true],
    ],
    "## Overview\n\nBody text.",
  );
  assert.match(doc, /^---\n/);
  assert.match(doc, /\nslug: aerospace-rag\n/);
  assert.match(doc, /\nperiod: "2026.05"\n/);
  assert.match(doc, /\ntags:\n {2}- Python\n {2}- RAG\n/);
  assert.match(doc, /\nrelatedNotes: \[\]\n/);
  assert.match(doc, /\nmetrics: \[\{"label":"MRR","value":"\+31%"\}\]\n/);
  assert.match(doc, /\nhighlight: true\n/);
  assert.match(doc, /\n---\n\n## Overview\n\nBody text\.\n$/);
});

test("buildContacts maps rows to the profile.contacts shape", () => {
  const rows = [
    { properties: { Key: rich("email"), Type: sel("email"), Label: title("a@b.test"), Href: url("mailto:a@b.test") } },
  ];
  assert.deepEqual(buildContacts(rows), [{ id: "email", type: "email", label: "a@b.test", href: "mailto:a@b.test" }]);
});

test("buildEducation maps a timeline row", () => {
  const rows = [
    {
      properties: {
        Type: sel("education"),
        Degree: title("CS / AI 석사 과정"),
        School: rich("제주대학교"),
        Period: rich("2025 — 2027"),
        "Start Date": rich("2025"),
        "End Date": rich("2027"),
        Note: rich("note"),
        Current: chk(true),
        Highlight: chk(true),
        Status: sel("Published"),
        Bullets: rich("a\nb"),
        Links: rich("CV|https://x.test"),
        "Related Projects": rich("p1, p2"),
        "Related Skills": rich("Python"),
      },
    },
  ];
  const [entry] = buildEducation(rows);
  assert.equal(entry.degree, "CS / AI 석사 과정");
  assert.equal(entry.current, true);
  assert.equal(entry.status, "published");
  assert.deepEqual(entry.bullets, ["a", "b"]);
  assert.deepEqual(entry.links, [{ label: "CV", href: "https://x.test" }]);
  assert.deepEqual(entry.relatedProjects, ["p1", "p2"]);
});

test("media helpers", () => {
  assert.equal(toPlayerEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube.com/embed/dQw4w9WgXcQ");
  assert.equal(toPlayerEmbedUrl("https://vimeo.com/12345"), "https://player.vimeo.com/video/12345");
  assert.equal(toPlayerEmbedUrl("https://example.com/x"), null);
  assert.match(videoEmbedTag("https://www.youtube.com/embed/abc", "demo"), /<figure class="video-embed">/);
  assert.equal(hasTemporaryNotionUrl("https://x.amazonaws.com/y?X-Amz-Signature=z"), true);
  assert.equal(hasTemporaryNotionUrl("https://example.com/image.png"), false);
});

test("buildSkills + buildStarred", () => {
  assert.deepEqual(buildSkills([{ properties: { Label: title("핵심 언어"), Items: rich("Python, C++") } }]), [
    { label: "핵심 언어", items: ["Python", "C++"] },
  ]);
  assert.deepEqual(
    buildStarred([{ properties: { Name: title("a/b"), Href: url("https://x.test"), Stars: rich("1k"), Desc: rich("d") } }]),
    [{ name: "a/b", href: "https://x.test", stars: "1k", desc: "d" }],
  );
});
