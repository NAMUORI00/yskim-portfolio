const encoder = new TextEncoder();

function base64urlBytes(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlJson(value) {
  return base64urlBytes(encoder.encode(JSON.stringify(value)));
}

function bytesToBase64(value) {
  const bytes = encoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function derLength(length) {
  if (length < 128) return [length];
  const bytes = [];
  let value = length;
  while (value > 0) {
    bytes.unshift(value & 0xff);
    value >>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

function wrapPkcs1AsPkcs8(pkcs1Der) {
  const algorithmIdentifier = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const privateKey = [0x04, ...derLength(pkcs1Der.length), ...pkcs1Der];
  const body = [0x02, 0x01, 0x00, ...algorithmIdentifier, ...privateKey];
  return new Uint8Array([0x30, ...derLength(body.length), ...body]);
}

function pemToPkcs8(pem) {
  const normalized = pem.replace(/\\n/g, "\n").trim();
  const isPkcs1 = normalized.includes("BEGIN RSA PRIVATE KEY");
  const base64 = normalized
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return isPkcs1 ? wrapPkcs1AsPkcs8(der) : der;
}

async function createAppJwt(env) {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required");
  }
  const now = Math.floor(Date.now() / 1000);
  const body = `${base64urlJson({ alg: "RS256", typ: "JWT" })}.${base64urlJson({
    iat: now - 60,
    exp: now + 540,
    iss: env.GITHUB_APP_ID,
  })}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(env.GITHUB_APP_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(body));
  return `${body}.${base64urlBytes(new Uint8Array(signature))}`;
}

export async function exchangeUserCode(env, code) {
  const clientId = env.GITHUB_APP_CLIENT_ID;
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET are required");
  }
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "GitHub code exchange failed");
  }
  return data.access_token;
}

export async function fetchGitHubUser(token) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "namuori-portfolio-cms",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch GitHub user");
  return response.json();
}

export function isAllowedAdmin(env, login) {
  const users = String(env.ADMIN_GITHUB_USERS || "")
    .split(",")
    .map((user) => user.trim().toLowerCase())
    .filter(Boolean);
  return users.includes(String(login).toLowerCase());
}

export async function getInstallationToken(env) {
  if (!env.GITHUB_APP_INSTALLATION_ID) {
    throw new Error("GITHUB_APP_INSTALLATION_ID is required");
  }
  const jwt = await createAppJwt(env);
  const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "namuori-portfolio-cms",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create GitHub installation token");
  return data.token;
}

export async function githubFetch(env, path, options = {}) {
  const token = options.token || (await getInstallationToken(env));
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "namuori-portfolio-cms",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || `GitHub API failed: ${response.status}`);
  }
  return data;
}

export function repoPath(env) {
  if (!env.GITHUB_REPO_OWNER || !env.GITHUB_REPO_NAME) {
    throw new Error("GITHUB_REPO_OWNER and GITHUB_REPO_NAME are required");
  }
  return `/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}`;
}

export async function ensureBranch(env, branch, base = "main") {
  const repo = repoPath(env);
  try {
    await githubFetch(env, `${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    return;
  } catch (error) {
    const baseRef = await githubFetch(env, `${repo}/git/ref/heads/${encodeURIComponent(base)}`);
    await githubFetch(env, `${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }),
    });
  }
}

export async function upsertFile(env, { path, content, branch, message }) {
  const repo = repoPath(env);
  let sha;
  try {
    const existing = await githubFetch(env, `${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`);
    sha = existing.sha;
  } catch {
    sha = undefined;
  }
  return githubFetch(env, `${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: bytesToBase64(content),
      branch,
      sha,
    }),
  });
}

export async function createOrUpdatePullRequest(env, { branch, title, body, base = "main" }) {
  const repo = repoPath(env);
  const head = `${env.GITHUB_REPO_OWNER}:${branch}`;
  const pulls = await githubFetch(env, `${repo}/pulls?state=open&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`);
  if (Array.isArray(pulls) && pulls.length > 0) {
    return githubFetch(env, `${repo}/pulls/${pulls[0].number}`, {
      method: "PATCH",
      body: JSON.stringify({ title, body }),
    });
  }
  return githubFetch(env, `${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, body, head: branch, base }),
  });
}
