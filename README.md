# Websim

Worker-backed BYOP app for generating shareable single-file HTML pages with Pollinations.

## Local Development

```bash
npm ci
npm run dev
```

The Worker runs on `http://localhost:16386` and serves the Vite-built app from `dist`.
Dependencies come from npm; no Pollinations monorepo checkout is required.
Build the frontend with `npm run build`.
Run `npm run typecheck` to check the frontend types.

## Routes

- `/` serves the React app shell using `@pollinations/sdk` and `@pollinations/ui`.
- `/api/generate` accepts `POST { "prompt": "...", "model": "openai-fast" }` and returns generated HTML.
- `/{prompt}/?model=openai-fast` is a legacy generation URL and requires `Authorization: Bearer ...`.
- `/api/health` returns Worker configuration health without exposing tokens.

## Auth

The frontend uses the publishable app key `pk_wYCqFfSdCXZL8UBW`.

Generation requires the incoming `Authorization: Bearer ...` header from the BYOP app shell.

## Deployment

Production deploys run through **Deploy / Cloudflare production** in GitHub Actions,
always from the `production` branch. Configure the repository variable
`CLOUDFLARE_ACCOUNT_ID` and the production environment secret
`CLOUDFLARE_API_TOKEN`. The app itself stores no server-side Pollinations key;
generation uses each signed-in user's Pollen.

The existing Cloudflare Worker is `websim`, serving `websim.pollinations.ai` and
`websim.myceli.ai`. Both remain unchanged during repository migration.
`websim.pollinations.app` is a later, separate domain migration.

Automatic deployments stay off until the monorepo deployment registration has
been removed from its `production` branch. For the first deployment, check that
the monorepo has no running Websim deployment, then dispatch this repository's
production workflow manually. Verify the active Worker version, assets, login,
and a real generation before removing the monorepo copy. Set the repository
variable `AUTO_DEPLOY` to `true` after the handoff; subsequent pushes to
`production` deploy automatically. Promote changes from `main` through a PR.

For rollback, revert the affected commit and promote it to `production` through
GitHub Actions. Keep automatic deployments under a single repository's ownership.

## Source and attribution

Extracted from [Pollinations Websim](https://github.com/pollinations/pollinations/tree/daa3b5910521060efb43194677e172044d514097/apps/websim).
The app's Git history, including its earlier directory names, preserves the
original authors and commit messages. See [LICENSE](LICENSE).
