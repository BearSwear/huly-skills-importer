# huly-skills-importer

Community CLI for materializing and inspecting controlled Huly Recruiting skill taxonomies.

> [!IMPORTANT]
> This is an independent community project. It is not affiliated with, maintained by, sponsored by, or endorsed by Huly or Hardcore Engineering Inc. Huly and related names and marks belong to their respective owners.

`huly-skills-importer` helps Huly Recruiting administrators preload a curated set of real workspace skills, inspect candidate skill assignments, and understand Huly's built-in skill suggestion vocabulary.

The practical goal is to make CV ingestion more predictable: materialize the skills you want candidates to map to, then keep Huly's **Create new skills if existing not found** option disabled unless you explicitly want CV imports to grow the taxonomy.

The CLI uses Huly's published API client. It does not write directly to CockroachDB.

## Why this exists

Huly Recruiting has several related but distinct skill layers:

1. **Built-in suggestions** — strings stored in `TagCategory.tags[]`. These are category/recognition vocabulary, not necessarily visible workspace skills.
2. **Materialized skills** — `TagElement` documents. These are the real skills visible under Recruiting → Skills and available for candidate references.
3. **Candidate assignments** — `TagReference` documents linking a candidate to a materialized skill, optionally with a proficiency `weight`.
4. **CV recognition** — Huly's Rekoni service extracts skill names from uploaded resumes, then Recruiting maps those names to materialized skills.

Compatibility testing against Huly self-host `v0.7.426` demonstrated the useful behavior behind this project:

- Rekoni extracted 15 skills from a controlled test CV.
- Only 6 of those skills were already materialized in the workspace.
- With **Create new skills if existing not found** disabled, Huly mapped exactly those 6 existing skills.
- After saving the candidate, exactly those 6 `TagReference`s were persisted.
- Automatically parsed skill references had no proficiency weight set.

So pre-materializing a controlled taxonomy is useful even when the same names already appear in Huly's built-in suggestions.

`huly-skills-importer` does **not** teach Rekoni to recognize new terminology. Materializing a skill and extending Rekoni's recognition vocabulary are separate concerns.

See [`docs/RECRUITING-SKILL-MODEL.md`](docs/RECRUITING-SKILL-MODEL.md) for the model and observed workflow in more detail.

## What v0.4.0 does

- discovers Recruiting categories and distinguishes built-in suggestions from materialized skills;
- validates YAML skill catalogues locally;
- materializes only missing skills by default;
- resolves category labels through aliases rather than persisting Huly internal category IDs;
- compares skill names case-insensitively for idempotent imports;
- supports a safe `--dry-run` mode;
- can optionally synchronize existing skills, but only when title, description, category or color actually differs;
- inspects candidate skill references and Huly proficiency weights;
- highlights low-reference skills in the default `Other` category that may be affected by Huly's Skills Optimizer;
- inspects and exports Huly's built-in suggestion vocabulary;
- never deletes skills or candidate references;
- includes an editable broad example catalogue in `skills/import-skills.yaml`;
- bundles 11 industry-specific example catalogues under `skills/industries/`;
- lists bundled industry catalogues and their validated skill/category counts with the `catalogues` command.

## Requirements

- Node.js 20.11 or newer;
- a Huly workspace with Recruiting enabled;
- credentials permitted to read Recruiting data and, for import operations, create/update skills;
- network access to the public npm registry.

## Install

```bash
git clone https://github.com/BearSwear/huly-skills-importer.git
cd huly-skills-importer
cp .env.example .env
npm install
```

No GitHub Packages token is required for the current dependency set.

## Configure Huly access

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

The importer removes accidental whitespace from copied API tokens before authentication.

## Discover the workspace model

```bash
npm run discover
```

or:

```bash
huly-skills-importer discover
```

Example output starts with separate counts for the three important workspace concepts:

```text
Huly Recruiting discovery
-------------------------
Categories:            18
Built-in suggestions:  502
Materialized skills:   15
```

The command then lists each Recruiting category, its internal ID, number of built-in suggestions, and a small suggestion sample.

Machine-readable output:

```bash
huly-skills-importer discover --json
```

## Inspect built-in suggestions

Summary:

```bash
npm run suggestions
```

Print every built-in suggestion grouped by category:

```bash
huly-skills-importer suggestions --all
```

Export the workspace's built-in suggestion vocabulary as an importable YAML catalogue:

```bash
huly-skills-importer suggestions --export huly-native-suggestions.yaml
```

The exporter removes duplicate names case-insensitively, keeping the first category occurrence. Review the generated file before importing it.

This is useful when you want to materialize a large portion of Huly's native recognition/category vocabulary rather than maintain a smaller curated catalogue.

## Inspect materialized skills and references

