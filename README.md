# huly-skills-importer

Community CLI for discovering and importing Recruiting skills into a Huly workspace.

> [!IMPORTANT]
> This is an independent community project. It is not affiliated with, maintained by, sponsored by, or endorsed by Huly or Hardcore Engineering Inc. Huly and related names and marks belong to their respective owners.

`huly-skills-importer` makes it practical to maintain Recruiting skill catalogues as YAML instead of adding skills manually one at a time. It uses Huly's published API client and the same tag model used by Huly Recruiting. It does not write directly to the Huly database.

## What it does

- discovers the Recruiting skill categories available in a workspace;
- validates YAML skill catalogues locally;
- resolves catalogue categories by Huly category label and aliases rather than hard-coded document IDs;
- reads existing Recruiting skills;
- creates only missing skills by default;
- compares skill names case-insensitively for idempotent imports;
- supports a safe `--dry-run` mode;
- can optionally synchronize descriptions, categories and colors for existing skills with `--update-existing`;
- never deletes skills;
- includes an editable example catalogue in `skills/import-skills.yaml`.

## How Huly represents Recruiting skills

Huly Recruiting currently models candidate skills through Huly's tag system. A skill is a `TagElement` targeted at the Recruiting `Candidate` mixin, while categories are `TagCategory` documents. The importer creates normal Huly documents through the API client rather than modifying CockroachDB directly.

This is an implementation detail of Huly, not a permanent compatibility guarantee. Run `discover` and a dry-run against your own Huly release before applying changes.

## Requirements

- Node.js 20.11 or newer;
- a Huly workspace with Recruiting enabled;
- credentials permitted to read/create Recruiting skills;
- network access to the public npm registry.

## 1. Clone and install

```bash
git clone https://github.com/YOUR-GITHUB-USER/huly-skills-importer.git
cd huly-skills-importer
cp .env.example .env
npm install
```

No GitHub Packages token is required for the current dependency set.

## 2. Configure Huly access

Edit `.env`:

```dotenv
HULY_URL=https://huly.example.com
HULY_WORKSPACE=my-workspace
HULY_TOKEN=...
HULY_TRANSPORT=websocket
```

`HULY_WORKSPACE` is the workspace slug visible in a URL such as:

```text
https://huly.example.com/workbench/my-workspace/...
```

Token authentication is preferred for automation. Email/password authentication is also supported:

```dotenv
HULY_TOKEN=
HULY_EMAIL=user@example.com
HULY_PASSWORD=your-password
```

## 3. Discover your Huly categories

Before importing anything:

```bash
npm run discover
```

or after building/installing the CLI:

```bash
huly-skills-importer discover
```

For machine-readable output:

```bash
huly-skills-importer discover --json
```

Discovery returns Recruiting categories visible to the configured workspace, including their labels, internal IDs and sample built-in suggestion tags. The importer resolves categories by labels and aliases and does not persist those internal IDs in the catalogue.

## 4. Validate the example catalogue

```bash
npm run catalog:check
```

or:

```bash
huly-skills-importer check skills/import-skills.yaml
```

The validator catches duplicate normalized skill names and references to unknown catalogue categories before connecting to Huly.

## 5. Dry-run the import

Always review a dry-run first:

```bash
npm run import:dry
```

or:

```bash
huly-skills-importer import skills/import-skills.yaml --dry-run
```

Example:

```text
Catalogue: Example Huly Recruiting skill catalogue
Requested: 214
Create:    214
Update:    0
Skip:      0
Mode:      DRY RUN

[dry-run] CREATE REST API Design (Backend development)
[dry-run] CREATE GraphQL (Backend development)
...
```

The exact create/skip counts depend on skills already created in your workspace.

If a Huly category cannot be resolved, the import stops before creating anything. Run `discover` and add the exact label used by your Huly version as an alias in the YAML file.

## 6. Apply the import

After reviewing the dry-run:

```bash
npm run import
```

or:

```bash
huly-skills-importer import skills/import-skills.yaml
```

Running the same command again should skip skills that already exist.

## Updating existing skills

Existing normalized skill names are skipped by default, even if their description or category differs from the YAML catalogue.

To synchronize existing entries:

```bash
huly-skills-importer import skills/import-skills.yaml --dry-run --update-existing
```

Review the plan and then, if appropriate:

```bash
huly-skills-importer import skills/import-skills.yaml --update-existing
```

There is intentionally no automatic delete or synchronize-absence mode.

## Catalogue format

