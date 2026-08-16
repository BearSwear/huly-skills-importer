# Huly Recruiting skill model

This document records the behavior that motivated `huly-skills-importer` v0.3.0. It is based on source inspection and live compatibility testing against self-hosted Huly `v0.7.426` with `@hcengineering/api-client@0.7.423`.

Treat these details as version-specific implementation knowledge, not a permanent Huly API contract.

## Four related layers

### 1. Built-in suggestions

Recruiting `TagCategory` documents contain a `tags[]` array. These strings form Huly's built-in suggestion/category vocabulary.

They are not the same thing as actual skills visible under Recruiting → Skills.

A tested workspace returned:

- 18 Recruiting categories;
- 502 built-in suggestion occurrences.

### 2. Materialized skills

Actual workspace skills are `TagElement` documents targeted at:

```text
recruit:mixin:Candidate
```

These are the entries visible under Recruiting → Skills and the tags candidate references point to.

This distinction matters: a term can appear in `TagCategory.tags[]` while no corresponding `TagElement` exists yet.

### 3. Candidate skill assignments

Candidate assignments are `TagReference` documents with:

- `tag` — the materialized `TagElement` ID;
- `attachedTo` — the candidate/person document ID;
- `attachedToClass` — `recruit:mixin:Candidate`;
- `collection` — `skills`;
- optional `weight` — proficiency/knowledge level.

Observed weight interpretation:

| Weight | Level |
|---:|---|
| unset | Unset |
| 0–2 | Initial |
| 3–5 | Meaningful |
| >5 | Expert |

Automatically parsed resume skills were persisted without a weight in the tested workflow.

### 4. Rekoni CV recognition

Huly's Rekoni service recognizes skill names in uploaded resumes. Recruiting then attempts to map those names to materialized `TagElement` skills.

A controlled CV test explicitly contained a mixture of existing and non-existing skill names. Rekoni returned 15 recognized skills:

```text
Python
Linux
Bash
Azure
CI/CD
Kubernetes
Docker
Terraform
PostgreSQL
AWS
Redis
RabbitMQ
Node.js
TypeScript
REST
```

At that point only these six had already been materialized in the workspace:

```text
Python
Linux
Bash
Azure
CI/CD
Kubernetes
```

With **Create new skills if existing not found** disabled, Huly displayed exactly those six in the New Talent form. After saving, exactly six `TagReference`s were persisted, all with unset weight.

This establishes the primary use case for this CLI:

> Materialize a controlled taxonomy before CV ingestion so Huly can map recognized skills without automatically creating arbitrary new skill records.

## Auto-create enabled

With **Create new skills if existing not found** enabled before uploading a resume, Huly can create missing `TagElement` records for Rekoni-recognized terms and attach them to the candidate.

This is convenient for organic taxonomy growth, but it also means CV parsing can introduce broad, duplicate, oddly categorized, or low-value terms. A separate live test produced terms such as `security`, `test`, `testing`, and `recognition` while missing more specific competencies that were prominent in the CV.

A curated materialized taxonomy therefore gives administrators more control over what becomes a reusable Recruiting skill.

## Materialization does not extend Rekoni vocabulary

Creating a `TagElement` does not necessarily make Rekoni recognize a new phrase in a resume.

The controlled platform-engineer test also included newer/specialized terms such as GraphQL, Prometheus, Grafana, Helm, Argo CD, OpenTofu, GitOps, FastAPI and Pydantic. Rekoni did not return those terms in that test, even though some are useful skills to materialize manually.

The two concerns are separate:

```text
huly-skills-importer
    controls/materializes workspace taxonomy

Rekoni
    controls CV recognition vocabulary/behavior
```

## Skills Optimizer

Huly Recruiting includes a Skills Optimizer that analyzes real skills and their candidate references.

Observed `v0.7.426` behavior relevant to this project:

- expert-level inputs are references with `weight > 5`;
- expert titles with fewer than five expert references are disabled as optimizer signals by default;
- skills in named Recruiting skill categories are treated differently from the default `Other` category;
- a disposable, low-reference skill in `Other` was proposed for deletion and was removed when the optimizer plan was applied;
- reference migration/cleanup is handled by Huly's native optimizer, not this CLI.

`huly-skills-importer inspect` therefore reports:

- materialized skills and reference counts;
- unset/Initial/Meaningful/Expert distributions;
- low-reference `Other` skills;
- distinct expert titles and the count meeting the observed five-reference threshold.

The CLI intentionally does not reproduce or apply Huly's optimizer write operations.

## Recommended workflow

```text
1. Review/edit a curated YAML catalogue
              │
              ▼
2. Materialize it with huly-skills-importer
              │
              ▼
3. Keep auto-create OFF for normal CV imports
              │
              ▼
4. Rekoni extracts recognized names
              │
              ▼
5. Huly maps only approved/materialized skills
              │
              ▼
6. Review candidate assignments and proficiency
              │
              ▼
7. Use Huly Skills Optimizer carefully when cleanup is needed
```

If you want broad coverage of Huly's native suggestion vocabulary instead of a hand-curated subset, use:

```bash
huly-skills-importer suggestions --export huly-native-suggestions.yaml
```

Review the resulting catalogue and materialize it with the normal dry-run/import flow.
