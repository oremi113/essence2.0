'use client';

/**
 * A2 — Recipient Setup. Front door of Step 6 message creation.
 *
 * The screen owns three internal modes:
 *   - firstEver  : no prior recipients (A2.a) — pure form
 *   - returning  : list of existing recipients (A2.b) — pick or "Add new"
 *   - addingNew  : reached from "Add new" on returning (A2.c) — form again
 *
 * Initial mode is derived from existingRecipients.length. Toggle to
 * addingNew is internal; the page never sees it.
 *
 * The screen never persists anything. New recipients are surfaced via
 * onSubmit({kind:'new'}) and the page layer carries them as
 * pending_recipient_* fields per Step6_OpenContracts.md Q1.
 */

import { useCallback, useMemo, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { ChevronLeftIcon } from '@/components/icons';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type { RelationshipKey } from '@/lib/messageTemplates';
import type {
  ExistingRecipient,
  RecipientSelection,
  RecipientSetupMode,
  RecipientSetupScreenProps,
} from './RecipientSetupScreen.types';

const RELATIONSHIPS: ReadonlyArray<{ value: RelationshipKey; label: string }> = [
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'partner', label: 'Spouse / Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Someone else' },
];

const RELATIONSHIP_DISPLAY: Record<RelationshipKey, string> = {
  daughter: 'Your daughter',
  son: 'Your son',
  partner: 'Your partner',
  parent: 'Your parent',
  grandchild: 'Your grandchild',
  friend: 'Your friend',
  other: 'Someone else',
};

const CATEGORY_DISPLAY: Record<string, string> = {
  birthday: 'Birthday',
  encouragement: 'Encouragement',
  daily_reminder: 'Daily reminder',
  future_message: 'Future message',
  comfort: 'Comfort',
  holiday: 'Holiday',
  checking_in: 'Just checking in',
};

export function RecipientSetupScreen({
  existingRecipients,
  onSubmit,
  onBack,
}: RecipientSetupScreenProps) {
  const initialMode: RecipientSetupMode =
    existingRecipients.length === 0 ? 'firstEver' : 'returning';

  const [mode, setMode] = useState<RecipientSetupMode>(initialMode);
  const reducedMotion = useReducedMotion();

  // Form state (firstEver / addingNew)
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipKey | null>(null);
  const [descriptor, setDescriptor] = useState('');

  // List state (returning)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  const isFormMode = mode === 'firstEver' || mode === 'addingNew';

  const isValid = useMemo(() => {
    if (isFormMode) return name.trim().length > 0 && relationship !== null;
    return selectedRecipientId !== null;
  }, [isFormMode, name, relationship, selectedRecipientId]);

  // Render the duplicate-name disambiguator only when a recipient
  // shares both name AND relationship with another. Mirrors the
  // prototype rule.
  const needsDisambiguator = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of existingRecipients) {
      const key = `${r.name.toLowerCase()}|${r.relationship}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return (r: ExistingRecipient) => {
      const key = `${r.name.toLowerCase()}|${r.relationship}`;
      return (counts.get(key) ?? 0) > 1;
    };
  }, [existingRecipients]);

  const promptQuestion = useMemo(() => {
    if (mode === 'firstEver') return "Who's this first message for?";
    if (mode === 'addingNew') return 'Who is this message for?';
    return "Who's this one for?";
  }, [mode]);

  const handleRelationshipPick = useCallback((next: RelationshipKey) => {
    setRelationship(next);
    if (next !== 'other') setDescriptor('');
  }, []);

  const handleContinue = useCallback(() => {
    if (!isValid) return;
    if (isFormMode) {
      const selection: RecipientSelection = {
        kind: 'new',
        name: name.trim(),
        relationship: relationship as RelationshipKey,
        ...(relationship === 'other' && descriptor.trim()
          ? { descriptor: descriptor.trim() }
          : {}),
      };
      onSubmit(selection);
    } else if (selectedRecipientId) {
      onSubmit({ kind: 'existing', recipientId: selectedRecipientId });
    }
  }, [isValid, isFormMode, name, relationship, descriptor, selectedRecipientId, onSubmit]);

  const handleBackFromAddingNew = useCallback(() => {
    setMode('returning');
    // Reset form state — the next time user opens "Add new" they get a fresh form.
    setName('');
    setRelationship(null);
    setDescriptor('');
  }, []);

  const handleEnterAddingNew = useCallback(() => {
    setMode('addingNew');
    setSelectedRecipientId(null);
  }, []);

  // Back chevron: from addingNew, return to the list; otherwise exit the flow.
  const handleBack = mode === 'addingNew' ? handleBackFromAddingNew : onBack;

  return (
    <div className="flex flex-col items-center min-h-screen bg-[var(--color-bg-warm-phase)] text-[var(--color-text-primary)]">
      <div className="w-full max-w-md flex flex-col flex-1 min-h-screen">
      {/* ── Backbar ── */}
      <div className="flex items-center justify-between px-6 py-3 min-h-[52px] flex-shrink-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label={mode === 'addingNew' ? 'Back to your people' : 'Back'}
          className="p-2 -m-2 min-h-[44px] flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ChevronLeftIcon size={22} />
        </button>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-sm transition-[width,background-color] duration-700 ease-out ${
                n === 1
                  ? 'w-5 bg-[var(--color-bg-gold)]'
                  : 'w-1.5 bg-[var(--color-surface-warm)]'
              }`}
            />
          ))}
        </div>
        <span className="w-[22px]" aria-hidden="true" />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <div className="flex flex-col items-center text-center pt-4">
          <div className="my-2">
            <BreathStone state="ready" size={140} reducedMotion={reducedMotion} />
          </div>

          <h1 className="font-[family-name:var(--font-display)] italic text-[28px] leading-[1.4] font-medium mt-6 max-w-[290px] text-balance">
            {promptQuestion}
          </h1>

          {/* Mode-dependent content */}
          <div className="w-full mt-8 text-left flex flex-col gap-8">
            {isFormMode ? (
              <FormFields
                name={name}
                onNameChange={setName}
                relationship={relationship}
                onRelationshipPick={handleRelationshipPick}
                descriptor={descriptor}
                onDescriptorChange={setDescriptor}
              />
            ) : (
              <RecipientList
                recipients={existingRecipients}
                selectedId={selectedRecipientId}
                onPick={setSelectedRecipientId}
                onEnterAddNew={handleEnterAddingNew}
                needsDisambiguator={needsDisambiguator}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-6 pt-3 pb-8 flex-shrink-0 bg-[var(--color-bg-warm-phase)]">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid}
          className="w-full min-h-[52px] px-6 py-3 rounded-[10px] font-[family-name:var(--font-body)] font-semibold text-[18px] flex items-center justify-center bg-[var(--color-mineral)] text-white shadow-[var(--shadow-mineral)] transition-[background-color,transform] duration-200 active:scale-[0.98] hover:bg-[var(--color-mineral-dark)] disabled:bg-[var(--color-surface-warm)] disabled:text-[var(--color-text-tertiary)] disabled:shadow-none disabled:cursor-default disabled:active:scale-100"
        >
          Continue
        </button>
      </div>
      </div>
    </div>
  );
}

