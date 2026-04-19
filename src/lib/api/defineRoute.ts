/**
 * Route factory — consolidates the requestId / auth / body-size / dedup /
 * try-catch boilerplate that every API route was repeating. See
 * src/app/api/* for call sites.
 */
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertBodySize, handleRouteError, AppError, ErrorCode } from "@/lib/errors";
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

/** Per-route override for the 400 response shape when bodySchema fails. */
type InvalidBodyResponse = (error: z.ZodError) => {
  body: unknown;
  status: number;
};

interface DefineRouteOptions<
  TAuth extends boolean,
  TParams extends RouteParams,
  TBody,
> {
  /** If true, run getUser() and short-circuit with 401 when missing. */
  auth: TAuth;
  /** If true, run assertBodySize() before auth. */
  checkBodySize?: boolean;
  /** Optional dedup gate; only valid when auth is true. */
  dedup?: TAuth extends true ? DedupConfig<TParams> : never;
  /**
   * Optional Zod schema applied to the parsed JSON body. When set, the
   * handler receives the parsed result as `body`. Invalid JSON / schema
   * failures short-circuit with a 400 (shape configurable via
   * invalidBodyResponse).
   */
  bodySchema?: z.ZodType<TBody>;
  /**
   * Override the 400 response returned when bodySchema fails. Default:
   * throw AppError(VALIDATION_ERROR, <first issue>, 400, false), which
   * matches the { error, code, retryable } shape.
   */
  invalidBodyResponse?: InvalidBodyResponse;
}

interface HandlerContextBase<TParams extends RouteParams, TBody>
  extends RouteContextBase<TParams> {
  body: TBody;
}

interface AuthedHandlerContext<TParams extends RouteParams, TBody>
  extends AuthedRouteContext<TParams> {
  body: TBody;
}

type Handler<
  TAuth extends boolean,
  TParams extends RouteParams,
  TBody,
> = TAuth extends true
  ? [TBody] extends [never]
    ? (ctx: AuthedRouteContext<TParams>) => Promise<Response>
    : (ctx: AuthedHandlerContext<TParams, TBody>) => Promise<Response>
  : [TBody] extends [never]
    ? (ctx: RouteContextBase<TParams>) => Promise<Response>
    : (ctx: HandlerContextBase<TParams, TBody>) => Promise<Response>;

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
  TBody = never,
>(
  options: DefineRouteOptions<TAuth, TParams, TBody>,
  handler: Handler<TAuth, TParams, TBody>,
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

      // Parse + validate body upfront when a schema is configured. We
      // consume request.json() here so downstream handlers receive the
      // typed value via ctx.body.
      let parsedBody: TBody = undefined as TBody;
      if (options.bodySchema) {
        const raw = await request.json().catch(() => null);
        const result = options.bodySchema.safeParse(raw);
        if (!result.success) {
          if (options.invalidBodyResponse) {
            const { body, status } = options.invalidBodyResponse(result.error);
            return withRequestId(
              NextResponse.json(body, { status }),
              requestId,
            );
          }
          const first = result.error.issues[0];
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            first?.message ?? "Invalid JSON body",
            400,
            false,
          );
        }
        parsedBody = result.data as TBody;
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

        const ctx: AuthedHandlerContext<TParams, TBody> = {
          request,
          requestId,
          params,
          user,
          body: parsedBody,
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

        const response = await (
          handler as (ctx: AuthedHandlerContext<TParams, TBody>) => Promise<Response>
        )(ctx);
        return withRequestId(response, requestId);
      }

      const ctx: HandlerContextBase<TParams, TBody> = {
        request,
        requestId,
        params,
        body: parsedBody,
      };
      const response = await (
        handler as (ctx: HandlerContextBase<TParams, TBody>) => Promise<Response>
      )(ctx);
      return withRequestId(response, requestId);
    } catch (err) {
      const { body, status } = handleRouteError(err, requestId);
      return withRequestId(NextResponse.json(body, { status }), requestId);
    }
  };
}