Basic workspace and optimizer-oriented summary:

```bash
npm run inspect
```

Show every materialized skill with reference/proficiency counts:

```bash
huly-skills-importer inspect --skills
```

Show candidate skill assignments:

```bash
huly-skills-importer inspect --candidates
```

Filter candidate assignments by display name:

```bash
huly-skills-importer inspect --candidate alex
```

Complete JSON output:

```bash
huly-skills-importer inspect --json
```

The current compatibility model interprets Huly skill weights as:

| Weight | Level |
|---:|---|
| unset | Unset |
| 0–2 | Initial |
| 3–5 | Meaningful |
| >5 | Expert |

Huly `v0.7.426`'s Skills Optimizer was also observed to enable an expert-title signal by default only when that normalized skill title has at least five expert references. These optimizer details are version-specific diagnostics, not guarantees for future Huly releases.

## Skills Optimizer warning

Huly's Skills Optimizer treats skills in named Recruiting categories differently from low-reference skills in the default `Other` category. During compatibility testing, a disposable skill in `Other` was proposed for cleanup and removed after applying the optimizer plan, while named-category skills were retained.

For that reason:

- the bundled v0.4.0 catalogues intentionally contain **zero** `Other` skills;
- `check` warns when a custom catalogue uses `Other`;
- `inspect` reports low-reference `Other` skills as optimizer-risk indicators;
- this CLI never applies the Huly optimizer or deletes anything itself.

Always review Huly's optimizer plan before applying it.

## Validate a catalogue

```bash
npm run catalog:check
```

or:

```bash
huly-skills-importer check skills/import-skills.yaml
```

The validator catches:

- duplicate normalized skill names;
- references to undefined catalogue categories;
- use of the `Other` category as a warning.

## Dry-run an import

Always review a dry-run first:

```bash
npm run import:dry
```

or:

```bash
huly-skills-importer import skills/import-skills.yaml --dry-run
```

The plan reports `CREATE`, `SKIP`, or `UPDATE` for each requested skill. A dry-run performs no writes.

If a Huly category cannot be resolved, the entire import stops before writing anything. Run `discover` and update category aliases in the YAML catalogue.

## Apply an import

After reviewing the dry-run:

```bash
npm run import
```

or:

```bash
huly-skills-importer import skills/import-skills.yaml
```

Running the same command again should skip every already-materialized skill.

## Updating existing skills

Existing normalized skill names are skipped by default even if their title casing, description, category or color differs from the YAML catalogue.

Preview synchronization:

```bash
huly-skills-importer import skills/import-skills.yaml --dry-run --update-existing
```

With `--update-existing`, the planner compares the existing `TagElement` with the desired catalogue values. A matching skill stays `SKIP`; only real differences become `UPDATE`. Each planned update prints the exact fields that would change, for example:

```text
[dry-run] UPDATE Docker (DevOps)
          title: "docker" -> "Docker"
          description: "" -> "Container deployment, networking, storage and troubleshooting."
          color: 3 -> 17
```

The bundled example catalogue follows native Huly/Rekoni category placement where live testing gave us a clear answer for common terms, reducing unnecessary category churn.

Apply synchronization only after reviewing those field-level differences:

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
  - name: Kubernetes
    category: DevOps
    description: Container orchestration and workload operation with Kubernetes.

  - name: Incident Response
    category: Hard Skills
    description: Structured response to security incidents from triage through recovery.
```

Supported skill fields:

- `name` — required skill name;
- `category` — required catalogue category key;
- `description` — optional description written to Huly;
- `color` — optional Huly color integer; otherwise a deterministic cosmetic value is generated.

## Included example catalogue

`skills/import-skills.yaml` is a broad editable example, not an official Huly taxonomy. Its description is:

> An example skill catalogue for importing into Huly Recruiting module. Categories map to the built-in Huly Recruiting skill categories. Edit this file to suit your needs :)

The broad catalogue intentionally overlaps with Huly's built-in suggestions. A suggestion string is not the same thing as a materialized workspace skill, and pre-materializing recognized terms is the behavior that enables controlled CV mapping with automatic skill creation disabled.

The example contains 382 materialized-skill definitions across the 18 built-in Recruiting category keys. `Other` is retained as a resolvable category but contains no bundled skills. The catalogue includes conventional Huly-recognized terms such as Python, Linux, Kubernetes, Docker, Terraform, PostgreSQL, AWS, Redis, RabbitMQ, Node.js, TypeScript and REST, plus more modern platform, security, AI, product and professional skills.

A smaller two-skill catalogue is available at `skills/example.yaml` for an initial write/idempotency test.

See `skills/CATALOG.md` for statistics and design notes.


## Bundled industry catalogues

v0.4.0 includes 11 research-informed industry examples under `skills/industries/`. They supplement the broad `skills/import-skills.yaml` catalogue and can be imported independently or in combination.

List them locally:

```bash
npm run catalogues
# or
huly-skills-importer catalogues
```

The command validates each bundled YAML file while loading it and reports skill counts, used-category counts and `Other` usage. JSON output is also available:

```bash
huly-skills-importer catalogues --json
```

Bundled sectors:

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

Example:

```bash
huly-skills-importer check skills/industries/environmental-water-skills.yaml
huly-skills-importer import skills/industries/environmental-water-skills.yaml --dry-run
```

Overlap between industry files is intentional and is handled by the importer's title-level idempotency. Review `--update-existing` carefully when combining catalogues because two industries can reasonably describe the same transferable skill differently.

See [`skills/industries/README.md`](skills/industries/README.md) for the catalogue index and [`docs/INDUSTRY-CATALOGUES.md`](docs/INDUSTRY-CATALOGUES.md) for research/design notes.

## Recommended Recruiting workflow

A controlled workflow looks like this:

```text
Curated YAML catalogue
        │
        ▼
