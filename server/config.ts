import type { Env } from "./types";

// Deployment-specific URLs, email addresses, credentials, and billing settings
// must be configured for this app. Never fall back to another production app.
export function withDefaults(env: Env): Env {
  return {
    ...env,
    COMPANY_NAME: env.COMPANY_NAME ?? "Radoslav Dodnikov (Kova Studio)",
    COMPANY_CITY: env.COMPANY_CITY ?? "Sofia",
    EMAIL_FROM: env.EMAIL_FROM?.trim(),
  };
}
export function configuredOrigin(env: Env): string {
  if (!env.SITE_URL) throw new Error("Configure SITE_URL for this application");
  return new URL(env.SITE_URL).origin;
}
