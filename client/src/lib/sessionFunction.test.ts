import { describe, expect, it } from "vitest";
import { createSessionCookie, requireSession } from "../../../functions/_utils/session.js";

function requestWithCookie(cookie: string) {
  return new Request("https://example.com/admin", {
    headers: {
      Cookie: cookie,
    },
  });
}

describe("admin session function", () => {
  it("allows a signed session for a configured admin login", async () => {
    const env = { SESSION_SECRET: "test-secret", ADMIN_GITHUB_USERS: "NAMUORI00" };
    const cookie = await createSessionCookie(env, new Request("https://example.com/admin"), "NAMUORI00");
    const auth = await requireSession(env, requestWithCookie(cookie));

    expect(auth.session).toEqual({ login: "NAMUORI00" });
    expect(auth.response).toBeUndefined();
  });

  it("rejects a signed session when the login is no longer allowed", async () => {
    const cookie = await createSessionCookie(
      { SESSION_SECRET: "test-secret", ADMIN_GITHUB_USERS: "NAMUORI00" },
      new Request("https://example.com/admin"),
      "OTHERUSER",
    );
    const auth = await requireSession(
      { SESSION_SECRET: "test-secret", ADMIN_GITHUB_USERS: "NAMUORI00" },
      requestWithCookie(cookie),
    );

    expect(auth.session).toBeUndefined();
    expect(auth.response?.status).toBe(403);
    await expect(auth.response?.json()).resolves.toEqual({ error: "Admin account is not allowed" });
  });
});
