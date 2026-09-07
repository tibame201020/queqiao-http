import { describe, expect, it, vi } from "vitest";
import httpExtension, { HTTP_REQUEST_DEFINITION } from "./index.js";

function context(requestImpl: (input: any) => Promise<any>) {
  return {
    workspaceId: "codes",
    capabilities: {} as any,
    runtime: { stdio: {} as any, http: { request: vi.fn(requestImpl), fetch: vi.fn() as any } },
  };
}

describe("Queqiao HTTP extension", () => {
  it("registers exactly one http_request capability", () => {
    const registerTool = vi.fn();
    httpExtension.activate({ registerTool, extendTool: vi.fn(), replaceTool: vi.fn() } as any);
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool.mock.calls[0]?.[0].name).toBe("http_request");
  });

  it("maps GET requests to the bounded runtime", async () => {
    const ctx = context(async () => ({ status: 200, headers: { "content-type": "text/plain" }, body: "ok" }));
    const result = await HTTP_REQUEST_DEFINITION.execute({ workspaceId: "codes", url: "http://127.0.0.1:9889/api/meal/types" }, ctx as any);
    expect(ctx.runtime.http.request).toHaveBeenCalledWith({ url: "http://127.0.0.1:9889/api/meal/types", method: "GET", headers: undefined, body: undefined, timeoutMs: 30000 });
    expect(result).toEqual({ status: 200, headers: { "content-type": "text/plain" }, body: "ok" });
  });

  it("serializes json and parses a JSON response", async () => {
    const ctx = context(async () => ({ status: 201, headers: { "content-type": "application/json; charset=utf-8" }, body: '{"id":52}' }));
    const result = await HTTP_REQUEST_DEFINITION.execute({ workspaceId: "codes", url: "http://localhost:9889/api/meal/log", method: "POST", json: { mealName: "coffee" }, headers: { "x-test": "1" }, timeoutMs: 1500 }, ctx as any);
    expect(ctx.runtime.http.request).toHaveBeenCalledWith({
      url: "http://localhost:9889/api/meal/log",
      method: "POST",
      headers: { "x-test": "1", "content-type": "application/json" },
      body: '{"mealName":"coffee"}',
      timeoutMs: 1500,
    });
    expect(result).toEqual({ status: 201, headers: { "content-type": "application/json; charset=utf-8" }, body: '{"id":52}', json: { id: 52 } });
  });

  it("rejects body and json together before network execution", async () => {
    const ctx = context(async () => ({ status: 200, headers: {}, body: "" }));
    await expect(HTTP_REQUEST_DEFINITION.execute({ workspaceId: "codes", url: "http://localhost:9889", body: "x", json: { x: 1 } }, ctx as any)).rejects.toThrow(/body.*json|json.*body/i);
    expect(ctx.runtime.http.request).not.toHaveBeenCalled();
  });

  it("returns non-2xx responses without converting them into transport failures", async () => {
    const ctx = context(async () => ({ status: 400, headers: { "content-type": "text/plain" }, body: "bad taxonomy" }));
    await expect(HTTP_REQUEST_DEFINITION.execute({ workspaceId: "codes", url: "http://localhost:9889/api/trans/save", method: "POST", body: "{}" }, ctx as any)).resolves.toEqual({ status: 400, headers: { "content-type": "text/plain" }, body: "bad taxonomy" });
  });

  it("propagates runtime security and timeout errors", async () => {
    const denied = Object.assign(new Error("origin denied"), { code: "extension_network_denied" });
    const ctx = context(async () => { throw denied; });
    await expect(HTTP_REQUEST_DEFINITION.execute({ workspaceId: "codes", url: "https://example.com" }, ctx as any)).rejects.toBe(denied);
  });
});
