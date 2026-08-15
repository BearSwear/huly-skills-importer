# huly-skills-importer

Community CLI for discovering and importing Recruiting skills into a Huly workspace.

> [!IMPORTANT]
> This is an independent community project. It is not affiliated with, maintained by, sponsored by, or endorsed by Huly or Hardcore Engineering Inc. Huly and related names and marks belong to their respective owners.

The project was created to make it practical to maintain a larger recruiting skill catalogue without clicking `+ Skill` hundreds of times. It uses Huly's published API client and the same underlying tag model used by Huly Recruiting. It does not write directly to the Huly database.

## What it does

- discovers the Recruiting skill categories available in a workspace;
- validates YAML skill catalogues locally;
- resolves catalogue categories by Huly category label/aliases instead of hard-coded document IDs;
- reads existing Recruiting skills;
- creates only missing skills by default;
- compares skill names case-insensitively for idempotent imports;
- supports a safe `--dry-run` mode;
- can optionally synchronize existing skill descriptions/categories/colors with `--update-existing`;
- never deletes skills;
- includes a broad example catalogue for an AI-first SaaS/platform startup.

## How Huly represents Recruiting skills

Huly Recruiting currently models candidate skills using the platform's tag system. A skill is a `TagElement` targeted at the Recruiting `Candidate` mixin, and categories are `TagCategory` documents. The importer therefore creates normal Huly tag documents in the workspace through the API client rather than modifying CockroachDB directly.

This is an implementation detail of Huly, not a compatibility guarantee. Run `discover` and `--dry-run` against your own Huly release before applying changes.

## Requirements

- Node.js 20.11 or newer
- a Huly workspace with Recruiting enabled
- credentials permitted to read/create Recruiting skills
- access to Huly's `@hcengineering/*` packages in GitHub Packages

## 1. Clone and install

```bash
git clone https://github.com/BearSwear/huly-skills-importer.git
cd huly-skills-importer
cp .npmrc.example .npmrc
cp .env.example .env
```

Create a GitHub token with at least `read:packages`, then either export it:

```bash
export GITHUB_PACKAGES_TOKEN=github_pat_...
```

or put it in your local shell/secret manager. Do not commit the token.

Install dependencies:

```bash
npm install
```

## 2. Configure Huly access

Edit `.env`:

```dotenv
HULY_URL=https://huly.example.com
HULY_WORKSPACE=my-workspace
HULY_TOKEN=...
HULY_TRANSPORT=websocket
```

The workspace value is the slug visible in a URL such as:

```text
https://huly.example.com/workbench/my-workspace/...
```

The Huly API client supports both token authentication and email/password authentication. Token authentication is preferred when you have a suitable token. If you use email/password instead:

```dotenv
HULY_TOKEN=
HULY_EMAIL=user@example.com
HULY_PASSWORD=your-password
```

Self-hosted Huly and API-client versions evolve together. If authentication or document operations fail unexpectedly, first verify that the `@hcengineering/*` package versions used by this repository are compatible with your Huly release.

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

Typical output includes the Huly category label, internal ID, target class, default flag and sample category tags. The importer intentionally does not persist or depend on the internal IDs.

## 4. Validate a catalogue

```bash
npm run catalog:check
```

or:

```bash
huly-skills-importer check skills/startup-platform.yaml
```

The validator catches duplicate normalized skill names and references to unknown catalogue categories before any Huly connection is made.

## 5. Dry-run the import

Always do this first:

```bash
npm run import:dry
```

or:

```bash
huly-skills-importer import skills/startup-platform.yaml --dry-run
```

Example:

```text
Catalogue: Startup platform skills for Huly Recruiting
Requested: 255
Create:    198
Update:    0
Skip:      22
Mode:      DRY RUN

[dry-run] SKIP   Docker (DevOps)
[dry-run] CREATE Ansible (DevOps)
...
```

If a Huly category cannot be resolved, the import stops before creating anything. Run `discover` and add the exact Huly category label as an alias in your YAML file.

