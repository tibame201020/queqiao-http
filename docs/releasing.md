# Releasing queqiao-http

## Normal release path

After the npm package has been bootstrapped and the npm trusted publisher is configured, releases are tag-driven:

1. merge a release-ready package version to `main`;
2. require green CI;
3. create and push immutable tag `v<package-version>`;
4. publish the matching GitHub Release;
5. `.github/workflows/publish-npm.yml` checks tag/package identity, reruns package gates, checks whether the exact version already exists, and publishes to npm through GitHub OIDC with provenance.

The workflow is idempotent for an already-published exact version: it exits successfully without republishing.

## First-package bootstrap

npm trusted-publisher configuration requires the package to already exist in the npm registry. Therefore the first `@tibame201020/queqiao-http` version must be published once using an npm account authorized for the `@tibame201020` scope.

From this repository, after authenticating with npm and satisfying the account's 2FA requirements:

```powershell
npm run check
npm publish --access public
```

Do not commit npm tokens, OTPs, session credentials, or `.npmrc` credentials.

## Configure the trusted publisher

After the package exists, configure GitHub Actions as a trusted publisher for:

- package: `@tibame201020/queqiao-http`
- repository: `tibame201020/queqiao-http`
- workflow file: `publish-npm.yml`
- allowed action: direct `npm publish`

With an authenticated npm CLI that supports trust management, the equivalent command is:

```powershell
npm trust github @tibame201020/queqiao-http --repo tibame201020/queqiao-http --file publish-npm.yml --allow-publish
```

Subsequent versions should be published only by the GitHub Release workflow.

## Immutable release identity

Never move an already-pushed release tag. Workflow evolution belongs on `main`; a release package must remain the source identified by its matching `v<version>` tag.
