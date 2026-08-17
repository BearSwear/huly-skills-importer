# huly-skills-importer

Community CLI for controlled Huly Recruiting skill taxonomies.

> [!IMPORTANT]
> This is an independent community project. It is not affiliated with, maintained by, sponsored by, or endorsed by Huly or Hardcore Engineering Inc. Huly and related names and marks belong to their respective owners.

`huly-skills-importer` helps Huly Recruiting administrators materialize curated skills, audit workspace taxonomy drift, inspect candidate skill assignments, export workspace skills, and work safely with Huly's built-in skill suggestions.

The main use case is simple: **preload the skills you want Huly to map from CVs, then keep _Create new skills if existing not found_ disabled during normal recruiting.**

The CLI uses Huly's published API client. It does not write directly to the Huly database.

## Features

- validate YAML Recruiting skill catalogues locally;
- discover Huly Recruiting categories and built-in suggestion counts;
- materialize missing skills with case-insensitive idempotency;
- preview every write with `--dry-run`;
- optionally synchronize existing title, description, category and color with field-level diffs;
- audit a catalogue against the live workspace and report missing, divergent and workspace-only skills;
- export the live materialized taxonomy as an importable YAML catalogue;
- inspect candidate skill references and observed proficiency weights;
- inspect/export Huly's built-in suggestion vocabulary;
- merge compatible catalogues locally with conflict detection;
- validate shared definitions across all bundled catalogues;
- bundle a broad example catalogue and 11 industry-focused examples;
- never delete skills or candidate references.

## Why materialize a controlled taxonomy?

Huly Recruiting uses related but distinct concepts:

```text
Built-in suggestions (TagCategory.tags[])
                 │
                 │ not automatically materialized
                 ▼
Materialized workspace skills (TagElement)
                 ▲
                 │ matching
CV → Rekoni-recognized skill names
                 │
                 ▼
Candidate skill assignments (TagReference)
```

Live compatibility testing showed that Rekoni-recognized terms were mapped to a candidate only when matching materialized skills already existed while automatic skill creation was disabled. Materializing a skill does **not** teach Rekoni new vocabulary; it controls which recognized terms already exist for matching and manual assignment.

Detailed observations, data-model notes and compatibility experiments live in [`docs/RECRUITING-SKILL-MODEL.md`](docs/RECRUITING-SKILL-MODEL.md).

## Requirements

- Node.js 20.11 or newer;
- a Huly workspace with Recruiting enabled;
- credentials allowed to read Recruiting data and, for imports, create/update skills;
- access to the public npm registry.

## Install

```bash
git clone https://github.com/BearSwear/huly-skills-importer.git
cd huly-skills-importer
cp .env.example .env
npm ci
```

No GitHub Packages token is required.

For contributors updating dependencies, use `npm install` and commit the resulting `package-lock.json`.

## Configure Huly access

Edit `.env`:

```dotenv
HULY_URL=https://huly.example.com
HULY_WORKSPACE=my-workspace
HULY_TOKEN=...
HULY_TRANSPORT=websocket
```

`HULY_WORKSPACE` is the workspace slug from `/workbench/<workspace-slug>/...`.

Token authentication is preferred for automation. Email/password authentication is also supported through `HULY_EMAIL` and `HULY_PASSWORD`.

## Quick start

Inspect the workspace first:

```bash
huly-skills-importer discover
huly-skills-importer inspect
```

Validate and dry-run the broad example catalogue:

```bash
huly-skills-importer check skills/import-skills.yaml
huly-skills-importer import skills/import-skills.yaml --dry-run
```

Apply only after reviewing the plan:

```bash
huly-skills-importer import skills/import-skills.yaml
```

Then audit for drift:

```bash
huly-skills-importer audit skills/import-skills.yaml
```

A fully synchronized workspace should report no missing or divergent catalogue skills.

## Audit taxonomy drift

`audit` is read-only and compares the desired catalogue with materialized workspace skills:

```bash
huly-skills-importer audit skills/import-skills.yaml
```

It reports:

```text
Catalogue skills
Present and matching
Missing from workspace
Divergent from catalogue
Workspace-only skills
Duplicate normalized workspace names
Candidate references to catalogue/workspace-only skills
```

Audit more than one compatible catalogue as one desired taxonomy:

```bash
huly-skills-importer audit \
  skills/import-skills.yaml \
  skills/industries/cybersecurity-services-skills.yaml
```

Use `--json` for automation.

## Export the live workspace taxonomy

Before making authoritative changes, or when migrating between workspaces:

```bash
huly-skills-importer export workspace-skills.yaml
```

The export contains materialized Recruiting skill names, category labels, descriptions and colors. Candidate names and candidate assignments are **not** exported.

Review the file before importing it elsewhere.

## Merge catalogues safely

Shared skills in bundled catalogues use one canonical definition. The CLI refuses to merge arbitrary catalogues when the same normalized skill name has conflicting title, category, description or color.

```bash
huly-skills-importer merge \
  skills/import-skills.yaml \
  skills/industries/cybersecurity-services-skills.yaml \
  --output combined-skills.yaml
```

Then:

```bash
huly-skills-importer check combined-skills.yaml
huly-skills-importer import combined-skills.yaml --dry-run
```

