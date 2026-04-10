/**
 * Design Token Smoke Test
 *
 * Visual verification page for the MINERAL & WARMTH design tokens defined in
 * src/app/globals.css. Not linked from anywhere in the app — navigate to
 * /dev/tokens directly to verify tokens render correctly before building
 * components that depend on them.
 */

type ColorToken = {
  name: string;
  hex: string;
  note?: string;
};

const BACKGROUND_COLORS: ColorToken[] = [
  { name: "--color-bg-primary", hex: "#FBF8F4", note: "cream — main app bg" },
  { name: "--color-surface-card", hex: "#F5F0EA", note: "oat — cards" },
  { name: "--color-surface-warm", hex: "#EBE4DC", note: "soft sand" },
  { name: "--color-surface-honey", hex: "#E8DCC8", note: "light honey" },
];

const ACCENT_COLORS: ColorToken[] = [
  { name: "--color-mineral", hex: "#7A8088", note: "primary" },
  { name: "--color-mineral-dark", hex: "#656B73", note: "primary hover" },
];

const TEXT_COLORS: ColorToken[] = [
  { name: "--color-text-primary", hex: "#1C1A18" },
  { name: "--color-text-secondary", hex: "#6B6B6B" },
  { name: "--color-text-tertiary", hex: "#ADA9A5" },
];

const STATUS_COLORS: ColorToken[] = [
  { name: "--color-status-error", hex: "#9C3528", note: "terracotta · 6.72:1" },
  { name: "--color-status-warning", hex: "#8A5A1E", note: "amber-umber · 5.57:1" },
  { name: "--color-status-success", hex: "#4A7A68", note: "sage · 4.64:1" },
];

type TypeToken = {
  name: string;
  varName: string;
  px: string;
  family: "display" | "body";
};

const TYPE_SCALE: TypeToken[] = [
  { name: "display", varName: "--text-display", px: "48px", family: "display" },
  { name: "h1", varName: "--text-h1", px: "36px", family: "display" },
  { name: "h2", varName: "--text-h2", px: "28px", family: "display" },
  { name: "h3", varName: "--text-h3", px: "20px", family: "body" },
  { name: "body-lg", varName: "--text-body-lg", px: "18px", family: "body" },
  { name: "body", varName: "--text-body", px: "16px", family: "body" },
  { name: "small", varName: "--text-small", px: "14px", family: "body" },
  { name: "caption", varName: "--text-caption", px: "12px", family: "body" },
];

const SPACING_SCALE = [
  { name: "--space-xs", px: 4 },
  { name: "--space-sm", px: 8 },
  { name: "--space-md", px: 12 },
  { name: "--space-lg", px: 16 },
  { name: "--space-xl", px: 24 },
  { name: "--space-2xl", px: 32 },
  { name: "--space-3xl", px: 40 },
  { name: "--space-4xl", px: 48 },
];

const EASINGS = [
  {
    name: "--ease-essence",
    value: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    note: "standard easing",
  },
  {
    name: "--ease-breath",
    value: "cubic-bezier(0.4, 0.0, 0.2, 1)",
    note: "breathing animations (same as essence in current tokens)",
  },
  {
    name: "--ease-press",
    value: "cubic-bezier(0.2, 0.0, 0.0, 1)",
    note: "button press — snappier",
  },
];

const SAMPLE_TEXT = "Your voice holds more than you realize.";

function Swatch({ token }: { token: ColorToken }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "96px",
          backgroundColor: `var(${token.name})`,
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-small)",
          color: "var(--color-text-primary)",
          fontWeight: 500,
        }}
      >
        {token.name}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-caption)",
          color: "var(--color-text-secondary)",
        }}
      >
        {token.hex}
        {token.note ? ` · ${token.note}` : ""}
      </div>
    </div>
  );
}

function SwatchGrid({ tokens }: { tokens: ColorToken[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "var(--space-lg)",
      }}
    >
      {tokens.map((t) => (
        <Swatch key={t.name} token={t} />
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-h2)",
        color: "var(--color-text-primary)",
        marginBottom: "var(--space-lg)",
      }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-h3)",
        color: "var(--color-text-secondary)",
        marginBottom: "var(--space-md)",
        marginTop: "var(--space-xl)",
        fontWeight: 600,
      }}
    >
      {children}
    </h3>
  );
}

