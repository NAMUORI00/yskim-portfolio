import { clearCookie } from "../../_utils/cookies.js";

export function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": clearCookie("namuori_session"),
    },
  });
}
