# Queqiao HTTP

Bounded outbound HTTP extension for [Queqiao](https://github.com/tibame201020/Queqiao).

It exposes one Worker-hosted capability, `http_request`, through Queqiao's stable `extension` proxy. It uses `context.runtime.http.request()`; it does not invoke `curl`, a shell, `child_process`, or unrestricted global `fetch`.

## MVP scope

Allowed origins are intentionally fixed in the extension manifest:

- `http://127.0.0.1:9889`
- `http://localhost:9889`

Requests to other origins are rejected by Queqiao's Worker runtime with `extension_network_denied`. Redirects, request/response bounds, cancellation, and timeout behavior remain owned by Queqiao.

## Install locally

```powershell
npm install
npm run check
queqiao extension install . --worker <worker-name>
```

## Capability

`http_request` accepts:

- `workspaceId`
- `url`
- `method`: `GET | POST | PUT | PATCH | DELETE | HEAD` (default `GET`)
- `headers` (optional)
- `body` or `json` (mutually exclusive)
- `timeoutMs` (100-120000, default 30000)

When `json` is supplied, it is serialized and `content-type: application/json` is added unless already present. JSON responses are returned with both the raw `body` and a parsed `json` field when parsing succeeds. Non-2xx HTTP responses are returned as responses rather than converted into transport errors.

## Development

```powershell
npm test
npm run typecheck
npm run build
npm run check
```