```yaml
version: 1
name: My Huly Recruiting skills
description: Skills used when matching candidates.

categories:
  DevOps:
    aliases:
      - DevOps
  Hard Skills:
    aliases:
      - Hard Skills

skills:
  - name: Restore Testing
    category: DevOps
    description: Practical validation that backups can be restored successfully.

  - name: Threat Modeling
    category: Hard Skills
    description: Structured identification of threats, trust boundaries and mitigations.
```

Supported skill fields are:

- `name` — required skill name;
- `category` — required catalogue category key;
- `description` — optional description written to Huly;
- `color` — optional Huly color integer; otherwise a deterministic color is generated.

## Included example catalogue

`skills/import-skills.yaml` is an editable example, not an official Huly taxonomy. Its description is intentionally explicit:

> An example skill catalogue for importing into Huly Recruiting module. Categories map to the built-in Huly Recruiting skill categories. Edit this file to suit your needs :)

The catalogue maps to the 18 built-in Recruiting categories observed during compatibility testing. It contains 214 example additions covering software development, infrastructure, security, data, product, design, QA, sales, operations, AI and other professional skills.

To avoid unnecessary duplicates, the bundled example was compared with the built-in category suggestion tags observed in a Huly `v0.7.426` workspace. Twenty-two exact normalized matches and nineteen obvious direct equivalents were excluded. Built-in suggestions can change between Huly versions and workspaces, so treat this as an example rather than a definitive deduplication database. See `skills/CATALOG.md` for the comparison summary.

A smaller two-skill catalogue is also available at `skills/example.yaml` for write testing before a bulk import.

## Category aliases

Category labels can vary slightly by Huly release. The example catalogue therefore supports aliases:

```yaml
categories:
  Backend Development:
    aliases:
      - Backend development
      - Backend Development
  Business Analytics:
    aliases:
      - Business Analytics
      - Bussines analytics
      - Bussines Analytics
```

Resolution is case-insensitive and whitespace-normalized. The `Bussines analytics` spelling above reflects a label observed in Huly and is retained as a compatibility alias.

## Safety model

The importer is deliberately conservative:

1. catalogue validation happens before connecting;
2. all referenced categories must resolve before a write is attempted;
3. existing created skills are detected case-insensitively;
4. existing skills are skipped by default;
5. `--dry-run` performs no writes;
6. deletion is not implemented;
7. updating existing skills requires an explicit flag.

The suggestion strings stored on Huly categories are not themselves necessarily created `TagElement` skills. The bundled example catalogue has been manually deduplicated against a known set of built-in suggestions, but custom catalogues should still be reviewed against `discover` output when avoiding semantic overlap matters.

Back up important self-hosted Huly data before using community integration tooling against a production workspace.

## Huly compatibility

This repository uses `@hcengineering/api-client@0.7.423` as its only direct Huly runtime dependency. Huly-specific resource IDs and minimal document shapes are isolated in `src/huly.ts`, avoiding direct dependencies on platform-internal Recruiting, Tags, Core and UI packages.

Read-only discovery has been tested against self-hosted Huly `v0.7.426` using token authentication and WebSocket transport. Because the published API client can trail the self-hosted release, test a disposable skill before a bulk write. See `docs/UPSTREAM.md` for the compatibility baseline and validation procedure.

## Development

```bash
npm run typecheck
npm test
npm run build
```

The tests mock the Huly adapter, so most importer behavior can be tested without a live Huly workspace.

Repository layout:

```text
huly-skills-importer/
├── .github/workflows/ci.yml
├── skills/
│   ├── CATALOG.md
│   ├── example.yaml
│   └── import-skills.yaml
├── src/
│   ├── catalog.ts
│   ├── category-resolver.ts
│   ├── config.ts
│   ├── huly.ts
│   ├── importer.ts
│   ├── index.ts
│   └── types.ts
├── tests/
│   ├── category-resolver.test.ts
│   └── importer.test.ts
├── .editorconfig
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── NOTICE.md
├── README.md
├── SECURITY.md
├── docs/UPSTREAM.md
├── package.json
└── tsconfig.json
```

## Publishing

Before publishing the repository:

1. replace `YOUR-GITHUB-USER` in `package.json` and README examples;
2. run `npm run check` and `npm run build`;
3. test `discover` against your Huly workspace;
4. run a complete dry-run;
5. import the tiny `skills/example.yaml` catalogue first;
6. verify the created skills in the Huly Recruiting UI;
7. run it again to confirm idempotency;
8. only then consider a larger catalogue import.

## Licence

The original code in this repository is MIT licensed. Huly and the `@hcengineering/*` dependencies are separate projects with their own licences. See `NOTICE.md`.
