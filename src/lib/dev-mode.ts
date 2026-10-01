/**
 * Single source of truth for the dev-mode auth toggle.
 * When false (production default) ONLY Google sign-in is available —
 * email/password login, registration and password recovery are hidden.
 */
export const DEV_MODE =
  String(import.meta.env.VITE_DEV_MODE ?? "false").toLowerCase() === "true";

export const EMAIL_AUTH_ENABLED = DEV_MODE;
