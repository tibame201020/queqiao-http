import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("npm release workflow", () => {
  it("publishes only an immutable matching release tag through OIDC", async () => {
    const workflow = await readFile(new URL("../.github/workflows/publish-npm.yml", import.meta.url), "utf8");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("Release tag $RELEASE_TAG does not match package version $version");
    expect(workflow).toContain("npm view \"$name@$version\" version --json");
    expect(workflow).toContain("npm publish --provenance --access public");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
  });
});
