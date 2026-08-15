# Huly implementation notes

This project intentionally keeps Huly-specific implementation details isolated in `src/huly.ts`.

The importer was designed against the public Huly source/API model inspected on 2026-08-15:

- Huly publishes `@hcengineering/api-client` as the typed integration client.
- The client supports workspace authentication with a token or email/password and exposes document methods including `findAll`, `createDoc` and `updateDoc`.
- Recruiting Candidate skills are represented using the tag system.
- `TagElement` contains `title`, `targetClass`, `description`, `color` and `category`.
- `TagCategory` contains `label`, `targetClass`, `tags` and `default`.
- The Recruiting plugin exposes `recruit.mixin.Candidate`.
- Huly's own tag creation helper creates `TagElement` documents in `core.space.Workspace` and targets the supplied class.

Upstream references:

- Huly platform: https://github.com/hcengineering/platform
- Huly core/API client: https://github.com/hcengineering/huly.core/tree/main/packages/api-client
- Tags model: https://github.com/hcengineering/platform/tree/develop/plugins/tags
- Recruiting plugin: https://github.com/hcengineering/platform/tree/develop/plugins/recruit

These are implementation details and may change. Before supporting a new Huly release:

1. run `discover`;
2. run the example catalogue in dry-run mode;
3. create one disposable example skill;
4. verify it appears correctly under Recruiting → Skills;
5. verify a second run skips it;
6. only then test the larger catalogue.
