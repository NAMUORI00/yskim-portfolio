// Regenerates the public Notion portfolio rendering page from the portfolio
// category databases. This keeps the Notion page itself in sync with the same
// DBs that drive namuori.net.

import { pathToFileURL } from "node:url";

import { Client } from "@notionhq/client";

const DEFAULT_PUBLIC_PAGE_ID = "380dcd44-779f-81bc-b4ee-e4076ffa598e";
const DEFAULT_MANAGEMENT_PAGE_URL = "https://app.notion.com/p/37fdcd44779f8161827bd4cc6615a7ab";
const CATEGORY_DATABASE_DEFAULTS = {
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
const CATEGORY_ENV_KEYS = {
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
const CATEGORY_DATABASE_SECTIONS = Object.keys(CATEGORY_DATABASE_DEFAULTS);
const MAX_RICH_TEXT = 1900;
const MAX_APPEND_CHILDREN = 100;
const publicFilter = {
  and: [
    { property: "Status", select: { equals: "Published" } },
    { property: "Private", checkbox: { does_not_equal: true } },
  ],
};
const orderSort = [{ property: "Order", direction: "ascending" }];

function richTextToPlain(items) {
  return (items ?? []).map((item) => item.plain_text ?? "").join("").trim();
}

function textProp(properties, name) {
  const property = properties?.[name] ?? properties?.[`userDefined:${name}`];
  if (!property) return "";
  if (property.type === "title") return richTextToPlain(property.title);
  if (property.type === "rich_text") return richTextToPlain(property.rich_text);
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "url") return property.url ?? "";
  if (property.type === "date") return property.date?.start ?? "";
  if (property.type === "number") return property.number == null ? "" : String(property.number);
  if (property.type === "checkbox") return property.checkbox ? "true" : "false";
  return "";
}

function rowFromPage(page, sectionOverride) {
  const p = page.properties;
  const order = Number.parseInt(textProp(p, "Order"), 10);
  return {
    id: page.id,
    section: sectionOverride ?? textProp(p, "Section"),
    locale: textProp(p, "Locale") || "ko",
    title: textProp(p, "Title"),
    key: textProp(p, "Key"),
    summary: textProp(p, "Summary") || textProp(p, "Description"),
    summaryLead: textProp(p, "Summary Lead"),
    headline: textProp(p, "Headline"),
    availability: textProp(p, "Availability"),
    school: textProp(p, "School"),
    period: textProp(p, "Period"),
    tags: textProp(p, "Tags"),
    items: textProp(p, "Items"),
    metric: textProp(p, "Metric"),
    proof: textProp(p, "Proof Level"),
    href: textProp(p, "Href"),
    link: textProp(p, "Link"),
    url: textProp(p, "URL"),
    stars: textProp(p, "Stars"),
    order: Number.isFinite(order) ? order : 9999,
    highlight: textProp(p, "Highlight") === "true",
    private: textProp(p, "Private") === "true",
    status: textProp(p, "Status") || "Published",
  };
}

function clean(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function sortRows(rows) {
  return [...rows].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function rowsFor(rows, section, locale = "ko") {
  return sortRows(rows.filter((row) => row.section === section && row.locale === locale));
}

function firstRow(rows, section, locale = "ko") {
  return rowsFor(rows, section, locale)[0] ?? {};
}

function splitText(text, max = MAX_RICH_TEXT) {
  const chunks = [];
  let remaining = String(text ?? "");
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function richText(text, options = {}) {
  const content = String(text ?? "").slice(0, MAX_RICH_TEXT);
  const item = {
    type: "text",
    text: options.href ? { content, link: { url: options.href } } : { content },
  };
  if (options.bold || options.code || options.color) {
    item.annotations = {
      bold: Boolean(options.bold),
      italic: false,
      strikethrough: false,
      underline: false,
      code: Boolean(options.code),
      color: options.color ?? "default",
    };
  }
  return [item];
}

function block(type, richTextKey, text, options = {}) {
  return {
    object: "block",
    type,
    [type]: {
      rich_text: richText(text, options),
    },
  };
}

function paragraph(text, options = {}) {
  return block("paragraph", "rich_text", text, options);
}

function richTextSpan(text, options = {}) {
  const item = {
    type: "text",
    text: options.href ? { content: text, link: { url: options.href } } : { content: text },
  };
  if (options.bold || options.code || options.color) {
    item.annotations = {
      bold: Boolean(options.bold),
      italic: false,
      strikethrough: false,
      underline: false,
      code: Boolean(options.code),
      color: options.color ?? "default",
    };
  }
  return item;
}

function quote(text) {
  return block("quote", "rich_text", text);
}

function heading(level, text) {
  return block(`heading_${level}`, "rich_text", text);
}

function divider() {
  return { object: "block", type: "divider", divider: {} };
}

function bullet(text, children = []) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: richText(text),
      children,
    },
  };
}

function linkedTextBlock(type, label, href, suffix = "") {
  const rich_text = [
    richTextSpan(label, { href, bold: true }),
  ];
  if (suffix) rich_text.push(richTextSpan(suffix));
  return {
    object: "block",
    type,
    [type]: { rich_text },
  };
}

function paragraphWithRichText(spans) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: spans,
    },
  };
}

