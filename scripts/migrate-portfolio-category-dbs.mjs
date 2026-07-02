import { spawnSync } from "node:child_process";

const SOURCE_DATA_SOURCE_ID = "18622209-ea39-4136-8494-31afb1a85295";

const TARGETS = {
  profile: {
    dataSourceId: "9b24921c-efa4-4143-9ede-abe607300b32",
    fields: ["Romanized", "Handle", "Availability", "Headline", "Summary Lead", "Avatar URL"],
  },
  intro: {
    dataSourceId: "fa9e9444-6254-4088-9bde-69c556ad3d58",
    fields: ["Description", "Summary Lead"],
  },
  contacts: {
    dataSourceId: "2744eeb0-e4fa-46d7-a46b-4ba700de003f",
    fields: ["Type", "Handle", "Href", "URL", "Link"],
  },
  timeline: {
    dataSourceId: "535722e0-d69e-4da8-abfe-1eb9c82835e3",
    fields: ["Type", "School", "Period", "Start Date", "End Date", "Current", "Bullets"],
  },
  research: {
    dataSourceId: "9cf575d4-e968-4b0b-8cd0-5f30482b5a61",
    fields: ["Tags", "Focus", "Related Projects", "Related Notes", "Show Diagram", "Cover URL"],
  },
  projects: {
    dataSourceId: "654afefe-1d7e-452a-b1b4-614228fc5a11",
    fields: ["Link", "Tags", "Metric", "Proof Level", "Period", "Focus", "Category", "Related Notes", "Related Research", "Cover URL"],
  },
  skills: {
    dataSourceId: "e2fdb49b-cf97-4840-a55c-6cd46613c167",
    fields: ["Items", "Category", "Related Projects"],
  },
  starred: {
    dataSourceId: "ea21f9e0-8981-4a95-9939-dcc48e89c2fc",
    fields: ["Href", "Stars", "Tags", "Category"],
  },
  notes: {
    dataSourceId: "8a0a6041-63b4-49c6-85e3-af7e769c7356",
    fields: ["Date", "Tags", "Type", "Related Projects", "Related Research"],
  },
  site: {
    dataSourceId: "723e7188-9b2f-4e6d-8ce7-122d5a9a2d53",
    fields: ["Description", "URL"],
  },
};

const SECTION_TO_TARGET = {
  profile: "profile",
  contacts: "contacts",
  timeline: "timeline",
  research: "research",
  projects: "projects",
  skills: "skills",
  starred: "starred",
  notes: "notes",
  site: "site",
};

