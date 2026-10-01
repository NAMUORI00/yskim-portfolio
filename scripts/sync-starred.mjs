import { readFile, writeFile, rename } from 'node:fs/promises';

// Public stars only; no personal access token or private repository data.
const target = new URL('../content/starred.json', import.meta.url);
const response = await fetch('https://api.github.com/users/NAMUORI00/starred?sort=created&direction=desc&per_page=6', {
  headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'namuori-portfolio' },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`GitHub stars request failed: ${response.status}. Existing list preserved.`);
const repositories = await response.json();
if (!Array.isArray(repositories)) throw new Error('Invalid GitHub response; existing list preserved.');
const next = repositories.filter(repo => repo.private === false).map(repo => {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo.full_name) || !Number.isFinite(repo.stargazers_count)) {
    throw new Error('Invalid repository metadata; existing list preserved.');
  }
  return { name: repo.full_name, href: `https://github.com/${repo.full_name}`,
    stars: new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(repo.stargazers_count),
    desc: repo.description?.trim() || repo.full_name };
});
const serialized = JSON.stringify(next, null, 2) + '\n';
if (await readFile(target, 'utf8') !== serialized) {
  const temp = new URL('../content/starred.json.tmp', import.meta.url);
  await writeFile(temp, serialized);
  await rename(temp, target);
  console.log(`Updated ${next.length} recently starred public repositories.`);
} else console.log('Starred repositories unchanged.');