function addParagraphs(blocks, text, options = {}) {
  for (const chunk of splitText(clean(text))) blocks.push(paragraph(chunk, options));
}

function contactUrl(row) {
  return row.href || row.url || row.link || "";
}

export function buildPublicPageBlocks(rows, source = {}) {
  const publicRows = rows.filter((row) => row.status === "Published" && !row.private);
  const profile = firstRow(publicRows, "profile");
  const intro = firstRow(publicRows, "intro");
  const site = firstRow(publicRows, "site");
  const siteEn = firstRow(publicRows, "site", "en");
  const contacts = rowsFor(publicRows, "contacts");
  const research = rowsFor(publicRows, "research");
  const projects = rowsFor(publicRows, "projects");
  const skills = rowsFor(publicRows, "skills");
  const timeline = rowsFor(publicRows, "timeline");
  const starred = rowsFor(publicRows, "starred");
  const notes = rowsFor(publicRows, "notes");
  const selected = sortRows(projects).sort((a, b) => Number(b.highlight) - Number(a.highlight) || a.order - b.order).slice(0, 4);
  const selectedKeys = new Set(selected.map((row) => row.key).filter(Boolean));
  const systemRows = projects.filter((row) => !selectedKeys.has(row.key)).slice(0, 4);
  const blocks = [];

  blocks.push(quote(`${source.shortLabel ?? "Portfolio category DBs"} 기반 공개 렌더링 · Published 항목만 표시 · Private 항목 제외`));
  if (profile.headline) addParagraphs(blocks, profile.headline, { bold: true });
  blocks.push(paragraph("Selected · Research · Systems · Timeline · Links"));
  addParagraphs(blocks, intro.summaryLead || profile.summaryLead);
  addParagraphs(blocks, intro.summary || site.summary);

  if (contacts.length) {
    const spans = [richTextSpan("Contact", { bold: true })];
    for (const [index, row] of contacts.entries()) {
      spans.push(richTextSpan(index === 0 ? " · " : " · "));
      spans.push(richTextSpan(row.title, { href: contactUrl(row) || undefined }));
    }
    blocks.push(paragraphWithRichText(spans));
  }

  blocks.push(divider());
  blocks.push(heading(2, "Selected"));
  for (const row of selected) {
    blocks.push(linkedTextBlock("heading_3", row.title, row.link));
    addParagraphs(blocks, row.summary);
    const meta = [
      row.tags ? `Tags: ${row.tags}` : "",
      row.metric ? `Metric: ${row.metric}` : "",
      row.proof ? `Proof: ${row.proof}` : "",
    ].filter(Boolean);
    if (meta.length) blocks.push(paragraph(meta.join(" · "), { code: true }));
  }

  blocks.push(heading(2, "Research"));
  for (const row of research) blocks.push(bullet(`${row.title} - ${clean(row.summary)}`));

  blocks.push(heading(2, "Systems"));
  for (const row of systemRows) {
    const suffix = `${row.summary ? ` - ${clean(row.summary)}` : ""}${row.tags ? ` · ${row.tags}` : ""}`;
    blocks.push(linkedTextBlock("bulleted_list_item", row.title, row.link, suffix));
  }

  blocks.push(heading(2, "Timeline"));
  for (const row of timeline) {
    const where = [row.school, row.period].filter(Boolean).join(" · ");
    const children = row.summary ? [paragraph(clean(row.summary))] : [];
    blocks.push(bullet(`${row.title}${where ? ` · ${where}` : ""}`, children));
  }

  blocks.push(heading(2, "Skills"));
  for (const row of skills) blocks.push(bullet(`${row.title}${row.items ? ` - ${clean(row.items)}` : ""}`));

  blocks.push(heading(2, "Links"));
  for (const row of notes) blocks.push(bullet(`${row.title} - ${clean(row.summary)}`));
  for (const row of starred) {
    const suffix = ` - ${clean(row.summary)}${row.stars ? ` · ${row.stars}` : ""}`;
    blocks.push(linkedTextBlock("bulleted_list_item", row.title, row.href, suffix));
  }

  blocks.push(heading(2, "English"));
  addParagraphs(blocks, siteEn.summary);
  const englishSelected = rowsFor(publicRows, "projects", "en").filter((row) => selectedKeys.has(row.key));
  for (const row of englishSelected) blocks.push(bullet(`${row.title} - ${clean(row.summary)}`));

  blocks.push(divider());
  blocks.push(
    linkedTextBlock(
      "paragraph",
      source.label ?? "Source: Portfolio category DBs",
      source.href ?? DEFAULT_MANAGEMENT_PAGE_URL,
      ". This page is regenerated automatically from the database.",
    ),
  );

  return blocks;
}

