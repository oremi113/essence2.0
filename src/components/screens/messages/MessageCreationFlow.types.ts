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
 * V1 stub renders 'recipient' only and shows a placeholder for the rest.
 */
export type FlowStep = 'recipient' | 'category' | 'note';

/**
 * Staged inputs collected through the form steps. Holds nothing until
 * the user submits each step. None of these are persisted server-side
 * until A4 submit triggers /api/messages/generate (per Q1 — message is
 * ephemeral pre-save).
 */
export interface StagedFlowState {
  recipient: RecipientSelection | null;
  // category, note added in later passes when A3/A4 land.
}

export interface MessageCreationFlowProps {
  /** Existing recipients fetched from the server. Empty array = first-ever path. */
  existingRecipients: ExistingRecipient[];
  /** Called when the user backs out of the entire flow (typically routes to Home). */
  onExitFlow: () => void;
}
