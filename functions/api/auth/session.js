import { readSession } from "../../_utils/session.js";
import { isAllowedAdmin } from "../../_utils/github.js";

export async function onRequestGet({ env, request }) {
  const session = await readSession(env, request);
  if (!session) return Response.json({ authenticated: false });
  if (!isAllowedAdmin(env, session.login)) {
    return Response.json({ authenticated: false, error: "Admin account is not allowed" }, { status: 403 });
  }
  return Response.json({ authenticated: true, login: session.login });
}
