import { clearCookie, parseCookies } from "../../_utils/cookies.js";
import { exchangeUserCode, fetchGitHubUser, isAllowedAdmin } from "../../_utils/github.js";
import { createSessionCookie } from "../../_utils/session.js";

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request);
  if (!code || !state || cookies.namuori_oauth_state !== state) {
    return new Response("Invalid GitHub login state", { status: 400 });
  }
  try {
    const token = await exchangeUserCode(env, code);
    const user = await fetchGitHubUser(token);
    if (!isAllowedAdmin(env, user.login)) {
      return new Response("This GitHub account is not allowed to administer the portfolio.", { status: 403 });
    }
    const headers = new Headers({ Location: "/admin" });
    headers.append("Set-Cookie", await createSessionCookie(env, request, user.login));
    headers.append("Set-Cookie", clearCookie("namuori_oauth_state"));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "GitHub login failed", { status: 500 });
  }
}
