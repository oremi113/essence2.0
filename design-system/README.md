# design-system/

The token export external design tooling loads — Claude Design canvases, the
`_ds/` bundle a `.dc.html` file pulls in.

**`colors_and_type.css` is generated. Do not edit it.**

```
npm run build:ds-export
```

It emits `src/app/globals.css`'s entire `@theme` block verbatim, comments
included. `globals.css` is the source; this is a copy that exists only because
external tools can't read the repo.

## Why it's generated

The previous export was lifted by hand on 2026-04-17. Its header promised
*"Source wins if it drifts — regenerate from it"* and offered no way to do
that, so it drifted for five months:

| token | stale export | globals.css |
|---|---|---|
| `--shadow-mineral` | `0 4px 12px rgba(74,107,126,.3)` — teal | `0 4px 14px rgba(110,80,40,.20)` — warm |
| `--text-display` | `48px` | `34px` |

The shadow put a **blue shadow under the primary CTA on a warm cream screen**
in every design file that consumed it. `--text-display` is worse than a value
change: the 48px scale step was renamed `--text-scale-display` and the name was
reused for the 34px ceremonial role, so the export and the app disagree by 14px
on a line that is supposed to be a payoff.

52 tokens added since the lift were simply absent — including
`--color-text-secondary-strong`, which a later design pass re-derived from
scratch and proposed "promoting" to a system it was already in.

## The rule

A token missing here is missing in the app. Add it to `globals.css` and
regenerate. **A local override in a design file is drift with extra steps** —
it makes the design correct and the record wrong.

Regenerate whenever `@theme` changes, and hand the file to whoever is designing.
