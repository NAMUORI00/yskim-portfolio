import { serializeCookie } from "../../_utils/cookies.js";

function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function onRequestGet({ env, request }) {
  if (!env.GITHUB_APP_CLIENT_ID) {
    return Response.json({ error: "GITHUB_APP_CLIENT_ID is not configured" }, { status: 500 });
  }
  const url = new URL(request.url);
  const state = randomState();
  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", env.GITHUB_APP_CLIENT_ID);
  redirect.searchParams.set("redirect_uri", `${url.origin}/api/auth/callback`);
  redirect.searchParams.set("state", state);
  const secure = url.protocol === "https:";
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect.toString(),
      "Set-Cookie": serializeCookie("namuori_oauth_state", state, { maxAge: 600, secure }),
    },
  });
}