export default function DesignTokensPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-primary)",
        padding: "var(--space-xl)",
        fontFamily: "var(--font-body)",
        color: "var(--color-text-primary)",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* ── Page header ───────────────────────────── */}
        <header style={{ marginBottom: "var(--space-4xl)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-display)",
              marginBottom: "var(--space-sm)",
            }}
          >
            MINERAL & WARMTH
          </h1>
          <p
            style={{
              fontSize: "var(--text-body-lg)",
              color: "var(--color-text-secondary)",
            }}
          >
            Design token smoke test — Session 1
          </p>
        </header>

        {/* ── Section 1: Colors ─────────────────────── */}
        <section style={{ marginBottom: "var(--space-4xl)" }}>
          <SectionHeading>1 · Colors</SectionHeading>
          <SubHeading>Backgrounds</SubHeading>
          <SwatchGrid tokens={BACKGROUND_COLORS} />
          <SubHeading>Accent</SubHeading>
          <SwatchGrid tokens={ACCENT_COLORS} />
          <SubHeading>Text</SubHeading>
          <SwatchGrid tokens={TEXT_COLORS} />
          <SubHeading>Status</SubHeading>
          <SwatchGrid tokens={STATUS_COLORS} />
        </section>

        {/* ── Section 2: Typography ─────────────────── */}
        <section style={{ marginBottom: "var(--space-4xl)" }}>
          <SectionHeading>2 · Typography</SectionHeading>
          <p
            style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            Spectral (serif) is used for display / h1 / h2 / h3. Inter (sans) is
            used for body and below.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-lg)",
            }}
          >
            {TYPE_SCALE.map((t) => (
              <div
                key={t.name}
                style={{
                  padding: "var(--space-md)",
                  backgroundColor: "var(--color-surface-card)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-secondary)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {t.name} · {t.varName} · {t.px} ·{" "}
                  {t.family === "display" ? "Spectral" : "Inter"}
                </div>
                <div
                  style={{
                    fontSize: `var(${t.varName})`,
                    fontFamily:
                      t.family === "display"
                        ? "var(--font-display)"
                        : "var(--font-body)",
                    color: "var(--color-text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {SAMPLE_TEXT}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: Shadows ────────────────────── */}
        <section style={{ marginBottom: "var(--space-4xl)" }}>
          <SectionHeading>3 · Shadows</SectionHeading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--space-xl)",
            }}
          >
            {[
              { name: "--shadow-sm", label: "shadow-sm" },
              { name: "--shadow-md", label: "shadow-md" },
              { name: "--shadow-lg", label: "shadow-lg" },
            ].map((s) => (
              <div
                key={s.name}
                style={{
                  backgroundColor: "var(--color-surface-card)",
                  borderRadius: "var(--radius-2xl)",
                  padding: "var(--space-xl)",
                  boxShadow: `var(${s.name})`,
                  minHeight: "140px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-body)",
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {s.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Spacing ────────────────────── */}
        <section style={{ marginBottom: "var(--space-4xl)" }}>
          <SectionHeading>4 · Spacing</SectionHeading>
          <p
            style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            8px base unit. Each bar below is rendered at its literal token value.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            {SPACING_SCALE.map((s) => (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                }}
              >
                <div
                  style={{
                    width: "120px",
                    fontSize: "var(--text-small)",
                    color: "var(--color-text-secondary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    width: `var(${s.name})`,
                    height: "24px",
                    backgroundColor: "var(--color-mineral)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
                <div
                  style={{
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {s.px}px
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 5: Easing ─────────────────────── */}
        <section style={{ marginBottom: "var(--space-4xl)" }}>
          <SectionHeading>5 · Easing</SectionHeading>
          <p
            style={{
              fontSize: "var(--text-small)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-lg)",
            }}
          >
            Hover each box to see its easing curve. Note: --ease-essence and
            --ease-breath are currently defined as the same cubic-bezier, so
            they will animate identically.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--space-xl)",
            }}
          >
            {EASINGS.map((e) => (
              <div
                key={e.name}
                className="ease-demo"
                style={
                  {
                    backgroundColor: "var(--color-surface-card)",
                    borderRadius: "var(--radius-2xl)",
                    padding: "var(--space-xl)",
                    minHeight: "160px",
                    cursor: "pointer",
                    transition: `transform var(--duration-medium) var(${e.name})`,
                    // Also overridden via hover class below
                    ["--ease-demo-curve" as string]: `var(${e.name})`,
                  } as React.CSSProperties
                }
              >
                <div
                  style={{
                    fontSize: "var(--text-body)",
                    fontWeight: 600,
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-secondary)",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  {e.note}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-caption)",
                    color: "var(--color-text-tertiary)",
                    fontFamily: "monospace",
                  }}
                >
                  {e.value}
                </div>
              </div>
            ))}
          </div>
          {/* Scoped hover styles for the easing demo boxes */}
          <style>{`
            .ease-demo:hover {
              transform: translateX(var(--space-2xl));
            }
          `}</style>
        </section>

        <footer
          style={{
            marginTop: "var(--space-4xl)",
            paddingTop: "var(--space-xl)",
            borderTop: "1px solid var(--color-border)",
            fontSize: "var(--text-caption)",
            color: "var(--color-text-tertiary)",
          }}
        >
          Dev-only route · not linked from the app
        </footer>
      </div>
    </main>
  );
}
