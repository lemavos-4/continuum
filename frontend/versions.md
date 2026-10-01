# Changelog

Every notable change to **Continuum**, from the first release to what just shipped. Newest at the top.

> A few early versions (`v2`, `v3`) predate our versioning scheme, and a couple of tags got committed twice on the same day — those are merged into one entry each below.

---

## v1.2.15 — Aug 29, 2026 *(current)*
🔧 Small backend configuration tweak.

## v1.2.12 — Aug 30, 2026
🔧 Small refinements to the note editor and its styling.

## v1.2.11 — Aug 30, 2026
🔧 Minor visual polish across the app.

## v1.2.10 — Aug 30, 2026
🔧 Continued work on profile wallpapers and editor font sizing.

## v1.2.9 — Aug 30, 2026
✨ You can now adjust the font size in the note editor, with new related options in your Profile.

## v1.2.8 — Aug 30, 2026
🔧 Reworked how sign-in/sign-up redirects you through the app, plus route fixes on several pages.
🔧 Free plan limits were tightened, and data export is now a paid-only feature.
🗑️ Removed a leftover static Google auth file from the backend build.

## v1.2.6 — Aug 26, 2026
✨ Notifications now go through **Telegram** instead of Discord.
✨ Smoother page transitions and loading animations throughout the app.
✨ New wallpaper customization options for your profile.
🔧 Big rewrite of the note editor and the Notes page for a better writing experience.
🔧 Polish on the Dashboard, Entities, Insights, and Vault pages.

## v1.2.5 — Aug 10, 2026
🔧 Environment configuration tweak.

## v1.2.4 — Aug 10, 2026
✨ New "Score Evolution" card on the Dashboard, showing how your score changes over time.
✨ Discord notifications for important events.
🔧 Metrics engine rewritten under the hood.

## v1.2.3 — Aug 9, 2026
🔧 Environment configuration tweak.

## v1.2.1 — Aug 9, 2026
✨ Notes can now be folded/collapsed by heading.
✨ Configurable editor mode.
✨ Custom naming for your vaults.
✨ New subscription modal for managing your plan.
🔧 Stripe payments are now reconciled automatically, with full event auditing.
🔧 Requests are now time-zone aware.

## v1.2.0 — Aug 4, 2026
🔧 **Full visual redesign** — nearly every core page (Dashboard, Entities, Insights, Knowledge Graph, Notes, Pricing, Profile, Projects, Subscription, Vault) got a fresh look.
✨ New reusable UI building blocks across the app.

## v1.1.2 — Jul 29, 2026
🔧 Small cosmetic fix on the landing page.

## v1.1.1 — Jul 29, 2026
✨ Continuum can now be installed as a PWA (with install prompts and buttons).
🔧 Dashboard and auth screens (Login, Forgot Password, Register, etc.) rewritten for clarity.

## v1.1.0 — Jul 29, 2026
🔧 Small fix to time-tracking behavior.

## v1.0.4 — Jul 28, 2026
🐛 Backend security hardening.

## v1.0.3 — Jul 28, 2026
🔧 Environment configuration tweak.

## v1.0.2 — Jul 28, 2026
🗑️ Cleaned up unused code and simplified the build config.

## v1.0.1 — Jul 28, 2026
✨ Continuum now works **offline** and can run as a PWA, syncing automatically once you're back online.
✨ New activity calendars and time-tracking history views.
✨ Language switcher, plus a fully modular translation system.
✨ New About, Pricing, and Support pages.
✨ Timer goals and related notifications.
🔧 Payments migrated from LemonSqueezy to **Stripe**.
🗑️ Removed the LemonSqueezy integration.

## v3 — Jun 13, 2026
🔧 Reverted the folder reorganization from v2 — no functional changes.

## v2 — Jun 13, 2026
✨ You can now **import Markdown files**, with a confirmation step before anything is committed.
✨ Expanded the note editor: find & replace, status bar, keyboard shortcuts, and more.
✨ New sign-up page.
✨ Vercel Web Analytics and Speed Insights added.
🐛 Fixed Google login and token refresh issues.

## v1.0.0-RELEASE — May 28, 2026
🎉 **The first full release of Continuum**, shipped as a complete product:
- Email/password and Google sign-in, with secure token refresh
- Private vaults for your files, backed by Backblaze B2
- Notes linked to entities, with an interactive knowledge graph
- Dashboard, Insights, and usage metrics
- Time tracking per activity/entity
- Subscriptions and billing via Stripe and LemonSqueezy
- Landing page, Terms, and Privacy pages

---

## Initial commit — May 27, 2026
Repository created with a license and a placeholder README.