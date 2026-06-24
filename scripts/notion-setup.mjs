// Checks that the GitHub repository has the secrets/variables the Notion sync
// workflow needs, and prints the commands to fill in anything missing.
// Usage: node scripts/notion-setup.mjs [--repo owner/name]

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import path from "node:path";

import { DATABASE_DEFAULTS } from "./notion-content.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_REPO = "NAMUORI00/yskim-portfolio";

const DB_VARIABLES = {
  NOTION_ENTRIES_DB_ID: DATABASE_DEFAULTS.entries,
};

export function parseGhList(output) {
  const rows = new Map();
  for (const line of String(output ?? "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, value = ""] = trimmed.split(/\t+/);
    if (name) rows.set(name, value);
  }
  return rows;
}

export function summarizeSetup({ repo = DEFAULT_REPO, secrets, variables }) {
  const missing = [];
  const nextSteps = [];

  if (!secrets.has("NOTION_TOKEN")) {
    missing.push("NOTION_TOKEN (secret)");
    nextSteps.push(`gh secret set NOTION_TOKEN --repo ${repo}`);
    nextSteps.push("In Notion, share the Portfolio Entries database with your read-only integration.");
  }

  for (const [name, value] of Object.entries(DB_VARIABLES)) {
    if (!variables.has(name)) {
      missing.push(`${name} (variable)`);
      nextSteps.push(`gh variable set ${name} --body ${value} --repo ${repo}`);
    }
  }

  if (missing.length === 0) {
    nextSteps.push(`gh workflow run sync-from-notion.yml --repo ${repo}`);
  }

  return { repo, missing, ready: missing.length === 0, nextSteps };
}

async function ghList(kind, repo) {
  const { stdout } = await execFileAsync("gh", [kind, "list", "--repo", repo], { windowsHide: true });
  return parseGhList(stdout);
}

function renderSummary(summary) {
  const lines = [`Repository: ${summary.repo}`, ""];
  if (summary.ready) {
    lines.push("All Notion secrets/variables are present. Trigger a sync with:");
  } else {
    lines.push(`Missing: ${summary.missing.join(", ")}`);
    lines.push("Next steps:");
  }
  for (const step of summary.nextSteps) lines.push(`- ${step}`);
  return lines.join("\n");
}

async function runCli() {
  const args = process.argv.slice(2);
  const repoIndex = args.indexOf("--repo");
  const repo = repoIndex === -1 ? DEFAULT_REPO : args[repoIndex + 1];
  const [secrets, variables] = await Promise.all([ghList("secret", repo), ghList("variable", repo)]);
  console.log(renderSummary(summarizeSetup({ repo, secrets, variables })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await runCli();
}
