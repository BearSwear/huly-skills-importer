# Contributing

Contributions are welcome when they stay focused on Huly Recruiting skills, taxonomy management, candidate skill inspection, compatibility and safe catalogue workflows.

## Development

1. Use Node.js 20.11 or newer.
2. Run `npm ci` for a clean checkout.
3. Copy `.env.example` to `.env` only when testing against a Huly workspace.
4. Run `npm run check`, `npm run build`, `npm run catalogues:check` and `npm run package:smoke` before opening a pull request.

When changing dependencies, run `npm install` and commit the resulting `package-lock.json`.

No GitHub Packages token is required for the current dependency set.

## Scope

Good contributions include:

- compatibility fixes for supported Huly releases;
- safer Recruiting category discovery and matching;
- taxonomy audit/export/merge improvements;
- candidate skill-reference diagnostics that remain read-only;
- suggestion-vocabulary diagnostics;
- additional tests;
- documentation improvements;
- generic or industry Recruiting catalogues;
- validation and dry-run improvements.

Please avoid unrelated project-management functionality, organization-specific secrets, private instance URLs, personal candidate data, or proprietary taxonomies without permission.

## Catalogue rules

Keep skill names concise and descriptions useful for Recruiting. Avoid duplicates that differ only by punctuation, casing or whitespace.

A normalized skill title is a shared identity across bundled catalogues. If the same normalized title appears in multiple bundled YAML files, all occurrences must use the same:

- title/casing;
- category;
- description;
- optional explicit color.

Run:

```bash
npm run catalogues:check
```

A non-zero definition-conflict count is a repository error and should not be committed.

The bundled catalogues prefer named Recruiting categories over the default `Other` category because the tested Huly Skills Optimizer treated low-reference `Other` skills differently. If `Other` is genuinely the best fit in a custom catalogue, document and review that choice.

Do not remove a skill merely because the same text appears in Huly's built-in suggestion vocabulary. Suggestions and materialized workspace skills are separate objects.

## Industry catalogues

Industry files belong under `skills/industries/` and should follow `<industryname>-skills.yaml` naming.

Keep them focused on capabilities assignable to individual talents rather than job titles. Put research/framework references in `docs/INDUSTRY-CATALOGUES.md`, not in the YAML files or top-level README.

When adding or changing a sector:

```bash
huly-skills-importer check skills/industries/<file>.yaml
npm run catalogues:check
npm run check
```

## Live compatibility testing

Do not use a production workspace for first-write tests. A suitable sequence is:

```bash
npm run discover
npm run suggestions
npm run inspect
huly-skills-importer audit skills/example.yaml
huly-skills-importer import skills/example.yaml --dry-run
```

Then test writes only in a disposable/test workspace.

## Release checklist

Before tagging a release:

1. ensure `git status` is clean;
2. ensure `package-lock.json` is committed and current;
3. run `npm ci` from a clean dependency state;
4. run `npm run check`;
5. run `npm run build`;
6. run `npm run catalogues:check` and verify zero definition conflicts;
7. run `npm run package:smoke`;
8. run `discover`, `suggestions`, `inspect` and `audit` against a test Huly workspace;
9. dry-run any catalogue intended for a live workspace;
10. verify idempotency after a test import;
11. review `README.md`, `CHANGELOG.md`, `SECURITY.md` and `NOTICE.md` for public-release suitability.
