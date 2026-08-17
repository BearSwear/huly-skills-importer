# Example catalogue notes

`skills/import-skills.yaml` is an editable example catalogue, not an official Huly taxonomy.

Its purpose in v0.3.0 is to demonstrate a broad **materialized** Recruiting taxonomy that can exist alongside Huly's built-in suggestion vocabulary.

## Statistics

Total example skills: 382

| Huly category | Skills |
|---|---:|
| Backend Development | 31 |
| Business Analytics | 18 |
| Database Development | 15 |
| Data Structures | 11 |
| Design | 11 |
| Desktop Application Development | 4 |
| DevOps | 46 |
| Hard Skills | 93 |
| Management | 27 |
| Marketing | 13 |
| Mobile Development | 4 |
| Networking | 21 |
| Programming Languages | 16 |
| Quality Assurance | 15 |
| Sales | 13 |
| Soft Skills | 26 |
| Web Development | 18 |
| Other | 0 |

## Why v0.3.0 intentionally overlaps Huly suggestions

v0.2.0 removed terms that already appeared in Huly's built-in `TagCategory.tags[]` suggestion arrays. Live testing showed that was the wrong abstraction.

A built-in suggestion is not a materialized `TagElement` skill. With Huly's **Create new skills if existing not found** option disabled, Rekoni-recognized terms only map to the candidate when a matching materialized skill already exists.

A controlled CV test demonstrated this directly:

- Rekoni recognized 15 skills;
- 6 were already materialized;
- Huly mapped and persisted exactly those 6;
- the 9 recognized-but-unmaterialized terms were not attached.

For that reason, v0.3.0 restores common terms such as:

`Python`, `Linux`, `Bash`, `Azure`, `CI/CD`, `Kubernetes`, `Docker`, `Terraform`, `PostgreSQL`, `AWS`, `Redis`, `RabbitMQ`, `Node.js`, `TypeScript`, `REST`.

The catalogue also adds newer or more specific terms that may or may not be recognized by Rekoni, such as `OpenTofu`, `GitOps`, `Argo CD`, `Grafana`, `FastAPI`, `Prompt Injection Defense`, `MITRE ATT&CK`, and `Digital Forensics`.

Materializing a term does not extend Rekoni's recognition vocabulary; it only makes that term available for matching when Rekoni returns it or for manual assignment.

## Category alignment for native Huly terms

Where the live Huly/Rekoni workflow provides a clear native category for a common term, the bundled catalogue follows that placement even when another taxonomy could also be reasonable. In the tested `v0.7.426` workspace this includes:

- `Bash` → DevOps;
- `Kubernetes` → Backend Development;
- `Azure` → Backend Development;
- `Kibana` → Backend Development.

This reduces unnecessary category churn when `--update-existing` is used after Rekoni has already materialized skills.

## Why `Other` is empty

The Huly `v0.7.426` Skills Optimizer treated a disposable low-reference skill in the default `Other` category as a cleanup/deletion candidate. Named Recruiting categories behaved differently.

The example catalogue therefore maps every bundled skill to a named category and leaves `Other` empty. The category remains defined so users can deliberately place custom skills there when appropriate.

The CLI warns when a custom catalogue uses `Other` and `inspect` reports low-reference `Other` skills as optimizer-risk indicators.

## Broad rather than exhaustive

The 382 skills are a practical example covering software development, infrastructure, cloud, security, data, QA, product, design, sales, marketing, AI and professional practices.

If you want to materialize Huly's own built-in suggestion vocabulary instead, generate a catalogue from the live workspace:

```bash
huly-skills-importer suggestions --export huly-native-suggestions.yaml
```

Review that file before importing it because Huly's built-in vocabulary can contain legacy terms, synonyms and cross-category duplicates.

## Industry catalogues

v0.4.0 also bundles independent sector-specific examples under `skills/industries/`. These are supplements to the broad catalogue above; they are not merged into `import-skills.yaml` automatically.

Use `huly-skills-importer catalogues` to list and validate the bundled files. See `skills/industries/README.md` for counts and `docs/INDUSTRY-CATALOGUES.md` for the research/design basis.

Cross-catalogue overlap is intentional. The same transferable skill can appear in several sectors, and title-level idempotency prevents duplicate materialization. If combining catalogues with `--update-existing`, review field-level changes because descriptions or preferred categories may differ between industry contexts.
