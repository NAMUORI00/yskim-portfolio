import { githubFetch, repoPath } from "../../_utils/github.js";
import { requireSession } from "../../_utils/session.js";

export async function onRequestGet({ env, request }) {
  const auth = await requireSession(env, request);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const branch = url.searchParams.get("branch");
  if (!branch) return Response.json({ error: "branch is required" }, { status: 400 });
  try {
    const repo = repoPath(env);
    const head = `${env.GITHUB_REPO_OWNER}:${branch}`;
    const pulls = await githubFetch(env, `${repo}/pulls?state=open&head=${encodeURIComponent(head)}&base=main`);
    return Response.json({ branch, pull: pulls?.[0] || null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Status failed" }, { status: 500 });
  }
}
