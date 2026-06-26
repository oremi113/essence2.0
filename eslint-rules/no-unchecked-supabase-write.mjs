/**
 * ESLint rule: no-unchecked-supabase-write
 *
 * Flags a Supabase table write (`.insert/.update/.upsert/.delete` on a
 * `.from(...)` chain) whose result is **discarded** — i.e. the write expression
 * is awaited (or floated) as a bare statement and its `{ error }` is never
 * captured. Supabase reports a failed write through the returned `error`, it
 * does not throw, so a discarded result silently swallows the failure. That
 * single oversight is the recurring FOLLOW_UPS bug class (#42, #43, #44, #45,
 * #46, #61, #62, #63, #64): the route reports success while the row never
 * changed.
 *
 * The fix is to make intent explicit at every write:
 *   - destructure and check `{ error }` (the inline pattern), OR
 *   - route through `checkedWrite(...)` (throws on failure), OR
 *   - route through `bestEffortWrite(...)` (deliberately logs + swallows).
 * All three "use" the write's result, so none of them trip this rule.
 *
 * Scope: only the discard shape (a bare `ExpressionStatement`). A write whose
 * result is assigned, returned, or passed as an argument is considered handled
 * — those forms are not the bug this codebase actually hits, and flagging them
 * would need dataflow analysis with real false-positive risk.
 */

const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);

/** Does this CallExpression's receiver chain go through a `.from(...)` call? */
function chainHasFrom(node) {
  let cur = node;
  while (cur) {
    if (cur.type === "CallExpression") {
      const callee = cur.callee;
      if (
        callee &&
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "from"
      ) {
        return true;
      }
      cur = callee && callee.type === "MemberExpression" ? callee.object : null;
    } else if (cur.type === "MemberExpression") {
      cur = cur.object;
    } else {
      return false;
    }
  }
  return false;
}

/**
 * Climb from a write CallExpression to the end of its PostgREST method chain
 * (`.eq().select()...`), step over an enclosing `await`, and return the node
 * whose parent decides whether the value is used.
 */
function topOfExpression(writeCall) {
  let cur = writeCall;
  // Walk up through chained method calls where `cur` is the receiver.
  for (;;) {
    const parent = cur.parent;
    if (
      parent &&
      parent.type === "MemberExpression" &&
      parent.object === cur &&
      parent.parent &&
      parent.parent.type === "CallExpression" &&
      parent.parent.callee === parent
    ) {
      cur = parent.parent;
      continue;
    }
    break;
  }
  if (cur.parent && cur.parent.type === "AwaitExpression") {
    cur = cur.parent;
  }
  return cur;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require Supabase table writes to handle their result (check { error }, or use checkedWrite/bestEffortWrite) — a discarded write silently swallows failures.",
    },
    schema: [],
    messages: {
      uncheckedWrite:
        "Discarded Supabase .{{ method }}() result — a failed write would resolve as success. Check the returned { error }, or wrap in checkedWrite() / bestEffortWrite() from @/lib/supabase/checked-write.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          !callee ||
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier" ||
          !WRITE_METHODS.has(callee.property.name)
        ) {
          return;
        }
        // Must be a PostgREST chain (goes through `.from(...)`) — this filters
        // out Set.delete / Map.delete / array methods sharing the name.
        if (!chainHasFrom(node)) return;

        const top = topOfExpression(node);
        // The result is discarded only when the whole expression is a bare
        // statement. Assigned / returned / passed-as-argument → handled.
        if (top.parent && top.parent.type === "ExpressionStatement") {
          context.report({
            node,
            messageId: "uncheckedWrite",
            data: { method: callee.property.name },
          });
        }
      },
    };
  },
};

export default rule;
