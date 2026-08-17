# Bundled industry skill catalogues

v0.4.0 adds research-informed example catalogues for industries where Huly-style project, document, workflow and talent coordination can benefit from a controlled Recruiting taxonomy.

All files use the same v1 catalogue schema as `skills/import-skills.yaml`, define the 18 built-in Huly Recruiting category aliases, and intentionally contain zero bundled skills in `Other`.

| File | Skills | Used categories | `Other` skills |
|---|---:|---:|---:|
| `accounting-finance-skills.yaml` | 84 | 11 | 0 |
| `architecture-engineering-construction-skills.yaml` | 98 | 7 | 0 |
| `clinical-research-healthtech-skills.yaml` | 92 | 10 | 0 |
| `cybersecurity-services-skills.yaml` | 107 | 8 | 0 |
| `environmental-water-skills.yaml` | 83 | 8 | 0 |
| `facilities-property-skills.yaml` | 88 | 9 | 0 |
| `legal-services-skills.yaml` | 91 | 9 | 0 |
| `management-consulting-skills.yaml` | 93 | 9 | 0 |
| `manufacturing-industrial-skills.yaml` | 95 | 10 | 0 |
| `marketing-agency-skills.yaml` | 92 | 11 | 0 |
| `public-sector-municipal-skills.yaml` | 83 | 8 | 0 |

Total skill entries across all industry files: **1,006**.

Overlap between files is intentional. Transferable skills such as project management, quality assurance, cybersecurity, data analysis and stakeholder management legitimately recur. The importer is title-idempotent, so importing multiple catalogues is supported; always inspect the dry-run and only use `--update-existing` when you want the selected catalogue to synchronize existing skill fields.

List the bundled catalogues:

```bash
npm run catalogues
# or
huly-skills-importer catalogues
```

Use one catalogue:

```bash
huly-skills-importer check skills/industries/cybersecurity-services-skills.yaml
huly-skills-importer import skills/industries/cybersecurity-services-skills.yaml --dry-run
huly-skills-importer import skills/industries/cybersecurity-services-skills.yaml
```

These are community-maintained examples, not official Huly taxonomies or official competency frameworks. Adapt them to your organization, geography, regulation and recruiting practice.

See [`../../docs/INDUSTRY-CATALOGUES.md`](../../docs/INDUSTRY-CATALOGUES.md) for research/design notes.