function run(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function ntnApi(path, body) {
  return JSON.parse(run("ntn", ["api", "--notion-version", "2026-03-11", path], JSON.stringify(body)));
}

function ntnPageMarkdown(pageId) {
  const json = JSON.parse(run("ntn", ["pages", "get", pageId, "--json", "--notion-version", "2026-03-11"]));
  return String(json.markdown?.markdown ?? "").trim();
}

async function queryAll(dataSourceId, body = {}) {
  const rows = [];
  let start_cursor;
  do {
    const response = ntnApi(`v1/data_sources/${dataSourceId}/query`, {
      page_size: 100,
      ...body,
      ...(start_cursor ? { start_cursor } : {}),
    });
    rows.push(...(response.results ?? []));
    start_cursor = response.has_more ? response.next_cursor : undefined;
  } while (start_cursor);
  return rows;
}

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

function boolProp(properties, name) {
  const property = properties?.[name];
  return property?.type === "checkbox" ? Boolean(property.checkbox) : false;
}

function numberProp(properties, name) {
  const property = properties?.[name];
  return property?.type === "number" ? property.number : null;
}

function dateProp(properties, name) {
  const property = properties?.[name];
  return property?.type === "date" ? property.date : null;
}

function titleValue(value) {
  return { title: [{ type: "text", text: { content: String(value ?? "") || "Untitled" } }] };
}

function richTextValue(value) {
  const text = String(value ?? "");
  if (!text) return { rich_text: [] };
  const chunks = [];
  for (let i = 0; i < text.length; i += 1900) chunks.push(text.slice(i, i + 1900));
  return {
    rich_text: chunks.map((content) => ({ type: "text", text: { content } })),
  };
}

function selectValue(value) {
  return value ? { select: { name: value } } : { select: null };
}

function checkboxValue(value) {
  return { checkbox: Boolean(value) };
}

function numberValue(value) {
  return { number: value == null || Number.isNaN(value) ? null : Number(value) };
}

function urlValue(value) {
  return { url: value || null };
}

function dateValue(value) {
  if (!value?.start) return { date: null };
  return { date: value };
}

function sourceKey(row) {
  return textProp(row.properties, "Key") || textProp(row.properties, "Slug") || textProp(row.properties, "Title");
}

function locale(row) {
  return textProp(row.properties, "Locale") || "ko";
}

function rowIdentity(row, overrideKey) {
  return `${overrideKey ?? sourceKey(row)}::${locale(row)}`;
}

async function existingIdentities(target) {
  const rows = await queryAll(target.dataSourceId);
  return new Set(rows.map((row) => rowIdentity(row)));
}

function createProperties(row, target, overrides = {}) {
  const p = row.properties;
  const properties = {
    Title: titleValue(overrides.Title ?? textProp(p, "Title")),
    Key: richTextValue(overrides.Key ?? sourceKey(row)),
    Locale: selectValue(locale(row)),
    Status: selectValue(textProp(p, "Status") || "Published"),
    Private: checkboxValue(boolProp(p, "Private")),
    Order: numberValue(numberProp(p, "Order")),
    Slug: richTextValue(textProp(p, "Slug")),
    Highlight: checkboxValue(boolProp(p, "Highlight")),
    Summary: richTextValue(textProp(p, "Summary") || textProp(p, "Description")),
  };

  for (const field of target.fields) {
    if (field in properties) continue;
    if (field === "Avatar URL" || field === "Cover URL" || field === "Href" || field === "Link" || field === "URL") {
      properties[field] = urlValue(textProp(p, field));
    } else if (field === "Current" || field === "Show Diagram") {
      properties[field] = checkboxValue(boolProp(p, field));
    } else if (field === "Date") {
      properties[field] = dateValue(dateProp(p, field));
    } else {
      properties[field] = richTextValue(textProp(p, field));
    }
  }
  return properties;
}

function fallbackMarkdown(row, overrides = {}) {
  const p = row.properties;
  const lines = [
    textProp(p, "Summary"),
    textProp(p, "Items") ? `## Items\n${textProp(p, "Items")}` : "",
    textProp(p, "Metric") ? `## Evidence\n${textProp(p, "Metric")}` : "",
    overrides.note ?? "",
  ].filter(Boolean);
  return lines.join("\n\n").trim();
}

async function createDestinationPage(row, targetKey, overrides = {}) {
  const target = TARGETS[targetKey];
  const markdown = ntnPageMarkdown(row.id) || fallbackMarkdown(row, overrides);
  const body = {
    parent: { data_source_id: target.dataSourceId },
    properties: createProperties(row, target, overrides),
    markdown,
  };
  return ntnApi("v1/pages", body);
}

async function main() {
  const sourceRows = await queryAll(SOURCE_DATA_SOURCE_ID, {
    sorts: [{ property: "Order", direction: "ascending" }],
  });
  const existing = {};
  for (const [key, target] of Object.entries(TARGETS)) existing[key] = await existingIdentities(target);

  const counts = Object.fromEntries(Object.keys(TARGETS).map((key) => [key, { created: 0, skipped: 0 }]));

  for (const row of sourceRows) {
    const section = textProp(row.properties, "Section");
    const targetKey = SECTION_TO_TARGET[section];
    if (targetKey) {
      const identity = rowIdentity(row);
      if (existing[targetKey].has(identity)) {
        counts[targetKey].skipped += 1;
      } else {
        await createDestinationPage(row, targetKey);
        existing[targetKey].add(identity);
        counts[targetKey].created += 1;
      }
    }

    if (section === "profile") {
      const introKey = "intro";
      const identity = rowIdentity(row, introKey);
      if (existing.intro.has(identity)) {
        counts.intro.skipped += 1;
      } else {
        await createDestinationPage(row, "intro", {
          Title: locale(row) === "en" ? "About" : "소개",
          Key: introKey,
        });
        existing.intro.add(identity);
        counts.intro.created += 1;
      }
    }
  }

  console.log(JSON.stringify({ sourceRows: sourceRows.length, counts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
