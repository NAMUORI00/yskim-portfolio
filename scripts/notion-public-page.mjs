// Regenerates the public Notion portfolio rendering page from the unified
// Portfolio Entries database. This keeps the Notion page itself in sync with
// the same DB that drives namuori.net.

import { pathToFileURL } from "node:url";

import { Client } from "@notionhq/client";

const DEFAULT_ENTRIES_DB_ID = "a15aff41-47f3-4a92-8dc8-a1367ae00a46";
const DEFAULT_PUBLIC_PAGE_ID = "380dcd44-779f-81bc-b4ee-e4076ffa598e";
const MAX_RICH_TEXT = 1900;
const MAX_APPEND_CHILDREN = 100;

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

function rowFromPage(page) {
  const p = page.properties;
  const order = Number.parseInt(textProp(p, "Order"), 10);
  return {
    id: page.id,
    section: textProp(p, "Section"),
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
    {
      type: "text",
      text: href ? { content: label, link: { url: href } } : { content: label },
      annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
    },
  ];
  if (suffix) rich_text.push({ type: "text", text: { content: suffix } });
  return {
    object: "block",
    type,
    [type]: { rich_text },
  };
}

function addParagraphs(blocks, text, options = {}) {
  for (const chunk of splitText(clean(text))) blocks.push(paragraph(chunk, options));
}

function contactUrl(row) {
  return row.href || row.url || row.link || "";
}

function buildPublicPageBlocks(rows) {
  const publicRows = rows.filter((row) => row.status === "Published" && !row.private);
  const profile = firstRow(publicRows, "profile");
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

  blocks.push(heading(1, "Kim Yuseok — AI Research Engineer"));
  blocks.push(quote("Portfolio Entries 기반 공개 렌더링 · Published 항목만 표시 · Private 항목 제외"));
  if (profile.headline) addParagraphs(blocks, profile.headline, { bold: true });
  addParagraphs(blocks, profile.summaryLead);
  addParagraphs(blocks, site.summary);

  if (contacts.length) {
    const contactSummary = contacts.map((row) => row.title).join(" · ");
    blocks.push(paragraph(`Contact · ${contactSummary}`));
  }

  blocks.push(divider());
  blocks.push(heading(2, "Selected Work"));
  blocks.push(paragraph("대표 작업은 Portfolio Entries의 projects 섹션에서 가져오며, Highlight=true와 표시 순서를 우선합니다."));
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

  blocks.push(heading(2, "Research Themes"));
  for (const row of research) blocks.push(bullet(`${row.title} - ${clean(row.summary)}`));

  blocks.push(heading(2, "Systems & Implementation"));
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

  blocks.push(heading(2, "Notes & Links"));
  for (const row of notes) blocks.push(bullet(`${row.title} - ${clean(row.summary)}`));
  for (const row of starred) {
    const suffix = ` - ${clean(row.summary)}${row.stars ? ` · ${row.stars}` : ""}`;
    blocks.push(linkedTextBlock("bulleted_list_item", row.title, row.href, suffix));
  }

  blocks.push(heading(2, "English Snapshot"));
  addParagraphs(blocks, siteEn.summary);
  const englishSelected = rowsFor(publicRows, "projects", "en").filter((row) => selectedKeys.has(row.key));
  for (const row of englishSelected) blocks.push(bullet(`${row.title} - ${clean(row.summary)}`));

  blocks.push(divider());
  blocks.push(
    linkedTextBlock(
      "paragraph",
      "Source: Portfolio Entries",
      "https://app.notion.com/p/a15aff4147f34a928dc8a1367ae00a46",
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
      filter: { property: "Status", select: { equals: "Published" } },
      sorts: [{ property: "Order", direction: "ascending" }],
    });
    results.push(...response.results);
    start_cursor = response.has_more ? response.next_cursor : undefined;
  } while (start_cursor);
  return results;
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
  const entriesDatabaseId = options.entriesDatabaseId ?? process.env.NOTION_ENTRIES_DB_ID ?? DEFAULT_ENTRIES_DB_ID;
  const pageId = options.pageId ?? process.env.NOTION_PUBLIC_PAGE_ID ?? DEFAULT_PUBLIC_PAGE_ID;
  const notion = new Client({ auth: token });
  const pages = await queryAll(notion, entriesDatabaseId);
  const rows = pages.map(rowFromPage);
  const children = buildPublicPageBlocks(rows);
  await replacePageChildren(notion, pageId, children);
  return { rows: rows.length, blocks: children.length, pageId, entriesDatabaseId };
}

async function runCli() {
  try {
    const result = await syncPublicPage();
    console.log(
      `Synced public Notion page ${result.pageId}: ${result.rows} published rows -> ${result.blocks} blocks from ${result.entriesDatabaseId}.`,
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
