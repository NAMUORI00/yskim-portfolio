import { marked } from "marked";
import DOMPurify from "dompurify";

export type FrontmatterPrimitive = string | boolean | number;
export type FrontmatterValue = FrontmatterPrimitive | FrontmatterValue[] | object | null;
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
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      return JSON.parse(trimmed) as FrontmatterValue;
    } catch {
      return trimmed;
    }
  }
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

marked.setOptions({ gfm: true, breaks: false });

// Tags/attributes for the media embeds emitted by the Notion pipeline
// (video/audio players, YouTube/Vimeo iframes, file attachments).
const SANITIZE_CONFIG = {
  ADD_TAGS: ["iframe", "video", "audio", "source", "figure", "figcaption"],
  ADD_ATTR: [
    "allow",
    "allowfullscreen",
    "frameborder",
    "scrolling",
    "loading",
    "referrerpolicy",
    "controls",
    "preload",
    "target",
    "rel",
    "download",
  ],
};

// Only allow iframes from known video providers.
function isSafeIframeSrc(src: string): boolean {
  return /^https:\/\/(www\.youtube\.com\/embed\/|player\.vimeo\.com\/)/.test(src);
}

let hooksInstalled = false;
function installSanitizeHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (el.tagName === "IFRAME" && !isSafeIframeSrc(el.getAttribute("src") ?? "")) {
      el.parentNode?.removeChild(el);
      return;
    }
    if (el.tagName === "IMG") {
      el.setAttribute("loading", "lazy");
    }
    if (el.tagName === "A" && (el.getAttribute("href") ?? "").startsWith("http")) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
}

// Render Notion-authored Markdown (headings, lists, tables, callouts/quotes,
// code, images, and media embeds) to sanitized HTML. Content is owner-authored,
// but we still sanitize as defense-in-depth.
export function toMarkdownHtml(markdown: string): string {
  const raw = marked.parse(markdown ?? "", { async: false }) as string;
  // Non-DOM environments (e.g. plain node) can't run DOMPurify; the site and the
  // jsdom test env both have a DOM.
  if (typeof window === "undefined") return raw;
  installSanitizeHooks();
  return DOMPurify.sanitize(raw, SANITIZE_CONFIG);
}

function serializeValue(key: string, value: FrontmatterValue): string[] {
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")) {
      return [key + ":", ...value.map((item) => `  - ${item}`)];
    }
    return [`${key}: ${JSON.stringify(value)}`];
  }
  if (typeof value === "object" && value !== null) {
    return [`${key}: ${JSON.stringify(value)}`];
  }
  return [`${key}: ${String(value)}`];
}

export function serializeFrontmatter(data: FrontmatterData, body: string): string {
  const lines = Object.entries(data).flatMap(([key, value]) => serializeValue(key, value));
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}
