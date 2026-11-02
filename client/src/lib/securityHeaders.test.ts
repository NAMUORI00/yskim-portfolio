import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headersPath = new URL("../../public/_headers", import.meta.url);

describe("Cloudflare Pages security headers", () => {
  it("ships a Pages _headers file with browser security policies", () => {
    expect(existsSync(headersPath)).toBe(true);
    const headers = readFileSync(headersPath, "utf8");

    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).toContain("script-src 'self' 'wasm-unsafe-eval';");
    expect(headers).not.toContain("'unsafe-eval'");
    expect(headers).toContain("frame-src blob:");
    expect(headers).toContain("Strict-Transport-Security:");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain("Permissions-Policy:");
  });
});
