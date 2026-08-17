# Changelog

All notable changes to this project will be documented in this file.

## 0.4.1 - 2026-08-17

### Added

- `audit` command for read-only catalogue-to-workspace comparison, including missing, divergent, workspace-only and duplicate normalized skills plus candidate-reference split counts.
- `export` command for exporting materialized Recruiting skills as an importable YAML catalogue without candidate data.
- `merge` command for combining compatible catalogues locally with shared-definition conflict detection.
- `docs/CATALOGUE-MANAGEMENT.md` describing canonical skill identity, merge, audit and export behavior.
- `docs/BASE-CATALOGUE.md` for broad-catalogue design/reference material previously kept under `skills/`.
- Automated tests for catalogue merging/conflicts, taxonomy audit and workspace export.
- Package smoke-test script that packs and installs the CLI into a temporary clean project before exercising public commands.

### Changed

- Canonicalized all shared normalized skill definitions across the broad catalogue and 11 industry catalogues so bundled files agree on title, category, description and optional color.
- `catalogues` now validates the entire bundled catalogue set and reports shared normalized names and definition conflicts.
- Polished `README.md` for public consumption and moved implementation research/reference material into `docs/`.
- Reduced `skills/industries/README.md` to a usage pointer; research references remain in `docs/INDUSTRY-CATALOGUES.md`.
- Pinned direct npm dependency versions and added repository `.npmrc` settings to require lockfile generation.
- GitHub Actions now uses `npm ci`, validates bundled catalogue consistency and runs the package smoke test.
- Contributor guidance now includes canonical shared-definition rules and a publication-oriented release checklist.

### Safety

- Audit, merge and export do not write candidate references.
- Workspace export excludes candidate names, skill assignments and proficiency weights.
- The CLI still implements no skill-delete or Skills Optimizer write operation.

## 0.4.0 - 2026-08-17

### Added

- 11 bundled research-informed industry Recruiting catalogues under `skills/industries/`, covering accounting/finance, AEC/BIM, clinical research/healthtech, cybersecurity services, environmental/water, facilities/property, legal services, management consulting, manufacturing/OT, marketing agencies, and public-sector/municipal work.
- `catalogues` command for listing and validating bundled industry catalogues with skill counts, used-category counts and `Other` usage.
- `catalogues --json` for machine-readable catalogue inventory.
- `skills/industries/README.md` catalogue index and usage guidance.
- `docs/INDUSTRY-CATALOGUES.md` with research basis and design principles for the industry examples.
- Automated tests for bundled-catalogue discovery and cross-catalogue normalized-name counting.

### Changed

- Package/repository metadata now points to `BearSwear/huly-skills-importer`.
- README documents combining the broad catalogue with industry-specific catalogues and cautions about authoritative updates across overlapping taxonomies.
- Published package file list now includes `skills/industries`.

### Catalogue data

- 11 industry files contain 1,006 skill entries in total.
- Industry catalogue overlap is intentional; importing multiple files relies on existing title-level idempotency.
- All bundled industry examples avoid assigning skills to Huly's default `Other` category.

## 0.3.0 - 2026-08-17

### Changed

- Reframed the project around controlled Recruiting taxonomy materialization rather than simple bulk seeding.
- Documented the distinction between Huly built-in suggestions, materialized `TagElement` skills, candidate `TagReference`s, and Rekoni CV recognition.
- Restored intentional overlap between the bundled catalogue and Huly's built-in suggestions after live testing showed that suggestions are not materialized skills.
- Rebuilt `skills/import-skills.yaml` as a broad 382-skill example catalogue.
- Mapped all bundled example skills to named Recruiting categories; `Other` remains defined but contains zero bundled skills.
- Expanded deterministic cosmetic skill colors to Huly's observed 0-23 range.
- Updated discovery wording to report suggestion counts and materialized skills separately.
- Refined `--update-existing` planning to compare title, description, category and color before scheduling an update.
- Added field-level dry-run diffs for existing-skill synchronization.
- Existing skills that already match the catalogue now remain `SKIP` even with `--update-existing`.
- Aligned Bash, Kubernetes, Azure and Kibana with the native categories observed from Huly/Rekoni `v0.7.426`.

### Added

- `inspect` command for workspace skill/reference diagnostics.
- Candidate `TagReference` inspection and proficiency-level reporting.
- Skills Optimizer indicators for low-reference `Other` skills and expert-title thresholds observed in Huly `v0.7.426`.
- `suggestions` command for inspecting Huly's built-in suggestion vocabulary.
- `suggestions --export <file>` to generate an importable catalogue from live `TagCategory.tags[]` values.
- `docs/RECRUITING-SKILL-MODEL.md` documenting the tested Huly/Rekoni workflow.
- Unit tests for inspection and suggestion export logic.
- Catalogue warnings when custom entries use the default `Other` category.

### Compatibility testing

Live testing against `hcengineering/huly-selfhost v0.7.426` with `@hcengineering/api-client@0.7.423` verified:

- category/suggestion discovery;
- materialized skill reads and writes;
- idempotent imports;
- candidate skill-reference reads;
- proficiency weights;
- Rekoni auto-create behavior;
- controlled CV mapping with auto-create disabled;
- observed Skills Optimizer cleanup behavior.

## 0.2.0 - 2026-08-16

### Changed

- Reframed the project as a generic community CLI for Huly Recruiting skill discovery and import.
- Renamed the bundled catalogue to `skills/import-skills.yaml`.
- Reduced Huly runtime dependencies to `@hcengineering/api-client@0.7.423` only.
- Removed the GitHub Packages registry/token requirement.
- Added local minimal types and Huly resource IDs instead of importing platform-internal Recruiting/Tags/UI packages.
- Added defensive whitespace cleanup for copied Huly API tokens.
- Limited category discovery to Recruiting Candidate categories.
- Added the observed Huly spelling `Bussines analytics` as an alias for Business Analytics.

### Added

- YAML catalogue validation.
- Idempotent skill import with dry-run mode.
- Optional synchronization of existing skills.
- Initial generic example catalogue.
- Small write-test catalogue.
- Unit tests and GitHub Actions CI configuration.
- Security, contribution, licensing and non-affiliation documentation.

## 0.1.0 - 2026-08-15

### Added

- Huly Recruiting category discovery.
- YAML catalogue validation.
- Idempotent skill import with dry-run mode.
- Optional synchronization of existing skills.
- 255-skill startup platform catalogue mapped to Huly built-in categories.
- Unit tests and GitHub Actions CI configuration.
- Security, contribution, licensing and non-affiliation documentation.
