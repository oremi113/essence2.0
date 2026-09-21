---
id: 2026-08-04-privacy-terms-pages-absent-on-main
legacy_id: 76
priority: P2
status: open
opened: 2026-08-04
resolved:
owner_paired: false
summary: No Privacy Policy or Terms pages exist on `main` at all — FOLLOW_UPS §76 wrongly records them as "shipped, just unlinked"; they were never merged, so a launch-blocking gap is masked as a one-line linking task *(triage 2026-08-04)*
---

# Privacy / Terms pages don't exist on `main` — the backlog says they do (supersedes §76)

*(triage 2026-08-04 — trigger-came-true audit after Step 9 Settings landed)*

Legacy **FOLLOW_UPS §76** ("Legal pages aren't linked from Settings yet") states the Privacy
Policy and Terms pages *shipped greenfield 2026-07-08* — `src/app/{privacy,terms}/`, screens in
`src/components/screens/legal/`, `ROUTES.privacy` / `ROUTES.terms`, dev pages — and that the only
remaining work is adding a "Legal" links row once Settings merges. **That premise is now false.**
Settings *did* merge (commit `2fdf6bf`, the §76 trigger), but the legal pages did **not** land with
it:

- `git log --all -- 'src/app/privacy/*' 'src/app/terms/*' 'src/components/screens/legal/*'` → **no commits** (never on any branch reachable here).
- Full-tree grep for `LegalDocument` / `PrivacyPolicyScreen` / `TermsScreen` / "Privacy Policy" in `src/` → **zero hits**.
- `src/lib/routes.ts` has **no** `privacy` / `terms` / `legal` route entries.

So the pages, screens, routes, and dev pages §76 describes are all absent on `main`. They appear to
have lived only on the unmerged `step9/settings-trust` work and were dropped when Settings was
cherry-picked in.

**Why it matters:** the app has **no Privacy Policy and no Terms of Service anywhere** — not by URL,
not linked, not built. App-store and platform review reject consumer apps that can't show both, so
this is a hard launch gate (same class as §75, the dead support address). Worse, the backlog
actively *hides* the gap: §76 reads as "we have the pages, just add two links," a ~10-minute task,
when the real work is authoring/counsel-reviewing two legal documents and building the screens —
days, not minutes. A non-technical owner reading the backlog would not know launch is blocked here.

**Fix shape:** treat as build-from-scratch, not linking. (1) Author Privacy + Terms copy (needs
counsel review — this is an owner/legal task, not agent-fixable). (2) Build the screens + routes
(`src/app/{privacy,terms}/`, `ROUTES.privacy`/`ROUTES.terms`, `/dev/{privacy,terms}` per the
three-layer + dev-page rules). (3) Link them from Settings (the original §76 ask) and consider a
pre-auth footer link on sign-in/onboarding. Mark §76 superseded by this entry so the misleading
"just needs linking" framing stops being read as near-done.

**Pick up when:** before public launch — hard gate. Start the copy/legal-review track now (long
lead time); the screen build can follow the standard greenfield-screen pattern once copy exists.
