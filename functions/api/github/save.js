import { ensureBranch, upsertFile } from "../../_utils/github.js";
import { requireSession } from "../../_utils/session.js";

export async function onRequestPost({ env, request }) {
  const auth = await requireSession(env, request);
  if (auth.response) return auth.response;
  const payload = await request.json();
  const branch = String(payload.branch || "");
  const message = String(payload.message || "Update portfolio content");
  const files = Array.isArray(payload.files) ? payload.files : [];
  if (!branch.startsWith("draft/")) {
    return Response.json({ error: "Draft branch must start with draft/" }, { status: 400 });
  }
  if (files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }
  try {
    await ensureBranch(env, branch);
    const commits = [];
    for (const file of files) {
      if (!file.path || typeof file.content !== "string") {
        return Response.json({ error: "Each file requires path and content" }, { status: 400 });
      }
      const result = await upsertFile(env, { path: file.path, content: file.content, branch, message });
      commits.push(result.commit);
    }
    return Response.json({ branch, commits });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 500 });
  }
}
