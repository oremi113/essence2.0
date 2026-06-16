"use client";

import type { ShelfMessage } from "./types";
import { CATEGORY_LABEL, formatKeptDate, formatDuration } from "./types";

/**
 * The saved-message cards (newest-first, ≤3). Pure presentation — the card's
 * primary action (open the ceremonial overlay) and the audio-retry both bubble
 * out via callbacks. Mirrors the prototype: flat house surface + hairline +
 * shadow-sm, a woven category caption (never a pill), and a honey glow reserved
 * for unplayed / just-landed cards so the glow MEANS "unheard," not decoration.
 */
export function MessageList({
  messages,
  unplayedIds,
  unavailableIds,
  freshId,
  onOpen,
  onRetryAudio,
}: {
  messages: ShelfMessage[];
  /** ids that should carry the unplayed glow (server `played` ∪ session state). */
  unplayedIds: ReadonlySet<string>;
  /** ids whose audio failed to play — render the "safe, try again" affordance. */
  unavailableIds: ReadonlySet<string>;
  /** newest card just arrived from A7 — one warm settle, then rest. */
  freshId: string | null;
  onOpen: (id: string) => void;
  onRetryAudio: (id: string) => void;
}) {
  return (
    <div className="shelf-cards">
      {messages.map((msg, index) => {
        const unavailable = unavailableIds.has(msg.id);
        const fresh = msg.id === freshId && !unavailable;
        const unplayed = !fresh && !unavailable && unplayedIds.has(msg.id);

        const classes = ["shelf-card"];
        if (unavailable) classes.push("shelf-card--unavailable");
        else if (fresh) classes.push("shelf-card--fresh");
        else if (unplayed) classes.push("shelf-card--unplayed");

        return (
          <article
            key={msg.id}
            className={classes.join(" ")}
            style={{ ["--card-index" as string]: index }}
            onClick={unavailable ? undefined : () => onOpen(msg.id)}
          >
            <div className="shelf-card__recipient">
              For {msg.recipientName ?? "someone you love"}
            </div>
            <div className="shelf-card__occasion">
              {CATEGORY_LABEL[msg.category] ?? ""}
            </div>
            {msg.body && <p className="shelf-card__excerpt">{msg.body}</p>}
            <div className="shelf-card__meta">
              Kept on {formatKeptDate(msg.createdAt)} ·{" "}
              {formatDuration(msg.durationSeconds)}
            </div>

            <div className="shelf-card__footer">
              {unavailable ? (
                <span className="shelf-card__unavailable-label" aria-hidden="true">
                  ◌ Unavailable
                </span>
              ) : (
                <button
                  type="button"
                  className="shelf-btn-play"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(msg.id);
                  }}
                >
                  <span>Play</span>
                </button>
              )}
            </div>

            {unavailable && (
              <div className="shelf-card__unavailable-note">
                This message is safe. It just needs a moment before it can play.
                <button
                  type="button"
                  className="shelf-btn-retry"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryAudio(msg.id);
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
