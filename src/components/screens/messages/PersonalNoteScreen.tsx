'use client';

/**
 * A4 — Personal Note. The user's only creative input in the flow.
 *
 * Production implementation of prototypes/message creation/
 * essence-step6-a4.html (Directions 1 + 5). Pure and props-driven per
 * CLAUDE.md: the screen owns the input/honoring stage state and all
 * motion; submit and back bubble out (the page owns /generate and
 * navigation). See PersonalNoteScreen.types.ts for the contract.
 *
 * The two-stage shape:
 *   Stage A (input)    — ready stone as companion, italic category-aware
 *                        question, a plain-language subtitle (the mechanic +
 *                        that blank is allowed), example-led textarea. The CTA
 *                        morphs: empty → ghost "Skip and write it for me";
 *                        content → solid "Write my message". (Clarity pass
 *                        2026-06-15 — see Step6_A4_Copy_Clarity.md.)
 *   Stage B (honoring) — the note quoted back in the user's words with a
 *                        quiet ack + pulsing dots while /generate runs
 *                        behind it (min-hold 2.4s so the moment is never
 *                        cut short). Skip bypasses this stage entirely.
 *
 * A failed submit returns Stage B → Stage A with the note intact
 * (generation-failure UI proper is A5.b's territory).
 */

import { useCallback, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { ChevronLeftIcon } from '@/components/icons';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type { MessageCategory } from '@/lib/messageTemplates';
import type { PersonalNoteScreenProps } from './PersonalNoteScreen.types';
import { PERSONAL_NOTE_CSS } from './PersonalNoteScreen.css';

export const NOTE_MAX_CHARS = 200;
const COUNTER_SHOW_AT = 150;
const COUNTER_WARN_AT = 180;
const GLOW_DEEPENS_AT = 80;
/** The honoring moment is never cut shorter than this (prototype cadence). */
const HONORING_MIN_HOLD_MS = 2400;

/**
 * Category-aware question copy — the emotional anchor of the screen.
 * PLACEHOLDER: all seven strings await the validation task (prototype
 * header note); this table is the single edit point when copy lands.
 */
const QUESTION_BY_CATEGORY: Record<MessageCategory, string> = {
  birthday: 'What do you want them to know?',
  encouragement: 'What do you want them to know?',
  daily_reminder: 'What do you want them to know?',
  future_message: 'What do you want them to know?',
  comfort: 'What do you want them to know?',
  holiday: 'What do you want them to know?',
  checking_in: 'What do you want them to know?',
};

/**
 * Plain-language helper under the question — explains the mechanic (a few words
 * → a full message) and that blank is allowed. Clarity pass for a boomer/Gen-X
 * audience (2026-06-15): the prior screen leaned on a morphing button alone,
 * which read as an opt-out. Exact wording is owner-approved.
 */
const SUBTITLE =
  'A memory, a few words, even just a feeling we’ll turn it into a full message. Or leave it blank and we’ll write a warm one for you.';

/**
 * An example in the box — the strongest clarity lever for this audience: it
 * shows what a note looks like and that a sentence is enough. Birthday-flavoured
 * for now (copy is category-agnostic — see FOLLOW_UPS for per-category examples).
 */
const NOTE_PLACEHOLDER =
  'Example: Happy birthday, sweetheart. I’m so proud of the woman you’ve become.';

const SKIP_LABEL = 'Skip and write it for me';
const SUBMIT_LABEL = 'Write my message';

/** PLACEHOLDER ack — may become category-aware (same single-table shape). */
const HONORING_ACK = 'We’ll bring this into your voice.';

export function PersonalNoteScreen({
  recipientName,
  categoryLabel,
  category,
  initialNote = '',
  onSubmit,
  onBack,
}: PersonalNoteScreenProps) {
  const reducedMotion = useReducedMotion();

  const [note, setNote] = useState(initialNote.slice(0, NOTE_MAX_CHARS));
  const [stage, setStage] = useState<'input' | 'honoring'>('input');
  const [honoringVisible, setHonoringVisible] = useState(false);
  const [writing, setWriting] = useState(initialNote.trim().length > 0);
  const [pending, setPending] = useState(false);
  // The note as submitted — rendered by the honoring quote (the live
  // field may notionally change after submit; the quote must not).
  const [submittedNote, setSubmittedNote] = useState('');

  const trimmed = note.trim();
  const hasContent = trimmed.length > 0;
  const len = note.length;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value.slice(0, NOTE_MAX_CHARS));
  }, []);

  const handleFocus = useCallback(() => setWriting(true), []);
  const handleBlur = useCallback(() => {
    if (note.trim().length === 0) setWriting(false);
  }, [note]);

  const handleSubmit = useCallback(async () => {
    if (pending) return;
    setPending(true);

    if (hasContent) {
      // Note path — the honoring moment holds while /generate runs.
      setSubmittedNote(trimmed);
      setStage('honoring');
      // Two-frame defer so the fade transition runs from the hidden state.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHonoringVisible(true));
      });
      const [result] = await Promise.all([
        onSubmit(trimmed),
        new Promise((r) => setTimeout(r, reducedMotion ? 0 : HONORING_MIN_HOLD_MS)),
      ]);
      if (!result.ok) {
        // Back to the input stage, note intact — no dead ends before A5.
        setHonoringVisible(false);
        setStage('input');
        setPending(false);
      }
      // ok → the parent navigates; Stage B holds until unmount.
    } else {
      // Skip path — template default, no LLM call, no honoring moment.
      const result = await onSubmit(null);
      if (!result.ok) setPending(false);
    }
  }, [pending, hasContent, trimmed, onSubmit, reducedMotion]);

  return (
    <div className="personal-note">
      <style>{PERSONAL_NOTE_CSS}</style>

      <div className="backbar">
        <button type="button" className="backbar__btn" aria-label="Back" onClick={onBack}>
          <ChevronLeftIcon />
        </button>
        <div className="backbar__pips" aria-hidden="true">
          <span className="backbar__pip is-done" />
          <span className="backbar__pip is-done" />
          <span className="backbar__pip is-current" />
          <span className="backbar__pip" />
          <span className="backbar__pip" />
        </div>
        <span className="backbar__spacer" />
      </div>

      <div className="crumb-row">
        <div className="crumb-display">
          <span>For {recipientName}</span>
          <span className="crumb-display__divider" aria-hidden="true" />
          <span>{categoryLabel}</span>
        </div>
      </div>

      <div className="body">
        {stage === 'input' ? (
          <div
            className={[
              'stage',
              writing ? 'is-writing' : '',
              hasContent ? 'has-content' : '',
              len >= GLOW_DEEPENS_AT ? 'has-long-content' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="stone-wrap" aria-hidden="true">
              <BreathStone state="ready" size={120} reducedMotion={reducedMotion} />
            </div>

            <p className="prompt-question" id="pn-question">
              {QUESTION_BY_CATEGORY[category]}
            </p>
            <p className="prompt-subtitle" id="pn-subtitle">
              {SUBTITLE}
            </p>

            <div className="note-wrap">
              <textarea
                className="note-field"
                aria-labelledby="pn-question pn-subtitle"
                placeholder={NOTE_PLACEHOLDER}
                maxLength={NOTE_MAX_CHARS}
                rows={3}
                value={note}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div
              className={[
                'note-counter',
                len >= COUNTER_SHOW_AT ? 'is-visible' : '',
                len >= COUNTER_WARN_AT ? 'is-warning' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden={len < COUNTER_SHOW_AT}
            >
              {len} / {NOTE_MAX_CHARS}
            </div>
          </div>
        ) : (
          <div
            className={`honoring${honoringVisible ? ' is-visible' : ''}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p
              className={`honoring__quote${
                submittedNote.length > GLOW_DEEPENS_AT ? ' honoring__quote--long' : ''
              }`}
            >
              {submittedNote}
            </p>
            <p className="honoring__ack">{HONORING_ACK}</p>
            <div className="honoring__pulse" aria-hidden="true">
              <span className="honoring__pulse-dot" />
              <span className="honoring__pulse-dot" />
              <span className="honoring__pulse-dot" />
            </div>
          </div>
        )}
      </div>

      <div className={`footer${stage === 'honoring' ? ' is-hidden' : ''}`}>
        <button
          type="button"
          className={`btn${hasContent ? '' : ' btn--ghost'}`}
          onClick={handleSubmit}
          disabled={pending}
        >
          {hasContent ? SUBMIT_LABEL : SKIP_LABEL}
        </button>
      </div>
    </div>
  );
}