huly-skills-importer import
        │
        ▼
Materialized TagElement skills
        │
        ▼
Upload CV to Huly Recruiting
        │
        ▼
Rekoni extracts recognized names
        │
        ▼
Huly maps matching materialized skills
        │
        ▼
Candidate TagReference assignments
```

For a curated taxonomy, keep **Create new skills if existing not found** disabled during normal CV imports. Enable it deliberately when you want the resume ingestion path to expand the taxonomy.

After importing candidates, use:

```bash
huly-skills-importer inspect --skills
huly-skills-importer inspect --candidates
```

Then use Huly's native Skills Optimizer only after reviewing its plan.

## Category aliases

Category labels can vary slightly between Huly releases. The example catalogue supports aliases:

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

Resolution is case-insensitive and whitespace-normalized. `Bussines analytics` reflects a label observed in Huly `v0.7.426` and is kept only as a compatibility alias.

## Safety model

The CLI is deliberately conservative:

1. catalogue validation happens before connecting;
2. every referenced category must resolve before a write is attempted;
3. existing skills are detected case-insensitively;
4. existing skills are skipped by default;
5. `--dry-run` performs no writes;
6. deletions are not implemented;
7. candidate references are read-only;
8. Skills Optimizer actions are read-only diagnostics in this tool;
9. updating existing skills requires an explicit flag.

Back up important self-hosted Huly data before using community integration tooling against a production workspace.

## Compatibility

The current compatibility baseline is:

- `hcengineering/huly-selfhost`
- Huly `v0.7.426`
- `@hcengineering/api-client@0.7.423`
- token authentication
- WebSocket transport

Live tests covered category/suggestion discovery, materialized-skill reads, skill creation, idempotency, candidate `TagReference` reads, proficiency weights, Rekoni CV mapping with auto-create both enabled and disabled, and observed Skills Optimizer behavior.

The API client emitted repeated non-fatal model-transaction warnings while connecting to the newer self-hosted release. All tested reads and writes still completed correctly. See [`docs/UPSTREAM.md`](docs/UPSTREAM.md).

## Development

```bash
npm run typecheck
npm test
npm run build
```

Repository layout:

```text
huly-skills-importer/
├── .github/workflows/ci.yml
├── docs/
│   ├── INDUSTRY-CATALOGUES.md
│   ├── RECRUITING-SKILL-MODEL.md
│   └── UPSTREAM.md
├── skills/
│   ├── CATALOG.md
│   ├── example.yaml
│   ├── import-skills.yaml
│   └── industries/
│       ├── README.md
│       └── *-skills.yaml
├── src/
│   ├── catalog.ts
│   ├── catalogues.ts
│   ├── category-resolver.ts
│   ├── config.ts
│   ├── huly.ts
│   ├── importer.ts
│   ├── index.ts
│   ├── inspector.ts
│   ├── suggestions.ts
│   └── types.ts
├── tests/
│   ├── catalogues.test.ts
│   ├── category-resolver.test.ts
│   ├── importer.test.ts
│   ├── inspector.test.ts
│   └── suggestions.test.ts
└── ...
```

## Release checklist

Before publishing a release:

1. run `npm install`;
2. run `npm run check` and `npm run build`;
3. run `npm run catalogues` to validate bundled industry catalogues;
4. run `discover`, `suggestions`, and `inspect` against a test workspace;
5. dry-run any catalogue intended for a live workspace;
6. verify idempotency after import.

Repository: `BearSwear/huly-skills-importer`.

## Licence

The original code in this repository is MIT licensed. Huly and the `@hcengineering/*` dependencies are separate projects with their own licences. See `NOTICE.md`.
