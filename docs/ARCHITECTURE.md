# Architecture

Scene is a React 19 / Vite / TypeScript frontend with a Hono Cloudflare Worker API. It is ported from Rech BG without replacing its backend workflows.

## Application boundaries

- `src/App.tsx`: public routes, authenticated shell, lazy video/media routes.
- `src/Showcase.tsx`: new landing experience; `showcase-media.ts` holds replaceable media.
- `src/Studio.tsx`: standard audio/podcast/voiceover editing.
- `src/VideoStudio.tsx`: premium speech, approval, avatar generation, captions/export.
- `src/MediaTools.tsx`: video upload, captions, product images, file library.
- `src/Settings.tsx` and `StudioVoiceAdmin.tsx`: account and admin controls.
- `shared/`: stable voice IDs, public labels, prices, credit rules, caption models.

## Runtime

D1 stores accounts, sessions, projects, job snapshots, usage windows, billing state, and media tasks. Private R2 stores source uploads, generated media, samples, and voice overrides. The Worker authorizes file access; provider inputs use restricted temporary tokens. Cloudflare Workflows run audio/video/media jobs. A private FFmpeg container inspects video and renders captioned MP4s. An hourly task reconciles jobs, removes expired media, and drains cleanup work.

Jobs reserve credits before dispatch. Idempotency keys and database constraints prevent duplicate reservation; failure paths release credits and storage. Ambiguous paid provider submissions are not blindly retried. Stripe webhooks, rather than a checkout redirect, establish billing state.

## English edition

User-visible labels, errors, emails, samples, and public pages are English. ElevenLabs speech uses `en`; transcription uses `eng`; delivery instructions refer to English scripts. The podcast parser accepts `1:`, `2:`, `Host 1:`, and `Host 2:`. Existing public voice IDs and provider models remain stable.

Cookie, local template storage, internal browser events, export filenames, and Stripe idempotency prefixes use the Scene namespace. Production domain, email sender, D1, R2, Workflows, and billing configuration are independent of Rech BG.

## Validation

The inherited tests exercise authentication, billing, quota accounting, workflow idempotency/refunds, provider request contracts, media retention, private input URLs, and renderer behavior. Provider calls in automated tests are mocked; workerd tests check compatible runtime requests. A production build and Worker dry run validate the packaged app. Live generation, email delivery, Stripe transactions, and the full container image require configured services.
