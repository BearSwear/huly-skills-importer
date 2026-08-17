# Broad example catalogue

`skills/import-skills.yaml` is an editable community example, not an official Huly taxonomy.

It contains 382 Recruiting skill definitions across the 18 category keys used by the tested Huly workspace. The default `Other` category is resolvable but intentionally contains no bundled skills.

## Purpose

The catalogue demonstrates a broad materialized taxonomy spanning software development, infrastructure, cloud, security, data, QA, product, design, sales, marketing, AI and professional practices.

It intentionally includes names that also appear in Huly's built-in `TagCategory.tags[]` suggestions. Live testing showed that a suggestion string is not equivalent to a materialized `TagElement` skill. See [`RECRUITING-SKILL-MODEL.md`](RECRUITING-SKILL-MODEL.md).

## Native category alignment

Where live Huly/Rekoni behavior gave a clear category for a common term, the broad catalogue follows that observed placement to reduce unnecessary churn. In the tested `v0.7.426` workspace this included:

- Bash → DevOps;
- Kubernetes → Backend Development;
- Azure → Backend Development;
- Kibana → Backend Development.

Treat these as compatibility observations rather than universal ontology claims.

## Shared definitions

The broad catalogue and the 11 industry catalogues intentionally overlap. v0.4.1 canonicalizes every shared normalized title so the bundled files agree on title, category, description and optional color.

Run:

```bash
huly-skills-importer catalogues
```

The expected bundled definition-conflict count is zero.

## Alternative: materialize Huly suggestions

To start from the live workspace's built-in suggestion vocabulary instead:

```bash
huly-skills-importer suggestions --export huly-native-suggestions.yaml
```

Review the result before importing. Built-in suggestion sets can contain synonyms, legacy terms and repeated names across categories.
