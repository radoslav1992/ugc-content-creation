# Deploy Scene to Cloudflare

This is an independent app. Do not point it at Rech BG's live D1 database or R2 bucket. The repository is configured with the D1 ID and R2 bucket supplied by the owner; production credentials and remaining runtime settings must be configured separately.

## 1. Initialize the configured storage

The following resources are already configured in `wrangler.jsonc`:

| Binding | Resource |
| --- | --- |
| `DB` | D1 ID `9de0693e-231e-4ef4-bd11-8dc506606f1e` (configured name: `ugc-content-creation`) |
| `AUDIO` | R2 bucket `ugc-content-creation-audio` |

Use these existing resources; do not recreate them. Their identifiers were supplied by the owner. Database migrations still need to be applied if they have not already been run.

Apply all migrations, in order:

```sh
npm run db:remote
```

The three SQL files create accounts/projects/billing, avatar jobs, and media storage/processing. They are included under `migrations/`. For a manual dashboard installation, run the complete contents of 0001, then 0002, then 0003; keep each `CREATE TRIGGER … END;` statement intact. Avoid mixing manual installation and Wrangler migration tracking without reconciling the migration history.

## 2. Connect the repository

Create a Cloudflare Worker from this GitHub repository.

- Worker name: `ugc-content-creation`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root
- Node.js: 24

Use a full deploy. The app has a server Worker entrypoint (`server/index.ts`) and static frontend assets (`dist`). It is not a static-only Pages project.

Cloudflare Containers and the deployment permissions needed for the private renderer must be available on the account. `renderer/Dockerfile` installs FFmpeg. The configuration declares the `MediaRenderer` Durable Object, three Workflows, and the hourly maintenance schedule. Container deployment requires Docker-compatible build support.

A dry run with `--containers-rollout=none` verifies only the Worker; it is not a replacement for publishing the renderer.

## 3. Configure the origin and operator

Choose the new Worker URL or your own domain. Add a custom domain through Cloudflare if desired. This repository has no hardcoded custom domain.

Set these Worker runtime variables:

| Variable | Value |
| --- | --- |
| `SITE_URL` | Exact public HTTPS origin of this app, without a path |
| `COMPANY_NAME` | Accurate operator name; defaults to Radoslav Dodnikov (Kova Studio) |
| `COMPANY_ID` | Operator registration identifier |
| `COMPANY_ADDRESS` | Full operator address |
| `COMPANY_CITY` | City; defaults to Sofia |
| `CONTACT_EMAIL` | This app's support email |
| `CONTACT_PHONE` | Optional public support number |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |
| `REGISTRATION_ENABLED` | `true` after account/email setup |
| `BILLING_ENABLED` | `true` after Stripe setup |
| `MEDIA_ENABLED` | `true` after media migration, integrations, and renderer deployment |

`keep_vars: true` preserves dashboard variables between deploys. Secrets must be stored as Worker secrets, never committed. There is no fallback to Rech BG's domain or sender.

## 4. Enable accounts and email

Configure Cloudflare Email Sending for a sender on a domain you control and set `EMAIL_FROM`. The `EMAIL` binding is declared in Wrangler. The sender must be authorized in the Cloudflare account. You may restrict `allowed_sender_addresses` in the binding after selecting the sender.

Create a Turnstile widget for the app's domain. Set `TURNSTILE_SITE_KEY` and the secret `TURNSTILE_SECRET_KEY`. Production registration requires Turnstile; the local `APP_ENV=development` bypass is only for local development.

Registration checks for complete operator details, the public origin, the email binding, and sender. Verify the admin account's email before using the admin controls in Settings. No default admin password is created.

## 5. Connect generation providers

| Capability | Configuration |
| --- | --- |
| Standard speech and podcasts | Cloudflare `AI` binding; existing model `google/gemini-3.1-flash-tts` |
| Premium speech and uploaded-video transcription | Secret `ELEVENLABS_API_KEY` with the required provider permissions |
| Emotion suggestions | Cloudflare `AI`; optional `STUDIO_SCRIPT_MODEL` (inherited default `openai/gpt-5.6-luna`) |
| Low-quality avatar video | Secret `WAVESPEED_API_KEY` |
| Medium/high avatar video and product image variations | Secret `FAL_KEY` |
| Background media inspection/export | `MEDIA_RENDERER` container and `MEDIA_GENERATION` Workflow |

Model identifiers and provider request contracts are retained from Rech BG. Model access and account balance must be checked against your actual provider accounts before launch. Paid generation was not invoked during this port.

Premium speech is configured for English; Scribe transcription uses `eng`. Standard Gemini speech uses the supplied text. Generate new English public samples from Settings rather than copying the Bulgarian recordings.

Add/edit/remove premium voices in Settings using their ElevenLabs Voice IDs. The optional `ELEVENLABS_VOICES` JSON maps the retained `studio-boris`, `studio-mila`, `studio-nikola`, and `studio-elena` IDs to provider voice IDs; admin changes take precedence.

## 6. Configure Stripe

Keep this application's product/price settings independent. The inherited plans are monthly EUR, with inclusive tax behavior:

| Plan | Monthly price | Monthly credits |
| --- | ---: | ---: |
| Starter | €12 | 30,000 |
| Creator | €29 | 100,000 |
| Studio | €59 | 250,000 |

Free accounts receive 1,000 one-time credits. The backend checks the configured Price IDs against these amounts and monthly interval. Changing prices requires updating the catalogue and Stripe together.

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_CREATOR`, and `STRIPE_PRICE_STUDIO`. Configure Customer Portal and automatic tax settings. Register a webhook at `https://YOUR-APP-ORIGIN/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Enable billing only after testing the integration.

## 7. Verify before opening the app

Run the build, automated suite, and full deployment. Then use an actual configured account to verify registration/email, a short audio recording, an avatar video, captions, and a background export. Confirm files remain private and the Stripe webhook updates the correct account. Live provider and payment verification uses your own configured services and is separate from the mocked automated suite.

Review the English legal pages against the operator details you configure. They preserve the source app's policies and Bulgarian operator jurisdiction; this port does not constitute a new legal assessment.
