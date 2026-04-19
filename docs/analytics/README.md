# Analytics notes

Heads-ups about telemetry changes — shifts in event timing, schema changes, new events, known data discontinuities. Things an analytics tool should know about when interpreting historical data.

## File conventions

One file per note. Filename: `YYYY-MM-DD-short-slug.md`. Naming this way sorts chronologically and is ingestion-friendly.

## Frontmatter schema

Every note starts with YAML frontmatter. All fields required unless marked optional.

```yaml
---
title: short human summary
date: YYYY-MM-DD           # when the change landed or was recorded
event: event_name          # primary telemetry event affected (or "multiple")
type: behavior-change | schema-change | new-event | removed-event | known-gap
pr: 123                    # optional — PR that introduced the change
impact: one-line summary of what changed and who cares
---
```

## Body

Use these sections:

- **What changed** — the observable delta
- **Root cause** — why it changed (bug fix, intentional redesign, infra change)
- **When** — date it landed on `main`
- **What to watch** — how this shows up in dashboards/queries

Keep it tight. A future analytics agent should be able to read 5–10 of these in one pass.
