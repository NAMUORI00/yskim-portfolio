// Fetches the portfolio content from Notion and regenerates the files that the
// Vite frontend imports at build time (content/*.json, content/**/*.mdx,
// content/order.json, content/i18n/en.json). Notion is the single source of
// truth; the committed content/ files are a build seed that this script
// overwrites.

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Database ids for the "KYS — Portfolio (CMS)" Notion workspace. Each can be
// overridden by an environment variable so CI / other workspaces can point the
// pipeline elsewhere without code changes.
export const DATABASE_DEFAULTS = {
  profile: "9b24921c-efa4-4143-9ede-abe607300b32",
  intro: "fa9e9444-6254-4088-9bde-69c556ad3d58",
  contacts: "2744eeb0-e4fa-46d7-a46b-4ba700de003f",
  timeline: "535722e0-d69e-4da8-abfe-1eb9c82835e3",
  research: "9cf575d4-e968-4b0b-8cd0-5f30482b5a61",
  projects: "654afefe-1d7e-452a-b1b4-614228fc5a11",
  skills: "e2fdb49b-cf97-4840-a55c-6cd46613c167",
  starred: "ea21f9e0-8981-4a95-9939-dcc48e89c2fc",
  notes: "8a0a6041-63b4-49c6-85e3-af7e769c7356",
  site: "723e7188-9b2f-4e6d-8ce7-122d5a9a2d53",
};

const ENV_KEYS = {
  profile: "NOTION_PROFILE_DB_ID",
  intro: "NOTION_INTRO_DB_ID",
  contacts: "NOTION_CONTACTS_DB_ID",
  timeline: "NOTION_TIMELINE_DB_ID",
  research: "NOTION_RESEARCH_DB_ID",
  projects: "NOTION_PROJECTS_DB_ID",
  skills: "NOTION_SKILLS_DB_ID",
  starred: "NOTION_STARRED_DB_ID",
  notes: "NOTION_NOTES_DB_ID",
  site: "NOTION_SITE_DB_ID",
};

const CATEGORY_DATABASE_SECTIONS = [
  "profile",
  "intro",
  "contacts",
  "timeline",
  "research",
  "projects",
  "skills",
  "starred",
  "notes",
  "site",
];

// site.navigation and site.images are structural (icons, hero artwork) rather
// than editorial, so they stay here instead of in Notion. Only title /
// description / url come from the Site database.
const SITE_DEFAULTS = {
  navigation: [
    { id: "about", label: "소개", icon: "user" },
    { id: "education", label: "타임라인", icon: "graduation" },
    { id: "research", label: "연구 관심사", icon: "flask" },
    { id: "projects", label: "프로젝트", icon: "code" },
    { id: "skills", label: "기술 스택", icon: "layers" },
    { id: "interests", label: "관심 저장소", icon: "star" },
  ],
  images: {
    heroTree:
      "https://d2xsxph8kpxj0f.cloudfront.net/106867672/XFaxs2Z8r6G3GyzQNwSSoE/hero_abstract-QnvWc7iMMJmimwoF3wARey.webp",
    ragDiagram:
      "https://d2xsxph8kpxj0f.cloudfront.net/106867672/XFaxs2Z8r6G3GyzQNwSSoE/research_rag-jArZ5FsJdCJiktQYGMp6rA.webp",
    dotPattern:
      "https://d2xsxph8kpxj0f.cloudfront.net/106867672/XFaxs2Z8r6G3GyzQNwSSoE/profile_card_bg-hV5HrJ3CNXxcdXaMYuNA6G.webp",
  },
};

// UI chrome strings (navigation labels, button text) are not stored per-row in
// Notion; they are part of the app's English locale.
const EN_UI = {
  nav: { about: "About", education: "Timeline", research: "Research", projects: "Projects", skills: "Skills", interests: "Starred" },
  labels: {
    contact: "CONTACT",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    languageToEnglish: "English",
    languageToKorean: "Korean",
    current: "In progress",
    featured: "Featured",
    private: "Private",
    portfolio: "Portfolio",
    notes: "notes",
    detail: "Detail",
    github: "GitHub",
    ragCaption: "Dense + Sparse + Graph hybrid retrieval architecture",
    fullCv: "View full CV timeline",
  },
};

const GENERATED_ASSETS_DIR = path.join("client", "public", "notion");

// ---------------------------------------------------------------------------
// Notion property readers (shared shape with yskim-blog's pipeline)
// ---------------------------------------------------------------------------

function richTextToPlain(items) {
  return (items ?? []).map((item) => item.plain_text ?? "").join("").trim();
}

export function readPlainText(property) {
  if (!property) return "";
  if (property.type === "title") return richTextToPlain(property.title);
  if (property.type === "rich_text") return richTextToPlain(property.rich_text);
  return "";
}

export function readSelect(property) {
  if (!property) return "";
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  return "";
}

export function readMultiSelect(property) {
  if (property?.type !== "multi_select") return [];
  return property.multi_select.map((item) => item.name).filter(Boolean);
}

export function readDate(property) {
  return property?.type === "date" ? property.date?.start ?? "" : "";
}

export function readUrl(property) {
  return property?.type === "url" ? property.url ?? "" : "";
}

export function readNumber(property) {
  return property?.type === "number" ? property.number ?? null : null;
}

export function readCheckbox(property, fallback = false) {
  return property?.type === "checkbox" ? Boolean(property.checkbox) : fallback;
}

function readObjectFileUrl(file) {
  if (!file) return "";
  if (file.type === "file") return file.file?.url ?? "";
  if (file.type === "external") return file.external?.url ?? "";
  return "";
}

export function readFileUrl(property) {
  if (property?.type !== "files") return "";
  return readObjectFileUrl(property.files?.[0]);
}

// A page may expose the same property under its display name or its internal
// "userDefined:" name (e.g. reserved words like "URL"). Try both.
function prop(properties, name) {
  return properties?.[name] ?? properties?.[`userDefined:${name}`];
}

// ---------------------------------------------------------------------------
// Value parsing helpers (rich_text encodings used in this CMS)
// ---------------------------------------------------------------------------

