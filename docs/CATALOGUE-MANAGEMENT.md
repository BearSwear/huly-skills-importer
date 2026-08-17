# Catalogue management

This document describes how `huly-skills-importer` v0.4.1 treats catalogue identity, overlap, workspace drift and export.

## Skill identity

The importer treats a normalized skill title as the identity key. Normalization trims whitespace, collapses repeated whitespace and compares case-insensitively.

This is intentionally aligned with the live Recruiting behavior that motivated the project: materially identical titles should not create duplicate `TagElement` skills merely because casing differs.

## Canonical shared definitions

A skill may appear in the broad catalogue and several industry catalogues. In v0.4.1, every shared normalized title in the bundled files has one canonical definition:

- title/casing;
- category;
- description;
- optional explicit color.

`huly-skills-importer catalogues` validates the broad catalogue plus every bundled industry file and reports a definition-conflict count. The repository test suite fails if bundled catalogues diverge.

This avoids import-order-dependent taxonomy changes when catalogues are combined.

## Merging catalogues

`merge` combines compatible catalogues and writes one deduplicated YAML file:

```bash
huly-skills-importer merge first.yaml second.yaml --output combined.yaml
```

Category aliases are unioned. Shared normalized skill names are emitted once.

If two input catalogues disagree about title, category, description or color for a shared normalized name, the command fails instead of choosing one silently. Resolve the conflict deliberately, then merge again.

## Auditing a workspace

`audit` is read-only:

```bash
huly-skills-importer audit skills/import-skills.yaml
```

It builds the same field-level comparison used by `--update-existing`, then reports:

- present and matching catalogue skills;
- missing catalogue skills;
- divergent existing skills;
- workspace-only materialized skills;
- duplicate normalized skill titles already present in Huly;
- candidate reference counts split between catalogue and workspace-only skills.

Multiple compatible catalogues can be audited together. They are merged in memory first and therefore receive the same conflict protection as the `merge` command.

This is intended to answer the practical question: **what would change if this catalogue became authoritative for the current workspace?**

## Workspace export

`export` creates an importable YAML representation of the live materialized Recruiting taxonomy:

```bash
huly-skills-importer export workspace-skills.yaml
```

The export preserves:

- skill title;
- category label;
- description;
- color.

It does not export candidate names, candidate `TagReference` assignments or proficiency weights.

Useful cases include:

- backup before an authoritative taxonomy update;
- comparing two workspaces;
- moving a materialized taxonomy between environments;
- creating a starting catalogue from an established Huly workspace.

Always review exported YAML before importing it into a different workspace because category labels can vary between Huly releases.

## Workspace-only skills

Workspace-only skills are not automatically errors. They can represent:

- intentionally local competencies;
- terms created by CV ingestion when automatic creation was enabled;
- older taxonomy entries not represented by the current catalogue;
- duplicates or low-value terms that need recruiter review.

The CLI reports them but never deletes them.

## Candidate references

Candidate `TagReference` records point at materialized skill IDs. Updating an existing `TagElement` through `--update-existing` preserves that skill identity rather than deleting/recreating it.

The current CLI keeps candidate references read-only. Automated candidate proficiency writes are intentionally outside the v0.4.x safety boundary.
