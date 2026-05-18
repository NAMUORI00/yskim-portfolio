import { readSession } from "../../_utils/session.js";

export async function onRequestGet({ env, request }) {
  const session = await readSession(env, request);
  if (!session) return Response.json({ authenticated: false });
  return Response.json({ authenticated: true, login: session.login });
}