async function resolveDataSourceId(notion, databaseId) {
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    return database.data_sources?.[0]?.id ?? databaseId;
  } catch (error) {
    if (!notion.dataSources?.retrieve) throw error;
    await notion.dataSources.retrieve({ data_source_id: databaseId });
    return databaseId;
  }
}

async function queryAll(notion, databaseId) {
  const dataSourceId = await resolveDataSourceId(notion, databaseId);
  const results = [];
  let start_cursor;
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor,
      filter: publicFilter,
      sorts: orderSort,
    });
    results.push(...response.results);
    start_cursor = response.has_more ? response.next_cursor : undefined;
  } while (start_cursor);
  return results;
}

function resolveCategoryDatabaseIds(options = {}) {
  const ids = {};
  for (const section of CATEGORY_DATABASE_SECTIONS) {
    ids[section] = options[`${section}DatabaseId`] ?? process.env[CATEGORY_ENV_KEYS[section]] ?? CATEGORY_DATABASE_DEFAULTS[section];
  }
  return ids;
}

function assertConfiguredCategoryDatabases(ids) {
  const missing = CATEGORY_DATABASE_SECTIONS.filter((section) => !ids[section]);
  if (missing.length) {
    const envNames = missing.map((section) => CATEGORY_ENV_KEYS[section]).join(", ");
    throw new Error(`Missing Notion category database ids: ${envNames}.`);
  }
}

async function queryCategoryRows(notion, ids) {
  const rows = [];
  for (const section of CATEGORY_DATABASE_SECTIONS) {
    const pages = await queryAll(notion, ids[section]);
    rows.push(...pages.map((page) => rowFromPage(page, section)));
  }
  return rows;
}

async function listChildren(notion, blockId) {
  const results = [];
  let start_cursor;
  do {
    const response = await notion.blocks.children.list({ block_id: blockId, start_cursor, page_size: 100 });
    results.push(...response.results);
    start_cursor = response.has_more ? response.next_cursor : undefined;
  } while (start_cursor);
  return results;
}

async function replacePageChildren(notion, pageId, children) {
  const currentChildren = await listChildren(notion, pageId);
  for (const child of currentChildren) {
    await notion.blocks.delete({ block_id: child.id });
  }
  for (let i = 0; i < children.length; i += MAX_APPEND_CHILDREN) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: children.slice(i, i + MAX_APPEND_CHILDREN),
    });
  }
}

export async function syncPublicPage(options = {}) {
  const token = options.token ?? process.env.NOTION_TOKEN;
  if (!token) throw new Error("Missing NOTION_TOKEN.");
  const categoryDatabaseIds = resolveCategoryDatabaseIds(options);
  const pageId = options.pageId ?? process.env.NOTION_PUBLIC_PAGE_ID ?? DEFAULT_PUBLIC_PAGE_ID;
  const notion = new Client({ auth: token });
  assertConfiguredCategoryDatabases(categoryDatabaseIds);
  const rows = await queryCategoryRows(notion, categoryDatabaseIds);
  if (rows.length === 0) throw new Error("Portfolio category databases have no public Published rows.");

  const source = {
    shortLabel: "Portfolio category DBs",
    label: "Source: Portfolio category DBs",
    href: DEFAULT_MANAGEMENT_PAGE_URL,
  };
  const children = buildPublicPageBlocks(rows, source);
  await replacePageChildren(notion, pageId, children);
  return { rows: rows.length, blocks: children.length, pageId, source: source.shortLabel };
}

async function runCli() {
  try {
    const result = await syncPublicPage();
    console.log(
      `Synced public Notion page ${result.pageId}: ${result.rows} published rows -> ${result.blocks} blocks from ${result.source}.`,
    );
  } catch (error) {
    if (error?.code === "restricted_resource") {
      console.error(
        "Notion public page sync needs a token with content update/insert permissions and access to the public rendering page.",
      );
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
