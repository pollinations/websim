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

The deployment token needs **Editor** access only to the existing `websim` Worker.
The primary address is `https://websim.pollinations.app`. Cloudflare manages its
custom domain and the exact route `websim.pollinations.app/*` to `websim`, which
takes precedence over Gen's shared `*.pollinations.app/*` route. Keep these domain
settings in Cloudflare so CI needs no zone-wide permissions.

`websim.pollinations.ai` redirects to `.app` with HTTP 301, preserving the path
and query string. The existing `websim.myceli.ai` alias remains available.
The app key's allowed login callbacks must include `https://websim.pollinations.app/`.

With the repository variable `AUTO_DEPLOY=true`, pushes to `production` deploy
automatically. Promote changes from `main` through a PR. The workflow checks the
app, legacy alias, and old-domain redirect after deployment. Manual dispatch is
also available from `production`.

For rollback, revert the affected commit and promote it to `production` through
GitHub Actions. Keep automatic deployments under a single repository's ownership.

## Source and attribution

Extracted from [Pollinations Websim](https://github.com/pollinations/pollinations/tree/daa3b5910521060efb43194677e172044d514097/apps/websim).
The app's Git history, including its earlier directory names, preserves the
original authors and commit messages. See [LICENSE](LICENSE).
