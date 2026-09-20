# Voices

Standard audio provides 30 public voice entries from `shared/catalog.ts`. Provider IDs are mapped privately in `server/audio.ts`. Public IDs are retained from Rech BG for compatibility; all names and descriptions are rendered in English.

Premium Video Studio voices are managed in Settings by verified users listed in `ADMIN_EMAILS`. Add a name, English description, and an ElevenLabs Voice ID. Generate or upload a sample, listen, and publish it. Sample generation incurs provider usage. Removing a voice prevents new speech with it while keeping existing recordings accessible.

`server/studio-voices.ts` resolves admin overrides first, then optional `ELEVENLABS_VOICES`, then bundled defaults. Voice revision hashes keep stale samples from appearing after the provider ID changes. Public responses do not expose provider credentials.

The common sample sentence is English. The administrator should generate new samples in this app's R2 bucket; no Bulgarian sample recordings are copied. Both sample generation and premium speech explicitly use language `en` with `eleven_v3`.
