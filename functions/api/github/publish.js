import { createOrUpdatePullRequest } from "../../_utils/github.js";
import { requireSession } from "../../_utils/session.js";

export async function onRequestPost({ env, request }) {
  const auth = await requireSession(env, request);
  if (auth.response) return auth.response;
  const payload = await request.json();
  const branch = String(payload.branch || "");
  if (!branch.startsWith("draft/")) {
    return Response.json({ error: "Draft branch must start with draft/" }, { status: 400 });
  }
  try {
    const pull = await createOrUpdatePullRequest(env, {
      branch,
      title: String(payload.title || `Publish ${branch}`),
      body: String(payload.body || "Portfolio admin publish request."),
      base: String(payload.base || "main"),
    });
    return Response.json(pull);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Publish failed" }, { status: 500 });
  }
}
