import { Spectral, Inter } from "next/font/google";
import "./globals.css";
import { LiveOfflineIndicator } from "@/components/system/OfflineIndicator";

// Self-hosted + preloaded. Each binding writes its own CSS variable so the
// `var(--font-display)` / `var(--font-body)` tokens in globals.css and
// components pick it up without any rename.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spectral.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {children}
        {/* Step 10 · S10-B — app-wide connectivity indicator. Fixed overlay,
            driven by the real navigator.onLine signal; hidden while online. */}
        <LiveOfflineIndicator />
      </body>
    </html>
  );
}