export function commaList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function lineList(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// "Label|https://href" per line -> [{ label, href }]
export function parseLinks(value) {
  return lineList(value)
    .map((line) => {
      const [label, href = ""] = line.split("|");
      return { label: label.trim(), href: href.trim() };
    })
    .filter((link) => link.label && link.href);
}

export function parseJsonValue(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function normalizeStatus(value) {
  const text = String(value ?? "").toLowerCase();
  return text === "draft" || text === "archived" ? text : "published";
}

// ---------------------------------------------------------------------------
// Frontmatter / YAML serialization (compatible with client/src/content/markdown.ts)
// ---------------------------------------------------------------------------

// Quote a scalar when leaving it bare would make parseScalar() coerce it to a
// number/boolean, treat it as JSON, or mangle whitespace.
export function serializeScalar(value) {
  const text = String(value ?? "");
  if (text === "") return '""';
  if (
    /^-?\d+(\.\d+)?$/.test(text) ||
    text === "true" ||
    text === "false" ||
    /^[[{"']/.test(text) ||
    text !== text.trim() ||
    text.includes("\n")
  ) {
    return JSON.stringify(text);
  }
  return text;
}

function serializeField(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${key}: []`];
    const primitive = value.every((item) => ["string", "number", "boolean"].includes(typeof item));
    if (primitive) return [`${key}:`, ...value.map((item) => `  - ${serializeScalar(item)}`)];
    return [`${key}: ${JSON.stringify(value)}`];
  }
  if (value && typeof value === "object") return [`${key}: ${JSON.stringify(value)}`];
  if (typeof value === "boolean" || typeof value === "number") return [`${key}: ${value}`];
  return [`${key}: ${serializeScalar(value)}`];
}

export function buildDocument(fields, body) {
  const lines = ["---"];
  for (const [key, value] of fields) {
    if (value === undefined) continue;
    lines.push(...serializeField(key, value));
  }
  lines.push("---");
  return `${lines.join("\n")}\n\n${String(body ?? "").trim()}\n`;
}

// ---------------------------------------------------------------------------
// Notion querying
// ---------------------------------------------------------------------------

async function resolveDataSourceId(notion, databaseId) {
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const dataSources = database.data_sources ?? database.dataSources ?? [];
    return dataSources[0]?.id ?? databaseId;
  } catch (error) {
    if (!notion.dataSources?.retrieve) throw error;
    await notion.dataSources.retrieve({ data_source_id: databaseId });
    return databaseId;
  }
}

async function queryAll(notion, databaseId, { filter, sorts } = {}) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const results = [];
  let startCursor;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      start_cursor: startCursor,
      page_size: 100,
    });
    results.push(...response.results);
    startCursor = response.has_more ? response.next_cursor : undefined;
  } while (startCursor);
  return results;
}

const publishedFilter = { property: "Status", select: { equals: "Published" } };
const publicFilter = {
  and: [
    publishedFilter,
    { property: "Private", checkbox: { does_not_equal: true } },
  ],
};
const orderSort = [{ property: "Order", direction: "ascending" }];

async function pageToMarkdown(n2m, pageId) {
  const blocks = await n2m.pageToMarkdown(pageId);
  const markdown = n2m.toMarkdownString(blocks);
  return (typeof markdown === "string" ? markdown : markdown.parent ?? "").trim();
}

function markdownToParagraphs(markdown) {
  return String(markdown ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Asset self-hosting (covers, avatar, inline images)
// ---------------------------------------------------------------------------

function extensionForAsset(url, contentType) {
  const byType = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".oga",
    "audio/wav": ".wav",
    "audio/webm": ".weba",
  }[contentType.split(";")[0].trim().toLowerCase()];
  if (byType) return byType;
  try {
    const ext = path.extname(new URL(url).pathname);
    if (ext) return ext.toLowerCase();
  } catch {
    /* ignore */
  }
  return ".bin";
}

async function downloadAsset(url, root, group, slug, basename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download Notion asset ${url}: HTTP ${response.status}`);
  const ext = extensionForAsset(url, response.headers.get("content-type") ?? "");
  const relative = path.join(group, slug, `${basename}${ext}`);
  const destination = path.join(root, GENERATED_ASSETS_DIR, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return `/notion/${relative.split(path.sep).join("/")}`;
}

// Covers and avatars are images and are always self-hosted.
async function selfHostCover(url, root, group, slug) {
  if (!url || !/^https?:\/\//i.test(url)) return url || undefined;
  return downloadAsset(url, root, group, slug, "cover");
}

// --- media (video / audio / embeds / attachments), ported from yskim-blog -----

export function hasTemporaryNotionUrl(markdown) {
  return /https?:\/\/[^\s)"]*(notion-static\.com|notion\.site|amazonaws\.com)[^\s)"]*(X-Amz-|notion|secure)/i.test(markdown);
}

const PLAYER_PROVIDERS = [
  { test: /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/, embed: (id) => `https://www.youtube.com/embed/${id}` },
  { test: /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/, embed: (id) => `https://player.vimeo.com/video/${id}` },
];

export function toPlayerEmbedUrl(url) {
  if (typeof url !== "string") return null;
  for (const provider of PLAYER_PROVIDERS) {
    const match = url.match(provider.test);
    if (match) return provider.embed(match[1]);
  }
  return null;
}

function escAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function captionHtml(caption) {
  const text = String(caption ?? "").trim();
  return text ? `\n  <figcaption>${escAttr(text)}</figcaption>` : "";
}
export function videoEmbedTag(playerUrl, caption) {
  return `<figure class="video-embed">\n  <iframe src="${playerUrl}" title="${escAttr(caption || "video")}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>${captionHtml(caption)}\n</figure>`;
}
export function videoFileTag(url, caption) {
  return `<figure class="video-file">\n  <video controls preload="metadata" src="${url}"></video>${captionHtml(caption)}\n</figure>`;
}
export function audioFileTag(url, caption) {
  return `<figure class="audio-file">\n  <audio controls preload="metadata" src="${url}"></audio>${captionHtml(caption)}\n</figure>`;
}
export function fileLinkTag(href, label) {
  return `<a class="file-attachment" href="${href}" download>${escAttr(label)}</a>`;
}

function mediaSrc(block, node, mode) {
  if (mode === "proxy" && node?.type === "file" && block?.id) return `/media/${block.id}`;
  return readObjectFileUrl(node);
}

// Custom notion-to-md transformers. In "proxy" mode, Notion-uploaded media is
// served through the /media/<block-id> Function (fresh URL + KV cache); otherwise
// the download pipeline self-hosts it. Images are always self-hosted.
function installCustomTransformers(n2m, mediaMode) {
  n2m.setCustomTransformer("equation", async (block) => {
    const expr = block?.equation?.expression?.trim();
    return expr ? `$$\n${expr}\n$$` : "";
  });
  n2m.setCustomTransformer("embed", async (block) => {
    const url = block?.embed?.url;
    if (!url) return "";
    const caption = richTextToPlain(block.embed.caption);
    const player = toPlayerEmbedUrl(url);
    if (player) return videoEmbedTag(player, caption);
    return caption ? `[${caption}](${url})` : `<${url}>`;
  });
  n2m.setCustomTransformer("video", async (block) => {
    const node = block?.video;
    const url = readObjectFileUrl(node);
    if (!url) return "";
    const caption = richTextToPlain(node?.caption);
    const player = toPlayerEmbedUrl(url);
    if (player) return videoEmbedTag(player, caption);
    return videoFileTag(mediaSrc(block, node, mediaMode), caption);
  });
  n2m.setCustomTransformer("audio", async (block) => {
    const node = block?.audio;
    if (!readObjectFileUrl(node)) return "";
    return audioFileTag(mediaSrc(block, node, mediaMode), richTextToPlain(node?.caption));
  });
  const attachment = (type) => async (block) => {
    const node = block?.[type];
    if (!readObjectFileUrl(node)) return "";
    if (!(mediaMode === "proxy" && node?.type === "file" && block?.id)) return false;
    const label = richTextToPlain(node?.caption) || node?.name || "첨부파일 다운로드";
    return fileLinkTag(`/media/${block.id}`, label);
  };
  n2m.setCustomTransformer("file", attachment("file"));
  n2m.setCustomTransformer("pdf", attachment("pdf"));
  n2m.setCustomTransformer("callout", async (block) => {
    const text = richTextToPlain(block.callout?.rich_text);
    const icon = block.callout?.icon?.emoji ? `${block.callout.icon.emoji} ` : "";
    return `> ${icon}${String(text).replace(/\n/g, "\n> ")}`;
  });
}

function collectRemoteAssets(markdown, mediaMode) {
  const assets = [];
  // Images are always self-hosted.
  for (const match of markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    assets.push({ url: match[1], kind: "image" });
  }
  // In proxy mode, heavy media/attachments are served from Notion via /media/<id>.
  if (mediaMode === "proxy") return assets;
  for (const match of markdown.matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (match.index > 0 && markdown[match.index - 1] === "!") continue;
    if (hasTemporaryNotionUrl(match[1])) assets.push({ url: match[1], kind: "file" });
  }
  for (const match of markdown.matchAll(/<(?:video|audio|source)\b[^>]*?\ssrc="(https?:\/\/[^"]+)"/gi)) {
    assets.push({ url: match[1], kind: "file" });
  }
  return assets;
}

// Download remote images/media referenced inside a Markdown body and rewrite the
// URLs to the self-hosted /notion/... paths (download mode) or leave /media/<id>
// proxy links untouched (proxy mode).
async function downloadAndRewriteAssets(markdown, root, group, slug, mediaMode) {
  const assets = collectRemoteAssets(markdown, mediaMode);
  if (assets.length === 0) return markdown;
  const replacements = new Map();
  let index = 0;
  for (const { url } of assets) {
    if (replacements.has(url)) continue;
    index += 1;
    replacements.set(url, await downloadAsset(url, root, group, slug, `asset-${index}`));
  }
  let output = markdown;
  for (const [url, local] of replacements) {
    if (output.includes(url)) output = output.split(url).join(local);
  }
  if (hasTemporaryNotionUrl(output)) {
    throw new Error(`Temporary Notion URL remains after asset rewrite for ${slug}.`);
  }
  return output;
}

// Convert a page body to Markdown and self-host/proxy its media.
async function renderBody(n2m, pageId, root, group, slug, mediaMode) {
  const markdown = await pageToMarkdown(n2m, pageId);
  return downloadAndRewriteAssets(markdown, root, group, slug, mediaMode);
}

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function resolveSlug(page, kind) {
  const explicit = readPlainText(page.properties.Slug);
  if (explicit) return explicit;
  const title = kind === "projects" ? readPlainText(page.properties.Name) : readPlainText(page.properties.Title);
  return slugify(title) || page.id.replace(/-/g, "").slice(0, 12);
}

function resolveEntrySlug(page) {
  return readPlainText(page.properties.Slug) || readPlainText(page.properties.Key) || slugify(entryTitle(page)) || page.id.replace(/-/g, "").slice(0, 12);
}

// First real paragraph of a Markdown body — used as an auto summary/desc when the
// author hasn't set one explicitly. Skips headings, quotes, tables, raw HTML.
export function firstParagraph(markdown) {
  for (const block of String(markdown ?? "").split(/\n{2,}/)) {
    const text = block.trim();
    if (!text || /^[#<>|]/.test(text)) continue;
    return text.replace(/\s+/g, " ").trim();
  }
  return "";
}

// Render a content page's Korean body. Korean DBs are mono-lingual now (English
// lives in the parallel "… (EN)" DBs), but as a safety net we still strip an
// English section if a legacy page kept a "# 한국어 / # English" split.
async function renderKoreanBody(n2m, pageId, root, group, slug, mediaMode) {
  const whole = await renderBody(n2m, pageId, root, group, slug, mediaMode);
  return splitByLanguageHeading(whole)?.ko ?? whole;
}

// Split markdown at a top-level "한국어" / "English" heading. Returns null if no
// English heading is present.
export function splitByLanguageHeading(markdown) {
  const lines = String(markdown ?? "").split("\n");
  const isHeading = (line, re) => /^#{1,3}\s+/.test(line) && re.test(line.toLowerCase());
  const enIdx = lines.findIndex((l) => isHeading(l, /english|영어|🇺🇸/));
  if (enIdx === -1) return null;
  const koHeadingIdx = lines.findIndex((l, i) => i < enIdx && isHeading(l, /한국어|korean|🇰🇷/));
  const koStart = koHeadingIdx === -1 ? 0 : koHeadingIdx + 1;
  return {
    ko: lines.slice(koStart, enIdx).join("\n").trim(),
    en: lines.slice(enIdx + 1).join("\n").trim(),
  };
}

// ---------------------------------------------------------------------------
// Builders: Notion rows -> content objects
// ---------------------------------------------------------------------------

export function buildContacts(rows) {
  return rows.map((page) => {
    const p = page.properties;
    return {
      id: readPlainText(p.Key) || readSelect(p.Type),
      type: readSelect(p.Type) || "external",
      label: readPlainText(p.Label),
      href: readUrl(p.Href),
    };
  });
}

export function buildEducation(rows) {
  return rows.map((page) => {
    const p = page.properties;
    return {
      type: readSelect(p.Type) || "education",
      degree: readPlainText(p.Degree),
      school: readPlainText(p.School),
      period: readPlainText(p.Period),
      startDate: readPlainText(p["Start Date"]) || undefined,
      endDate: readPlainText(p["End Date"]) || undefined,
      note: readPlainText(p.Note),
      current: readCheckbox(p.Current),
      status: normalizeStatus(readSelect(p.Status)),
      highlight: readCheckbox(p.Highlight, true),
      bullets: lineList(readPlainText(p.Bullets)),
      links: parseLinks(readPlainText(p.Links)),
      relatedProjects: commaList(readPlainText(p["Related Projects"])),
      relatedSkills: commaList(readPlainText(p["Related Skills"])),
    };
  });
}

export function buildSkills(rows) {
  return rows.map((page) => ({
    label: readPlainText(page.properties.Label),
    items: commaList(readPlainText(page.properties.Items)),
  }));
}

export function buildStarred(rows) {
  return rows.map((page) => {
    const p = page.properties;
    return {
      name: readPlainText(p.Name),
      href: readUrl(p.Href),
      stars: readPlainText(p.Stars),
      desc: readPlainText(p.Desc),
    };
  });
}

function readTextOrSelect(property) {
  return readPlainText(property) || readSelect(property);
}

function entryTitle(page) {
  return readPlainText(page.properties.Title);
}

function entryStatus(page) {
  return normalizeStatus(readTextOrSelect(page.properties.Status));
}

export function buildEntryContacts(rows) {
  return rows.map((page) => {
    const p = page.properties;
    return {
      id: readPlainText(p.Key) || readTextOrSelect(p.Type),
      type: readTextOrSelect(p.Type) || "external",
      label: entryTitle(page),
      href: readUrl(p.Href),
    };
  });
}

export function buildEntryEducation(rows) {
  return rows.map((page) => {
    const p = page.properties;
    return {
      type: readTextOrSelect(p.Type) || "education",
      degree: entryTitle(page),
      school: readPlainText(p.School),
      period: readPlainText(p.Period),
      startDate: readPlainText(p["Start Date"]) || undefined,
      endDate: readPlainText(p["End Date"]) || undefined,
      note: readPlainText(p.Summary),
      current: readCheckbox(p.Current),
      status: entryStatus(page),
      highlight: readCheckbox(p.Highlight, true),
      bullets: lineList(readPlainText(p.Bullets)),
      links: parseLinks(readPlainText(p.Links)),
      relatedProjects: commaList(readPlainText(p["Related Projects"])),
      relatedSkills: commaList(readPlainText(p["Related Skills"])),
    };
  });
}

export function buildEntrySkills(rows) {
  return rows.map((page) => ({
    label: entryTitle(page),
    items: commaList(readPlainText(page.properties.Items)),
  }));
}

export function buildEntryStarred(rows) {
  return rows.map((page) => {
    const p = page.properties;
    return {
      name: entryTitle(page),
      href: readUrl(p.Href),
      stars: readPlainText(p.Stars),
      desc: readPlainText(p.Summary),
    };
  });
}

function projectFrontmatter(page, coverImage, opts = {}) {
  const p = page.properties;
  const metrics = parseJsonValue(readPlainText(p["Metrics JSON"]), []);
  const evaluation = parseJsonValue(readPlainText(p["Evaluation JSON"]), {});
  const fields = [
    ["slug", opts.slug ?? readPlainText(p.Slug)],
    ["name", readPlainText(p.Name)],
    ["period", readPlainText(p.Period)],
    ["status", normalizeStatus(readSelect(p.Status))],
    ["desc", readPlainText(p.Desc) || opts.descFallback || ""],
    ["metric", readPlainText(p.Metric)],
    ["category", readSelect(p.Category) || undefined],
    ["focus", readSelect(p.Focus) || undefined],
    ["proofLevel", readSelect(p["Proof Level"]) || undefined],
  ];
  if (Array.isArray(metrics) && metrics.length > 0) fields.push(["metrics", metrics]);
  if (evaluation && typeof evaluation === "object" && Object.keys(evaluation).length > 0) {
    fields.push(["evaluation", evaluation]);
  }
  fields.push(
    ["tags", readMultiSelect(p.Tags)],
    ["link", readUrl(p.Link) || ""],
    ["highlight", readCheckbox(p.Highlight)],
    ["private", readCheckbox(p.Private)],
  );
  if (coverImage) fields.push(["coverImage", coverImage]);
  fields.push(["relatedNotes", commaList(readPlainText(p["Related Notes"]))]);
  return fields;
}

function researchFrontmatter(page, coverImage, opts = {}) {
  const p = page.properties;
  const fields = [
    ["slug", opts.slug ?? readPlainText(p.Slug)],
    ["title", readPlainText(p.Title)],
    ["status", normalizeStatus(readSelect(p.Status))],
    ["desc", readPlainText(p.Desc) || opts.descFallback || ""],
    ["showDiagram", readCheckbox(p["Show Diagram"])],
  ];
  if (coverImage) fields.push(["coverImage", coverImage]);
  fields.push(["relatedNotes", commaList(readPlainText(p["Related Notes"]))]);
  return fields;
}

function noteFrontmatter(page, opts = {}) {
  const p = page.properties;
  const relatedProjects = commaList(readPlainText(p["Related Projects"]));
  const relatedResearch = commaList(readPlainText(p["Related Research"]));
  return [
    ["slug", opts.slug ?? readPlainText(p.Slug)],
    ["title", readPlainText(p.Title)],
    ["status", normalizeStatus(readSelect(p.Status))],
    ["date", readDate(p.Date)],
    ["summary", readPlainText(p.Summary) || opts.summaryFallback || ""],
    ["tags", readMultiSelect(p.Tags)],
    ["relatedProjects", filterKnownSlugs(relatedProjects, opts.projectSlugs)],
    ["relatedResearch", filterKnownSlugs(relatedResearch, opts.researchSlugs)],
  ];
}

function entryProjectFrontmatter(page, coverImage, opts = {}) {
  const p = page.properties;
  const fields = [
    ["slug", opts.slug ?? resolveEntrySlug(page)],
    ["name", entryTitle(page)],
    ["period", readPlainText(p.Period)],
    ["status", entryStatus(page)],
    ["desc", readPlainText(p.Summary) || opts.descFallback || ""],
    ["metric", readPlainText(p.Metric)],
    ["category", readPlainText(p.Category) || undefined],
    ["focus", readPlainText(p.Focus) || undefined],
    ["proofLevel", readPlainText(p["Proof Level"]) || undefined],
    ["tags", commaList(readPlainText(p.Tags))],
    ["link", readUrl(p.Link) || ""],
    ["highlight", readCheckbox(p.Highlight)],
    ["private", readCheckbox(p.Private)],
  ];
  if (coverImage) fields.push(["coverImage", coverImage]);
  fields.push(["relatedNotes", commaList(readPlainText(p["Related Notes"]))]);
  return fields;
}

function entryResearchFrontmatter(page, coverImage, opts = {}) {
  const p = page.properties;
  const fields = [
    ["slug", opts.slug ?? resolveEntrySlug(page)],
    ["title", entryTitle(page)],
    ["status", entryStatus(page)],
    ["desc", readPlainText(p.Summary) || opts.descFallback || ""],
    ["showDiagram", readCheckbox(p["Show Diagram"])],
  ];
  if (coverImage) fields.push(["coverImage", coverImage]);
  fields.push(["relatedNotes", commaList(readPlainText(p["Related Notes"]))]);
  return fields;
}

function entryNoteFrontmatter(page, opts = {}) {
  const p = page.properties;
  const relatedProjects = commaList(readPlainText(p["Related Projects"]));
  const relatedResearch = commaList(readPlainText(p["Related Research"]));
  return [
    ["slug", opts.slug ?? resolveEntrySlug(page)],
    ["title", entryTitle(page)],
    ["status", entryStatus(page)],
    ["date", readDate(p.Date)],
    ["summary", readPlainText(p.Summary) || opts.summaryFallback || ""],
    ["tags", commaList(readPlainText(p.Tags))],
    ["relatedProjects", filterKnownSlugs(relatedProjects, opts.projectSlugs)],
    ["relatedResearch", filterKnownSlugs(relatedResearch, opts.researchSlugs)],
  ];
}

function filterKnownSlugs(values, knownSlugs) {
  if (!knownSlugs) return values;
  return values.filter((value) => knownSlugs.has(value));
}

// ---------------------------------------------------------------------------
// English (i18n) assembly
// ---------------------------------------------------------------------------

function pushIf(target, key, value) {
  if (value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)) {
    target[key] = value;
  }
}

export function rowKey(row, fallback = "") {
  return readPlainText(row?.properties?.Key) || fallback;
}

export function indexRowsByKey(rows = []) {
  const byKey = new Map();
  for (const row of rows) {
    const key = rowKey(row);
    if (key && !byKey.has(key)) byKey.set(key, row);
  }
  return byKey;
}

function firstRow(rows = []) {
  return rows[0] ?? null;
}

function keyedRow(section, key) {
  return section?.byKey?.get(key) ?? null;
}

function englishText(enRow, enProp, koProperties, inlineProp) {
  return readPlainText(enRow?.properties?.[enProp]) || readPlainText(koProperties?.[inlineProp]);
}

// enContent maps slug -> { row, body } for each English content DB (Projects/
// Research/Notes EN). shortEn maps section -> rows/index for config DBs.
export function buildEnglish({
  siteRow,
  profileRow,
  contactRows,
  educationRows,
  skillRows,
  starredRows,
  enContent = { projects: {}, research: {}, notes: {} },
  shortEn = {},
}) {
  const en = { locale: "en", ui: EN_UI };

  const siteEn = keyedRow(shortEn.site, "site") ?? firstRow(shortEn.site?.rows);
  const site = {};
  pushIf(site, "title", englishText(siteEn, "Title", siteRow.properties, "Title (EN)"));
  pushIf(site, "description", englishText(siteEn, "Description", siteRow.properties, "Description (EN)"));
  if (Object.keys(site).length) en.site = site;

  const profileEn = keyedRow(shortEn.profile, "profile") ?? firstRow(shortEn.profile?.rows);
  const profile = {};
  const pp = profileRow.properties;
  pushIf(profile, "name", englishText(profileEn, "Name", pp, "Name (EN)"));
  pushIf(profile, "status", englishText(profileEn, "Availability", pp, "Availability (EN)"));
  pushIf(profile, "headline", englishText(profileEn, "Headline", pp, "Headline (EN)"));
  pushIf(profile, "summaryLead", englishText(profileEn, "Summary Lead", pp, "Summary Lead (EN)"));
  pushIf(profile, "summary", markdownToParagraphs(englishText(profileEn, "Summary", pp, "Summary (EN)")));
  const contacts = {};
  for (const row of contactRows) {
    const id = readPlainText(row.properties.Key) || readSelect(row.properties.Type);
    const contactEn = keyedRow(shortEn.contacts, id);
    const label = englishText(contactEn, "Label", row.properties, "Label (EN)");
    if (id && label) contacts[id] = { label };
  }
  if (Object.keys(contacts).length) profile.contacts = contacts;
  if (Object.keys(profile).length) en.profile = profile;

  en.education = educationRows.map((row) => {
    const p = row.properties;
    const key = rowKey(row, `timeline-${slugify(readPlainText(p.Degree))}`);
    const timelineEn = keyedRow(shortEn.timeline, key);
    const entry = {};
    pushIf(entry, "degree", englishText(timelineEn, "Degree", p, "Degree (EN)"));
    pushIf(entry, "school", englishText(timelineEn, "School", p, "School (EN)"));
    pushIf(entry, "period", englishText(timelineEn, "Period", p, "Period (EN)"));
    pushIf(entry, "note", englishText(timelineEn, "Note", p, "Note (EN)"));
    pushIf(entry, "bullets", lineList(englishText(timelineEn, "Bullets", p, "Bullets (EN)")));
    return entry;
  });

  en.research = {};
  for (const [slug, { row, body }] of Object.entries(enContent.research)) {
    const entry = {};
    pushIf(entry, "title", readPlainText(row.properties.Title));
    pushIf(entry, "desc", readPlainText(row.properties.Desc) || firstParagraph(body));
    pushIf(entry, "body", body);
    if (Object.keys(entry).length) en.research[slug] = entry;
  }

  en.projects = {};
  for (const [slug, { row, body }] of Object.entries(enContent.projects)) {
    const p = row.properties;
    const entry = {};
    pushIf(entry, "name", readPlainText(p.Name));
    pushIf(entry, "period", readPlainText(p.Period));
    pushIf(entry, "desc", readPlainText(p.Desc) || firstParagraph(body));
    pushIf(entry, "metric", readPlainText(p.Metric));
    pushIf(entry, "tags", commaList(readPlainText(p.Tags)));
    pushIf(entry, "body", body);
    if (Object.keys(entry).length) en.projects[slug] = entry;
  }

  en.skills = {};
  for (const row of skillRows) {
    const label = readPlainText(row.properties.Label);
    const key = rowKey(row, `skill-${slugify(label)}`);
    const skillEn = keyedRow(shortEn.skills, key);
    const entry = {};
    pushIf(entry, "label", englishText(skillEn, "Label", row.properties, "Label (EN)"));
    pushIf(entry, "items", commaList(englishText(skillEn, "Items", row.properties, "Items (EN)")));
    if (label && Object.keys(entry).length) en.skills[label] = entry;
  }

  en.starred = {};
  for (const row of starredRows) {
    const name = readPlainText(row.properties.Name);
    const key = rowKey(row, `starred-${slugify(name)}`);
    const starredEn = keyedRow(shortEn.starred, key);
    const desc = englishText(starredEn, "Desc", row.properties, "Desc (EN)");
    if (name && desc) en.starred[name] = { desc };
  }

  en.notes = {};
  for (const [slug, { row, body }] of Object.entries(enContent.notes)) {
    const p = row.properties;
    const entry = {};
    pushIf(entry, "title", readPlainText(p.Title));
    pushIf(entry, "date", readPlainText(p.Date));
    pushIf(entry, "summary", readPlainText(p.Summary) || firstParagraph(body));
    pushIf(entry, "tags", commaList(readPlainText(p.Tags)));
    pushIf(entry, "body", body);
    if (Object.keys(entry).length) en.notes[slug] = entry;
  }

  return en;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function resolveDatabaseIds(options = {}) {
  const ids = {};
  for (const key of Object.keys(DATABASE_DEFAULTS)) {
    ids[key] = options[key] ?? process.env[ENV_KEYS[key]] ?? DATABASE_DEFAULTS[key];
  }
  return ids;
}

// Build slug -> { row, body } maps for the English content DBs, joined to the
// Korean rows by Slug. Tolerant: if an English DB is missing or unshared, that
// collection simply has no English and the site falls back to Korean.
async function loadEnglishContent(notion, n2m, ids, root, mediaMode) {
  const kinds = [
    ["projects", ids.projectsEn],
    ["research", ids.researchEn],
    ["notes", ids.notesEn],
  ];
  const out = { projects: {}, research: {}, notes: {} };
  for (const [kind, dataId] of kinds) {
    if (!dataId) continue;
    let rows;
    try {
      rows = await queryAll(notion, dataId, { filter: publishedFilter });
    } catch (error) {
      console.warn(`English ${kind} DB unavailable (${error.message}); falling back to Korean.`);
      continue;
    }
    for (const row of rows) {
      const slug = resolveSlug(row, kind);
      if (!slug) continue;
      out[kind][slug] = { row, body: await renderBody(n2m, row.id, root, kind, `${slug}-en`, mediaMode) };
    }
  }
  return out;
}

async function loadShortEnglishRows(notion, ids) {
  const specs = [
    ["profile", ids.profileEn, undefined],
    ["site", ids.siteEn, undefined],
    ["contacts", ids.contactsEn, orderSort],
    ["timeline", ids.timelineEn, orderSort],
    ["skills", ids.skillsEn, orderSort],
    ["starred", ids.starredEn, orderSort],
  ];
  const out = {};
  for (const [section, dataId, sorts] of specs) {
    if (!dataId) {
      out[section] = { rows: [], byKey: new Map() };
      continue;
    }
    try {
      const rows = await queryAll(notion, dataId, sorts ? { sorts } : {});
      out[section] = { rows, byKey: indexRowsByKey(rows) };
    } catch (error) {
      console.warn(`English ${section} DB unavailable (${error.message}); falling back to inline fields.`);
      out[section] = { rows: [], byKey: new Map() };
    }
  }
  return out;
}

function entrySection(page) {
  return page.__section ?? readTextOrSelect(page.properties.Section);
}

function entryLocale(page) {
  return readTextOrSelect(page.properties.Locale) || "ko";
}

function entryKey(page) {
  return readPlainText(page.properties.Key) || resolveEntrySlug(page);
}

function entryOrder(page) {
  return readNumber(page.properties.Order) ?? Number.MAX_SAFE_INTEGER;
}

function sortEntries(rows) {
  return [...rows].sort((a, b) => entryOrder(a) - entryOrder(b) || entryTitle(a).localeCompare(entryTitle(b)));
}

function groupEntryRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${entrySection(row)}:${entryLocale(row)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  for (const [key, value] of grouped) grouped.set(key, sortEntries(value));
  return grouped;
}

function entriesFor(grouped, section, locale = "ko") {
  return grouped.get(`${section}:${locale}`) ?? [];
}

function firstEntry(grouped, section, locale = "ko") {
  return entriesFor(grouped, section, locale)[0] ?? null;
}

function indexEntriesByKey(rows) {
  return new Map(rows.map((row) => [entryKey(row), row]).filter(([key]) => key));
}

function withEntrySection(page, section) {
  return { ...page, __section: section };
}

function assertConfiguredCategoryDatabases(ids) {
  const missing = CATEGORY_DATABASE_SECTIONS.filter((section) => !ids[section]);
  if (missing.length) {
    const envNames = missing.map((section) => ENV_KEYS[section]).join(", ");
    throw new Error(`Missing Notion category database ids: ${envNames}.`);
  }
}

async function queryCategoryRows(notion, ids) {
  const rows = [];
  for (const section of CATEGORY_DATABASE_SECTIONS) {
    const sectionRows = await queryAll(notion, ids[section], { filter: publicFilter, sorts: orderSort });
    rows.push(...sectionRows.map((row) => withEntrySection(row, section)));
  }
  return rows;
}

async function buildEnglishFromEntries({ grouped, n2m, root, mediaMode, koRows }) {
  const en = { locale: "en", ui: EN_UI };
  const siteEn = firstEntry(grouped, "site", "en");
  if (siteEn) {
    const site = {};
    pushIf(site, "title", entryTitle(siteEn));
    pushIf(site, "description", readPlainText(siteEn.properties.Summary) || readPlainText(siteEn.properties.Description));
    if (Object.keys(site).length) en.site = site;
  }

  const profileEn = firstEntry(grouped, "profile", "en");
  if (profileEn) {
    const pp = profileEn.properties;
    const introEn = firstEntry(grouped, "intro", "en");
    const bodySource = introEn ?? profileEn;
    const body = await renderBody(n2m, bodySource.id, root, "profile", "summary-en", mediaMode);
    const profile = {};
    pushIf(profile, "name", entryTitle(profileEn));
    pushIf(profile, "status", readPlainText(pp.Availability));
    pushIf(profile, "headline", readPlainText(pp.Headline));
    pushIf(profile, "summaryLead", readPlainText(pp["Summary Lead"]));
    pushIf(profile, "summary", markdownToParagraphs(body || readPlainText(pp.Summary)));
    const contacts = {};
    for (const row of entriesFor(grouped, "contacts", "en")) {
      const id = entryKey(row);
      const label = entryTitle(row);
      if (id && label) contacts[id] = { label };
    }
    if (Object.keys(contacts).length) profile.contacts = contacts;
    if (Object.keys(profile).length) en.profile = profile;
  }

  const timelineEn = indexEntriesByKey(entriesFor(grouped, "timeline", "en"));
  en.education = koRows.timeline.map((row) => {
    const match = timelineEn.get(entryKey(row));
    const p = match?.properties ?? {};
    const entry = {};
    pushIf(entry, "degree", match ? entryTitle(match) : "");
    pushIf(entry, "school", readPlainText(p.School));
    pushIf(entry, "period", readPlainText(p.Period));
    pushIf(entry, "note", readPlainText(p.Summary));
    pushIf(entry, "bullets", lineList(readPlainText(p.Bullets)));
    return entry;
  });

  en.research = {};
  for (const row of entriesFor(grouped, "research", "en")) {
    const slug = resolveEntrySlug(row);
    if (koRows.researchSlugs && !koRows.researchSlugs.has(slug)) continue;
    const body = await renderBody(n2m, row.id, root, "research", `${slug}-en`, mediaMode);
    const entry = {};
    pushIf(entry, "title", entryTitle(row));
    pushIf(entry, "desc", readPlainText(row.properties.Summary) || firstParagraph(body));
    pushIf(entry, "body", body);
    if (Object.keys(entry).length) en.research[slug] = entry;
  }

  en.projects = {};
  for (const row of entriesFor(grouped, "projects", "en")) {
    const slug = resolveEntrySlug(row);
    if (koRows.projectSlugs && !koRows.projectSlugs.has(slug)) continue;
    const p = row.properties;
    const body = await renderBody(n2m, row.id, root, "projects", `${slug}-en`, mediaMode);
    const entry = {};
    pushIf(entry, "name", entryTitle(row));
    pushIf(entry, "period", readPlainText(p.Period));
    pushIf(entry, "desc", readPlainText(p.Summary) || firstParagraph(body));
    pushIf(entry, "metric", readPlainText(p.Metric));
    pushIf(entry, "tags", commaList(readPlainText(p.Tags)));
    pushIf(entry, "body", body);
    if (Object.keys(entry).length) en.projects[slug] = entry;
  }

  const skillsEn = indexEntriesByKey(entriesFor(grouped, "skills", "en"));
  en.skills = {};
  for (const row of koRows.skills) {
    const match = skillsEn.get(entryKey(row));
    const entry = {};
    pushIf(entry, "label", match ? entryTitle(match) : "");
    pushIf(entry, "items", commaList(readPlainText(match?.properties?.Items)));
    if (entryTitle(row) && Object.keys(entry).length) en.skills[entryTitle(row)] = entry;
  }

  const starredEn = indexEntriesByKey(entriesFor(grouped, "starred", "en"));
  en.starred = {};
  for (const row of koRows.starred) {
    const match = starredEn.get(entryKey(row));
    const desc = readPlainText(match?.properties?.Summary);
    if (entryTitle(row) && desc) en.starred[entryTitle(row)] = { desc };
  }

  en.notes = {};
  for (const row of entriesFor(grouped, "notes", "en")) {
    const slug = resolveEntrySlug(row);
    if (koRows.noteSlugs && !koRows.noteSlugs.has(slug)) continue;
    const p = row.properties;
    const body = await renderBody(n2m, row.id, root, "notes", `${slug}-en`, mediaMode);
    const entry = {};
    pushIf(entry, "title", entryTitle(row));
    pushIf(entry, "date", readDate(p.Date));
    pushIf(entry, "summary", readPlainText(p.Summary) || firstParagraph(body));
    pushIf(entry, "tags", commaList(readPlainText(p.Tags)));
    pushIf(entry, "body", body);
    if (Object.keys(entry).length) en.notes[slug] = entry;
  }

  return en;
}

async function writeJson(root, relative, value) {
  const destination = path.join(root, "content", relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchPortfolioEntriesContent({ root, notion, n2m, entryRows, mediaMode }) {
  const grouped = groupEntryRows(entryRows);
  const profileRow = firstEntry(grouped, "profile", "ko");
  const introRow = firstEntry(grouped, "intro", "ko");
  const siteRow = firstEntry(grouped, "site", "ko");
  if (!profileRow) throw new Error("Portfolio category databases have no ko/profile row.");
  if (!siteRow) throw new Error("Portfolio category databases have no ko/site row.");

  const introRows = entriesFor(grouped, "intro", "ko");
  const contactRows = entriesFor(grouped, "contacts", "ko");
  const timelineRows = entriesFor(grouped, "timeline", "ko");
  const projectRows = entriesFor(grouped, "projects", "ko");
  const researchRows = entriesFor(grouped, "research", "ko");
  const noteRows = entriesFor(grouped, "notes", "ko");
  const skillRows = entriesFor(grouped, "skills", "ko");
  const starredRows = entriesFor(grouped, "starred", "ko");

  await rm(path.join(root, GENERATED_ASSETS_DIR), { recursive: true, force: true });
  for (const dir of ["projects", "research", "notes"]) {
    await rm(path.join(root, "content", dir), { recursive: true, force: true });
    await mkdir(path.join(root, "content", dir), { recursive: true });
  }

  const profileSummaryRow = introRow ?? profileRow;
  const profileSummaryMd = await renderBody(n2m, profileSummaryRow.id, root, "profile", "summary", mediaMode);
  const avatarUrl = await selfHostCover(readUrl(profileRow.properties["Avatar URL"]), root, "profile", "avatar");
  const profile = {
    name: entryTitle(profileRow),
    romanizedName: readPlainText(profileRow.properties.Romanized),
    handle: readPlainText(profileRow.properties.Handle),
    status: readPlainText(profileRow.properties.Availability),
    avatarUrl: avatarUrl ?? "",
    headline: readPlainText(profileRow.properties.Headline),
    summaryLead: readPlainText(profileRow.properties["Summary Lead"]),
    summary: markdownToParagraphs(profileSummaryMd || readPlainText(profileRow.properties.Summary)),
    contacts: buildEntryContacts(contactRows),
  };
  await writeJson(root, "profile.json", profile);

  const site = {
    title: entryTitle(siteRow),
    description: readPlainText(siteRow.properties.Summary) || readPlainText(siteRow.properties.Description),
    url: readUrl(prop(siteRow.properties, "URL")),
    navigation: SITE_DEFAULTS.navigation,
    images: SITE_DEFAULTS.images,
  };
  await writeJson(root, "site.json", site);

  await writeJson(root, "education.json", buildEntryEducation(timelineRows));
  await writeJson(root, "skills.json", buildEntrySkills(skillRows));
  await writeJson(root, "starred.json", buildEntryStarred(starredRows));

  const order = { research: [], projects: [], notes: [] };
  const publicProjectSlugs = new Set(projectRows.map((page) => resolveEntrySlug(page)).filter(Boolean));
  const publicResearchSlugs = new Set(researchRows.map((page) => resolveEntrySlug(page)).filter(Boolean));
  const publicNoteSlugs = new Set(noteRows.map((page) => resolveEntrySlug(page)).filter(Boolean));

  for (const page of projectRows) {
    const slug = resolveEntrySlug(page);
    const coverImage = await selfHostCover(readUrl(page.properties["Cover URL"]), root, "projects", slug);
    const ko = await renderKoreanBody(n2m, page.id, root, "projects", slug, mediaMode);
    await writeFile(
      path.join(root, "content", "projects", `${slug}.mdx`),
      buildDocument(entryProjectFrontmatter(page, coverImage, { slug, descFallback: firstParagraph(ko) }), ko),
      "utf8",
    );
    order.projects.push(slug);
  }

  for (const page of researchRows) {
    const slug = resolveEntrySlug(page);
    const coverImage = await selfHostCover(readUrl(page.properties["Cover URL"]), root, "research", slug);
    const ko = await renderKoreanBody(n2m, page.id, root, "research", slug, mediaMode);
    await writeFile(
      path.join(root, "content", "research", `${slug}.mdx`),
      buildDocument(entryResearchFrontmatter(page, coverImage, { slug, descFallback: firstParagraph(ko) }), ko),
      "utf8",
    );
    order.research.push(slug);
  }

  for (const page of noteRows) {
    const slug = resolveEntrySlug(page);
    const ko = await renderKoreanBody(n2m, page.id, root, "notes", slug, mediaMode);
    await writeFile(
      path.join(root, "content", "notes", `${slug}.mdx`),
      buildDocument(
        entryNoteFrontmatter(page, {
          slug,
          summaryFallback: firstParagraph(ko),
          projectSlugs: publicProjectSlugs,
          researchSlugs: publicResearchSlugs,
        }),
        ko,
      ),
      "utf8",
    );
    order.notes.push(slug);
  }

  await writeJson(root, "order.json", order);

  const english = await buildEnglishFromEntries({
    grouped,
    n2m,
    root,
    mediaMode,
    koRows: {
      timeline: timelineRows,
      skills: skillRows,
      starred: starredRows,
      projectSlugs: publicProjectSlugs,
      researchSlugs: publicResearchSlugs,
      noteSlugs: publicNoteSlugs,
    },
  });
  english.generatedAt = new Date().toISOString();
  await writeJson(root, path.join("i18n", "en.json"), english);

  return {
    counts: {
      projects: projectRows.length,
      research: researchRows.length,
      notes: noteRows.length,
      intro: introRows.length,
      timeline: timelineRows.length,
      skills: skillRows.length,
      starred: starredRows.length,
      contacts: contactRows.length,
    },
  };
}

export async function fetchPortfolioContent(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const token = options.token ?? process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("Missing NOTION_TOKEN. Create a read-only Notion integration and share the portfolio category databases with it.");
  }
  const ids = resolveDatabaseIds(options);

  const [{ Client }, { NotionToMarkdown }] = await Promise.all([
    import("@notionhq/client"),
    import("notion-to-md"),
  ]);
  const notion = new Client({ auth: token });
  const n2m = new NotionToMarkdown({ notionClient: notion });
  const mediaMode = (options.mediaMode ?? process.env.NOTION_MEDIA_MODE) === "proxy" ? "proxy" : "download";
  installCustomTransformers(n2m, mediaMode);

  assertConfiguredCategoryDatabases(ids);
  const entryRows = await queryCategoryRows(notion, ids);
  if (entryRows.length === 0) throw new Error("Portfolio category databases have no public Published rows.");
  return fetchPortfolioEntriesContent({ root, notion, n2m, entryRows, mediaMode });
}

async function runCli() {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--root");
  const root = rootIndex === -1 ? process.cwd() : args[rootIndex + 1];
  const result = await fetchPortfolioContent({ root });
  const { counts } = result;
  console.log(
    `Fetched from Notion: ${counts.projects} projects, ${counts.research} research, ${counts.notes} notes, ${counts.intro} intro, ` +
      `${counts.timeline} timeline, ${counts.skills} skill groups, ${counts.starred} starred, ${counts.contacts} contacts.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
