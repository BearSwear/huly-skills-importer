# Contributing

Contributions are welcome.

## Development

1. Use Node.js 20.11 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` only when testing against a Huly workspace.
4. Run `npm run check` before opening a pull request.

No GitHub Packages token is required for the current dependency set.

## Scope

Good contributions include:

- compatibility fixes for supported Huly releases;
- safer category discovery and matching;
- `inspect` and suggestion-vocabulary diagnostics;
- additional tests;
- documentation improvements;
- generic example catalogues;
- validation and dry-run improvements.

Please avoid adding organisation-specific secrets, internal URLs, personal candidate data, or proprietary skill taxonomies without permission.

## Catalogue changes

Keep skill names concise and descriptions useful for recruiting. Avoid duplicate skills that differ only by punctuation or capitalization.

The bundled catalogue should prefer named Recruiting categories over the default `Other` category because Huly's Skills Optimizer can treat low-reference `Other` skills differently. If `Other` is genuinely the best fit, document why.

Do not remove a skill merely because the same text appears in Huly's built-in suggestion vocabulary. Suggestions and materialized workspace skills are separate objects.
