export type FrontmatterValue = string | boolean | number | string[];
export type FrontmatterData = Record<string, FrontmatterValue>;

export interface ParsedFrontmatter {
  data: FrontmatterData;
  body: string;
}

function parseScalar(value: string): FrontmatterValue {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { data: {}, body: normalized.trim() };
  }

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("Frontmatter block is not closed");
  }

  const raw = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "").trim();
  const data: FrontmatterData = {};
  const lines = raw.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, value] = match;
    if (value === "") {
      const values: string[] = [];
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
        index += 1;
        values.push(lines[index].replace(/^\s+-\s+/, "").trim());
      }
      data[key] = values;
    } else {
      data[key] = parseScalar(value);
    }
  }

  return { data, body };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function toMarkdownHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeList();
      html.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      closeList();
      html.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("- ")) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  return html.join("\n");
}

function serializeValue(key: string, value: FrontmatterValue): string[] {
  if (Array.isArray(value)) {
    return [key + ":", ...value.map((item) => `  - ${item}`)];
  }
  return [`${key}: ${String(value)}`];
}

export function serializeFrontmatter(data: FrontmatterData, body: string): string {
  const lines = Object.entries(data).flatMap(([key, value]) => serializeValue(key, value));
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}
