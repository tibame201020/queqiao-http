import { z } from "zod";
import type {
  QueqiaoExtension,
  ToolDefinition,
  WorkerExtensionContext,
} from "@tibame201020/queqiao/extension";

const EXTENSION_ID = "dev.queqiao.http";
const EXTENSION_VERSION = "0.1.0";
const DEFAULT_TIMEOUT_MS = 30_000;

const headersSchema = z.record(z.string().min(1).max(256), z.string().max(8192));

export const HTTP_REQUEST_INPUT_SCHEMA = z.object({
  workspaceId: z.string().min(1).max(64),
  url: z.string().min(1).max(4096),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).default("GET"),
  headers: headersSchema.optional(),
  body: z.string().max(1024 * 1024).optional(),
  json: z.unknown().optional(),
  timeoutMs: z.number().int().min(100).max(120_000).default(DEFAULT_TIMEOUT_MS),
}).superRefine((value, ctx) => {
  if (value.body !== undefined && value.json !== undefined) {
    ctx.addIssue({ code: "custom", path: ["json"], message: "body and json are mutually exclusive" });
  }
});

type HttpRequestInput = z.infer<typeof HTTP_REQUEST_INPUT_SCHEMA>;

function hasHeader(headers: Readonly<Record<string, string>>, name: string): boolean {
  const expected = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === expected);
}

function responseContentType(headers: Readonly<Record<string, string>>): string {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "content-type") return value.toLowerCase();
  }
  return "";
}

function maybeParseJson(body: string, headers: Readonly<Record<string, string>>): unknown | undefined {
  const contentType = responseContentType(headers);
  if (!contentType.includes("json")) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export const HTTP_REQUEST_DEFINITION: ToolDefinition<WorkerExtensionContext> = {
  name: "http_request",
  title: "HTTP request",
  description: "Send one bounded HTTP request to an origin explicitly granted by this extension manifest.",
  inputSchema: HTTP_REQUEST_INPUT_SCHEMA,
  requiredCapabilities: [],
  risk: "execute",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: true,
    idempotentHint: false,
  },
  async execute(input, context) {
    const parsed: HttpRequestInput = HTTP_REQUEST_INPUT_SCHEMA.parse(input);
    const headers = parsed.headers ? { ...parsed.headers } : undefined;
    let body = parsed.body;

    if (parsed.json !== undefined) {
      body = JSON.stringify(parsed.json);
      if (headers) {
        if (!hasHeader(headers, "content-type")) headers["content-type"] = "application/json";
      }
    }

    const requestHeaders = parsed.json !== undefined && !headers
      ? { "content-type": "application/json" }
      : headers;

    const request: Parameters<WorkerExtensionContext["runtime"]["http"]["request"]>[0] = {
      url: parsed.url,
      method: parsed.method,
      timeoutMs: parsed.timeoutMs,
    };
    if (requestHeaders !== undefined) request.headers = requestHeaders;
    if (body !== undefined) request.body = body;

    const response = await context.runtime.http.request(request);

    const json = maybeParseJson(response.body, response.headers);
    return json === undefined ? response : { ...response, json };
  },
};

const extension = {
  manifest: {
    id: EXTENSION_ID,
    version: EXTENSION_VERSION,
    displayName: "Queqiao HTTP",
    supportedEnvironments: ["windows", "linux", "darwin"],
  },
  activate(api) {
    api.registerTool(HTTP_REQUEST_DEFINITION);
  },
} satisfies QueqiaoExtension<WorkerExtensionContext>;

export default extension;