See [`docs/CATALOGUE-MANAGEMENT.md`](docs/CATALOGUE-MANAGEMENT.md) for canonical-definition and multi-catalogue behavior.

## Updating existing skills

Existing normalized skill names are skipped by default, even when catalogue fields differ.

Preview synchronization explicitly:

```bash
huly-skills-importer import skills/import-skills.yaml \
  --dry-run \
  --update-existing
```

Only real differences become `UPDATE`, with field-level output such as:

```text
[dry-run] UPDATE Docker (DevOps)
          title: "docker" -> "Docker"
          description: "" -> "Container deployment, networking, storage and troubleshooting."
          color: 3 -> 17
```

Apply synchronization only after reviewing those changes:

```bash
huly-skills-importer import skills/import-skills.yaml --update-existing
```

There is intentionally no delete/synchronize-absence mode.

## Inspect Recruiting skills and candidates

Workspace summary:

```bash
huly-skills-importer inspect
```

Materialized skill/reference table:

```bash
huly-skills-importer inspect --skills
```

Candidate assignments:

```bash
huly-skills-importer inspect --candidates
huly-skills-importer inspect --candidate alex
```

Machine-readable output:

```bash
huly-skills-importer inspect --json
```

Candidate-oriented output can contain personal data. Treat it accordingly.

## Built-in Huly suggestions

Summarize the suggestion vocabulary stored on Recruiting categories:

```bash
huly-skills-importer suggestions
```

Show all suggestions:

```bash
huly-skills-importer suggestions --all
```

Export unique suggestions as a catalogue for review:

```bash
huly-skills-importer suggestions --export huly-native-suggestions.yaml
```

Built-in suggestions and materialized workspace skills are separate concepts. Review exported suggestions before materializing them.

## Bundled catalogues

The repository includes:

- `skills/import-skills.yaml` — broad general-purpose example;
- `skills/example.yaml` — two-skill write/idempotency smoke catalogue;
- 11 industry examples under `skills/industries/`.

List and validate the bundled industry catalogues:

```bash
huly-skills-importer catalogues
```

The command also verifies that shared skill names across the broad and industry catalogues have **zero definition conflicts**.

Industry examples cover:

- accounting, audit, finance and advisory;
- architecture, engineering, construction and BIM;
- clinical research, biotech and healthtech;
- cybersecurity services, SOC and DFIR;
- environmental consulting, water and wastewater;
- facilities, property and corporate real estate;
- legal services, compliance and eDiscovery;
- management consulting and professional services;
- manufacturing, industrial engineering and OT;
- digital marketing and creative agencies;
- public sector and municipalities.

These are community-maintained examples, not official Huly or standards-body taxonomies. Research basis and design notes are kept in [`docs/INDUSTRY-CATALOGUES.md`](docs/INDUSTRY-CATALOGUES.md).

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
  - name: Kubernetes
    category: DevOps
    description: Container orchestration and workload operation with Kubernetes.

  - name: Incident Response
    category: Hard Skills
    description: Structured response to security incidents from triage through recovery.
```

Skill fields:

- `name` — required;
- `category` — required catalogue category key;
- `description` — optional, defaults to an empty string;
- `color` — optional Huly color integer; otherwise the importer derives a deterministic cosmetic value.

Category aliases make catalogues resilient to minor Huly label differences.

## Safety model

The CLI is deliberately conservative:

1. catalogue validation happens before Huly writes;
2. every requested category must resolve before writing begins;
3. existing skills are matched case-insensitively;
4. existing skills are skipped by default;
5. `--dry-run` performs no writes;
6. updates require `--update-existing`;
7. deletes are not implemented;
8. candidate references are read-only;
9. Skills Optimizer operations are never applied by this tool;
10. workspace export excludes candidate data.

Back up important self-hosted Huly data before using community integration tooling against a production workspace.

## Compatibility

Tested baseline:

- Huly self-host `v0.7.426`;
- `@hcengineering/api-client@0.7.423`;
- token authentication;
- WebSocket transport.

Other versions may work but are not yet verified. Known upstream/API-client warnings and version-specific observations are documented in [`docs/UPSTREAM.md`](docs/UPSTREAM.md).

## Documentation

- [`docs/RECRUITING-SKILL-MODEL.md`](docs/RECRUITING-SKILL-MODEL.md) — observed Huly/Rekoni Recruiting skill behavior;
- [`docs/CATALOGUE-MANAGEMENT.md`](docs/CATALOGUE-MANAGEMENT.md) — canonical definitions, merge, audit and export;
- [`docs/BASE-CATALOGUE.md`](docs/BASE-CATALOGUE.md) — broad example catalogue design;
- [`docs/INDUSTRY-CATALOGUES.md`](docs/INDUSTRY-CATALOGUES.md) — research basis for industry examples;
- [`docs/UPSTREAM.md`](docs/UPSTREAM.md) — tested versions and upstream compatibility notes;
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — development and release process.

## Development

```bash
npm ci
npm run check
npm run build
npm run catalogues:check
npm run package:smoke
```

## Licence

Original code and catalogue text in this repository are MIT licensed. Huly and the `@hcengineering/*` dependencies are separate projects with their own licences. See [`NOTICE.md`](NOTICE.md).
