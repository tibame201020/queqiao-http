# @tibame201020/queqiao-http

[English](https://github.com/tibame201020/queqiao-http/blob/main/README.md) | [繁體中文](https://github.com/tibame201020/queqiao-http/blob/main/README.zh-TW.md)

Official bounded HTTP extension for [Queqiao](https://github.com/tibame201020/Queqiao).

`@tibame201020/queqiao-http` lets a Queqiao Worker call explicitly authorized HTTP/HTTPS origins through Queqiao's managed Extension runtime. It exposes one capability, `http_request`, through Queqiao's stable public `extension` proxy instead of adding a new public connector tool.

It uses `context.runtime.http.request()` directly. It does **not** invoke `curl`, a shell, `child_process`, or unrestricted global `fetch`.

## Status

v0.1 baseline for Queqiao 0.9.7. The canonical npm package is `@tibame201020/queqiao-http`. Starting with v0.1.1, releases are published automatically from GitHub Releases through npm Trusted Publishing with provenance.

The current v0.1 runtime policy is intentionally narrow and has been validated end-to-end against the local Personal Asset Manager API on port `9889`.

Verified acceptance chain:

```text
MCP client / LLM
→ Queqiao Gateway
→ Queqiao Worker
→ stable extension proxy
→ queqiao-http
→ Queqiao managed HTTP runtime
→ authorized REST API
```

Verified behavior includes:

- successful JSON GET requests;
- automatic JSON response parsing;
- backend HTTP 4xx responses preserved as normal HTTP responses;
- unauthorized origins rejected with `extension_network_denied`;
- no public Queqiao connector manifest expansion when the extension is installed or updated.

## Install

Install from npm and attach to every Worker:

```bash
queqiao extension install npm:@tibame201020/queqiao-http --attach-all
```

Or install into the Extension Hub first and attach a selected Worker later:

```bash
queqiao extension install npm:@tibame201020/queqiao-http
queqiao extension attach dev.queqiao.http --worker windows
```

`attach` is activation. There is no separate enable/disable state.

Because Queqiao exposes extensions through the stable public `extension` proxy, installing or updating `queqiao-http` does not require rebuilding the ChatGPT / MCP connector manifest.

## Allowed origins

The v0.1 package deliberately grants only these exact origins:

```text
http://127.0.0.1:9889
http://localhost:9889
```

Requests to any other origin are rejected by the Queqiao Worker runtime.

This means v0.1 is a bounded HTTP extension for the current local service integration, **not** an unrestricted arbitrary-internet HTTP client. A future configurable-origin design should extend Queqiao's deployment/runtime grant model rather than bypassing it inside this extension.

## Capability

`queqiao-http` registers one capability:

```text
http_request
```

Input fields:

- `workspaceId` — selected Queqiao Workspace;
- `url` — full HTTP/HTTPS URL under an allowed origin;
- `method` — `GET | POST | PUT | PATCH | DELETE | HEAD`, default `GET`;
- `headers` — optional string header map;
- `body` — optional raw string body;
- `json` — optional JSON value, mutually exclusive with `body`;
- `timeoutMs` — `100` to `120000`, default `30000`.

When `json` is supplied, the extension serializes it and adds `content-type: application/json` unless the caller already supplied a Content-Type header.

### Call through Queqiao's extension proxy

A client using Queqiao's stable public `extension` tool can invoke the capability like this:

```json
{
  "workspaceId": "codes",
  "operation": "call",
  "extensionId": "dev.queqiao.http",
  "capability": "http_request",
  "arguments": {
    "url": "http://127.0.0.1:9889/api/meal/types",
    "method": "GET"
  }
}
```

### JSON POST

```json
{
  "workspaceId": "codes",
  "operation": "call",
  "extensionId": "dev.queqiao.http",
  "capability": "http_request",
  "arguments": {
    "url": "http://127.0.0.1:9889/api/trans/save",
    "method": "POST",
    "json": {
      "type": "支出",
      "category": "食",
      "name": "牛肉麵",
      "value": 180,
      "transDate": "2026-09-07T00:00:00"
    }
  }
}
```

## Response contract

Successful transport execution returns the downstream HTTP response without converting non-2xx status codes into transport failures:

```json
{
  "status": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"ok\":true}",
  "json": {
    "ok": true
  }
}
```

`json` is included only when the response body can be parsed as JSON. `body` always preserves the raw response text.

For example, an application-level `HTTP 400` validation response remains a response with `status: 400`. Runtime policy failures such as a denied origin remain Queqiao runtime errors instead.

## Trust boundary

Queqiao extensions are trusted plugin code. Installing and attaching `queqiao-http` grants this extension authority to issue requests only through the managed Worker HTTP surface declared by its manifest.

Queqiao remains authoritative for:

- explicit package install/attach intent;
- Extension contract validation;
- exact-origin authorization;
- HTTP/HTTPS scheme validation;
- redirect denial;
- request/response bounds;
- timeout and cancellation handling;
- Gateway → Worker routing and ExtensionHost lifecycle.

`queqiao-http` owns only the request-level adapter behavior: validating its input, serializing optional JSON, calling `context.runtime.http.request()`, and normalizing the returned response.

The extension intentionally has:

```text
process allowlist: empty
shell access: none
curl execution: none
child_process: none
unrestricted global fetch: none
```

## Development

```bash
npm ci
npm run check
npm pack --ignore-scripts --dry-run
```

The test suite covers request mapping, JSON serialization/parsing, body/JSON exclusivity, non-2xx preservation, runtime error propagation, manifest/schema parity, bilingual package documentation, and release workflow invariants.

## Releasing

Releases are tag-driven after the initial npm bootstrap:

```text
main CI passes
→ tag v<package-version>
→ publish matching GitHub Release
→ Publish npm workflow
→ npm Trusted Publishing + provenance
```

See [`docs/releasing.md`](docs/releasing.md).

## License

MIT
