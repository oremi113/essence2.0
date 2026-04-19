/**
 * Route factory — consolidates the requestId / auth / body-size / dedup /
 * try-catch boilerplate that every API route was repeating. See
 * src/app/api/* for call sites.
 */
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertBodySize, handleRouteError, ErrorCode } from "@/lib/errors";
import {
  generateRequestId,
  logEvent,
  withRequestId,
} from "@/lib/logger";
import { isDedupBlocked } from "@/lib/rate-limit";

type RouteParams = Record<string, string>;

/**
 * Minimal context shared by every defineRoute handler.
 * Concrete ctx type is narrowed by config (auth → user present, params → typed).
 */
export interface RouteContextBase<TParams extends RouteParams = RouteParams> {
  request: Request;
  requestId: string;
  params: TParams;
}

export interface AuthedRouteContext<TParams extends RouteParams = RouteParams>
  extends RouteContextBase<TParams> {
  user: User;
}

interface DedupConfig<TParams extends RouteParams> {
  /** usage_events action key (e.g. "message_generate", "voice_create") */
  action: string;
  /** log event name (e.g. "message_generate_dedup") */
  event: string;
  /** optional extra fields merged into the dedup log entry */
  meta?: (ctx: AuthedRouteContext<TParams>) => Record<string, unknown>;
}

interface DefineRouteOptions<
  TAuth extends boolean,
  TParams extends RouteParams,
> {
  /** If true, run getUser() and short-circuit with 401 when missing. */
  auth: TAuth;
  /** If true, run assertBodySize() before auth. */
  checkBodySize?: boolean;
  /** Optional dedup gate; only valid when auth is true. */
  dedup?: TAuth extends true ? DedupConfig<TParams> : never;
}

type Handler<TAuth extends boolean, TParams extends RouteParams> =
  TAuth extends true
    ? (ctx: AuthedRouteContext<TParams>) => Promise<Response>
    : (ctx: RouteContextBase<TParams>) => Promise<Response>;

type NextRouteArg<TParams extends RouteParams> = {
  params: Promise<TParams>;
};

/**
 * Build a Next.js route handler with standard guardrails applied.
 * Every returned response carries the x-request-id header.
 */
export function defineRoute<
  TAuth extends boolean,
  TParams extends RouteParams = RouteParams,
>(
  options: DefineRouteOptions<TAuth, TParams>,
  handler: Handler<TAuth, TParams>,
) {
  return async (
    request: Request,
    routeArg?: NextRouteArg<TParams>,
  ): Promise<Response> => {
    const requestId = generateRequestId();
    try {
      if (options.checkBodySize) {
        assertBodySize(request);
      }

      const params = (routeArg?.params
        ? await routeArg.params
        : ({} as TParams)) as TParams;

      if (options.auth) {
        const supabase = await createSupabaseServerClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return withRequestId(
            NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
            requestId,
          );
        }

        const ctx: AuthedRouteContext<TParams> = {
          request,
          requestId,
          params,
          user,
        };

        if (options.dedup && isDedupBlocked(user.id, options.dedup.action)) {
          const extra = options.dedup.meta ? options.dedup.meta(ctx) : {};
          logEvent({
            event: options.dedup.event,
            requestId,
            userId: user.id,
            outcome: "rejected",
            ...extra,
          });
          return withRequestId(
            NextResponse.json(
              {
                error: "Request already in progress. Please wait.",
                code: ErrorCode.RATE_LIMIT_EXCEEDED,
                retryable: true,
              },
              { status: 429 },
            ),
            requestId,
          );
        }

        const response = await (handler as Handler<true, TParams>)(ctx);
        return withRequestId(response, requestId);
      }

      const ctx: RouteContextBase<TParams> = { request, requestId, params };
      const response = await (handler as Handler<false, TParams>)(ctx);
      return withRequestId(response, requestId);
    } catch (err) {
      const { body, status } = handleRouteError(err, requestId);
      return withRequestId(NextResponse.json(body, { status }), requestId);
    }
  };
}