## 6. Apply the import

```bash
npm run import
```

or:

```bash
huly-skills-importer import skills/startup-platform.yaml
```

Running the same command again should skip the skills that already exist.

## Updating existing skills

The default behavior is deliberately conservative: existing normalized skill names are skipped even if their description or category differs.

To synchronize existing entries with the catalogue:

```bash
huly-skills-importer import skills/startup-platform.yaml --dry-run --update-existing
```

Review the plan and then, if correct:

```bash
huly-skills-importer import skills/startup-platform.yaml --update-existing
```

There is intentionally no automatic delete/synchronize-absence option.

## Catalogue format

```yaml
version: 1
name: My recruiting skills

description: Skills used when matching startup candidates.

categories:
  DevOps:
    aliases:
      - DevOps
  Programming Languages:
    aliases:
      - Programming Languages

skills:
  - name: Docker
    category: DevOps
    description: Container deployment, networking, storage and troubleshooting.
    phases: [0, 1, 2, 3]

  - name: Python
    category: Programming Languages
    description: Python development for backend services, automation and integrations.
    phases: [0, 1, 2, 3]
```

`phases` is catalogue metadata for humans and tooling; it is not currently written into the Huly skill object.

## Included startup catalogue

`skills/startup-platform.yaml` covers the skills needed across four development phases of an AI-first managed SaaS platform, including:

- infrastructure and DevOps;
- networking and edge services;
- storage, backup and disaster recovery;
- security engineering and Wazuh;
- backend/control-plane development;
- databases and integration engineering;
- web/customer portal development;
- product management and analytics;
- AI/LLM engineering;
- privacy and compliance;
- sales, marketing and customer success;
- vertical SaaS and domain discovery.

It maps these skills onto the built-in Huly categories rather than attempting to modify Huly's category model.

## Category aliases

Category names shown in the Huly UI may differ slightly by version or capitalization. The catalogue uses aliases:

```yaml
categories:
  Backend Development:
    aliases:
      - Backend development
      - Backend Development
```

Resolution is case-insensitive and whitespace-normalized.

If your Huly instance uses a different label, add it to the alias list after checking `discover` output.

## Safety model

The importer is intentionally conservative:

1. catalogue validation happens before connecting;
2. all categories must resolve before a write is attempted;
3. existing skills are detected case-insensitively;
4. existing skills are skipped by default;
5. `--dry-run` performs no writes;
6. deletion is not implemented;
7. updating existing skills requires an explicit flag.

Back up important self-hosted Huly data before using community integration tooling against a production workspace.

## Huly compatibility

This repository uses Huly's published TypeScript API client and plugin packages. Huly's API and plugin model can change between releases, particularly across self-hosted versions.

The current adapter uses:

- `@hcengineering/api-client` for workspace access;
- `@hcengineering/tags` for `TagElement` and `TagCategory`;
- `@hcengineering/recruit` for the Recruiting `Candidate` mixin;
- `@hcengineering/core` for the workspace space;
- `@hcengineering/ui` for Huly's deterministic tag color helper.

If a newer Huly release changes these interfaces, keep Huly-specific compatibility changes inside `src/huly.ts`; the catalogue and generic importer logic should remain unaffected.

## Development

```bash
npm run typecheck
npm test
npm run build
```

The tests mock the Huly adapter, so most importer behavior can be tested without a live Huly workspace.

The included GitHub Actions workflow needs package-read access to the `@hcengineering/*` GitHub Packages dependencies. If the repository `GITHUB_TOKEN` cannot read those external public packages, replace `secrets.GITHUB_TOKEN` in the workflow with a repository secret containing a token with `read:packages`.

Repository layout:

```text
huly-skills-importer/
├── .github/workflows/ci.yml
├── skills/
│   ├── example.yaml
│   └── startup-platform.yaml
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
├── .npmrc.example
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

## Licence

The original code in this repository is MIT licensed. Huly and the `@hcengineering/*` dependencies are separate projects with their own licences. See `NOTICE.md`.