// ─── FormFields (firstEver, addingNew) ───────────────────────────────

interface FormFieldsProps {
  name: string;
  onNameChange: (value: string) => void;
  relationship: RelationshipKey | null;
  onRelationshipPick: (value: RelationshipKey) => void;
  descriptor: string;
  onDescriptorChange: (value: string) => void;
}

function FormFields({
  name,
  onNameChange,
  relationship,
  onRelationshipPick,
  descriptor,
  onDescriptorChange,
}: FormFieldsProps) {
  const descriptorOpen = relationship === 'other';

  return (
    <>
      <div className="flex flex-col gap-3">
        <label
          htmlFor="recipient-name"
          className="font-[family-name:var(--font-body)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
        >
          Their name
        </label>
        <input
          id="recipient-name"
          type="text"
          autoComplete="off"
          placeholder="Just a first name is fine."
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Recipient name"
          className="w-full min-h-[52px] px-4 py-3 rounded-2xl border-[1.5px] border-[rgba(0,0,0,0.04)] bg-[var(--color-surface-honey)] font-[family-name:var(--font-display)] text-[18px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] placeholder:italic shadow-[inset_0_2px_6px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] focus:outline-none focus:border-[var(--color-mineral)] focus:shadow-[inset_0_2px_6px_rgba(0,0,0,0.04),var(--shadow-focus-ring)] transition-[border-color,box-shadow] duration-300"
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-body)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Their relationship to you
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Relationship">
          {RELATIONSHIPS.map((r) => {
            const selected = relationship === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => onRelationshipPick(r.value)}
                aria-pressed={selected}
                className={`min-h-[44px] px-4 py-2 rounded-full font-[family-name:var(--font-body)] text-[16px] inline-flex items-center shadow-[var(--shadow-sm)] transition-[background-color,border-color,color,transform] duration-300 active:scale-[0.99] ${
                  selected
                    ? 'bg-[var(--color-bg-gold)] border-2 border-[var(--color-mineral)] text-[var(--color-text-primary)] font-semibold'
                    : 'bg-[var(--color-bg-neutral)] border-[1.5px] border-[rgba(122,128,136,0.35)] text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-bg-warm-1)] hover:border-[var(--color-mineral)]'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Optional descriptor — collapsed unless 'Someone else' chosen.
            Optional: never gates Continue. Sharpens downstream generation. */}
        <div
          className={`overflow-hidden flex flex-col gap-2 transition-[max-height,opacity,margin-top] duration-700 ease-out ${
            descriptorOpen
              ? 'max-h-40 opacity-100 mt-3'
              : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <label
            htmlFor="recipient-descriptor"
            className="font-[family-name:var(--font-body)] text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]"
          >
            How would you describe them?
          </label>
          <input
            id="recipient-descriptor"
            type="text"
            autoComplete="off"
            placeholder="Neighbor, cousin, caregiver…"
            value={descriptor}
            onChange={(e) => onDescriptorChange(e.target.value)}
            aria-label="How would you describe them?"
            className="w-full min-h-[52px] px-4 py-3 rounded-2xl border-[1.5px] border-[rgba(0,0,0,0.04)] bg-[var(--color-surface-honey)] font-[family-name:var(--font-display)] text-[18px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] placeholder:italic shadow-[inset_0_2px_6px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.03)] focus:outline-none focus:border-[var(--color-mineral)] focus:shadow-[inset_0_2px_6px_rgba(0,0,0,0.04),var(--shadow-focus-ring)] transition-[border-color,box-shadow] duration-300"
          />
        </div>
      </div>

      <p className="font-[family-name:var(--font-body)] text-[16px] text-[var(--color-text-secondary)] text-center leading-[1.5] -mt-2">
        This only helps shape this message.
      </p>
    </>
  );
}

// ─── RecipientList (returning) ───────────────────────────────────────

interface RecipientListProps {
  recipients: ExistingRecipient[];
  selectedId: string | null;
  onPick: (id: string) => void;
  onEnterAddNew: () => void;
  needsDisambiguator: (recipient: ExistingRecipient) => boolean;
}

function RecipientList({
  recipients,
  selectedId,
  onPick,
  onEnterAddNew,
  needsDisambiguator,
}: RecipientListProps) {
  return (
    <div className="flex flex-col gap-3">
      {recipients.map((r) => {
        const selected = selectedId === r.id;
        const initial = r.name.trim().charAt(0).toUpperCase() || '?';
        const baseSub = RELATIONSHIP_DISPLAY[r.relationship];
        const disambig =
          needsDisambiguator(r) && r.lastMessageCategory
            ? ` · last message, ${CATEGORY_DISPLAY[r.lastMessageCategory] ?? r.lastMessageCategory}`
            : '';

        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r.id)}
            aria-pressed={selected}
            className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 shadow-[var(--shadow-sm)] transition-[background-color,border-color,transform] duration-300 active:scale-[0.99] ${
              selected
                ? 'bg-[var(--color-bg-gold)] border-2 border-[var(--color-mineral)]'
                : 'bg-[var(--color-surface-card)] border-[1.5px] border-transparent hover:bg-[var(--color-bg-warm-2)]'
            }`}
          >
            <span
              className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center font-[family-name:var(--font-display)] text-[18px] font-semibold transition-[background-color,color] duration-300 ${
                selected
                  ? 'bg-[var(--color-mineral)] text-[var(--color-bg-neutral)]'
                  : 'bg-[var(--color-bg-warm-2)] text-[var(--color-mineral)]'
              }`}
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-[family-name:var(--font-display)] text-[18px] font-semibold leading-tight text-[var(--color-text-primary)]">
                {r.name}
              </span>
              <span className="block font-[family-name:var(--font-display)] italic text-[16px] text-[var(--color-text-secondary)] mt-1 leading-snug">
                {baseSub}
                {disambig}
              </span>
            </span>
            {selected && (
              <svg
                className="w-[22px] h-[22px] flex-shrink-0 text-[var(--color-mineral)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}

      <button
        type="button"
        onClick={onEnterAddNew}
        className="w-full text-left rounded-2xl p-4 flex items-center gap-4 bg-transparent border-[1.5px] border-[rgba(122,128,136,0.30)] text-[var(--color-text-secondary)] transition-[background-color,border-color,transform] duration-300 active:scale-[0.99] hover:bg-[var(--color-bg-warm-2)] hover:border-[var(--color-mineral)]"
      >
        <span
          className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center border-[1.5px] border-[rgba(122,128,136,0.35)] text-[var(--color-mineral)]"
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="font-[family-name:var(--font-body)] text-[16px] font-semibold text-[var(--color-text-primary)]">
          Add someone new
        </span>
      </button>
    </div>
  );
}
