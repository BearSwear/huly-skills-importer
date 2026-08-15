# Security policy

## Reporting a vulnerability

Please do not include real Huly credentials, access tokens, workspace data, or private instance URLs in a public issue.

If you discover a vulnerability in this importer, report it privately to the repository maintainers using GitHub's private vulnerability reporting feature if enabled.

If the issue is in Huly itself or in an `@hcengineering/*` package, report it through Huly's upstream security process rather than this repository.

## Credential handling

- Never commit `.env` or `.npmrc` containing real tokens.
- Prefer a scoped Huly token when available.
- Use a GitHub token with only the permissions necessary to read packages.
- Run `--dry-run` before an import.
- The importer never deletes skills.
- Existing skills are not modified unless `--update-existing` is supplied.
