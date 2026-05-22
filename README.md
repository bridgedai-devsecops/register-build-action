# BridgedAI Register Build Action

Registers the current GitHub Actions workflow run as a Bridged build via **`POST /v1/builds/ensure`**. This is idempotent: repeated calls return the same `build-id` without waiting for webhooks.

Use this as the **first Bridged API step** in CI when you want an explicit build id for downstream actions (`upload-evidence-action`, `evaluate-policy-action`, `release-gate-action`).

## Required secrets / inputs

| Input | Env fallback | Notes |
|-------|--------------|-------|
| `org-id` | `BRIDGED_ORG_ID` | Must match API key tenant |
| `api-key` | `BRIDGED_API_KEY` | Scope: `release-gates:evaluate` |
| `repo-full-name` | `GITHUB_REPOSITORY` | Repo must be bound to a project |
| `workflow-run-id` | `GITHUB_RUN_ID` | |
| `commit-sha` | `GITHUB_SHA` | |

## Example

```yaml
- uses: bridgedai-devsecops/register-build-action@v0.0.5-beta
  with:
    api-base: https://api.bridgedai.io
    api-key: ${{ secrets.BRIDGED_API_KEY }}
    org-id: ${{ secrets.BRIDGED_ORG_ID }}

- uses: bridgedai-devsecops/upload-evidence-action@v0.0.5-beta
  with:
    api-key: ${{ secrets.BRIDGED_API_KEY }}
    org-id: ${{ secrets.BRIDGED_ORG_ID }}
    build-id: ${{ steps.register.outputs.build-id }}
    sbom-path: .bridgedai/sbom.spdx.json
```

`upload-evidence-action` can also call ensure automatically when `resolve-build: true` (default) and `build-id` is omitted.
