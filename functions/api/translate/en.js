import { requireSession } from "../../_utils/session.js";

const MAX_ENTRIES = 40;
const MAX_TEXT_LENGTH = 6000;
const MODEL = "@cf/meta/m2m100-1.2b";

function cleanEntry(value) {
  if (!value || typeof value !== "object") return null;
  const key = String(value.key || "").trim();
  const text = String(value.text || "").trim();
  const label = String(value.label || "").trim();
  if (!key || !text) return null;
  return { key, label, text: text.slice(0, MAX_TEXT_LENGTH) };
}

function translatedText(output) {
  if (!output || typeof output !== "object") return "";
  return String(output.translated_text || output.translation || output.text || output.result?.translated_text || "").trim();
}

async function translate(env, text) {
  const output = await env.AI.run(MODEL, {
    text,
    source_lang: "ko",
    target_lang: "en",
  });
  return translatedText(output);
}

export async function onRequestPost({ env, request }) {
  const auth = await requireSession(env, request);
  if (auth.response) return auth.response;

  if (!env.AI || typeof env.AI.run !== "function") {
    return Response.json({ error: "Cloudflare Workers AI binding is not configured" }, { status: 501 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const entries = (Array.isArray(payload.entries) ? payload.entries : []).map(cleanEntry).filter(Boolean).slice(0, MAX_ENTRIES);
  if (entries.length === 0) {
    return Response.json({ error: "No translation entries provided" }, { status: 400 });
  }

  try {
    const translated = [];
    for (const entry of entries) {
      translated.push({ key: entry.key, text: (await translate(env, entry.text)) || entry.text });
    }
    return Response.json({ entries: translated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Translation failed" }, { status: 500 });
  }
}
