# Security policy

## Reporting a vulnerability

Please do not include real Huly credentials, access tokens, private candidate data, workspace data, or private instance URLs in a public issue.

If you discover a vulnerability in this importer, report it privately to the repository maintainers using GitHub's private vulnerability reporting feature if enabled.

If the issue is in Huly itself or in an `@hcengineering/*` package, report it through Huly's upstream security process rather than this repository.

## Credential and data handling

- Never commit `.env` files containing real tokens or passwords.
- Prefer a scoped Huly token when available.
- Do not paste live API tokens into issue reports or logs.
- Treat `inspect --candidates` and `inspect --json` output as potentially sensitive because it can contain candidate names and skill assignments.
- `export` is designed to contain taxonomy data only; still review exported descriptions for organization-specific information before sharing them.
- `audit` is read-only but can reveal workspace-only skill names and reference counts.
- Run `--dry-run` before an import.
- The CLI never deletes skills or candidate references.
- Existing skills are not modified unless `--update-existing` is supplied.
- The CLI never applies Huly Skills Optimizer write operations.
