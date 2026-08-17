# Huly implementation and compatibility notes

This project intentionally keeps Huly-specific implementation details isolated in `src/huly.ts` and treats optimizer behavior as version-specific diagnostics.

## Compatibility baseline

Live testing completed through 2026-08-17 used:

- `hcengineering/huly-selfhost`
- `HULY_VERSION=v0.7.426`
- `@hcengineering/api-client@0.7.423`
- token authentication
- WebSocket transport

Tested successfully:

- npm installation from the public npm registry;
- API authentication;
- Recruiting category discovery;
- built-in `TagCategory.tags[]` suggestion counts;
- materialized `TagElement` reads;
- idempotent skill creation;
- candidate `TagReference` reads;
- candidate/person name resolution;
- proficiency `weight` inspection;
- Rekoni resume recognition with auto-create enabled;
- Rekoni mapping to an existing taxonomy with auto-create disabled;
- observed Huly Skills Optimizer treatment of a disposable `Other` skill.

The WebSocket client emitted repeated non-fatal messages similar to:

```text
no document found, failed to apply model transaction, skipping ...
```

These appeared during connection because the published API client trails the self-hosted platform release. All tested reads and writes still completed correctly. Do not assume that remains safe for every future version combination.

## Resource IDs used by the CLI

Verified in the tested workspace:

- Tag category class: `tags:class:TagCategory`
- Tag element class: `tags:class:TagElement`
- Tag reference class: `tags:class:TagReference`
- Recruiting Candidate target: `recruit:mixin:Candidate`
- Person class: `contact:class:Person`
- Workspace space: `core:space:Workspace`
- Candidate skill collection: `skills`

The importer intentionally does not depend directly on `@hcengineering/recruit`, `@hcengineering/tags`, `@hcengineering/core`, or `@hcengineering/ui`.

## API client packaging

`@hcengineering/api-client@0.7.423` installs from the public npm registry. The published package does not provide usable TypeScript declarations for this project, so `src/huly.ts` loads it at runtime with Node's `createRequire()` and defines only the minimal local interfaces needed by the CLI.

The self-hosted Huly release tag and published npm package version are not guaranteed to match. For the tested deployment, Huly was `v0.7.426` while the usable public API client was `0.7.423`.

## Skills and suggestions are different objects

A central compatibility finding is that built-in category suggestions are not materialized workspace skills:

```text
TagCategory.tags[]  -> suggestion/category vocabulary
TagElement          -> real Recruiting skill
TagReference        -> candidate assignment to that skill
```

This is why v0.3.0 intentionally allows the bundled import catalogue to overlap with Huly's built-in suggestion vocabulary.

## Skills Optimizer

Observed behavior in Huly `v0.7.426`:

- `weight > 5` is treated as expert-level;
- normalized expert titles with fewer than five expert references are disabled by default in the optimizer UI;
- low-reference skills in the default `Other` category can be cleanup/deletion candidates;
- named Recruiting categories are treated as canonical/good tags in the optimizer path.

`inspect` reports indicators based on these observations but never applies optimizer writes.

## Upstream references

- Huly platform: https://github.com/hcengineering/platform
- Huly self-host: https://github.com/hcengineering/huly-selfhost
- Huly core/API client: https://github.com/hcengineering/huly.core
- Huly examples: https://github.com/hcengineering/huly-examples

## Validation procedure for a new Huly release

1. update/test the API client only when necessary;
2. run `discover`;
3. run `suggestions` and record counts;
4. run `inspect` and confirm reference queries work;
5. run `catalogues` and verify zero bundled definition conflicts;
6. export the test workspace taxonomy and validate the generated YAML;
7. run `audit skills/example.yaml`;
8. dry-run `skills/example.yaml`;
9. create its two skills in a disposable/test workspace;
10. run the same import again and verify both are skipped;
11. upload a controlled resume with auto-create disabled and verify existing skill mapping;
12. only then consider a larger catalogue import.
