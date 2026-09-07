# @tibame201020/queqiao-http

[English](https://github.com/tibame201020/queqiao-http/blob/main/README.md) | [繁體中文](https://github.com/tibame201020/queqiao-http/blob/main/README.zh-TW.md)

[Queqiao](https://github.com/tibame201020/Queqiao) 的官方 bounded HTTP extension。

`@tibame201020/queqiao-http` 讓 Queqiao Worker 能透過 Queqiao 管理的 Extension runtime，呼叫 manifest 明確授權的 HTTP/HTTPS origin。它只註冊一個 `http_request` capability，並透過 Queqiao 穩定的公開 `extension` proxy 使用，而不是為 HTTP 能力新增一個固定的 public connector tool。

底層直接使用 `context.runtime.http.request()`；**不會**執行 `curl`、shell、`child_process`，也不使用 unrestricted global `fetch`。

## 狀態

v0.1 baseline 對應 Queqiao 0.9.7。Canonical npm package 為 `@tibame201020/queqiao-http`。自 v0.1.1 起，release 會在 GitHub Release 發布後，透過 npm Trusted Publishing + provenance 自動發布。

目前 v0.1 runtime policy 刻意維持狹窄，並已對本機 `9889` port 的 Personal Asset Manager API 完成端到端驗證。

已驗證的 acceptance chain：

```text
MCP client / LLM
→ Queqiao Gateway
→ Queqiao Worker
→ stable extension proxy
→ queqiao-http
→ Queqiao managed HTTP runtime
→ authorized REST API
```

已驗證行為包括：

- JSON GET request 成功；
- JSON response 自動解析；
- backend HTTP 4xx 保留為正常 HTTP response；
- 未授權 origin 會被 `extension_network_denied` 拒絕；
- 安裝或更新 extension 不會擴張 Queqiao 公開 connector manifest。

## 安裝

從 npm 安裝並 attach 到所有 Worker：

```bash
queqiao extension install npm:@tibame201020/queqiao-http --attach-all
```

或先安裝到 Extension Hub，再 attach 到指定 Worker：

```bash
queqiao extension install npm:@tibame201020/queqiao-http
queqiao extension attach dev.queqiao.http --worker windows
```

`attach` 即為 activation，沒有另外的 enable/disable 狀態。

因為 Queqiao 使用固定的公開 `extension` proxy 暴露 extension，安裝或更新 `queqiao-http` 不需要重建 ChatGPT / MCP connector manifest。

## 允許的 origins

v0.1 package 只明確授權以下 exact origins：

```text
http://127.0.0.1:9889
http://localhost:9889
```

任何其他 origin 都會由 Queqiao Worker runtime 拒絕。

因此 v0.1 是針對目前本機服務整合的 bounded HTTP extension，**不是** unrestricted arbitrary-internet HTTP client。未來若要支援可配置 origin，應擴充 Queqiao 的 deployment/runtime grant model，而不是在 extension 內繞過安全邊界。

## Capability

`queqiao-http` 只註冊一個 capability：

```text
http_request
```

輸入欄位：

- `workspaceId` — 選定的 Queqiao Workspace；
- `url` — 位於允許 origin 下的完整 HTTP/HTTPS URL；
- `method` — `GET | POST | PUT | PATCH | DELETE | HEAD`，預設 `GET`；
- `headers` — optional string header map；
- `body` — optional raw string body；
- `json` — optional JSON value，與 `body` 互斥；
- `timeoutMs` — `100` 到 `120000`，預設 `30000`。

提供 `json` 時，extension 會自動 serialize，且在 caller 未提供 Content-Type 時補上 `content-type: application/json`。

### 透過 Queqiao extension proxy 呼叫

使用 Queqiao 穩定公開 `extension` tool 的 client，可以這樣呼叫：

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

Transport 成功執行後會回傳 downstream HTTP response；非 2xx status 不會被轉成 transport failure：

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

只有 response body 可成功 parse 為 JSON 時才會提供 `json`；`body` 永遠保留原始 response text。

例如 application validation 的 `HTTP 400` 仍會以 `status: 400` response 回傳。相對地，origin 未授權這類 runtime policy failure，會維持 Queqiao runtime error。

## 信任邊界

Queqiao extension 屬於 trusted plugin code。安裝並 attach `queqiao-http`，代表允許 extension 在自己的 manifest runtime policy 範圍內，透過 Worker managed HTTP surface 發出 request。

Queqiao 仍負責：

- 明確的 package install/attach intent；
- Extension contract validation；
- exact-origin authorization；
- HTTP/HTTPS scheme validation；
- redirect denial；
- request/response bounds；
- timeout 與 cancellation；
- Gateway → Worker routing 與 ExtensionHost lifecycle。

`queqiao-http` 只負責 request-level adapter：驗證 input、serialize optional JSON、呼叫 `context.runtime.http.request()`，以及 normalize response。

Extension 刻意不具備：

```text
process allowlist: empty
shell access: none
curl execution: none
child_process: none
unrestricted global fetch: none
```

## 開發

```bash
npm ci
npm run check
npm pack --ignore-scripts --dry-run
```

Test suite 會驗證 request mapping、JSON serialization/parsing、body/JSON 互斥、non-2xx preservation、runtime error propagation、manifest/schema parity、中英文 package documentation，以及 release workflow invariants。

## 發布

首次 npm bootstrap 完成後，release 採 tag-driven：

```text
main CI passes
→ tag v<package-version>
→ publish matching GitHub Release
→ Publish npm workflow
→ npm Trusted Publishing + provenance
```

另見 [`docs/releasing.md`](docs/releasing.md)。

## 授權

MIT
