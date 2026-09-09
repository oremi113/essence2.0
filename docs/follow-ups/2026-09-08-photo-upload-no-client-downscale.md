---
id: 2026-09-08-photo-upload-no-client-downscale
priority: P4
status: open
opened: 2026-09-08
summary: "Profile photos upload at full native size (cap is now 10MB) — the #140 commit and the avatar-shared code comment both say client-side downscale is \"tracked\" / \"see FOLLOW_UPS\", but no such entry existed until this one *(triage 2026-09-08)*"
---

# Photos still upload at native size — the promised downscale follow-up was never filed

*(surfaced reviewing the #140 photo-cap change, 2026-09-08)*

`src/lib/profile/avatar-shared.ts:12-15` (`AVATAR_MAX_BYTES = 10MB`)

#140 raised the avatar cap from 2MB to 10MB because modern phone photos
(iPhone 16 Pro JPEGs run ~3–8MB) were tripping the old friendly-error gate. The
raise is the right stopgap, and both the commit message ("Proper long-term fix
(client-side downscale before upload) tracked separately") and the code comment
("Proper long-term fix: downscale the image client-side before upload — see
FOLLOW_UPS") point at a follow-up that **did not exist** — the reference was
dangling. This file closes that gap so the deferral is actually tracked (house
rule: no in-code deferral note without a FOLLOW_UPS entry).

**Why it matters:** a profile photo is a small circle, yet the app now uploads
and stores the full-resolution original — up to 10MB — and ships that native-size
file to every consumer. For the 45–70 audience often on mobile data, an 8MB
upload over a weak connection is slow enough to read as "stuck", and it costs
storage on a preserve-forever product. Downscaling to a sane display size
(e.g. ~1024px, re-encoded) in the browser before upload would cut both by an
order of magnitude and let the app cap stay a friendly gate rather than a real
constraint.

This is the **upload/source** half of the same image-strategy concern as the
legacy FU-6 (`FOLLOW_UPS.md`, "server-side thumbnail remains"), which is the
**download/consumer** half — a client downscale before upload plus a server
thumbnail for consumers are complementary, and cheapest to design in one Storage
pass. Cross-reference FU-6 when either is picked up.

**Fix shape:** add a client-side canvas/`createImageBitmap` downscale + re-encode
step in the Screen 10 upload hook (`usePhotoUpload`) before the file is sent —
resize the longest edge to a target, re-encode to JPEG/WebP at a quality bound,
and keep the server-side `AVATAR_MAX_BYTES` check as the truth backstop. Purely
client-side; no schema or migration.

**Pick up when:** the next Storage/image-handling pass (fold together with FU-6),
or if photo-upload latency shows up in beta feedback.
