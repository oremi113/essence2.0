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
 * Renders A2 → A3 → A4 → A5 (the form spine + the in-flight generation
 * wait). A4 submit fires onGenerate (page owns /generate + the route push
 * to A6); A5 is the client-side wait the orchestrator shows while that
 * call is in flight — success navigates to A6 (A5 unmounts), failure
 * flips A5 to its retry state.
 */
export type FlowStep = 'recipient' | 'category' | 'note' | 'generating';

/**
 * Staged inputs collected through the form steps. Holds nothing until
 * the user submits each step. None of these are persisted server-side
 * until A4 submit triggers /api/messages/generate (per Q1 — message is
 * ephemeral pre-save). The note is staged so A5's "Adjust your note"
 * failure path can route back to A4 with it pre-filled.
 */
export interface StagedFlowState {
  recipient: RecipientSelection | null;
  category: MessageCategory | null;
  note: string | null;
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
  /**
   * Saved-message count at flow start. Drives A3's "last of three"
   * variant (=== 2) and the flow_started telemetry. Defaults to 0.
   */
  savedCountBefore?: number;
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
