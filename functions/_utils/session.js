import { parseCookies, serializeCookie } from "./cookies.js";
import { isAllowedAdmin } from "./github.js";

const SESSION_COOKIE = "namuori_session";
const encoder = new TextEncoder();

function base64url(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

function sessionSecret(env) {
  if (!env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return env.SESSION_SECRET;
}

export async function createSessionCookie(env, request, login) {
  const payload = {
    login,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const encoded = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(sessionSecret(env), encoded);
  const secure = new URL(request.url).protocol === "https:";
  return serializeCookie(SESSION_COOKIE, `${encoded}.${signature}`, { maxAge: 60 * 60 * 24 * 7, secure });
}

export async function readSession(env, request) {
  const raw = parseCookies(request)[SESSION_COOKIE];
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  const expected = await hmac(sessionSecret(env), encoded);
  if (expected !== signature) return null;
  const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(fromBase64url(encoded), (char) => char.charCodeAt(0))));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { login: String(payload.login) };
}

export async function requireSession(env, request) {
  const session = await readSession(env, request);
  if (!session) {
    return { response: Response.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!isAllowedAdmin(env, session.login)) {
    return { response: Response.json({ error: "Admin account is not allowed" }, { status: 403 }) };
  }
  return { session };
}

export { SESSION_COOKIE };
