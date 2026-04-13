import Link from "next/link";

/**
 * Top-level tab nav shared by the post-onboarding /app pages.
 * Pass `current` to show which tab the user is on; that one renders
 * as plain text instead of a link so it's clear which page is active.
 */
export type TabKey = "record" | "new-message" | "shelf";

const TABS: { key: TabKey; href: string; label: string }[] = [
  { key: "record", href: "/app/record", label: "Record" },
  { key: "new-message", href: "/app/messages/new", label: "New Message" },
  { key: "shelf", href: "/app/shelf", label: "Memory Shelf" },
];

export function TabNav({ current }: { current: TabKey }) {
  return (
    <nav className="tab-nav" aria-label="Primary">
      {TABS.map((tab, i) => (
        <span key={tab.key} className="tab-nav__item">
          {tab.key === current ? (
            <span className="tab-nav__link tab-nav__link--current" aria-current="page">
              {tab.label}
            </span>
          ) : (
            <Link href={tab.href} className="tab-nav__link">
              {tab.label}
            </Link>
          )}
          {i < TABS.length - 1 && (
            <span className="tab-nav__sep" aria-hidden="true">
              |
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
