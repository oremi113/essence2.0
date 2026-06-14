import type { MessageCategory } from '@/lib/messageTemplates';
import type { PersonalNoteSubmitResult } from './PersonalNoteScreen.types';
import type {
  ExistingRecipient,
  RecipientSelection,
} from './RecipientSetupScreen.types';

/**
 * Internal step state of the Step 6 message-creation flow. Mirrors the
 * inventory's A2 → A7 sequence. A5 (generating) and A6 (preview) live
 * at /messages/new/g/[generationId] per Step6_OpenContracts.md Q7 — the
 * orchestrator hands off to a different route once a generation exists.
 *
 * Renders A2 → A3 → A4 (the pre-generation form spine). A4 submit hands
 * off to the page via onGenerate, which owns /generate + the route push.
 */
export type FlowStep = 'recipient' | 'category' | 'note';

/**
 * Staged inputs collected through the form steps. Holds nothing until
 * the user submits each step. None of these are persisted server-side
 * until A4 submit triggers /api/messages/generate (per Q1 — message is
 * ephemeral pre-save). The note is not staged here — it is captured at
 * A4 submit and passed straight to onGenerate.
 */
export interface StagedFlowState {
  recipient: RecipientSelection | null;
  category: MessageCategory | null;
}

/**
 * The cold-start generation payload the orchestrator hands to the page
 * at A4 submit. The page owns POST /api/messages/generate (it needs the
 * voiceProfileId + auth) and the router push to the generation route —
 * per CLAUDE.md three-layer rules, the screen layer never fetches or
 * redirects. `note` is null on the "Use a generic message" skip path.
 */
export interface GenerateRequest {
  recipient: RecipientSelection;
  category: MessageCategory;
  note: string | null;
}

export interface MessageCreationFlowProps {
  /** Existing recipients fetched from the server. Empty array = first-ever path. */
  existingRecipients: ExistingRecipient[];
  /** Called when the user backs out of the entire flow (typically routes to Home). */
  onExitFlow: () => void;
  /**
   * A4 submit handoff. The page POSTs /generate and, on success, pushes
   * to /messages/new/g/[generationId]. Resolves not-ok to return A4's
   * honoring moment to the input stage with the note intact (no dead
   * end). The forward generate round-trip itself is wired in the
   * A4→A5 chunk; until then the page may resolve not-ok.
   */
  onGenerate: (request: GenerateRequest) => Promise<PersonalNoteSubmitResult>;
}
