import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HTTP_REQUEST_DEFINITION } from "./index.js";

describe("package manifest contract", () => {
  it("keeps the package contribution aligned with the runtime definition and exact-origin policy", async () => {
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    const manifest = pkg.queqiao.manifest;
    expect(manifest.id).toBe("dev.queqiao.http");
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.runtime.processes.allow).toEqual([]);
    expect(manifest.runtime.outboundHttp.allowOrigins).toEqual([
      "http://127.0.0.1:9889",
      "http://localhost:9889",
    ]);
    expect(manifest.contributions).toHaveLength(1);
    expect(manifest.contributions[0]).toMatchObject({
      operation: "register",
      tool: HTTP_REQUEST_DEFINITION.name,
      visibility: "public",
      risk: HTTP_REQUEST_DEFINITION.risk,
      annotations: HTTP_REQUEST_DEFINITION.annotations,
    });
    expect(manifest.contributions[0].inputSchema).toEqual(
      z.toJSONSchema(HTTP_REQUEST_DEFINITION.inputSchema, { io: "input" }),
    );
    expect(pkg.files).toEqual(expect.arrayContaining(["README.md", "README.zh-TW.md"]));
    const english = await readFile(new URL("../README.md", import.meta.url), "utf8");
    const traditionalChinese = await readFile(new URL("../README.zh-TW.md", import.meta.url), "utf8");
    expect(english).toContain("[繁體中文]");
    expect(traditionalChinese).toContain("[English]");
  });
});
