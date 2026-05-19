import { githubFetch } from "../../_utils/github.js";
import {
  buildSkillGroupsFromRepositories,
  decodeReadmeContent,
  parseGitHubImportSource,
  repositoryToProjectCandidate,
  repositoryToStarredCandidate,
} from "../../_utils/githubImport.js";
import { requireSession } from "../../_utils/session.js";

async function optionalGitHubFetch(env, path, warnings, label) {
  try {
    return await githubFetch(env, path);
  } catch (error) {
    warnings.push(`${label}: ${error instanceof Error ? error.message : "GitHub API request failed"}`);
    return null;
  }
}

async function fetchRepositoryBundle(env, owner, repoName, warnings) {
  const repo = await githubFetch(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`);
  const languages =
    (await optionalGitHubFetch(env, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/languages`, warnings, `${repo.full_name} languages`)) ||
    {};
  const readmeInfo = await optionalGitHubFetch(
    env,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/readme`,
    warnings,
    `${repo.full_name} README`,
  );
  const readme = readmeInfo ? decodeReadmeContent(readmeInfo) : "";
  return { repo, languages, readme };
}

async function importRepository(env, source) {
  const warnings = [];
  const bundle = await fetchRepositoryBundle(env, source.owner, source.repo, warnings);
  return {
    source: `https://github.com/${source.owner}/${source.repo}`,
    owner: source.owner,
    projects: [repositoryToProjectCandidate(bundle.repo, { languages: bundle.languages, readme: bundle.readme })],
    skills: buildSkillGroupsFromRepositories([bundle.repo], [bundle.languages]),
    starred: [],
    warnings,
  };
}

async function importProfile(env, source) {
  const warnings = [];
  const repos =
    (await optionalGitHubFetch(
      env,
      `/users/${encodeURIComponent(source.owner)}/repos?type=owner&sort=updated&per_page=20`,
      warnings,
      `${source.owner} repositories`,
    )) || [];
  const selectedRepos = Array.isArray(repos)
    ? repos.filter((repo) => !repo.archived && !repo.fork).slice(0, 8)
    : [];
  const starred =
    (await optionalGitHubFetch(env, `/users/${encodeURIComponent(source.owner)}/starred?sort=updated&per_page=12`, warnings, `${source.owner} starred repositories`)) ||
    [];
  const languageMaps = [];
  for (const repo of selectedRepos.slice(0, 6)) {
    const languages = await optionalGitHubFetch(
      env,
      `/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(repo.name)}/languages`,
      warnings,
      `${repo.full_name || repo.name} languages`,
    );
    languageMaps.push(languages || {});
  }
  if (selectedRepos.length === 0) warnings.push("가져올 수 있는 공개 프로젝트 후보가 없습니다.");

  return {
    source: `https://github.com/${source.owner}`,
    owner: source.owner,
    projects: selectedRepos.map((repo, index) => repositoryToProjectCandidate(repo, { languages: languageMaps[index] || {}, readme: "" })),
    skills: buildSkillGroupsFromRepositories(
      selectedRepos,
      languageMaps,
    ),
    starred: Array.isArray(starred) ? starred.slice(0, 8).map(repositoryToStarredCandidate) : [],
    warnings,
  };
}

export async function onRequestPost({ env, request }) {
  const auth = await requireSession(env, request);
  if (auth.response) return auth.response;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const mode = payload.mode === "repo" ? "repo" : "profile";
  let source;
  try {
    source = parseGitHubImportSource(payload.source, mode);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid GitHub source" }, { status: 400 });
  }

  try {
    const result = mode === "repo" ? await importRepository(env, source) : await importProfile(env, source);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "GitHub import failed" }, { status: 500 });
  }
}
