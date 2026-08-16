# Huly implementation notes

This project intentionally keeps Huly-specific implementation details isolated in `src/huly.ts`.

## Compatibility baseline

Read-only discovery was tested on 2026-08-16 with:

- `hcengineering/huly-selfhost`
- `HULY_VERSION=v0.7.426`
- `@hcengineering/api-client@0.7.423`
- token authentication
- WebSocket transport

The probe successfully authenticated, returned the Recruiting categories, and returned existing Recruiting `TagElement` skill documents.

The WebSocket client emitted several non-fatal model-transaction warnings during connection because the published API client trails the self-hosted platform release. Discovery nevertheless completed successfully. Write compatibility should be verified with a disposable skill before a bulk import.

## Data model used by the importer

The live workspace confirmed the following resource IDs:

- Tag category class: `tags:class:TagCategory`
- Tag element class: `tags:class:TagElement`
- Recruiting Candidate target: `recruit:mixin:Candidate`
- Workspace space: `core:space:Workspace`

Recruiting Candidate categories are queried by `targetClass`. Skills are queried as `TagElement` documents with the same Candidate target.

The importer intentionally does not depend directly on `@hcengineering/recruit`, `@hcengineering/tags`, `@hcengineering/core`, or `@hcengineering/ui`. This keeps it insulated from Huly's internal workspace package graph.

## API client packaging

`@hcengineering/api-client@0.7.423` installs from the public npm registry. The published package currently lacks usable TypeScript declaration files, so `src/huly.ts` loads it at runtime using Node's `createRequire()` and supplies only the minimal local interfaces required by this project.

Upstream references:

- Huly platform: https://github.com/hcengineering/platform
- Huly self-host: https://github.com/hcengineering/huly-selfhost
- Huly core/API client: https://github.com/hcengineering/huly.core
- Huly examples: https://github.com/hcengineering/huly-examples

## Validation procedure for a new Huly release

1. run `discover`;
2. run the example catalogue with `--dry-run`;
3. create one disposable example skill;
4. verify it appears correctly under Recruiting → Skills;
5. run the same import again and verify it is skipped;
6. optionally test `--update-existing` against that disposable skill;
7. only then import the larger catalogue.
