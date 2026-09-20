# Scene — AI content studio

The English edition of Rech BG, built in `ugc-content-creation` with the complete application backend and a new visual identity. “Scene” is a working brand name; no domain is assumed or registered.

Based on `radoslav1992/rech-bg` commit `ae186499850a095d8c8fdb08d228e1b6617a0d92`.

## Included

- An original responsive landing page with rotating AI avatar portraits, pause controls, reduced-motion support, product sections, FAQs, pricing, and working links into the app.
- English navigation, account flows, studio controls, admin tools, errors, transactional email, voice examples, and legal pages.
- Audio studio: 30 voices, text to speech, two-host podcasts, voiceovers, TXT import, projects, recording history, and WAV downloads.
- Video studio: ElevenLabs v3 speech, emotion tags and suggestions, voice approval, portrait uploads, three avatar video quality tiers, background processing, email notifications, and MP4 downloads.
- Caption editor: eight styles, word timing, colors, aspect ratios, saved local templates, SRT/VTT downloads, and local/browser or background MP4 export.
- Media tools: caption uploaded videos, create portrait-with-product image variations, save files, and manage storage.
- Accounts: verification, password reset, sessions, profile updates, data export, and account deletion.
- Stripe Checkout, Customer Portal, verified webhooks, shared credit quotas, idempotent jobs, and failed-generation refunds.
- Admin controls: voice catalogue, voice sample generation/upload/publication, and website enquiries.
- Cloudflare Worker, D1 migrations, private R2 storage, Workflows, container renderer, retention cleanup, and CI.

## Run locally

Use Node.js 24.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run db:local
npm run preview
```

For frontend hot reload, run `npm run dev` in another terminal. Vite proxies `/api` to the local Worker on port 8787. The public landing and voice catalogue render before integrations are configured. Registration and paid operations require the settings described in [Deployment](docs/DEPLOYMENT.md). Docker is required for the complete local container renderer.

## Check

```sh
npm run build
npm test
python -m unittest discover -s tests -p 'renderer_test.py'
npx wrangler deploy --dry-run --no-autoconfig
```

If Docker is unavailable, `npx wrangler deploy --dry-run --no-autoconfig --containers-rollout=none` checks the Worker bundle only. A real production deploy must publish the renderer container as well.

## Launch

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). This repository deliberately has **its own database, bucket and workflow names**, a placeholder D1 ID, no assigned domain, and no copied secrets or Stripe Price IDs. Configure those before deploying. `rech-bg` is unchanged.

## Replace the avatar showcase

Edit [src/showcase-media.ts](src/showcase-media.ts). Add your files to `public/avatars/` and use same-origin paths such as `/avatars/ella.jpg`. Each card supports an image/GIF poster and an optional looping MP4/WebM video. Remove `size` and use `position: 'center'` for a standalone portrait. See [docs/DESIGN.md](docs/DESIGN.md).

The included portraits are generated visual placeholders, clearly labelled as avatar concepts. They are not presented as real customers or as outputs of the integrated video providers.

## Implementation notes

- `src/Showcase.tsx`, `src/scene.css`: new landing page and shared app theme.
- `src/Public.tsx`: pricing, voices, about, contact, legal pages.
- `src/Studio.tsx`, `src/VideoStudio.tsx`, `src/MediaTools.tsx`: the retained creation workflows.
- `server/`: API, authentication, billing, provider adapters, background workflows.
- `shared/`: catalogues, pricing, text handling, caption styles.
- `migrations/`: apply all three migrations to the new D1 database.
- `renderer/`: private FFmpeg container for inspection and caption exports.

Premium speech uses English (`en`); uploaded-video transcription uses English (`eng`); emotion suggestions target English scripts. Public voice IDs remain stable so provider mappings and saved references continue to work.
