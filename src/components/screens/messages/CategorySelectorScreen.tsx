'use client';

/**
 * A3 — Category Selector. "What do you want to say?" — the user picks the
 * shape of the message before the note (A4) and the generation (A5/A6).
 *
 * Production implementation of prototypes/message creation/
 * essence-step6-a3.html. Pure and props-driven per CLAUDE.md: the screen
 * owns the local selection state and all motion; the choice bubbles out
 * through onSubmit (the orchestrator stages it and advances to A4). Back
 * (chevron or crumb) bubbles through onBack to A2.
 *
 * Label, description, and order come from the canonical registry
 * (CATEGORY_DISPLAY_ORDER + getCategoryDefinition), reconciled to this
 * prototype's copy on 2026-06-13 — one source of truth, no hardcoded
 * third variant. Only the per-category icon lives here (line-art, ported
 * from the prototype into @/components/icons).
 *
 * Two variants:
 *   default       — "What do you want to say?" on the warm-phase ground.
 *   last-of-three — when this is the third and final Vault message
 *                   (isFinalOfThree): warmer ground, the Position-2
 *                   ceiling note, and softer copy. Driven by the
 *                   orchestrator from saved_count_before === 2.
 */

import { useState } from 'react';
import {
  AwardIcon,
  CakeIcon,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  HeartIcon,
  HourglassIcon,
  MugIcon,
  SunIcon,
} from '@/components/icons';
import {
  CATEGORY_DISPLAY_ORDER,
  getCategoryDefinition,
  type MessageCategory,
} from '@/lib/messageTemplates';
import type { CategorySelectorScreenProps } from './CategorySelectorScreen.types';
import { CATEGORY_SELECTOR_CSS } from './CategorySelectorScreen.css';

/** Per-category line-art. Icons ported from the A3 prototype. */
const CATEGORY_ICON: Record<
  MessageCategory,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  birthday: CakeIcon,
  encouragement: AwardIcon,
  daily_reminder: SunIcon,
  future_message: HourglassIcon,
  comfort: MugIcon,
  holiday: CalendarIcon,
  checking_in: HeartIcon,
};

const COPY = {
  default: {
    title: 'What do you want to say?',
    aside: 'Pick the shape. The words come next.',
  },
  final: {
    title: 'One more to shape.',
    aside: 'This will complete your three. Take your time.',
  },
} as const;

export function CategorySelectorScreen({
  recipientName,
  isFinalOfThree = false,
  initialCategory = null,
  onSubmit,
  onBack,
}: CategorySelectorScreenProps) {
  const [selected, setSelected] = useState<MessageCategory | null>(
    initialCategory ?? null,
  );

  const copy = isFinalOfThree ? COPY.final : COPY.default;

  return (
    <div className={`category-selector${isFinalOfThree ? ' is-final' : ''}`}>
      <style>{CATEGORY_SELECTOR_CSS}</style>

      <div className="backbar">
        <button type="button" className="backbar__btn" aria-label="Back" onClick={onBack}>
          <ChevronLeftIcon />
        </button>
        <div className="backbar__pips" aria-hidden="true">
          <span className="backbar__pip is-done" />
          <span className="backbar__pip is-current" />
          <span className="backbar__pip" />
          <span className="backbar__pip" />
          <span className="backbar__pip" />
        </div>
        <span className="backbar__spacer" />
      </div>

      <div className="body">
        <div className="anchor-head">
          <button type="button" className="crumb" onClick={onBack}>
            <ChevronLeftIcon size={12} />
            <span>For {recipientName}</span>
          </button>

          <h1 className="title">{copy.title}</h1>
          <p className="aside">{copy.aside}</p>
        </div>

        {isFinalOfThree && (
          <div className="ceiling-note" role="note">
            <ClockNoteIcon />
            <span>
              This is the <strong>third of the three messages</strong> included
              with your Vault. Take your time.
            </span>
          </div>
        )}

        <div className="selectable-list" role="radiogroup" aria-label="Message category">
          {CATEGORY_DISPLAY_ORDER.map((key) => {
            const def = getCategoryDefinition(key);
            const Icon = CATEGORY_ICON[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`selectable-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => setSelected(key)}
              >
                <span className="selectable-card__icon">
                  <Icon size={22} />
                </span>
                <span className="selectable-card__main">
                  <span className="selectable-card__name">{def.label}</span>
                  <span className="selectable-card__sub">{def.description}</span>
                </span>
                <CheckIcon className="selectable-card__check" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="footer">
        <button
          type="button"
          className="btn"
          disabled={selected === null}
          onClick={() => selected && onSubmit(selected)}
        >
          Begin shaping
        </button>
      </div>
    </div>
  );
}

/** The ceiling-note clock glyph (prototype: circle + 12→3 hand). */
function ClockNoteIcon() {
  return (
    <svg
      className="ceiling-note__icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
